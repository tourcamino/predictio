import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useWallet } from "~/store/useWalletStore";

interface WalletGateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BENEFITS: ReadonlyArray<readonly [string, string]> = [
  ["💰", "1,000 paper USDC demo balance — free"],
  ["📊", "Save your predictions & history"],
  ["🔁", "Copy top traders automatically"],
  ["💎", "Earn analyst rewards lifetime"],
  ["🔗", "Your personal referral link"],
] as const;

/**
 * Guest-mode gate modal: prompts the user to connect a wallet to unlock saving
 * & trading actions, while letting them keep browsing if they decline.
 *
 * The "Connect Wallet" CTA delegates to the existing wallet picker
 * (`openWalletModal()` from `useWalletStore`), so this modal does not duplicate
 * any wallet connection logic.
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
          <div
            className="fixed inset-0"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
          />
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
              <Dialog.Panel
                className="w-full max-w-md rounded-2xl border border-[#1a2332] p-8 shadow-2xl"
                style={{ backgroundColor: "#0D1117" }}
              >
                <div className="text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#00FF87]/10">
                    <span className="text-3xl" aria-hidden="true">
                      🔐
                    </span>
                  </div>

                  <Dialog.Title
                    as="h2"
                    className="font-syne mb-2 text-2xl font-bold text-white"
                  >
                    Connect Wallet to Continue
                  </Dialog.Title>

                  <p className="mb-6 text-gray-400">
                    Save your progress and unlock all features
                  </p>

                  <div className="mb-8 rounded-xl bg-white/5 p-4 text-left">
                    <ul className="space-y-3">
                      {BENEFITS.map(([icon, text]) => (
                        <li key={text} className="flex items-center gap-3">
                          <span aria-hidden="true">{icon}</span>
                          <span className="text-sm text-gray-300">{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={handleConnect}
                    className="font-syne mb-3 w-full rounded-xl bg-[#00FF87] py-4 text-lg font-bold text-black transition-all hover:bg-[#00FF87]/90"
                  >
                    Connect Wallet
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2 text-sm text-gray-500 transition-colors hover:text-gray-300"
                  >
                    👀 Continue browsing as guest
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
