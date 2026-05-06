import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Header } from '~/components/Header';
import { Footer } from '~/components/Footer';
import { GLOSSARY_TERMS } from '~/components/education/GlossaryTooltip';
import { Search, ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/glossary/')({
  component: GlossaryPage,
});

function GlossaryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter and sort terms
  const terms = Object.entries(GLOSSARY_TERMS)
    .filter(([term, definition]) => {
      const query = searchQuery.toLowerCase();
      return (
        term.toLowerCase().includes(query) ||
        definition.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => a[0].localeCompare(b[0]));
  
  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />
      
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-brand-green transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-syne font-bold text-4xl md:text-5xl mb-4">
              Glossary
            </h1>
            <p className="text-gray-400 text-lg">
              Learn the basics of prediction markets and trading terminology
            </p>
          </div>
          
          {/* Search */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search terms..."
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Terms List */}
          {terms.length > 0 ? (
            <div className="space-y-6">
              {terms.map(([term, definition]) => (
                <div
                  key={term}
                  className="p-6 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green/30 transition-colors"
                >
                  <h3 className="font-syne text-xl font-bold text-brand-green mb-2">
                    {term}
                  </h3>
                  <p className="text-gray-300 leading-relaxed">{definition}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="font-syne text-xl font-bold mb-2">No terms found</h3>
              <p className="text-gray-400">
                Try searching for a different term
              </p>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
