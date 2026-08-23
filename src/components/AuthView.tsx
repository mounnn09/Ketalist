import React, { useState } from 'react';
import { BrainCircuit } from 'lucide-react';

interface AuthViewProps {
  onLogin: () => void;
}

export default function AuthView({ onLogin }: AuthViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onLogin();
    }, 800);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onLogin();
    }, 800);
  };

  const handleGoogleSignIn = () => {
    setLoading(true);
    setTimeout(() => {
      onLogin();
    }, 800);
  };

  return (
    <div className="w-full h-full min-h-screen flex items-center justify-center bg-[#c8e7ff] p-4 relative overflow-hidden">
      {/* Decorative background grid */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.15]" 
        style={{ backgroundImage: 'radial-gradient(#5a5a5a 2px, transparent 2px)', backgroundSize: '32px 32px' }}
      />
      
      <div className="bg-[#fdfaf6] border-[3px] border-[#5a5a5a] rounded-2xl shadow-[8px_8px_0px_0px_#5a5a5a] p-8 max-w-sm w-full z-10 flex flex-col items-center relative">
        <div className="mb-6 w-32 h-32 rounded-2xl overflow-hidden border-[3px] border-[#5a5a5a] shadow-[6px_6px_0px_0px_#5a5a5a]">
          <img src="/logo.jpg" alt="Ketalist Logo" className="w-full h-full object-cover" />
        </div>
        
        <p className="text-[#5a5a5a]/70 text-xs font-bold uppercase tracking-widest mb-8 text-center">Your Personal Second Brain</p>

        <form className="w-full space-y-4" onSubmit={handleSignIn}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border-[3px] border-[#5a5a5a] rounded-lg px-4 py-3 text-sm font-bold text-[#5a5a5a] placeholder-[#5a5a5a]/40 focus:outline-none focus:bg-[#e2f0cb]/30 transition-colors shadow-inner"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border-[3px] border-[#5a5a5a] rounded-lg px-4 py-3 text-sm font-bold text-[#5a5a5a] placeholder-[#5a5a5a]/40 focus:outline-none focus:bg-[#e2f0cb]/30 transition-colors shadow-inner"
            required
          />

          <div className="flex gap-3 pt-2">
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#5a5a5a] text-white font-bold py-3 rounded-lg hover:bg-black transition-colors disabled:opacity-50"
            >
              Sign In
            </button>
            <button 
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 bg-[#fdfaf6] border-[3px] border-[#5a5a5a] text-[#5a5a5a] font-bold py-3 rounded-lg hover:bg-[#e2f0cb] transition-colors disabled:opacity-50"
            >
              Sign Up
            </button>
          </div>
        </form>

        <div className="w-full flex items-center gap-4 my-6 opacity-50">
          <div className="flex-1 h-[2px] bg-[#5a5a5a]"></div>
          <span className="text-[10px] font-black uppercase text-[#5a5a5a]">OR</span>
          <div className="flex-1 h-[2px] bg-[#5a5a5a]"></div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border-[3px] border-[#5a5a5a] shadow-[4px_4px_0px_0px_#5a5a5a] active:translate-y-[4px] active:shadow-none text-[#5a5a5a] font-bold py-3 rounded-lg transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            <path fill="none" d="M1 1h22v22H1z" />
          </svg>
          Continue with Google
        </button>

        {error && (
          <div className="mt-4 p-3 bg-[#ffd6e0] border-2 border-[#5a5a5a] rounded-lg text-xs font-bold text-[#5a5a5a] w-full text-center">
            {error}
          </div>
        )}
      </div>
      
      {/* Credits Footer */}
      <div className="absolute bottom-4 left-0 w-full text-center z-10 px-4">
        <div className="text-[#5a5a5a] text-xs font-bold bg-[#fdfaf6]/80 inline-flex flex-col items-center px-6 py-2 rounded-xl border-2 border-[#5a5a5a] shadow-[2px_2px_0px_0px_#5a5a5a]">
          <span>Created by <span className="text-black">Moun Patel</span></span>
          <span className="text-[10px] mt-0.5 opacity-80">Supported by <span className="text-black">Ansh Nakrani</span> & <span className="text-black">Parth Patel</span></span>
        </div>
      </div>
    </div>
  );
}
