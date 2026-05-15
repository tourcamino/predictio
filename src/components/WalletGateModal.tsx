import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useWallet } from "~/store/useWalletStore";

interface WalletGateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Guest-mode gate modal: prompts the user to connect a wallet to unlock saving
 * & trading actions, while letting them keep browsing if they decline.
 */
export function WalletGateModal({ isOpen, onClose }: WalletGateModalProps) {
  const openWalletModal = useWallet().openWalletModal;

  const handleConnect = () => {
    onClose();
    openWalletModal();
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md rounded-xl border border-white/10 bg-brand-bg p-6 sm:p-8">
                <div className="text-center">
                  <Dialog.Title
                    as="h2"
                    className="font-syne mb-2 text-xl font-bold text-white"
                  >
                    Connect wallet
                  </Dialog.Title>

                  <p className="mb-6 text-sm text-gray-400 leading-relaxed">
                    Receive{' '}
                    <span className="font-mono text-white">1,000</span> paper USDC and trade
                    founder-curated sports markets. Your balance syncs to this address.
                  </p>

                  <ul className="mb-6 text-left text-sm text-gray-400 space-y-2 border border-white/10 rounded-lg px-4 py-3 bg-white/[0.02]">
                    <li>· Save predictions and portfolio history</li>
                    <li>· Pre-testnet — no on-chain stakes yet</li>
                  </ul>

                  <button
                    type="button"
                    onClick={handleConnect}
                    className="font-syne mb-3 w-full rounded-lg bg-brand-green py-3.5 text-base font-semibold text-brand-bg transition-colors hover:bg-brand-green/90"
                  >
                    Connect wallet
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2 text-sm text-gray-500 transition-colors hover:text-gray-300"
                  >
                    Continue as guest
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
