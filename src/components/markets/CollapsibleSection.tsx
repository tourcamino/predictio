import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
}

export function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false,
  icon 
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-syne font-bold text-lg">{title}</h3>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {isOpen && (
        <div className="p-4 pt-0 border-t border-white/10 animate-slide-down">
          {children}
        </div>
      )}
    </div>
  );
}
