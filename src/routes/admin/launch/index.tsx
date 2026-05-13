import { createFileRoute } from '@tanstack/react-router';
import { AdminTopBar } from '~/components/admin/AdminTopBar';
import { useState, useEffect } from 'react';
import { Check, Square } from 'lucide-react';

export const Route = createFileRoute('/admin/launch/')({
  component: LaunchChecklist,
});

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface ChecklistSection {
  title: string;
  emoji: string;
  items: ChecklistItem[];
}

const INITIAL_CHECKLIST: ChecklistSection[] = [
  {
    title: 'DOMINIO',
    emoji: '🌐',
    items: [
      { id: 'domain-purchased', label: 'predictio.live acquistato', checked: true },
      { id: 'dns-a-record', label: 'DNS record A → IP VPS Hostinger', checked: false },
      { id: 'dns-propagated', label: 'DNS propagato (ping predictio.live risponde)', checked: false },
      { id: 'ssl-certbot', label: 'SSL Certbot: predictio.live + www + api', checked: false },
      { id: 'frontend-loads', label: 'https://predictio.live carica il frontend', checked: false },
      { id: 'api-health', label: 'https://api.predictio.live/health risponde OK', checked: false },
      { id: 'ws-connects', label: 'wss://api.predictio.live/ws connette', checked: false },
    ],
  },
  {
    title: 'VPS HOSTINGER',
    emoji: '🖥️',
    items: [
      { id: 'vps-purchased', label: 'Piano KVM2 acquistato (€8-12/mese)', checked: false },
      { id: 'setup-script', label: 'setup-vps.sh eseguito come root', checked: false },
      { id: 'env-configured', label: '.env compilato con tutti i valori reali', checked: false },
      { id: 'deploy-success', label: 'deploy.sh eseguito con successo', checked: false },
      { id: 'containers-running', label: 'Tutti i container Docker running', checked: false },
      { id: 'migrations-complete', label: 'PostgreSQL migrations completate', checked: false },
    ],
  },
  {
    title: 'FRONTEND VERCEL',
    emoji: '▲',
    items: [
      { id: 'github-repo', label: 'Repository GitHub creato e pushato', checked: false },
      { id: 'vercel-imported', label: 'Progetto importato su Vercel', checked: false },
      { id: 'vercel-env', label: 'Env vars aggiunte (VITE_API_URL, VITE_WS_URL)', checked: false },
      { id: 'custom-domain', label: 'Dominio custom predictio.live aggiunto su Vercel', checked: false },
      { id: 'auto-deploy', label: 'Deploy automatico su git push attivo', checked: false },
    ],
  },
  {
    title: 'BOT',
    emoji: '🤖',
    items: [
      { id: 'mm-running', label: 'Market Maker bot running e loggante', checked: false },
      { id: 'ge-cycle', label: 'Growth Engine primo ciclo completato', checked: false },
      { id: 'mock-markets', label: 'Almeno 5 mercati mock live', checked: false },
      { id: 'openrouter-active', label: 'OpenRouter key attiva e testata', checked: false },
    ],
  },
  {
    title: 'AZURO PROTOCOL',
    emoji: '⚡',
    items: [
      { id: 'azuro-registered', label: 'Registrazione Frontend Operator su gem.azuro.org', checked: false },
      { id: 'azuro-key', label: 'AZURO_API_KEY inserita nel .env VPS', checked: false },
      { id: 'graphql-test', label: 'Test GraphQL query mercati reali', checked: false },
      { id: 'first-real-market', label: 'Primo mercato reale live su predictio.live', checked: false },
    ],
  },
  {
    title: 'SOCIAL',
    emoji: '📱',
    items: [
      { id: 'x-account', label: 'Account X creato', checked: false },
      { id: 'telegram-channel', label: 'Canale Telegram @predictio creato', checked: false },
      { id: 'discord-server', label: 'Discord server creato', checked: false },
      { id: 'x-api-keys', label: 'X API keys inserite nel .env', checked: false },
      { id: 'telegram-token', label: 'TELEGRAM_BOT_TOKEN inserito nel .env', checked: false },
      { id: 'first-post', label: 'Primo post pubblicato', checked: false },
    ],
  },
  {
    title: 'LEGALE',
    emoji: '⚖️',
    items: [
      { id: 'legal-consult', label: 'Consulenza legale crypto completata', checked: false },
      { id: 'terms-published', label: 'Terms of Service su predictio.live/terms', checked: false },
      { id: 'privacy-published', label: 'Privacy Policy su predictio.live/privacy', checked: false },
      { id: 'risk-disclosure', label: 'Risk Disclosure pubblicato', checked: false },
    ],
  },
];

