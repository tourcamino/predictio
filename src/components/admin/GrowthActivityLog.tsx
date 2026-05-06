import { useState, useEffect } from "react";
import { useWebSocket } from "~/hooks/useWebSocket";

interface GrowthActivityLogProps {
  activities: Array<{
    id: string;
    type: "post" | "reply" | "dm" | "cycle" | "user_tracked";
    message: string;
    timestamp: Date;
    platform?: "twitter" | "telegram";
  }>;
}

const typeColors = {
  post: "text-brand-green",
  reply: "text-cyan-400",
  dm: "text-yellow-400",
  cycle: "text-gray-400",
  user_tracked: "text-purple-400",
};

const typeLabels = {
  post: "POST",
  reply: "REPLY",
  dm: "DM",
  cycle: "SYSTEM",
  user_tracked: "USER",
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function GrowthActivityLog({ activities }: GrowthActivityLogProps) {
  const [displayActivities, setDisplayActivities] = useState(activities);
  const { messages, connected } = useWebSocket('growth');

  // Merge prop activities with WebSocket messages
  useEffect(() => {
    const wsActivities = messages.map((msg) => ({
      id: `ws-${Date.now()}-${Math.random()}`,
      type: msg.event === 'post_published' ? 'post' as const : 
            msg.event === 'reply_sent' ? 'reply' as const : 
            msg.event === 'dm_sent' ? 'dm' as const : 'cycle' as const,
      message: msg.data.content || msg.data.status || 'Activity logged',
      timestamp: new Date(msg.timestamp || Date.now()),
      platform: msg.data.platform as 'twitter' | 'telegram' | undefined,
    }));

    setDisplayActivities([...wsActivities, ...activities].slice(0, 50));
  }, [messages, activities]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-syne font-bold">Activity Log</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-green' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-500 font-mono">
            {connected ? 'Live' : 'Mock'}
          </span>
        </div>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {displayActivities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 font-mono text-sm">
              No activity yet. Start the engine to begin tracking.
            </p>
          </div>
        ) : (
          displayActivities.map((activity, index) => (
            <div
              key={activity.id}
              className={`
                flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5
                hover:border-white/10 transition-all
                ${index === 0 ? "animate-slide-down" : ""}
              `}
            >
              <div className={`text-xl ${typeColors[activity.type]}`}>●</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs text-gray-500 font-mono">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-bold font-mono ${
                      activity.type === "post"
                        ? "bg-brand-green/20 border border-brand-green/30 text-brand-green"
                        : activity.type === "reply"
                        ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-400"
                        : activity.type === "dm"
                        ? "bg-yellow-500/20 border border-yellow-500/30 text-yellow-400"
                        : activity.type === "user_tracked"
                        ? "bg-purple-500/20 border border-purple-500/30 text-purple-400"
                        : "bg-white/10 border border-white/20 text-gray-400"
                    }`}
                  >
                    {typeLabels[activity.type]}
                  </span>
                  {activity.platform && (
                    <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-xs font-mono text-gray-400">
                      {activity.platform === "twitter" ? "𝕏" : "TG"}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-300 font-mono leading-relaxed">
                  {activity.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
