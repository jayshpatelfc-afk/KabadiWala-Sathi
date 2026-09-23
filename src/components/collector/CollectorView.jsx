import React, { useEffect, useRef, useState } from "react";
import { Camera, DollarSign, AlertTriangle, TrendingUp, Volume2, QrCode, CheckCircle2, ShieldCheck, ScanLine, Upload, X, RefreshCw } from "lucide-react";
import { MOCK_PRICES, MOCK_RECYCLERS } from "../../services/mockData";
import { speakText } from "../../services/speechService";
import { api } from "../../services/api";
import { detectMaterial } from "../../services/materialScanner";
import { printLotReceipt } from "../../services/receiptService";
import { showBrowserNotification } from "../../services/notifications";

export default function CollectorView({ isOnline, setOfflineSyncQueue }) {
  const [activeTab, setActiveTab] = useState("add");
  const [prices, setPrices] = useState(MOCK_PRICES);
  const [recyclers, setRecyclers] = useState(MOCK_RECYCLERS);
  const [scannedMaterial, setScannedMaterial] = useState(MOCK_PRICES[0]);
  const [weight, setWeight] = useState("");
  const [createdLot, setCreatedLot] = useState(null);
  const [ledgerLots, setLedgerLots] = useState([]);
  const [error, setError] = useState("");
  const [scanPreview, setScanPreview] = useState("");
  const [scanConfidence, setScanConfidence] = useState(89);
  const [scanReason, setScanReason] = useState("Choose a clear photo for automatic detection");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isRefreshingLedger, setIsRefreshingLedger] = useState(false);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const loadLedger = () => {
    setError("");
    setIsRefreshingLedger(true);
    api
      .getLots()
      .then((lots) => {
        const completedLots = lots.filter((lot) => lot.status === "Completed");
        setLedgerLots(completedLots);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsRefreshingLedger(false));
  };

  useEffect(() => {
    if (!isOnline) return;
    Promise.all([api.getPrices(), api.getRecyclers()])
      .then(([nextPrices, nextRecyclers]) => {
        setPrices(nextPrices);
        setRecyclers(nextRecyclers);
        setScannedMaterial((current) => nextPrices.find((item) => item.id === current.id) || nextPrices[0]);
      })
      .catch(() => setError("Backend unavailable. You can still create an offline lot."));
  }, [isOnline]);

  useEffect(() => {
    if (activeTab === "ledger") {
      loadLedger();
    }
  }, [activeTab]);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const closeCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
  };

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanReason("Camera is unavailable here; use Upload Photo instead");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      setScanReason("Point the camera at e-waste, then capture");
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setScanReason("Camera permission was denied; use Upload Photo instead");
    }
  };

  const captureCameraFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) handleScan(new File([blob], "camera-scan.jpg", { type: "image/jpeg" }));
      closeCamera();
    }, "image/jpeg", 0.9);
  };

  const handleScan = async (file) => {
    setIsScanning(true);
    setScanPreview(URL.createObjectURL(file));
    setScanReason("Analyzing image locally on this device...");
    const result = await detectMaterial(file);
    const detectedMaterial = prices.find((item) => item.id === result.id);
    if (detectedMaterial) setScannedMaterial(detectedMaterial);
    setScanConfidence(result.confidence);
    setScanReason(result.reason);
    setIsScanning(false);
  };

  const handleCreateLot = async (e) => {
    e.preventDefault();
    const estVal = (parseFloat(weight) || 0) * scannedMaterial.price;
    setError("");
    let lotPayload;
    if (isOnline) {
      try {
        lotPayload = await api.createLot({ materialId: scannedMaterial.id, weight: parseFloat(weight) });
      } catch (requestError) {
        setError(requestError.message);
        return;
      }
    } else {
      lotPayload = {
        lotId: `OFFLINE-${Date.now()}`,
        material: scannedMaterial.name,
        weight: parseFloat(weight),
        estimatedVal: estVal,
        date: new Date().toLocaleDateString("en-IN"),
        status: "Created",
        synced: false
      };
      setOfflineSyncQueue((prev) => [...prev, lotPayload]);
    }
    setCreatedLot(lotPayload);
    setShowSuccessPopup(true);
    speakText(`लॉट बन गया है। अनुमानित मूल्य ₹${estVal} है।`);
    await showBrowserNotification(
      "Lot Created",
      `Lot ${lotPayload.lotId} created successfully for ${lotPayload.material}.`
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
        <button 
          onClick={() => setActiveTab("add")}
          className={`py-2 px-3 text-xs font-bold rounded-xl flex flex-col items-center gap-1 transition-all ${activeTab === "add" ? "bg-emerald-500 text-slate-950" : "text-slate-600 hover:bg-slate-50"}`}
        >
          <Camera className="w-4 h-4" />
          📸 कबाड़ बेचें
        </button>
        <button 
          onClick={() => setActiveTab("ledger")}
          className={`py-2 px-3 text-xs font-bold rounded-xl flex flex-col items-center gap-1 transition-all ${activeTab === "ledger" ? "bg-emerald-500 text-slate-950" : "text-slate-600 hover:bg-slate-50"}`}
        >
          <DollarSign className="w-4 h-4" />
          💰 मेरी कमाई
        </button>
        <button 
          onClick={() => setActiveTab("safety")}
          className={`py-2 px-3 text-xs font-bold rounded-xl flex flex-col items-center gap-1 transition-all ${activeTab === "safety" ? "bg-emerald-500 text-slate-950" : "text-slate-600 hover:bg-slate-50"}`}
        >
          <AlertTriangle className="w-4 h-4" />
          ⚠️ सुरक्षा नियम
        </button>
      </div>

      {activeTab === "add" && (
        <>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                आज का बाजार मूल्य (Today's Rates)
              </h2>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">Live Sync</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {prices.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    setScannedMaterial(item);
                    speakText(`चुना गया: ${item.hiName}. भाव ${item.price} रुपया प्रति किलो.`);
                  }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${item.color} ${scannedMaterial.id === item.id ? "ring-2 ring-emerald-500 border-transparent shadow-sm" : "opacity-80 hover:opacity-100"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold truncate">{item.hiName}</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        speakText(`आज ${item.hiName} का भाव ₹${item.price} प्रति ${item.unit} है.`);
                      }}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-lg font-black tracking-tight">₹{item.price}<span className="text-xs font-normal">/{item.unit}</span></p>
                  <span className="text-[10px] font-semibold text-emerald-600">{item.trend}</span>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">{error}</p>}

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50 flex flex-col items-center justify-center">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleScan(file);
                }}
              />
              {scanPreview ? (
                <img src={scanPreview} alt="Scanned e-waste" className="w-full h-32 object-cover rounded-lg mb-3" />
              ) : (
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                  <Camera className="w-6 h-6" />
                </div>
              )}
              <div className="mt-3 flex w-full gap-2">
                <button
                  type="button"
                  onClick={openCamera}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-bold text-slate-950 shadow-sm hover:bg-emerald-600"
                >
                  {isScanning ? <ScanLine className="w-4 h-4 animate-pulse" /> : <Camera className="w-4 h-4" />}
                  {isScanning ? "स्कैन हो रहा है..." : "AI Material Scan"}
                </button>

                <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
                  <Upload className="w-4 h-4" />
                  Upload Photo
                  <input type="file" accept="image/*" className="sr-only" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleScan(file);
                  }} />
                </label>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Detected: <span className="font-semibold text-slate-900">{scannedMaterial.hiName}</span> ({scanConfidence}% confidence)
              </p>
              <p className="text-[10px] text-slate-500 mt-1">{scanReason} • Tap to retake</p>
            </div>

            {cameraOpen && (
              <div className="fixed inset-0 z-[60] bg-slate-950/95 p-4 flex items-center justify-center">
                <div className="w-full max-w-md space-y-3">
                  <div className="flex items-center justify-between text-white">
                    <p className="font-bold text-sm flex items-center gap-2"><ScanLine className="w-4 h-4 text-emerald-400" /> Scan e-waste</p>
                    <button type="button" onClick={closeCamera} aria-label="Close camera" className="p-2 rounded-full bg-white/10"><X className="w-5 h-5" /></button>
                  </div>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[3/4] object-cover rounded-2xl bg-black" />
                  <button type="button" onClick={captureCameraFrame} className="w-full bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                    <Camera className="w-4 h-4" /> Capture and detect material
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateLot} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">वजन दर्ज करें (Enter Weight in Kg):</label>
                <div className="relative">
                  <input 
                    type="number" 
                    required
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 10.5" 
                    className="w-full pl-3 pr-12 py-2.5 text-base font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">KG</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-500">अनुमानित कुल राशि (Est. Total Value)</p>
                  <p className="text-lg font-black text-emerald-600">
                    ₹{((parseFloat(weight) || 0) * scannedMaterial.price).toLocaleString("en-IN")}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => speakText(`कुल अनुमानित मूल्य लगभग ₹${(parseFloat(weight) || 0) * scannedMaterial.price} रुपये है`)}
                  className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
              >
                <QrCode className="w-4 h-4" />
                डिजिटल लॉट बनाएं (Create Digital Lot)
              </button>
            </form>
          </div>

          {showSuccessPopup && createdLot && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-600 font-bold">Success</p>
                <h3 className="text-lg font-black text-slate-900">Lot Created</h3>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-6">
              Lot <span className="font-bold text-slate-900">{createdLot.lotId}</span> was created successfully.
            </p>

            <div className="mt-4 space-y-2 rounded-xl bg-emerald-50 p-3 text-sm text-slate-700 border border-emerald-100">
              <p><span className="font-bold">Material:</span> {createdLot.material}</p>
              <p><span className="font-bold">Weight:</span> {createdLot.weight} kg</p>
              <p><span className="font-bold">Value:</span> ₹{createdLot.estimatedVal}</p>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => printLotReceipt(createdLot)}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm hover:bg-emerald-600"
              >
                Download Receipt
              </button>
              <button
                type="button"
                onClick={() => setShowSuccessPopup(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {createdLot && (
            <div className="bg-emerald-950 text-white p-4 rounded-2xl shadow-md border border-emerald-800 space-y-3">
              <div className="flex justify-between items-start border-b border-emerald-800/80 pb-2">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded">
                    {createdLot.lotId}
                  </span>
                  <h3 className="font-bold text-base mt-1">{createdLot.material}</h3>
                </div>
                <span className="text-xs bg-emerald-500 text-slate-950 font-bold px-2.5 py-1 rounded-full">
                  {createdLot.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-emerald-400/70 text-[10px]">Weight</p>
                  <p className="font-bold text-sm">{createdLot.weight} kg</p>
                </div>
                <div>
                  <p className="text-emerald-400/70 text-[10px]">Est. Value</p>
                  <p className="font-bold text-sm">₹{createdLot.estimatedVal}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => printLotReceipt(createdLot)}
                  className="flex-1 bg-white/10 border border-white/20 text-white font-bold py-2.5 rounded-xl"
                >
                  Download PDF Receipt
                </button>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2">
                <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Best Authorized Recycler Recommended
                </p>
                {recyclers.slice(0, 1).map((rec) => (
                  <div key={rec.id} className="flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-100">{rec.name}</p>
                      <p className="text-[10px] text-slate-400">{rec.dist} away • Authorized</p>
                    </div>
                    <span className="text-emerald-400 font-bold">₹{Math.round(scannedMaterial.price * rec.priceMul)}/kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "ledger" && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-bold text-slate-900 text-sm">💰 मेरी कमाई (Earnings History)</h2>
            <button
              type="button"
              onClick={loadLedger}
              disabled={isRefreshingLedger}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingLedger ? "animate-spin" : ""}`} />
              {isRefreshingLedger ? "Loading" : "Refresh"}
            </button>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-500">कुल भुगतान प्राप्त (Total Received)</p>
              <p className="text-xl font-black text-slate-900">₹{ledgerLots.reduce((total, lot) => total + Number(lot.estimatedVal || 0), 0).toLocaleString("en-IN")}</p>
            </div>
            <span className="text-xs bg-emerald-200 text-emerald-800 font-bold px-2 py-1 rounded-md">
              Live
            </span>
          </div>

          {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}

          <div className="space-y-2 text-xs">
            {ledgerLots.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                No completed lots yet. Newly closed lots will appear here.
              </p>
            ) : (
              ledgerLots.map((lot) => (
                <div key={lot.lotId} className="flex justify-between p-2.5 bg-slate-50 rounded-lg gap-2">
                  <div>
                    <p className="font-bold text-slate-800">{lot.lotId}</p>
                    <p className="text-[10px] text-slate-400">{lot.material} • {lot.weight} kg • Handover Completed</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">₹{Number(lot.estimatedVal || 0).toLocaleString("en-IN")}</p>
                    <span className="text-[9px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Paid</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "safety" && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            स्वास्थ्य और सुरक्षा निर्देश (Safety Protocols)
          </h2>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-red-800">🔥 तार जलाना सख्त मना है</p>
                <p className="text-[11px] text-red-600">Do not burn cables. Severe toxic fumes hazard.</p>
              </div>
              <button
                type="button"
                aria-label="Speak safety protocol for burning cables"
                title="Speak safety tip"
                onClick={() => speakText("तार न जलाएं, यह जहरीला है")}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-amber-800">🧪 एसिड का प्रयोग न करें</p>
                <p className="text-[11px] text-amber-700">Do not use acid leaching at home.</p>
              </div>
              <button
                type="button"
                aria-label="Speak safety protocol for acid use"
                title="Speak safety tip"
                onClick={() => speakText("धातु निकालने के लिए तेजाब का उपयोग न करें")}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}