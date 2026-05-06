import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, FileText, Send, X } from 'lucide-react';
import { useTRPC } from '~/trpc/react';

interface AppealFormProps {
  marketId: string;
  marketName: string;
  walletAddress: string;
  onClose: () => void;
}

const appealSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  evidence: z.string().min(20, 'Please provide detailed evidence (at least 20 characters)'),
});

type AppealFormData = z.infer<typeof appealSchema>;

export function AppealForm({ marketId, marketName, walletAddress, onClose }: AppealFormProps) {
  const trpc = useTRPC();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AppealFormData>({
    resolver: zodResolver(appealSchema),
  });

  const submitAppealMutation = useMutation(
    trpc.submitAppeal.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        onClose();
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to submit appeal');
        setIsSubmitting(false);
      },
    })
  );

  const onSubmit = (data: AppealFormData) => {
    setIsSubmitting(true);
    submitAppealMutation.mutate({
      marketId,
      walletAddress,
      reason: data.reason,
      evidence: data.evidence,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-brand-bg border-2 border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-brand-bg border-b border-white/10 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 border border-yellow-500/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-xl">Submit Appeal</h2>
              <p className="text-sm text-gray-400">{marketName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300 leading-relaxed">
                <p className="font-semibold text-blue-500 mb-2">Appeal Guidelines</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Appeals must be submitted within 48 hours of market resolution</li>
                  <li>Provide clear evidence supporting your claim (official sources, screenshots, etc.)</li>
                  <li>Our team will review your appeal within 72 hours</li>
                  <li>If approved, the market will be re-resolved or voided with full refunds</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Reason Field */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium mb-2">
              Why do you believe this resolution is incorrect?
            </label>
            <textarea
              id="reason"
              {...register('reason')}
              rows={3}
              placeholder="e.g., The match was cancelled but the market resolved as if it was played..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none"
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-500">{errors.reason.message}</p>
            )}
          </div>

          {/* Evidence Field */}
          <div>
            <label htmlFor="evidence" className="block text-sm font-medium mb-2">
              Evidence (URLs, descriptions, official sources)
            </label>
            <textarea
              id="evidence"
              {...register('evidence')}
              rows={5}
              placeholder="Provide detailed evidence supporting your claim. Include:
- Links to official sources
- Screenshots or documentation
- Timestamps and specific details
- Any other relevant information"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none"
            />
            {errors.evidence && (
              <p className="mt-1 text-sm text-red-500">{errors.evidence.message}</p>
            )}
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="font-semibold text-yellow-500 mb-1">Important</p>
                <p>
                  Submitting false or frivolous appeals may result in restrictions on your account.
                  Only submit appeals if you have legitimate evidence that the resolution was incorrect.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 border border-white/10 font-semibold rounded-lg hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-bg border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Appeal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
