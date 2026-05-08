import { createFileRoute } from '@tanstack/react-router';
import { Header } from '~/components/Header';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const Route = createFileRoute('/privacy/')({
  component: PrivacyPage,
});

const sections = [
  {
    title: '1. Information We Collect',
    content: 'Predictio is a non-custodial platform. We do not collect or store personal information. Your wallet address is visible on the blockchain but is not linked to your identity by us.',
  },
  {
    title: '2. Blockchain Data',
    content: 'All transactions on Predictio occur on public blockchains. This data is publicly accessible and permanent. We do not control or have the ability to delete blockchain data.',
  },
  {
    title: '3. Website Analytics',
    content: 'We may use privacy-respecting analytics to understand platform usage. This data is anonymized and does not identify individual users.',
  },
  {
    title: '4. Cookies',
    content: 'We use minimal cookies necessary for the platform to function, such as wallet connection state. We do not use tracking cookies.',
  },
  {
    title: '5. Third-Party Services',
    content: 'Predictio integrates with third-party services like wallet providers and blockchain infrastructure. These services have their own privacy policies.',
  },
  {
    title: '6. Data Security',
    content: 'We implement security measures to protect our systems. However, as a non-custodial platform, you are responsible for securing your own wallet and private keys.',
  },
  {
    title: '7. Your Rights',
    content: 'Because we do not collect personal data, there is no personal data for us to modify or delete. Your wallet and blockchain interactions are under your control.',
  },
  {
    title: '8. Changes to Privacy Policy',
    content: 'We may update this privacy policy. Continued use of the platform constitutes acceptance of any changes.',
  },
];

function PrivacyPage() {
  const [openSection, setOpenSection] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />
      
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="font-syne font-bold text-4xl mb-2">Privacy Policy</h1>
            <p className="text-sm text-gray-400 font-mono">
              Last updated: April 2025
            </p>
          </div>

          <div className="mb-8 p-6 bg-brand-cyan/10 border border-brand-cyan/30 rounded-lg">
            <p className="text-brand-cyan text-sm leading-relaxed">
              <strong>Privacy First:</strong> Predictio is built on decentralized infrastructure. 
              We do not collect, store, or have access to your personal information or funds.
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

