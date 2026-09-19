import React, { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { api } from "../services/api";

export default function AuthorityView() {
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getAnalytics().then(setAnalytics).catch((requestError) => setError(requestError.message));
  }, []);

  const metrics = analytics || { activeCollectors: 0, formalizationRate: 0, processedWeight: 0, recoveredValue: 0, statusCounts: {} };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <div className="border-b pb-2">
        <h2 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          State E-Waste Analytics
        </h2>
        <p className="text-xs text-slate-500">Maharashtra Pollution Control Board Monitor</p>
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
          <p className="text-lg font-black text-slate-900">{(metrics.processedWeight / 1000).toFixed(2)} Tons</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border">
          <p className="text-[10px] text-slate-500 uppercase font-semibold">Value Recovered</p>
          <p className="text-lg font-black text-emerald-600">₹{(metrics.recoveredValue / 10000000).toFixed(2)} Cr</p>
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