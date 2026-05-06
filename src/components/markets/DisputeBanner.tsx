import { AlertTriangle, XCircle, ExternalLink } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface DisputeBannerProps {
  status: 'under_review' | 'voided';
  reason?: string;
  reviewSince?: string;
  voidedAt?: Date;
  refundAmount?: number;
}

export function DisputeBanner({
  status,
  reason,
  reviewSince,
  voidedAt,
  refundAmount,
}: DisputeBannerProps) {
  if (status === 'under_review') {
    return (
      <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-xl font-syne font-bold text-yellow-500 mb-3">
              ⚠ This market is under review
            </h3>
            <p className="text-gray-300 mb-4 leading-relaxed">
              The outcome is being verified by our resolution committee. Trading is paused.
              No action needed — your funds are safe.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
              <div>
                <span className="text-gray-400">Expected resolution:</span>
                <span className="ml-2 font-semibold text-white">within 24 hours</span>
              </div>
              {reason && (
                <div>
                  <span className="text-gray-400">Reason:</span>
                  <span className="ml-2 font-semibold text-white">{reason}</span>
                </div>
              )}
              {reviewSince && (
                <div>
                  <span className="text-gray-400">Under review for:</span>
                  <span className="ml-2 font-semibold text-white">{reviewSince}</span>
                </div>
              )}
            </div>
            <Link
              to="/resolution-policy"
              className="inline-flex items-center gap-2 text-sm text-yellow-500 hover:text-yellow-400 font-medium transition-colors"
            >
              Learn about our resolution process
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'voided') {
    return (
      <div className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-xl font-syne font-bold text-red-500 mb-3">
              ✕ This market has been voided
            </h3>
            <p className="text-gray-300 mb-4 leading-relaxed">
              All positions have been refunded in full to your wallet. No action needed.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
              {reason && (
                <div>
                  <span className="text-gray-400">Reason:</span>
                  <span className="ml-2 font-semibold text-white">{reason}</span>
                </div>
              )}
              {refundAmount && (
                <div>
                  <span className="text-gray-400">Refunded:</span>
                  <span className="ml-2 font-semibold text-white">
                    ${refundAmount.toFixed(2)} USDC
                  </span>
                </div>
              )}
              {voidedAt && (
                <div>
                  <span className="text-gray-400">Date:</span>
                  <span className="ml-2 font-semibold text-white">
                    {voidedAt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
            <Link
              to="/resolution-policy"
              className="inline-flex items-center gap-2 text-sm text-red-500 hover:text-red-400 font-medium transition-colors"
            >
              Learn about our resolution process
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
