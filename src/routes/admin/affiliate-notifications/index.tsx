import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AdminTopBar } from '~/components/admin/AdminTopBar';
import { useTRPC } from '~/trpc/react';
import { Bell, Send, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/admin/affiliate-notifications/')({
  component: AffiliateNotificationsPage,
});

function AffiliateNotificationsPage() {
  const trpc = useTRPC();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const notifyMutation = useMutation(
    trpc.notifyAffiliatesCommissionUpdate.mutationOptions({
      onSuccess: (data) => {
        toast.success(
          `Successfully sent ${data.notificationsSent} notifications! (${data.duplicatesSkipped} skipped as duplicates)`
        );
        setShowConfirmation(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to send notifications');
      },
    })
  );

  const handleSendNotifications = () => {
    notifyMutation.mutate({});
  };

  return (
    <div className="min-h-screen">
      <AdminTopBar title="Affiliate Notifications" />

      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-syne font-bold mb-2">Commission Update Notifications</h1>
          <p className="text-gray-400">
            Send notifications to all existing affiliates about the improved commission rates
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-400 mb-2">What This Does</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Sends notifications to all registered analysts/affiliates</li>
                <li>• Informs them about increased commission rates (30-50%)</li>
                <li>• Provides tier-specific information about their rate increase</li>
                <li>• Automatically prevents duplicate notifications (checks last 30 days)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Commission Changes Summary */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4">Commission Rate Changes</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { tier: 'Bronze', old: 15, new: 30, color: 'text-orange-400' },
              { tier: 'Silver', old: 20, new: 35, color: 'text-gray-400' },
              { tier: 'Gold', old: 25, new: 40, color: 'text-yellow-400' },
              { tier: 'Elite', old: 30, new: 50, color: 'text-brand-green' },
            ].map((tier) => (
              <div key={tier.tier} className="bg-white/5 rounded-lg p-4">
                <div className={`font-semibold ${tier.color} mb-2`}>{tier.tier} Tier</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">{tier.old}%</span>
                  <span className="text-gray-500">→</span>
                  <span className="font-bold text-brand-green">{tier.new}%</span>
                  <span className="text-xs text-gray-500">
                    (+{tier.new - tier.old}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview Card */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4">Notification Preview</h3>
          <div className="bg-brand-green/10 border border-brand-green/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <h4 className="font-semibold mb-1">Commission Rates Increased!</h4>
                <p className="text-sm text-gray-300">
                  Great news! Your [tier] tier commission rate has increased from [old]% to [new]%. 
                  Start earning more from your referrals today!
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Note: The actual notification will be customized based on each analyst's tier
          </p>
        </div>

        {/* Action Section */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          {!showConfirmation ? (
            <div>
              <h3 className="font-semibold mb-4">Send Notifications</h3>
              <p className="text-sm text-gray-400 mb-4">
                Click the button below to send commission update notifications to all registered affiliates.
                The system will automatically skip any affiliates who have already received this notification
                in the last 30 days.
              </p>
              <button
                onClick={() => setShowConfirmation(true)}
                className="px-6 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors flex items-center gap-2"
              >
                <Bell className="w-5 h-5" />
                Send Notifications to All Affiliates
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-start gap-3 mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-500 mb-1">Confirm Action</h4>
                  <p className="text-sm text-gray-300">
                    This will send notifications to all registered affiliates. Are you sure you want to proceed?
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSendNotifications}
                  disabled={notifyMutation.isPending}
                  className="px-6 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {notifyMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-brand-bg border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Yes, Send Notifications
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowConfirmation(false)}
                  disabled={notifyMutation.isPending}
                  className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {notifyMutation.isSuccess && notifyMutation.data && (
          <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-500 mb-2">Notifications Sent Successfully</h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <div>Total affiliates: {notifyMutation.data.totalAnalysts}</div>
                  <div>Notifications sent: {notifyMutation.data.notificationsSent}</div>
                  <div>Duplicates skipped: {notifyMutation.data.duplicatesSkipped}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