function LaunchChecklist() {
  const [checklist, setChecklist] = useState<ChecklistSection[]>(() => {
    const saved = localStorage.getItem('predictio-launch-checklist');
    return saved ? JSON.parse(saved) : INITIAL_CHECKLIST;
  });

  const [showConfetti, setShowConfetti] = useState(false);

  const totalItems = checklist.reduce((sum, section) => sum + section.items.length, 0);
  const completedItems = checklist.reduce(
    (sum, section) => sum + section.items.filter((item) => item.checked).length,
    0
  );
  const progress = Math.round((completedItems / totalItems) * 100);

  useEffect(() => {
    localStorage.setItem('predictio-launch-checklist', JSON.stringify(checklist));

    if (progress === 100 && !showConfetti) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [checklist, progress, showConfetti]);

  const toggleItem = (sectionIndex: number, itemId: string) => {
    setChecklist((prev) => {
      const newChecklist = [...prev];
      const section = newChecklist[sectionIndex];
      if (!section) return newChecklist;
      const item = section.items.find((i) => i.id === itemId);
      if (item) {
        item.checked = !item.checked;
      }
      return newChecklist;
    });
  };

  const resetChecklist = () => {
    if (confirm('Reset checklist to default? This cannot be undone.')) {
      setChecklist(INITIAL_CHECKLIST);
    }
  };

  return (
    <div className="min-h-screen">
      <AdminTopBar title="Launch Checklist" breadcrumbs={['Admin']} />

      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10%',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ['#00FF87', '#00D4FF', '#FF6B35', '#FFE135', '#FF35D4'][
                    Math.floor(Math.random() * 5)
                  ],
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-syne font-bold">🚀 PREDICTIO LAUNCH CHECKLIST</h1>
          <p className="text-gray-400 font-mono">
            Complete all items to go live with predictio.live
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-syne font-bold text-xl">
              Progress: {completedItems}/{totalItems}
            </span>
            <span className="font-mono text-2xl font-bold text-brand-green">{progress}%</span>
          </div>

          <div className="h-4 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-green to-cyan-400 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {progress === 100 && (
            <div className="text-center py-4 animate-pulse">
              <div className="text-4xl mb-2">🎉</div>
              <div className="text-2xl font-syne font-bold text-brand-green">
                Predictio is live!
              </div>
            </div>
          )}
        </div>

        {/* Checklist Sections */}
        <div className="space-y-6">
          {checklist.map((section, sectionIndex) => (
            <div
              key={section.title}
              className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{section.emoji}</span>
                <h2 className="text-xl font-syne font-bold">{section.title}</h2>
                <span className="ml-auto text-sm text-gray-500 font-mono">
                  {section.items.filter((i) => i.checked).length}/{section.items.length}
                </span>
              </div>

              <div className="space-y-2">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(sectionIndex, item.id)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg transition-all
                      ${
                        item.checked
                          ? 'bg-brand-green/10 border border-brand-green/30'
                          : 'bg-white/5 border border-white/10 hover:border-white/30'
                      }
                    `}
                  >
                    <div
                      className={`
                      flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors
                      ${
                        item.checked
                          ? 'bg-brand-green text-black'
                          : 'bg-white/10 text-transparent'
                      }
                    `}
                    >
                      {item.checked ? <Check size={14} /> : <Square size={14} />}
                    </div>
                    <span
                      className={`
                      text-left font-mono text-sm transition-colors
                      ${item.checked ? 'text-brand-green line-through' : 'text-gray-300'}
                    `}
                    >
                      {item.checked && '✅ '}
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Reset Button */}
        <div className="flex justify-center pt-6">
          <button
            onClick={resetChecklist}
            className="px-6 py-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-500 hover:bg-red-500/30 transition-colors font-medium"
          >
            Reset Checklist
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}
