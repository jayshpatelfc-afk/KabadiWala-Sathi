import React, { useEffect, useState } from "react";
import { CheckCircle2, QrCode, RefreshCw } from "lucide-react";
import { api } from "../services/api";

export default function RecyclerView() {
  const [lots, setLots] = useState([]);
  const [error, setError] = useState("");
  const [busyLot, setBusyLot] = useState("");

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
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyLot("");
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
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
              <button onClick={loadLots} className="flex-1 bg-slate-900 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                <QrCode className="w-3.5 h-3.5" /> Scan QR Code
              </button>
              <button onClick={() => confirmHandover(lot.lotId)} disabled={busyLot === lot.lotId} className="flex-1 bg-emerald-500 disabled:opacity-60 text-slate-950 font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {busyLot === lot.lotId ? "Saving..." : "Confirm Handover"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}