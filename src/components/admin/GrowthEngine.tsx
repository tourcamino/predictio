import { useState, useEffect } from "react";
import { EngineStatus } from "./EngineStatus";
import { MarketCards } from "./MarketCards";
import { GrowthActivityLog } from "./GrowthActivityLog";
import { InteractionTable } from "./InteractionTable";
import {
  startEngine,
  pauseEngine,
  resumeEngine,
  forceRunCycle,
  getEngineStats,
  getActivityLog,
  isEngineRunning,
  isEnginePaused,
} from "~/growthEngine";
import { getTrackedUsers } from "~/growthEngine/interactionTracker";
import { sendManualDM } from "~/growthEngine/dmEngine";
import { scanMarkets, selectTopMarkets } from "~/growthEngine/marketScanner";
import { Play } from "lucide-react";

export function GrowthEngine() {
  const [engineRunning, setEngineRunning] = useState(false);
  const [enginePaused, setEnginePaused] = useState(false);
  const [stats, setStats] = useState(getEngineStats());
  const [activities, setActivities] = useState(getActivityLog(50));
  const [trackedUsers, setTrackedUsers] = useState(getTrackedUsers());
  const [topMarkets, setTopMarkets] = useState<any[]>([]);

  // Poll for updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setEngineRunning(isEngineRunning());
      setEnginePaused(isEnginePaused());
      setStats(getEngineStats());
      setActivities(getActivityLog(50));
      setTrackedUsers(getTrackedUsers());

      // Update top markets
      scanMarkets().then((markets) => {
        const top = selectTopMarkets(markets, 3);
        setTopMarkets(
          top.map((m) => ({
            ...m,
            contentGenerated: true,
            postedToX: true,
            postedToTelegram: m.timeToClose < 3600,
            repliesSent: Math.floor(Math.random() * 3),
          }))
        );
      });
    }, 10000);

    // Initial load
    scanMarkets().then((markets) => {
      const top = selectTopMarkets(markets, 3);
      setTopMarkets(
        top.map((m) => ({
          ...m,
          contentGenerated: false,
          postedToX: false,
          postedToTelegram: false,
          repliesSent: 0,
        }))
      );
    });

    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
    startEngine();
    setEngineRunning(true);
    setEnginePaused(false);
  };

  const handlePause = () => {
    pauseEngine();
    setEnginePaused(true);
  };

  const handleResume = () => {
    resumeEngine();
    setEnginePaused(false);
  };

  const handleForceRun = () => {
    forceRunCycle();
  };

  const handleSendDM = async (handle: string) => {
    const success = await sendManualDM(handle);
    if (success) {
      // Refresh tracked users
      setTrackedUsers(getTrackedUsers());
      setActivities(getActivityLog(50));
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-brand-green/20 border border-brand-green/30 rounded-lg flex items-center justify-center">
            <span className="text-xl">⚡</span>
          </div>
          <h1 className="text-3xl font-syne font-bold">Growth Engine</h1>
        </div>
        <p className="text-gray-400 font-mono text-sm">
          Automated social operator · Market monitoring · Content generation · User acquisition
        </p>
      </div>

      {/* Start button if not running */}
      {!engineRunning && (
        <div className="mb-6">
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-6 py-3 bg-brand-green/20 border border-brand-green/30 rounded-lg text-base font-medium text-brand-green hover:bg-brand-green/30 transition-colors"
          >
            <Play size={20} />
            Start Growth Engine
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Engine Status */}
        {engineRunning && (
          <EngineStatus
            isRunning={engineRunning}
            isPaused={enginePaused}
            stats={stats}
            onPause={handlePause}
            onResume={handleResume}
            onForceRun={handleForceRun}
          />
        )}

        {/* Top Markets */}
        <div>
          <h2 className="text-xl font-syne font-bold mb-4">Top Markets Now</h2>
          <MarketCards markets={topMarkets} />
        </div>

        {/* Activity Log */}
        <GrowthActivityLog activities={activities} />

        {/* Interaction Tracker */}
        <InteractionTable users={trackedUsers} onSendDM={handleSendDM} />
      </div>
    </div>
  );
}
