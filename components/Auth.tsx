import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button, Input, Card } from './UI';
import { AlertCircle, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured. Please check your credentials.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'REGISTER') {
        const { error } = await (supabase.auth as any).signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Registration successful! Please check your email to verify your account.");
        setMode('LOGIN');
      } else {
        const { error } = await (supabase.auth as any).signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!supabase) {
    return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
            <Card className="max-w-md w-full text-center border-red-900/50">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Configuration Error</h2>
                <p className="text-neutral-400">
                    Supabase credentials are missing in <code>services/supabaseClient.ts</code>. 
                    Authentication features are disabled.
                </p>
            </Card>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-red-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-red-900/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-8">
            <div className="w-16 h-20 bg-red-600 rounded-lg border border-red-800 flex items-center justify-center text-black shadow-lg shadow-red-900/20 mx-auto mb-4 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <span className="font-serif text-5xl leading-none pb-2">♠</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">ChipTracker</h1>
            <p className="text-neutral-400 mt-2">Manage your poker nights like a pro.</p>
        </div>

        <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-2xl p-8 shadow-xl">
          <div className="flex gap-4 mb-6 border-b border-neutral-800 pb-1">
            <button
              onClick={() => { setMode('LOGIN'); setError(null); setMessage(null); }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${mode === 'LOGIN' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              Sign In
              {mode === 'LOGIN' && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-red-600 rounded-full"></div>}
            </button>
            <button
              onClick={() => { setMode('REGISTER'); setError(null); setMessage(null); }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${mode === 'REGISTER' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              Create Account
              {mode === 'REGISTER' && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-red-600 rounded-full"></div>}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-900/50 rounded-lg flex items-start gap-3">
              <Mail size={18} className="text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-green-200">{message}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-neutral-500" size={18} />
                <input
                  type="email"
                  required
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-neutral-500" size={18} />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                />
              </div>
            </div>

            <Button 
                type="submit" 
                className="w-full flex items-center justify-center gap-2 py-3 mt-2" 
                disabled={isLoading}
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              {mode === 'LOGIN' ? 'Sign In' : 'Create Account'}
              {!isLoading && <ArrowRight size={18} />}
            </Button>
          </form>
        </div>
        
        <p className="text-center text-neutral-500 text-xs mt-8">
            By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};