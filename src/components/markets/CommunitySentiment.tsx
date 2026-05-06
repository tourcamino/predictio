import { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp } from 'lucide-react';
import { Market } from '~/data/mockMarkets';

interface CommunitySentimentProps {
  market: Market;
}

interface Comment {
  id: string;
  wallet: string;
  timestamp: string;
  text: string;
  likes: number;
}

export function CommunitySentiment({ market }: CommunitySentimentProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [pollResults, setPollResults] = useState({
    teamA: 42,
    draw: market.percentDraw ? 18 : 0,
    teamB: 40,
  });

  const storageKey = `poll-vote-${market.id}`;

  // Load vote from localStorage
  useEffect(() => {
    const savedVote = localStorage.getItem(storageKey);
    if (savedVote) {
      setHasVoted(true);
      setUserVote(savedVote);
    }
  }, [storageKey]);

  const handleVote = (outcome: string) => {
    setHasVoted(true);
    setUserVote(outcome);
    localStorage.setItem(storageKey, outcome);
    
    // Update poll results (mock)
    setPollResults((prev) => {
      const updated = { ...prev };
      if (outcome === 'teamA') updated.teamA += 1;
      else if (outcome === 'teamB') updated.teamB += 1;
      else if (outcome === 'draw') updated.draw += 1;
      
      const total = updated.teamA + updated.teamB + updated.draw;
      return {
        teamA: Math.round((updated.teamA / total) * 100),
        teamB: Math.round((updated.teamB / total) * 100),
        draw: Math.round((updated.draw / total) * 100),
      };
    });
  };

  const outcomes = [
    { id: 'teamA', label: market.teamA, percent: pollResults.teamA },
    ...(market.percentDraw
      ? [{ id: 'draw', label: 'Draw', percent: pollResults.draw }]
      : []),
    { id: 'teamB', label: market.teamB, percent: pollResults.teamB },
  ];

  const mockComments: Comment[] = [
    {
      id: '1',
      wallet: '0x4f2a...8c3d',
      timestamp: '1h ago',
      text: `${market.teamA} at home in a semifinal is almost unbeatable. Bernabéu crowd factor is real. Going heavy on ${market.teamA} Win.`,
      likes: 23,
    },
    {
      id: '2',
      wallet: '0x9b1c...2e7f',
      timestamp: '2h ago',
      text: `${market.teamB}'s form last 5 games: W W W D W. Don't sleep on them.`,
      likes: 18,
    },
    {
      id: '3',
      wallet: '0x7e3a...5d1b',
      timestamp: '3h ago',
      text: 'Classic El Clásico energy. Could easily go either way. Draw is undervalued at these odds.',
      likes: 12,
    },
    {
      id: '4',
      wallet: '0x2d8f...9a4c',
      timestamp: '4h ago',
      text: 'Historical data shows home advantage is worth about 8-10% in these matchups. Factor that in.',
      likes: 15,
    },
    {
      id: '5',
      wallet: '0x6c1b...3f7e',
      timestamp: '5h ago',
      text: 'Just placed 500 USDC on this. Let\'s see how it plays out! 🚀',
      likes: 9,
    },
  ];

  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg p-6">
      <h2 className="font-syne font-bold text-2xl mb-6">Community Sentiment</h2>

      {/* Poll Section */}
      <div className="mb-8">
        <h3 className="font-semibold text-lg mb-4">Who do you think will win?</h3>
        
        {!hasVoted ? (
          <div className="space-y-3">
            {outcomes.map((outcome) => (
              <button
                key={outcome.id}
                onClick={() => handleVote(outcome.id)}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green hover:bg-brand-green/5 transition-all text-left font-semibold"
              >
                {outcome.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {outcomes.map((outcome) => (
              <div key={outcome.id} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{outcome.label}</span>
                    {userVote === outcome.id && (
                      <span className="px-2 py-0.5 bg-brand-green text-brand-bg text-xs font-bold rounded">
                        YOUR VOTE
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold">{outcome.percent}%</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      userVote === outcome.id ? 'bg-brand-green' : 'bg-white/20'
                    } transition-all duration-500`}
                    style={{ width: `${outcome.percent}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500 mt-3">
              This is a non-binding community poll. Results don't affect the market.
            </p>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Discussion
        </h3>
        
        {/* Comment Input (placeholder) */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Share your analysis..."
              disabled
              className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              disabled
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-brand-green text-brand-bg text-sm font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Connect wallet to comment</p>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {mockComments.map((comment) => (
            <div key={comment.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-400">{comment.wallet}</span>
                  <span className="text-gray-600">·</span>
                  <span className="text-xs text-gray-500">{comment.timestamp}</span>
                </div>
                <button className="flex items-center gap-1 text-gray-400 hover:text-brand-green transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                  <span className="text-xs">{comment.likes}</span>
                </button>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{comment.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
