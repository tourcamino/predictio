import { createFileRoute } from "@tanstack/react-router";
import { Header } from "~/components/Header";
import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { mockAnalysts } from "~/data/mockAffiliates";
import { AnalystCard } from "~/components/affiliate/AnalystCard";

export const Route = createFileRoute("/analysts/")({
  component: AnalystsPage,
});

function AnalystsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sportFilter, setSportFilter] = useState("all");

  const filteredAnalysts = mockAnalysts.filter((analyst) => {
    const matchesSearch =
      searchQuery === "" ||
      analyst.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      analyst.bio.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSport =
      sportFilter === "all" || analyst.sport.includes(sportFilter);
    return matchesSearch && matchesSport;
  });

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />

      <div className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-syne font-bold text-4xl md:text-5xl mb-4">
              Verified Analysts
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Follow top sports analysts and copy their predictions. All analysts are
              verified and earn based on performance.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search analysts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:outline-none"
              />
            </div>

            {/* Sport Filter */}
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:outline-none"
            >
              <option value="all">All Sports</option>
              <option value="Soccer">⚽ Soccer</option>
              <option value="MMA">🥊 MMA</option>
              <option value="Cricket">🏏 Cricket</option>
              <option value="Basketball">🏀 Basketball</option>
              <option value="Tennis">🎾 Tennis</option>
            </select>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Analysts</div>
              <div className="font-mono font-bold text-2xl">{mockAnalysts.length}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Volume</div>
              <div className="font-mono font-bold text-2xl text-brand-green">
                $
                {(
                  mockAnalysts.reduce((sum, a) => sum + a.volumeGenerated, 0) / 1000
                ).toFixed(0)}
                K
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Avg Win Rate</div>
              <div className="font-mono font-bold text-2xl text-brand-cyan">
                {(
                  mockAnalysts.reduce((sum, a) => sum + a.winRate, 0) /
                  mockAnalysts.length
                ).toFixed(1)}
                %
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Followers</div>
              <div className="font-mono font-bold text-2xl">
                {mockAnalysts.reduce((sum, a) => sum + a.followersCount, 0)}
              </div>
            </div>
          </div>

          {/* Analysts Grid */}
          {filteredAnalysts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {filteredAnalysts.map((analyst) => (
                <AnalystCard key={analyst.id} analyst={analyst} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg mb-4">No analysts found</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSportFilter("all");
                }}
                className="px-6 py-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* CTA Banner */}
          <div className="bg-gradient-to-r from-brand-green/10 to-brand-cyan/10 border border-brand-green/30 rounded-lg p-8 text-center">
            <h3 className="font-syne font-bold text-2xl mb-3">
              🚀 Want to appear here?
            </h3>
            <p className="text-gray-400 mb-6">
              Apply as an Analyst and start earning USDC from your sports knowledge.
            </p>
            <a
              href="/affiliates"
              className="inline-block px-8 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
            >
              Join the Analyst Program →
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}

