import { Play, Pause, Zap } from "lucide-react";

interface EngineStatusProps {
  isRunning: boolean;
  isPaused: boolean;
  stats: {
    postsToday: number;
    repliesToday: number;
    dmsToday: number;
    lastCycleAt: number | null;
    nextCycleAt: number | null;
  };
  onPause: () => void;
  onResume: () => void;
  onForceRun: () => void;
}

function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return "—";
  
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatTimeUntil(timestamp: number | null): string {
  if (!timestamp) return "—";
  
  const seconds = Math.floor((timestamp - Date.now()) / 1000);
  
  if (seconds < 0) return "now";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
  return `${Math.floor(seconds / 86400)}d`;
}

export function EngineStatus({
  isRunning,
  isPaused,
  stats,
  onPause,
  onResume,
  onForceRun,
}: EngineStatusProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between">
        {/* Status */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {isRunning && !isPaused ? (
              <>
                <div className="w-3 h-3 bg-brand-green rounded-full animate-pulse" />
                <span className="text-brand-green font-bold font-mono text-sm">
                  ENGINE RUNNING
                </span>
              </>
            ) : isPaused ? (
              <>
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-yellow-500 font-bold font-mono text-sm">
                  ⏸ ENGINE PAUSED
                </span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 bg-gray-500 rounded-full" />
                <span className="text-gray-500 font-bold font-mono text-sm">
                  ENGINE STOPPED
                </span>
              </>
            )}
          </div>

          <div className="h-8 w-px bg-white/10" />

          {/* Cycle timing */}
          <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
            <span>
              Last cycle: <span className="text-white">{formatTimeAgo(stats.lastCycleAt)}</span>
            </span>
            <span>
              Next cycle: <span className="text-white">{formatTimeUntil(stats.nextCycleAt)}</span>
            </span>
          </div>

          <div className="h-8 w-px bg-white/10" />

          {/* Today's stats */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-gray-400">
              Posts today: <span className="text-brand-green font-bold">{stats.postsToday}</span>
            </span>
            <span className="text-gray-400">
              Replies: <span className="text-cyan-400 font-bold">{stats.repliesToday}</span>
            </span>
            <span className="text-gray-400">
              DMs sent: <span className="text-yellow-400 font-bold">{stats.dmsToday}</span>
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {isRunning && !isPaused ? (
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm font-medium text-yellow-500 hover:bg-yellow-500/20 transition-colors"
            >
              <Pause size={16} />
              Pause
            </button>
          ) : isPaused ? (
            <button
              onClick={onResume}
              className="flex items-center gap-2 px-4 py-2 bg-brand-green/10 border border-brand-green/30 rounded-lg text-sm font-medium text-brand-green hover:bg-brand-green/20 transition-colors"
            >
              <Play size={16} />
              Resume
            </button>
          ) : null}

          {isRunning && (
            <button
              onClick={onForceRun}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors"
            >
              <Zap size={16} />
              Force Run
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
