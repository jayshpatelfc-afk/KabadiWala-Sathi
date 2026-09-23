import React, { useEffect, useState } from "react";
import { CheckCircle2, FileText, RefreshCw } from "lucide-react";
import { api } from "../../services/api";
import { printLotReceipt } from "../../services/receiptService";
import { showBrowserNotification } from "../../services/notifications";

export default function RecyclerView() {
  const [lots, setLots] = useState([]);
  const [error, setError] = useState("");
  const [busyLot, setBusyLot] = useState("");
  const [confirmLot, setConfirmLot] = useState(null);
  const [showAcceptPopup, setShowAcceptPopup] = useState(false);

  const loadLots = () => {
    setError("");
    api.getLots("Created").then(setLots).catch((requestError) => setError(requestError.message));
  };

  useEffect(() => {
    loadLots();
  }, []);

  const confirmHandover = async (lotId) => {
    setBusyLot(lotId);
    try {
      await api.updateLotStatus(lotId, "Completed");
      setLots((currentLots) => currentLots.filter((lot) => lot.lotId !== lotId));
      setShowAcceptPopup(true);
      setConfirmLot(null);
      const acceptedLot = lots.find((lot) => lot.lotId === lotId);
      await showBrowserNotification(
        "Lot Accepted",
        `Lot ${lotId} was accepted successfully${acceptedLot ? ` for ${acceptedLot.material}` : ""}.`
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyLot("");
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      {showAcceptPopup && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-600 font-bold">Accepted</p>
                <h3 className="text-lg font-black text-slate-900">Lot Accepted Successfully</h3>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-6">
              The lot has been accepted and closed successfully.
            </p>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowAcceptPopup(false)}
                className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm hover:bg-emerald-600"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmLot && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900">Accept this lot?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Lot <span className="font-bold text-slate-900">{confirmLot.lotId}</span> will be marked as accepted.
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 border border-slate-200">
              <p><span className="font-bold">Material:</span> {confirmLot.material}</p>
              <p><span className="font-bold">Weight:</span> {confirmLot.weight} kg</p>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  confirmHandover(confirmLot.lotId);
                }}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-600"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirmLot(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-b pb-2 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-slate-900 text-base">Authorized Recycler Hub</h2>
          <p className="text-xs text-slate-500">Maha Metal Recovery Plant (Reg #MH-EW-882)</p>
        </div>
        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
          Verified
        </span>
      </div>

      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-700">Incoming Digital Handover Requests</p>
          <button onClick={loadLots} className="text-slate-500 hover:text-slate-900" title="Refresh requests">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
        {!error && lots.length === 0 && <p className="text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-200">No pending handovers.</p>}

        {lots.map((lot) => (
          <div key={lot.lotId} className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between font-bold gap-2">
              <span>{lot.lotId}</span>
              <span className="text-emerald-600">₹{Math.round(lot.estimatedVal / lot.weight)}/kg Offered</span>
            </div>
            <p className="text-slate-500">Material: {lot.material} • Collector: {lot.collectorName}</p>
            <p className="text-slate-500">Weight: {lot.weight} kg • Estimated value: ₹{lot.estimatedVal}</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => printLotReceipt(lot)} className="flex-1 bg-slate-900 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Receipt
              </button>
              <button onClick={() => setConfirmLot(lot)} disabled={busyLot === lot.lotId} className="flex-1 bg-emerald-500 disabled:opacity-60 text-slate-950 font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {busyLot === lot.lotId ? "Saving..." : "Accept Lot"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}