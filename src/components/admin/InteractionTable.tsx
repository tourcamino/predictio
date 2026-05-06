import { Send } from "lucide-react";

interface InteractionTableProps {
  users: Array<{
    handle: string;
    sport: string;
    engagementCount: number;
    status: "new" | "engaged" | "dm_sent" | "replied" | "converted";
    lastInteraction: number;
  }>;
  onSendDM: (handle: string) => void;
}

const statusConfig = {
  new: {
    label: "New",
    color: "text-gray-400 bg-gray-500/10 border-gray-500/30",
  },
  engaged: {
    label: "Engaged",
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  },
  dm_sent: {
    label: "DM Sent",
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  },
  replied: {
    label: "Replied",
    color: "text-brand-green bg-brand-green/10 border-brand-green/30",
  },
  converted: {
    label: "Converted",
    color: "text-yellow-500 bg-yellow-500/20 border-yellow-500/40",
  },
};

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function InteractionTable({ users, onSendDM }: InteractionTableProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-syne font-bold mb-4">Interaction Tracker</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-xs font-bold font-mono text-gray-400 uppercase">
                Handle
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold font-mono text-gray-400 uppercase">
                Sport
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold font-mono text-gray-400 uppercase">
                Interactions
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold font-mono text-gray-400 uppercase">
                Last Active
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold font-mono text-gray-400 uppercase">
                Status
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold font-mono text-gray-400 uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  <p className="text-gray-400 font-mono text-sm">
                    No tracked users yet. Start engaging to populate.
                  </p>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.handle}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-white font-medium">
                      {user.handle}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-gray-300">{user.sport}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-white font-bold">
                      {user.engagementCount}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-mono text-gray-400">
                      {formatTimeAgo(user.lastInteraction)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold font-mono border ${
                        statusConfig[user.status].color
                      }`}
                    >
                      {statusConfig[user.status].label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {user.status === "engaged" ? (
                      <button
                        onClick={() => onSendDM(user.handle)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs font-medium text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                      >
                        <Send size={12} />
                        Send DM
                      </button>
                    ) : user.status === "dm_sent" || user.status === "replied" ? (
                      <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs font-mono text-gray-500 cursor-default">
                        View
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
