import { Calendar } from 'lucide-react';
import { useState } from 'react';
import { Menu } from '@headlessui/react';

interface DateRangePickerProps {
  timeRange: string;
  onTimeRangeChange: (range: '7D' | '30D' | '90D' | '1M' | '3M' | '6M' | '1Y' | 'ALL' | 'CUSTOM') => void;
  onCustomRangeChange?: (startDate: Date, endDate: Date) => void;
}

export function DateRangePicker({ 
  timeRange, 
  onTimeRangeChange,
  onCustomRangeChange 
}: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const presetRanges: Array<{
    value: '7D' | '30D' | '90D' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
    label: string;
  }> = [
    { value: '7D', label: '7 Days' },
    { value: '30D', label: '30 Days' },
    { value: '90D', label: '90 Days' },
    { value: '1M', label: '1 Month' },
    { value: '3M', label: '3 Months' },
    { value: '6M', label: '6 Months' },
    { value: '1Y', label: '1 Year' },
    { value: 'ALL', label: 'All Time' },
  ];

  const handleCustomApply = () => {
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      
      if (start <= end) {
        onTimeRangeChange('CUSTOM');
        if (onCustomRangeChange) {
          onCustomRangeChange(start, end);
        }
        setShowCustom(false);
      }
    }
  };

  const getDisplayLabel = () => {
    if (timeRange === 'CUSTOM' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    
    const preset = presetRanges.find(r => r.value === timeRange);
    return preset?.label || '30 Days';
  };

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all font-semibold">
        <Calendar className="w-4 h-4" />
        <span>{getDisplayLabel()}</span>
      </Menu.Button>

      <Menu.Items className="absolute right-0 mt-2 w-64 bg-brand-bg border border-white/10 rounded-lg shadow-xl z-10 overflow-hidden">
        <div className="p-2">
          {/* Preset Ranges */}
          <div className="space-y-1 mb-2">
            {presetRanges.map((range) => (
              <Menu.Item key={range.value}>
                {({ active }) => (
                  <button
                    onClick={() => {
                      onTimeRangeChange(range.value);
                      setShowCustom(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded transition-all ${
                      timeRange === range.value
                        ? 'bg-brand-green text-brand-bg font-semibold'
                        : active
                        ? 'bg-white/10'
                        : ''
                    }`}
                  >
                    {range.label}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>

          {/* Custom Range Divider */}
          <div className="border-t border-white/10 my-2" />

          {/* Custom Range Button */}
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={() => setShowCustom(!showCustom)}
                className={`w-full text-left px-3 py-2 rounded transition-all ${
                  timeRange === 'CUSTOM'
                    ? 'bg-brand-green text-brand-bg font-semibold'
                    : active
                    ? 'bg-white/10'
                    : ''
                }`}
              >
                Custom Range
              </button>
            )}
          </Menu.Item>

          {/* Custom Range Inputs */}
          {showCustom && (
            <div className="mt-2 p-3 bg-white/5 rounded-lg space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-brand-bg border border-white/10 rounded text-sm focus:outline-none focus:border-brand-green"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  min={customStartDate}
                  className="w-full px-3 py-2 bg-brand-bg border border-white/10 rounded text-sm focus:outline-none focus:border-brand-green"
                />
              </div>
              <button
                onClick={handleCustomApply}
                disabled={!customStartDate || !customEndDate}
                className="w-full px-3 py-2 bg-brand-green text-brand-bg font-semibold rounded hover:bg-brand-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </Menu.Items>
    </Menu>
  );
}
