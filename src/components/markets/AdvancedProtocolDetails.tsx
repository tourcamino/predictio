import type { Market } from '~/data/mockMarkets';
import { SettlementTimelineSection } from '~/components/protocol/SettlementTimelineSection';
import { MarketOracleStatusPanel } from '~/components/markets/MarketOracleStatusPanel';
import { MarketClockPanel } from '~/components/protocol/MarketClockPanel';
import { MarketActivityStrip } from '~/components/protocol/MarketActivityStrip';
import { LiquidityProtocolExplainer } from '~/components/protocol/LiquidityProtocolExplainer';
import { ProtocolActivityTimeline } from '~/components/protocol/ProtocolActivityTimeline';
import { CollapsibleSection } from '~/components/markets/CollapsibleSection';
import { Settings2 } from 'lucide-react';

type Props = {
  marketId: string;
  market: Market;
  lastUpdatedAt?: Date;
};

/** Oracle / settlement / protocol — hidden by default (execution-first). */
export function AdvancedProtocolDetails({ marketId, market, lastUpdatedAt }: Props) {
  return (
    <CollapsibleSection
      title="Advanced protocol details"
      defaultOpen={false}
      icon={<Settings2 className="w-5 h-5 text-gray-500" />}
    >
      <div className="space-y-4 pt-2">
        <MarketOracleStatusPanel market={market} lastUpdatedAt={lastUpdatedAt} />
        <MarketClockPanel market={market} />
        <MarketActivityStrip market={market} lastUpdatedAt={lastUpdatedAt} />
        <LiquidityProtocolExplainer market={market} />
        <SettlementTimelineSection marketId={marketId} market={market} />
        <ProtocolActivityTimeline marketId={marketId} compact />
      </div>
    </CollapsibleSection>
  );
}
