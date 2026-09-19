import React, { useState } from "react";
import Header from "./components/Header";
import OfflineBanner from "./components/OfflineBanner";
import CollectorView from "./components/CollectorView";
import RecyclerView from "./components/RecyclerView";
import AuthorityView from "./components/AuthorityView";

export default function App() {
  const [activeRole, setActiveRole] = useState("collector");
  const [isOnline, setIsOnline] = useState(true);
  const [offlineSyncQueue, setOfflineSyncQueue] = useState([]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-12">
      <Header 
        activeRole={activeRole} 
        setActiveRole={setActiveRole} 
        isOnline={isOnline} 
        setIsOnline={setIsOnline} 
      />

      <main className="max-w-md mx-auto p-4 space-y-4">
        {!isOnline && <OfflineBanner queueLength={offlineSyncQueue.length} />}

        {activeRole === "collector" && (
          <CollectorView 
            isOnline={isOnline} 
            setOfflineSyncQueue={setOfflineSyncQueue} 
          />
        )}

        {activeRole === "recycler" && <RecyclerView />}

        {activeRole === "authority" && <AuthorityView />}
      </main>
    </div>
  );
}