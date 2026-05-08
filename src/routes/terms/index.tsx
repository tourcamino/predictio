import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const Route = createFileRoute('/terms/')({
  component: TermsPage,
});

const sections = [
  {
    title: '1. Acceptance of Terms',
    content: 'By accessing and using Predictio, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the platform.',
  },
  {
    title: '2. Eligibility',
    content: 'You must be at least 18 years old to use Predictio. By using this platform, you represent that you meet this age requirement and that your use complies with all applicable laws in your jurisdiction.',
  },
  {
    title: '3. Non-Custodial Service',
    content: 'Predictio is a non-custodial platform. We never hold, control, or have access to your funds. All transactions occur directly between your wallet and smart contracts on the blockchain.',
  },
  {
    title: '4. Prediction Markets',
    content: 'Prediction markets on Predictio are peer-to-peer. Outcomes are determined by decentralized oracle systems. We do not control market outcomes or resolutions.',
  },
  {
    title: '5. Risks',
    content: 'Participating in prediction markets involves financial risk. You may lose all funds you commit to predictions. Smart contracts, while audited, may contain vulnerabilities. Blockchain transactions are irreversible.',
  },
  {
    title: '6. Prohibited Jurisdictions',
    content: 'Predictio may not be available in all jurisdictions. It is your responsibility to ensure that your use of the platform complies with local laws and regulations.',
  },
  {
    title: '7. No Warranty',
    content: 'Predictio is provided "as is" without warranties of any kind. We do not guarantee uninterrupted access, accuracy of information, or specific outcomes.',
  },
  {
    title: '8. Limitation of Liability',
    content: 'To the maximum extent permitted by law, Predictio and its operators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.',
  },
  {
    title: '9. Changes to Terms',
    content: 'We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the modified terms.',
  },
  {
    title: '10. Contact',
    content: 'For questions about these terms, please contact us through our official communication channels.',
  },
];

function TermsPage() {
  const [openSection, setOpenSection] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="font-syne font-bold text-4xl mb-2">Terms of Service</h1>
            <p className="text-sm text-gray-400 font-mono">
              Last updated: April 2025
            </p>
          </div>

          <div className="mb-8 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-500 text-sm leading-relaxed">
              <strong>Important:</strong> Predictio is a decentralized prediction market platform. 
              Participation involves financial risk. Please read these terms carefully before using the platform.
            </p>
          </div>

          <div className="space-y-3">
            {sections.map((section, index) => (
              <div
                key={index}
                className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setOpenSection(openSection === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <span className="font-semibold text-left">{section.title}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      openSection === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openSection === index && (
                  <div className="px-6 py-4 border-t border-white/10">
                    <p className="text-gray-300 leading-relaxed">{section.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}

