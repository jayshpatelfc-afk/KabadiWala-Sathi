import React from "react";
import { Wifi, WifiOff } from "lucide-react";

export default function Header({ activeRole, setActiveRole, isOnline, setIsOnline }) {
  return (
    <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 p-2 rounded-lg text-slate-900 font-bold">
            ♻️
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Kabadi Saathi</h1>
            <p className="text-xs text-slate-400"> Formal E-Waste Bridge</p>
          </div>
        </div>

        <button 
          onClick={() => setIsOnline(!isOnline)}
          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
            isOnline ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
          }`}
        >
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {isOnline ? "Online" : "Offline"}
        </button>
      </div>

      <div className="max-w-md mx-auto mt-3 pt-3 border-t border-slate-800 flex justify-between gap-1">
        <button 
          onClick={() => setActiveRole("collector")} 
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeRole === "collector" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:bg-slate-800"}`}
        >
          👷 Collector
        </button>
        <button 
          onClick={() => setActiveRole("recycler")} 
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeRole === "recycler" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:bg-slate-800"}`}
        >
          🏭 Recycler
        </button>
        <button 
          onClick={() => setActiveRole("authority")} 
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeRole === "authority" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:bg-slate-800"}`}
        >
          🏛️ Analytics
        </button>
      </div>
    </header>
  );
}