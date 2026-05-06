import { useEffect, useState } from "react";
import { aiClient } from "~/services/openRouterClient";
import { Zap } from "lucide-react";

export function AICostMonitor() {
  const [usage, setUsage] = useState({
    calls: 0,
    tokens: 0,
    cost: 0,
    monthlyProjection: 0,
  });

  useEffect(() => {
    // Update usage stats from aiClient
    const updateUsage = () => {
      const totalCalls = aiClient.usageLog.length;
      const totalTokens = aiClient.usageLog.reduce(
        (sum, log) => sum + log.tokens,
        0
      );
      const totalCost = aiClient.getTotalCost();
      const projection = aiClient.getMonthlyProjection();

      setUsage({
        calls: totalCalls,
        tokens: totalTokens,
        cost: totalCost,
        monthlyProjection: projection,
      });
    };

    updateUsage();
    const interval = setInterval(updateUsage, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get model breakdown
  const modelBreakdown = aiClient.usageLog.reduce(
    (acc, log) => {
      const modelName = log.model.split("/")[1] || log.model;
      acc[modelName] = (acc[modelName] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-brand-cyan" />
        <h3 className="font-syne font-bold text-lg">AI Usage — This Session</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Calls</div>
          <div className="font-mono font-bold text-2xl">{usage.calls}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Tokens</div>
          <div className="font-mono font-bold text-2xl">
            {usage.tokens.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Cost</div>
          <div className="font-mono font-bold text-2xl text-brand-green">
            ${usage.cost.toFixed(4)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Monthly est</div>
          <div className="font-mono font-bold text-2xl text-brand-cyan">
            ~${usage.monthlyProjection.toFixed(2)}
          </div>
        </div>
      </div>

      {Object.keys(modelBreakdown).length > 0 && (
        <div className="pt-4 border-t border-white/10 space-y-2">
          {Object.entries(modelBreakdown).map(([model, calls]) => (
            <div
              key={model}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-400">{model}</span>
              <span className="font-mono font-semibold">{calls} calls</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
