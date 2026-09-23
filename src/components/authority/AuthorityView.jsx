import React, { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { api } from "../../services/api";

function formatCurrency(val) {
  const num = Number(val) || 0;
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
}

function formatWeight(kg) {
  const num = Number(kg) || 0;
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)} Tons`;
  }
  return `${Number(num.toFixed(1)).toLocaleString("en-IN")} KG`;
}

export default function AuthorityView({ offlineSyncQueue = [] }) {
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAnalytics = () => {
    setError("");
    setIsRefreshing(true);
    api
      .getAnalytics()
      .then(setAnalytics)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsRefreshing(false));
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const serverMetrics = analytics || { activeCollectors: 0, formalizationRate: 0, processedWeight: 0, recoveredValue: 0, statusCounts: {} };

  // Combine with any local offline lots if present
  const offlineWeight = offlineSyncQueue.reduce((acc, lot) => acc + (Number(lot.weight) || 0), 0);
  const offlineValue = offlineSyncQueue.reduce((acc, lot) => acc + (Number(lot.estimatedVal) || 0), 0);

  const metrics = {
    ...serverMetrics,
    processedWeight: (Number(serverMetrics.processedWeight) || 0) + offlineWeight,
    recoveredValue: (Number(serverMetrics.recoveredValue) || 0) + offlineValue,
    statusCounts: {
      ...serverMetrics.statusCounts,
      Created: (serverMetrics.statusCounts?.Created || 0) + offlineSyncQueue.length
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <div className="border-b pb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            State E-Waste Analytics
          </h2>
          <p className="text-xs text-slate-500">Maharashtra Pollution Control Board Monitor</p>
        </div>
        <button
          type="button"
          onClick={loadAnalytics}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          title="Refresh analytics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing" : "Refresh"}
        </button>
      </div>

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="p-3 bg-slate-50 rounded-xl border">
          <p className="text-[10px] text-slate-500 uppercase font-semibold">Active Collectors</p>
          <p className="text-lg font-black text-slate-900">{metrics.activeCollectors.toLocaleString("en-IN")}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border">
          <p className="text-[10px] text-slate-500 uppercase font-semibold">Formalization Rate</p>
          <p className="text-lg font-black text-emerald-600">{metrics.formalizationRate}%</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border">
          <p className="text-[10px] text-slate-500 uppercase font-semibold">E-Waste Processed</p>
          <p className="text-lg font-black text-slate-900">{formatWeight(metrics.processedWeight)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total Lots Created</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border">
          <p className="text-[10px] text-slate-500 uppercase font-semibold">Value Recovered</p>
          <p 
            className="text-lg font-black text-emerald-600" 
            title={`Exact Value: ₹${Number(metrics.recoveredValue || 0).toLocaleString("en-IN")}`}
          >
            {formatCurrency(metrics.recoveredValue)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total Lots Created</p>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-3 rounded-xl text-xs space-y-1">
        <p className="font-bold text-emerald-400">Critical Materials Safely Recovered:</p>
        <p className="text-slate-300">Copper, Lithium, Gold, Neodymium, Tantalum, Cobalt</p>
      </div>
      <div className="text-[11px] text-slate-500 flex justify-between border-t pt-3">
        <span>Created: {metrics.statusCounts.Created || 0}</span>
        <span>Accepted: {metrics.statusCounts.Accepted || 0}</span>
        <span>Completed: {metrics.statusCounts.Completed || 0}</span>
      </div>
    </div>
  );
}