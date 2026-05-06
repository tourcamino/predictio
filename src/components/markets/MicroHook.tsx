import { Zap } from 'lucide-react';

export function MicroHook() {
  return (
    <div className="flex items-center justify-center gap-2 py-3 text-sm sm:text-base text-gray-300">
      <Zap className="w-4 h-4 text-yellow-400" />
      <span>
        Trade now or wait — <span className="font-semibold text-white">odds move in real time</span> during the match
      </span>
    </div>
  );
}
