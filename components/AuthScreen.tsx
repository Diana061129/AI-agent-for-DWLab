import React, { useState } from 'react';
import { User, Lock, ArrowRight, BookOpen, UserPlus } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (username: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // If we are already in the "register confirmation" mode, clicking submit again should register
    if (showRegisterPrompt) {
        handleRegister();
        return;
    }

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const userKey = `scholarAi_user_creds_${username.trim()}`;
    const storedPassword = localStorage.getItem(userKey);

    if (storedPassword) {
      // User exists, check password
      if (storedPassword === password) {
        onLogin(username.trim());
      } else {
        setError('Incorrect password. Please try again.');
        setShowRegisterPrompt(false);
      }
    } else {
      // User does not exist, prompt to register via UI
      setShowRegisterPrompt(true);
    }
  };

  const handleRegister = () => {
    const userKey = `scholarAi_user_creds_${username.trim()}`;
    localStorage.setItem(userKey, password);
    onLogin(username.trim());
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="inline-flex p-4 bg-blue-600 rounded-2xl shadow-lg mb-4">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-slate-900">ScholarAI</h1>
        <p className="text-slate-500 mt-2">Your Intelligent Research Companion</p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 w-full max-w-md transition-all">
        <h2 className="text-xl font-bold text-slate-800 mb-6">
          Login / Register
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                    setUsername(e.target.value);
                    setShowRegisterPrompt(false); // Reset prompt on change
                    setError('');
                }}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Enter your username"
                disabled={showRegisterPrompt}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                    setPassword(e.target.value);
                    setShowRegisterPrompt(false); // Reset prompt on change
                    setError('');
                }}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Simple password"
                disabled={showRegisterPrompt}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          {showRegisterPrompt ? (
             <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center animate-in fade-in slide-in-from-top-2">
                <p className="text-slate-800 text-sm mb-3">
                   Account <strong>{username}</strong> not found. <br/>
                   Do you want to create a new account?
                </p>
                <div className="flex gap-3">
                   <button
                     type="button"
                     onClick={() => setShowRegisterPrompt(false)}
                     className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                   >
                     Cancel
                   </button>
                   <button
                     type="button"
                     onClick={handleRegister}
                     className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                   >
                     <UserPlus className="w-4 h-4" /> Create
                   </button>
                </div>
             </div>
          ) : (
            <>
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                    Enter ScholarAI <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  New users will be prompted to create an account automatically.
                </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;