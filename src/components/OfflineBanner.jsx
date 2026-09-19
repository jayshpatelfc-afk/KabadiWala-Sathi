import React from "react";
import { WifiOff } from "lucide-react";

export default function OfflineBanner({ queueLength }) {
  return (
    <div className="bg-amber-500 text-slate-950 px-4 py-2.5 rounded-xl flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>Offline Mode: Syncs automatically when reconnected</span>
      </div>
      <span className="text-xs bg-slate-950/20 px-2 py-0.5 rounded font-mono">{queueLength} queued</span>
    </div>
  );
}