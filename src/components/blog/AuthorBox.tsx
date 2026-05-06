import { User, X, Globe } from 'lucide-react';

interface AuthorBoxProps {
  name?: string;
  bio?: string;
  avatar?: string;
  twitter?: string;
  website?: string;
}

export function AuthorBox({
  name = "Predictio Analyst",
  bio = "Expert sports analyst and prediction markets trader. Providing data-driven insights on sports events, DeFi protocols, and market trends.",
  avatar,
  twitter = "predictio_live",
  website = "https://predictio.live",
}: AuthorBoxProps) {
  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatar ? (
            <img
              src={avatar}
              alt={`${name} avatar`}
              className="w-16 h-16 rounded-full border-2 border-brand-green/30"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-green/20 to-emerald-500/20 border-2 border-brand-green/30 flex items-center justify-center">
              <User className="w-8 h-8 text-brand-green" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h3 className="text-lg font-syne font-bold text-white mb-1">
                {name}
              </h3>
              <p className="text-sm text-gray-400">
                Author
              </p>
            </div>
            
            {/* Social Links */}
            <div className="flex items-center gap-2">
              {twitter && (
                <a
                  href={`https://twitter.com/${twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-brand-green hover:border-brand-green/30 transition-all"
                  aria-label="X (Twitter)"
                >
                  <X size={16} />
                </a>
              )}
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-brand-green hover:border-brand-green/30 transition-all"
                  aria-label="Website"
                >
                  <Globe size={16} />
                </a>
              )}
            </div>
          </div>

          {/* Bio */}
          <p className="text-gray-300 text-sm leading-relaxed">
            {bio}
          </p>
        </div>
      </div>
    </div>
  );
}
