import { useState, useRef, useEffect, useMemo } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useWallet } from '~/store/useWalletStore';
import { useTRPC } from '~/trpc/react';
import { normalizeWalletForQuery } from '~/utils/walletQuery';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function Chatbot() {
  const trpc = useTRPC();
  const chatMutation = useMutation(trpc.chatbotStream.mutationOptions());

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content:
        "Hi! I'm your Predictio AI assistant. Ask about prediction markets, football context, fees, or how to trade on Base — I'll keep things transparent and concise.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { address, isConnected } = useWallet();
  const walletKey = normalizeWalletForQuery(address);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;

    const text = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const historyPayload = messages
      .slice(-5)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      const data = await chatMutation.mutateAsync({
        message: text,
        history: historyPayload,
        ...(walletKey ? { walletAddress: walletKey } : {}),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "I couldn't reach the assistant (network or server timeout). Try again shortly — if it persists, the host may be busy or AI may be disabled. Trading and markets still work normally.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const suggestedQuestions = useMemo(() => {
    const guest = [
      'How do prediction markets work here?',
      'How do I connect my wallet on Base?',
      'How do fees and the vault split work?',
      'What should I check before trading a football market?',
    ];
    const signedIn = [
      'Where do I see my portfolio and open positions?',
      'How do deposits and withdrawals work with USDC?',
      'How do fees and the vault split work?',
      'What should I check before trading a football market?',
      'How do I become an analyst?',
    ];
    return isConnected && address ? signedIn : guest;
  }, [isConnected, address]);

  const handleSuggestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const isLoading = chatMutation.isPending;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="hidden lg:flex fixed bottom-6 right-6 z-40 items-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-green to-brand-cyan border-2 border-brand-green/50 text-brand-bg font-semibold rounded-full shadow-lg hover:scale-105 transition-transform group"
        aria-label="Open AI Assistant"
      >
        <MessageCircle className="w-5 h-5" />
        <span>AI Assistant</span>
        <Sparkles className="w-4 h-4 animate-pulse" />
      </button>

      {isOpen && (
        <div className="hidden lg:block fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-2rem)] bg-brand-navy border-2 border-brand-green rounded-lg shadow-xl animate-slide-up overflow-hidden flex flex-col max-h-[600px]">
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-brand-green/10 to-brand-cyan/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-green to-brand-cyan rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-brand-bg" />
              </div>
              <div>
                <h3 className="font-syne font-bold text-sm">AI Assistant</h3>
                <p className="text-xs text-gray-400">
                  Sports · Markets · OpenRouter
                  {isConnected && address ? (
                    <span className="text-brand-green"> · Wallet linked</span>
                  ) : (
                    <span> · Guest</span>
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-brand-green text-brand-bg'
                      : 'bg-white/5 text-white'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 rounded-lg px-4 py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-green" />
                </div>
              </div>
            )}

            {messages.length === 1 && !isLoading && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-medium">Suggested questions:</p>
                {suggestedQuestions.map((question, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => handleSuggestion(question)}
                    className="w-full text-left text-sm px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-white/10 bg-brand-bg/50">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-green disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-brand-green text-brand-bg rounded-lg hover:bg-brand-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              AI can make mistakes — verify fees and rules on-platform; not financial advice.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
