import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { BookMarked, Loader2, AlertCircle, Eye, EyeOff, Key, ExternalLink, CheckCircle, Sparkles, Clipboard } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: { email: string; username: string; isAdmin: boolean; sessionToken: string; apiKey?: string }) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('blackbell_custom_api_key') || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validatingKey, setValidatingKey] = useState(false);
  const [keyValidated, setKeyValidated] = useState<boolean | null>(null);

  // Validate Gemini API Key with backend test
  const handleValidateKey = async () => {
    if (!apiKey.trim()) {
      setError("Please paste or type your Gemini API Key first.");
      setKeyValidated(false);
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setValidatingKey(true);

    try {
      const res = await fetch('/api/auth/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setKeyValidated(true);
        setSuccessMsg(data.message || "Gemini API Key is valid and active!");
        localStorage.setItem('blackbell_custom_api_key', apiKey.trim());
      } else {
        setKeyValidated(false);
        setError(data.error || "Invalid Gemini API Key. Please verify from Google AI Studio.");
      }
    } catch (err: any) {
      // In static deployment fallback, do a direct lightweight validation or accept valid format
      if (apiKey.trim().startsWith('AIzaSy') && apiKey.trim().length >= 35) {
        setKeyValidated(true);
        setSuccessMsg("Key format recognized (Google Gemini AI Studio format).");
        localStorage.setItem('blackbell_custom_api_key', apiKey.trim());
      } else {
        setKeyValidated(false);
        setError("Connection check failed. Please ensure key starts with AIzaSy...");
      }
    } finally {
      setValidatingKey(false);
    }
  };

  // Clipboard paste helper
  const handlePasteKey = async () => {
    try {
      setError(null);
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setApiKey(text.trim());
          setKeyValidated(null);
          setSuccessMsg("API key pasted successfully!");
          setTimeout(() => setSuccessMsg(null), 2500);
          return;
        }
      }
      setError("Clipboard access denied. Please paste manually into the input box.");
    } catch (err) {
      setError("Please press Ctrl+V / Cmd+V to paste your key.");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanApiKey = apiKey.trim();

    try {
      const endpoint = mode === 'signin' ? '/api/auth/login' : '/api/auth/register';
      const body: any = {
        email: cleanEmail,
        password: password,
        apiKey: cleanApiKey
      };
      if (mode === 'signup') {
        body.username = username.trim() || cleanEmail.split('@')[0];
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        let parsedMessage = errorText;
        try {
          const parsedJson = JSON.parse(errorText);
          if (parsedJson.error || parsedJson.message) {
            parsedMessage = parsedJson.error || parsedJson.message;
          }
        } catch (e) {}
        throw new Error(parsedMessage || 'Authentication failed');
      }

      const data = await res.json();
      if (data.success && data.user) {
        const fullUser = {
          ...data.user,
          apiKey: cleanApiKey || data.user.apiKey || ''
        };
        localStorage.setItem('blackbell_password', password);
        localStorage.setItem('blackbell_user', JSON.stringify(fullUser));
        if (cleanApiKey) {
          localStorage.setItem('blackbell_custom_api_key', cleanApiKey);
        }
        onLogin(fullUser);
      } else {
        throw new Error('Invalid response received from server.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0f18] text-white px-4 py-8 items-center justify-center font-sans relative overflow-x-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-900/15 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-[420px] flex flex-col items-center relative z-10">
        
        {/* Top App Logo */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2a174d] to-[#1a1130] flex items-center justify-center mb-3 border border-purple-500/30 shadow-[0_0_25px_rgba(168,85,247,0.2)]">
          <BookMarked className="w-7 h-7 text-purple-300" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-serif font-black tracking-wide text-white mb-1.5 text-center">
          Blackbell AGI
        </h1>
        <p className="text-[#9ca3af] mb-6 text-center text-[13.5px] font-medium">
          Sign in or register to launch your AI companion
        </p>

        {/* Alert/Error Notification */}
        {error && (
          <div className="w-full mb-4 flex items-center gap-2.5 p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs font-medium animate-fade-in shadow-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Success Notification */}
        {successMsg && (
          <div className="w-full mb-4 flex items-center gap-2.5 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium animate-fade-in shadow-lg">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span className="flex-1">{successMsg}</span>
          </div>
        )}

        {/* Form Container Card */}
        <div className="w-full bg-[#131622]/90 border border-white/5 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
          {/* Tabs: Sign Up / Sign In */}
          <div className="w-full flex bg-[#1a1d2d] rounded-xl p-1 mb-5 border border-white/5 shadow-inner">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                mode === 'signup'
                  ? 'bg-[#7c3aed] text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]'
                  : 'text-[#8892b0] hover:text-white'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setMode('signin');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                mode === 'signin'
                  ? 'bg-[#7c3aed] text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]'
                  : 'text-[#8892b0] hover:text-white'
              }`}
            >
              Sign In
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            
            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300">Email Address</label>
              <input
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#1a1e2e] border border-[#2d3246] focus:border-[#7c3aed] rounded-xl px-4 py-3 text-white placeholder-[#68728e] text-sm outline-none transition-all"
              />
            </div>

            {/* Username (Only for Sign Up) */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300">Username</label>
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="w-full bg-[#1a1e2e] border border-[#2d3246] focus:border-[#7c3aed] rounded-xl px-4 py-3 text-white placeholder-[#68728e] text-sm outline-none transition-all"
                />
              </div>
            )}

            {/* Gemini API Key Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-400" />
                  <span>Gemini API Key</span>
                  <span className="text-[10px] font-semibold text-purple-400/80">(Required)</span>
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                >
                  <span>Get Free Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative flex items-center">
                <input
                  type={showApiKey ? "text" : "password"}
                  disabled={loading}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setKeyValidated(null);
                  }}
                  placeholder="Paste AI Studio API Key (AIzaSy...)"
                  className={`w-full bg-[#1a1e2e] border ${
                    keyValidated === true 
                      ? 'border-emerald-500/60 focus:border-emerald-500' 
                      : keyValidated === false 
                        ? 'border-red-500/60 focus:border-red-500' 
                        : 'border-[#2d3246] focus:border-[#7c3aed]'
                  } rounded-xl pl-4 pr-24 py-3 text-white placeholder-[#68728e] text-sm font-mono outline-none transition-all`}
                />

                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    disabled={loading || validatingKey}
                    onClick={handleValidateKey}
                    className="px-2.5 py-1.5 bg-[#25293d] hover:bg-purple-900/40 border border-purple-500/30 text-purple-300 hover:text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="Check and validate API key"
                  >
                    {validatingKey ? (
                      <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                    ) : keyValidated === true ? (
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                    ) : null}
                    <span>Check</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1.5 text-[#8892b0] hover:text-white transition-colors cursor-pointer"
                    title={showApiKey ? "Hide Key" : "Show Key"}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 px-0.5 pt-0.5">
                <span>Works on Vercel, Netlify & local servers</span>
                <button
                  type="button"
                  onClick={handlePasteKey}
                  className="text-purple-400 hover:text-purple-300 font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Clipboard className="w-3 h-3" />
                  <span>Paste key</span>
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1a1e2e] border border-[#2d3246] focus:border-[#7c3aed] rounded-xl pl-4 pr-11 py-3 text-white placeholder-[#68728e] text-sm outline-none transition-all"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8892b0] hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] active:scale-[0.99] disabled:opacity-50 text-white font-bold py-3.5 text-sm rounded-xl mt-3 transition-all shadow-[0_0_20px_rgba(124,58,237,0.35)] cursor-pointer flex items-center justify-center gap-2 select-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Launching Blackbell...</span>
                </>
              ) : (
                <span>{mode === 'signup' ? 'Create Account & Launch' : 'Sign In & Launch Blackbell'}</span>
              )}
            </button>
          </form>
        </div>

        {/* Bottom Platform Compatibility & Netlify/Vercel Badge */}
        <div className="flex flex-col items-center gap-2 mt-6 select-none">
          <p className="text-[11px] text-gray-500 font-medium">
            Blackbell AGI · Ready for Vercel, Netlify & local servers
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#131622] border border-white/10 text-[11px] text-gray-400 font-medium shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Powered by <strong className="text-gray-200">Netlify & Vercel</strong></span>
          </div>
        </div>

      </div>
    </div>
  );
}
