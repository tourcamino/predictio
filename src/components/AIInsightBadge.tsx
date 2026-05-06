import { useState, useEffect } from 'react';

interface AIInsight {
  text: string;
}

const footballInsights: AIInsight[] = [
  { text: 'Sharp money moved to Draw in the last 2h. Volume pattern suggests informed traders know something about lineup.' },
  { text: 'Home advantage historically yields 67% win rate in this matchup. Current odds undervalue home team.' },
  { text: 'Weather conditions favor defensive play. Over/Under market showing unusual activity.' },
];

const basketballInsights: AIInsight[] = [
  { text: 'Key player injury news leaked 15min ago. Smart money already repositioning on away team.' },
  { text: 'Historical H2H data shows 73% away wins when home team on back-to-back. Market hasn\'t adjusted.' },
  { text: 'Vegas line moved 2.5 points in last hour. Professional bettors loading up on underdog.' },
];

const mmaInsights: AIInsight[] = [
  { text: 'Fighter weigh-in data suggests weight cut issues. Late money flooding opposite side.' },
  { text: 'Betting pattern matches previous upset. Volume surge on underdog past 3 hours.' },
  { text: 'Historical finish rate 89% in this style matchup. Current odds don\'t reflect knockout probability.' },
];

const cricketInsights: AIInsight[] = [
  { text: 'Pitch report indicates spin-friendly conditions. Market undervaluing team with stronger spin attack.' },
  { text: 'Weather forecast changed. Rain probability now 60%. Draw odds represent value opportunity.' },
  { text: 'Team selection leaked early. Key all-rounder out. Market hasn\'t fully adjusted yet.' },
];

const defaultInsights: AIInsight[] = [
  { text: 'Volume pattern suggests institutional money entering this market. Price discovery in progress.' },
  { text: 'Historical accuracy of this market type: 68%. Current odds align with statistical model.' },
  { text: 'Recent news sentiment shifted positive. Smart money following the narrative.' },
];

const insightsBySport: Record<string, AIInsight[]> = {
  football: footballInsights,
  basketball: basketballInsights,
  mma: mmaInsights,
  cricket: cricketInsights,
};

interface AIInsightBadgeProps {
  sport: string;
  compact?: boolean;
}

export function AIInsightBadge({ sport, compact = false }: AIInsightBadgeProps) {
  const insights = insightsBySport[sport] || defaultInsights;
  const [currentInsight, setCurrentInsight] = useState(insights[0]);

  useEffect(() => {
    // Rotate through insights every 15 seconds
    const interval = setInterval(() => {
      setCurrentInsight(insights[Math.floor(Math.random() * insights.length)]);
    }, 15000);

    return () => clearInterval(interval);
  }, [insights]);

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-cyan/10 border border-brand-cyan/30 rounded text-xs">
        <span className="text-brand-cyan">🤖</span>
        <span className="text-brand-cyan font-semibold">AI INSIGHT</span>
      </div>
    );
  }

  return (
    <div className="bg-brand-cyan/5 border border-brand-cyan/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-brand-cyan text-lg">🤖</span>
        <span className="text-brand-cyan font-semibold text-sm">AI INSIGHT</span>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed">
        "{currentInsight.text}"
      </p>
    </div>
  );
}
