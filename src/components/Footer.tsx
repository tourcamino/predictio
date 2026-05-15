import { Globe, Send, MessageCircle, ExternalLink } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useTopChromeManaged } from '~/components/TopChromeContext';
import { footerTagline } from '~/copy/homePremium';

export function Footer() {
  const isManaged = useTopChromeManaged();
  if (isManaged) return null;
  return <FooterInner />;
}

export function FooterInner() {
  return (
    <footer className="bg-brand-bg border-t border-brand-green/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-12 mb-12">
          {/* Logo & Tagline */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-brand-green rounded-full"></div>
              <span className="text-xl font-syne font-bold">PREDICTIO</span>
            </div>
            <p className="text-gray-400 text-sm">{footerTagline}</p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-syne font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/markets"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Markets
                </Link>
              </li>
              <li>
                <Link
                  to="/copy"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Copy Trading
                </Link>
              </li>
              <li>
                <Link
                  to="/trading"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Trading
                </Link>
              </li>
              <li>
                <Link
                  to="/liquidity"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Liquidity
                </Link>
              </li>
              <li>
                <Link
                  to="/leaderboard"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link
                  to="/affiliates"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Analyst Program
                </Link>
              </li>
              <li>
                <Link
                  to="/glossary"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Learn the basics
                </Link>
              </li>
              <li>
                <Link
                  to="/"
                  hash="how-it-works"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-syne font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/about"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  to="/careers"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Program Links */}
          <div>
            <h4 className="font-syne font-semibold text-sm mb-4">Program</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/affiliates"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Become an Analyst
                </Link>
              </li>
              <li>
                <Link
                  to="/analysts"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Top Analysts
                </Link>
              </li>
              <li>
                <a
                  href="/leaderboard#analysts"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Analyst Leaderboard
                </a>
              </li>
              <li>
                <Link
                  to="/developers"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Developers
                </Link>
              </li>
            </ul>
          </div>

          {/* Developers Links */}
          <div>
            <h4 className="font-syne font-semibold text-sm mb-4">Developers</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/developers"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  API Overview
                </Link>
              </li>
              <li>
                <Link
                  to="/developers/docs"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  to="/developers/keys"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  API Keys
                </Link>
              </li>
              <li>
                <Link
                  to="/developers/leaderboard"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Dev Leaderboard
                </Link>
              </li>
              <li>
                <Link
                  to="/developers/changelog"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-syne font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  to="/risk-disclosure"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Risk Disclosure
                </Link>
              </li>
              <li>
                <Link
                  to="/resolution-policy"
                  className="text-sm text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
                >
                  Resolution Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Copyright */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <p className="text-xs text-gray-500 text-center md:text-left">
              © 2026 Predictio. Prediction markets involve risk. Not available
              where prohibited.
            </p>
            <a
              href="/admin"
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors cursor-pointer"
            >
              Admin Access
            </a>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
            >
              <Globe size={20} />
            </a>
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
            >
              <Send size={20} />
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
            >
              <MessageCircle size={20} />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-brand-green transition-colors cursor-pointer"
            >
              <ExternalLink size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
