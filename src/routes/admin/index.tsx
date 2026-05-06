import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAdmin } from '~/store/useAdminStore';

export const Route = createFileRoute('/admin/')({
  component: AdminLogin,
});

function AdminLogin() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const { login, isAuthenticated } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/admin/dashboard' });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check password (mock check - in production this would be server-side)
    if (password === 'predictio2025') {
      login();
      navigate({ to: '/admin/dashboard' });
    } else {
      setError('Invalid credentials');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg">
      <div className={`w-full max-w-md p-8 ${shake ? 'animate-shake' : ''}`}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-brand-green rounded-full"></div>
            <span className="text-2xl font-syne font-bold">PREDICTIO</span>
          </div>
          <h1 className="text-3xl font-syne font-bold mb-2">Admin Access</h1>
          <p className="text-gray-400 text-sm">Restricted to authorized personnel only</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-green transition-colors"
                placeholder="Enter admin password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-500 font-medium">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-brand-green text-black font-semibold rounded-lg hover:bg-brand-green/90 transition-colors"
          >
            Access Panel
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
            ← Back to Predictio
          </a>
        </div>
      </div>
    </div>
  );
}
