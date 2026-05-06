import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { useWallet } from '~/store/useWalletStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hi! I'm your Predictio AI assistant. I can help you navigate the platform, understand how prediction markets work, or answer questions about trading. What would you like to know?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { address } = useWallet();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call our tRPC endpoint for chatbot responses
      const response = await fetch('/trpc/chatbotStream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          history: messages.slice(-5), // Send last 5 messages for context
          walletAddress: address,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again or contact support if the issue persists.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "How do prediction markets work?",
    "How do I place my first trade?",
    "What is the Protocol Vault?",
    "How do I become an analyst?",
    "What are the trading fees?",
  ];

  const handleSuggestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  return (
    <>
      {/* Floating Button - Desktop Only */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden lg:flex fixed bottom-6 right-6 z-40 items-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-green to-brand-cyan border-2 border-brand-green/50 text-brand-bg font-semibold rounded-full shadow-lg hover:scale-105 transition-transform group"
        aria-label="Open AI Assistant"
      >
        <MessageCircle className="w-5 h-5" />
        <span>AI Assistant</span>
        <Sparkles className="w-4 h-4 animate-pulse" />
      </button>
      
      {/* Chat Panel */}
      {isOpen && (
        <div className="hidden lg:block fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-2rem)] bg-brand-navy border-2 border-brand-green rounded-lg shadow-xl animate-slide-up overflow-hidden flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-brand-green/10 to-brand-cyan/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-green to-brand-cyan rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-brand-bg" />
              </div>
              <div>
                <h3 className="font-syne font-bold text-sm">AI Assistant</h3>
                <p className="text-xs text-gray-400">Powered by Claude</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
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

            {/* Suggested questions - only show at start */}
            {messages.length === 1 && !isLoading && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-medium">Suggested questions:</p>
                {suggestedQuestions.map((question, index) => (
                  <button
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

          {/* Input */}
          <div className="p-4 border-t border-white/10 bg-brand-bg/50">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-green disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-brand-green text-brand-bg rounded-lg hover:bg-brand-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
