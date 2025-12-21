
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button, Input, Card } from './UI';
import { AlertCircle, Mail, Lock, Loader2, ArrowRight, ChevronLeft } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'RESET'>('LOGIN');
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
      } else if (mode === 'RESET') {
        const { error } = await (supabase.auth as any).resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage("Password reset link sent! Check your inbox.");
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

  const handleSocialLogin = async (provider: 'google') => {
    if (!supabase) return;
    setIsSocialLoading(provider);
    setError(null);
    try {
      const { error } = await (supabase.auth as any).signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}`);
      setIsSocialLoading(null);
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
          {mode !== 'RESET' ? (
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
          ) : (
            <div className="mb-6 flex items-center gap-2">
              <button 
                onClick={() => { setMode('LOGIN'); setError(null); setMessage(null); }}
                className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-bold text-white">Reset Password</h2>
            </div>
          )}

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

            {mode !== 'RESET' && (
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
                {mode === 'LOGIN' && (
                  <div className="flex justify-end mt-2">
                    <button 
                      type="button"
                      onClick={() => setMode('RESET')}
                      className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            <Button 
                type="submit" 
                className="w-full flex items-center justify-center gap-2 py-3 mt-2" 
                disabled={isLoading || !!isSocialLoading}
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              {mode === 'LOGIN' ? 'Sign In' : mode === 'REGISTER' ? 'Create Account' : 'Send Reset Link'}
              {!isLoading && <ArrowRight size={18} />}
            </Button>
          </form>

          {mode !== 'RESET' && (
            <div className="mt-8 space-y-6">
              <div className="relative flex items-center">
                <div className="flex-grow border-t border-neutral-800"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-neutral-600 uppercase tracking-widest">Or continue with</span>
                <div className="flex-grow border-t border-neutral-800"></div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleSocialLogin('google')}
                  disabled={isLoading || !!isSocialLoading}
                  className="w-full flex items-center justify-center gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 transition-colors disabled:opacity-50 group"
                  title="Sign in with Google"
                >
                  {isSocialLoading === 'google' ? (
                    <Loader2 size={20} className="animate-spin text-neutral-400" />
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">Continue with Google</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <p className="text-center text-neutral-500 text-xs mt-8">
            By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
