import { createFileRoute, Link } from '@tanstack/react-router';
import { useWallet } from '~/store/useWalletStore';
import { Wallet, CreditCard, ArrowRightLeft, QrCode, Copy, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { CHAIN_CONFIG } from '~/config/chain';
import toast from 'react-hot-toast';
import { useWalletGate } from '~/hooks/useWalletGate';
import { WalletGateModal } from '~/components/WalletGateModal';
import { GuestPageState } from '~/components/GuestPageState';

export const Route = createFileRoute('/wallet/deposit/')({
  component: DepositPage,
});

type DepositMethod = 'select' | 'direct' | 'moonpay' | 'bridge';

function DepositPage() {
  const { requireWallet, showGateModal, closeGateModal } = useWalletGate();
  const { isConnected, address, updateBalance, balance, addTransaction } = useWallet();
  const [selectedMethod, setSelectedMethod] = useState<DepositMethod>('select');
  const [copied, setCopied] = useState(false);
  const [bridgeAmount, setBridgeAmount] = useState('');
  const [sourceChain, setSourceChain] = useState('ethereum');
  const [moonpayAmount, setMoonpayAmount] = useState('');

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMoonpayPurchase = async () => {
    const amount = parseFloat(moonpayAmount);
    if (!amount || amount < CHAIN_CONFIG.deposit.moonpayMinAmount || amount > CHAIN_CONFIG.deposit.moonpayMaxAmount) {
      toast.error(`Amount must be between $${CHAIN_CONFIG.deposit.moonpayMinAmount} and $${CHAIN_CONFIG.deposit.moonpayMaxAmount}`);
      return;
    }

    // Mock Moonpay flow
    toast.loading('Redirecting to Moonpay...', { duration: 2000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.loading('Processing payment...', { duration: 3000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Update balance
    const fee = amount * 0.03; // 3% Moonpay fee
    const netAmount = amount - fee;
    updateBalance(balance + netAmount);
    
    addTransaction({
      type: 'deposit',
      status: 'confirmed',
      amountUsdc: netAmount,
      description: 'From Moonpay',
      feePaid: fee,
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    });
    
    toast.success(`✓ Deposited $${netAmount.toFixed(2)} USDC!`);
    setMoonpayAmount('');
  };

  const handleBridge = async () => {
    const amount = parseFloat(bridgeAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Mock bridge flow
    toast.loading('Locking on source chain...', { duration: 3000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    toast.loading('Relaying to Predictio...', { duration: 5000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    toast.loading('Crediting your balance...', { duration: 2000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update balance (with fee)
    const fee = 2.5; // Fixed bridge fee
    const netAmount = amount - fee;
    updateBalance(balance + netAmount);
    
    addTransaction({
      type: 'deposit',
      status: 'confirmed',
      amountUsdc: netAmount,
      description: `Bridged from ${sourceChain}`,
      feePaid: fee,
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    });
    
    toast.success(`✓ Bridged $${netAmount.toFixed(2)} USDC!`);
    setBridgeAmount('');
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="font-syne font-bold text-4xl">Deposit USDC</h1>
              <Link
                to="/wallet"
                className="text-sm text-brand-green hover:text-brand-green/80 transition-colors"
              >
                ← Back to Wallet
              </Link>
            </div>
            <p className="text-gray-400">Choose how you'd like to add funds</p>
          </div>

          {!isConnected ? (
            <GuestPageState onConnect={() => requireWallet()} />
          ) : (
          <>
          {/* Method Selection */}
          {selectedMethod === 'select' && (
            <div className="space-y-4">
              {/* Buy with Card */}
              <button
                onClick={() => setSelectedMethod('moonpay')}
                disabled={!CHAIN_CONFIG.deposit.moonpayEnabled}
                className="w-full p-6 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-green/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-6 h-6 text-brand-green" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-syne font-bold text-lg mb-1">Buy with card</h3>
                    <p className="text-sm text-gray-400 mb-2">
                      Purchase USDC directly with credit/debit card
                    </p>
                    <div className="text-xs text-gray-500">
                      Powered by Moonpay · ~3% fee
                    </div>
                  </div>
                  <div className="text-brand-green">→</div>
                </div>
              </button>

              {/* Direct Transfer */}
              <button
                onClick={() => setSelectedMethod('direct')}
                className="w-full p-6 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green/50 transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <QrCode className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-syne font-bold text-lg mb-1">Transfer from another wallet</h3>
                    <p className="text-sm text-gray-400 mb-2">
                      Already have USDC on BASE? Send it to your wallet.
                    </p>
                    <div className="text-xs text-gray-500">
                      Free · Requires gas on sending chain
                    </div>
                  </div>
                  <div className="text-brand-green">→</div>
                </div>
              </button>

              {/* Bridge */}
              <button
                onClick={() => setSelectedMethod('bridge')}
                disabled={!CHAIN_CONFIG.deposit.bridgeEnabled}
                className="w-full p-6 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ArrowRightLeft className="w-6 h-6 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-syne font-bold text-lg mb-1">Bridge from another chain</h3>
                    <p className="text-sm text-gray-400 mb-2">
                      Move USDC from Ethereum, Polygon, Arbitrum, etc. to BASE.
                    </p>
                    <div className="text-xs text-gray-500">
                      Powered by Across · ~$2-5 fee
                    </div>
                  </div>
                  <div className="text-brand-green">→</div>
                </div>
              </button>
            </div>
          )}

          {/* Direct Transfer Flow */}
          {selectedMethod === 'direct' && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <button
                onClick={() => setSelectedMethod('select')}
                className="text-sm text-gray-400 hover:text-white mb-6"
              >
                ← Back
              </button>

              <h2 className="font-syne font-bold text-2xl mb-6">Receive USDC</h2>

              <div className="mb-6 p-6 bg-white/10 rounded-lg text-center">
                <div className="w-48 h-48 mx-auto mb-4 bg-white p-4 rounded-lg">
                  {/* QR Code placeholder */}
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    QR Code
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-2">Your address:</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-sm">{address}</span>
                    <button
                      onClick={handleCopyAddress}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-brand-green" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-sm space-y-1">
                  <div className="text-gray-400">Network: <span className="text-white">{CHAIN_CONFIG.chainName || 'TBD'}</span></div>
                  <div className="text-gray-400">Token: <span className="text-white">USDC</span></div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-500">
                  <div className="font-semibold mb-1">Important</div>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Only send USDC on BASE</li>
                    <li>Sending other tokens or wrong network = loss</li>
                    <li>Confirmations typically take ~15 seconds</li>
                  </ul>
                </div>
              </div>

              <div className="text-center text-sm text-gray-400">
                Waiting for incoming transfer...
              </div>
            </div>
          )}

          {/* Moonpay Flow */}
          {selectedMethod === 'moonpay' && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <button
                onClick={() => setSelectedMethod('select')}
                className="text-sm text-gray-400 hover:text-white mb-6"
              >
                ← Back
              </button>

              <h2 className="font-syne font-bold text-2xl mb-6">Buy USDC with card</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Amount (USD)</label>
                <input
                  type="number"
                  value={moonpayAmount}
                  onChange={(e) => setMoonpayAmount(e.target.value)}
                  placeholder="100"
                  min={CHAIN_CONFIG.deposit.moonpayMinAmount}
                  max={CHAIN_CONFIG.deposit.moonpayMaxAmount}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-lg font-mono"
                />
                <div className="text-xs text-gray-400 mt-1">
                  Min: ${CHAIN_CONFIG.deposit.moonpayMinAmount} · Max: ${CHAIN_CONFIG.deposit.moonpayMaxAmount.toLocaleString()}
                </div>
              </div>

              {parseFloat(moonpayAmount) > 0 && (
                <div className="mb-6 p-4 bg-white/10 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="font-mono">${parseFloat(moonpayAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Moonpay fee (3%):</span>
                    <span className="font-mono">${(parseFloat(moonpayAmount) * 0.03).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="font-semibold">You will receive:</span>
                    <span className="font-mono font-bold text-brand-green">
                      ${(parseFloat(moonpayAmount) * 0.97).toFixed(2)} USDC
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleMoonpayPurchase}
                disabled={!moonpayAmount || parseFloat(moonpayAmount) < CHAIN_CONFIG.deposit.moonpayMinAmount}
                className="w-full py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Moonpay
              </button>

              <div className="mt-4 text-xs text-center text-gray-500">
                Moonpay is a third-party service. Predictio does not process payments directly.
              </div>
            </div>
          )}

          {/* Bridge Flow */}
          {selectedMethod === 'bridge' && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <button
                onClick={() => setSelectedMethod('select')}
                className="text-sm text-gray-400 hover:text-white mb-6"
              >
                ← Back
              </button>

              <h2 className="font-syne font-bold text-2xl mb-6">Bridge USDC</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">From</label>
                <select
                  value={sourceChain}
                  onChange={(e) => setSourceChain(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                >
                  <option value="ethereum">Ethereum</option>
                  <option value="polygon">Polygon</option>
                  <option value="arbitrum">Arbitrum</option>
                  <option value="optimism">Optimism</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Amount</label>
                <input
                  type="number"
                  value={bridgeAmount}
                  onChange={(e) => setBridgeAmount(e.target.value)}
                  placeholder="200.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-lg font-mono"
                />
              </div>

              {parseFloat(bridgeAmount) > 0 && (
                <div className="mb-6 p-4 bg-white/10 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bridge fee:</span>
                    <span className="font-mono">$2.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Source gas:</span>
                    <span className="font-mono">~$0.40 (ETH)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Estimated time:</span>
                    <span>~1-2 minutes</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="font-semibold">You will receive:</span>
                    <span className="font-mono font-bold text-brand-green">
                      ${(parseFloat(bridgeAmount) - 2.5).toFixed(2)} USDC
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleBridge}
                disabled={!bridgeAmount || parseFloat(bridgeAmount) <= 2.5}
                className="w-full py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bridge {bridgeAmount} USDC →
              </button>

              <div className="mt-4 text-xs text-center text-gray-500">
                Powered by Across · Non-custodial · Audited
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>
      <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />
    </div>
  );
}

