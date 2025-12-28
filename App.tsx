import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ResearchChat from './components/ResearchChat';
import LitReview from './components/LitReview';
import SettingsComponent from './components/SettingsComponent';
import GameCenter from './components/GameCenter';
import AuthScreen from './components/AuthScreen';
import { View, UserSettings, UserStats } from './types';
import { Menu } from 'lucide-react';

const DEFAULT_SETTINGS: UserSettings = {
  researchField: '',
  updateFrequency: 'daily',
  experienceLevel: 'researcher',
  timeRange: '1w',
  language: 'en',
  selectedModel: 'balanced'
};

const DEFAULT_STATS: UserStats = {
  points: 0,
  papersRead: 0,
  minutesStudied: 0,
  quizzesTaken: 0,
};

// Scholar Levels Logic
const getScholarInfo = (minutes: number) => {
  if (minutes < 60) return { title: 'LV1 Novice Observer', next: 60 };
  if (minutes < 300) return { title: 'LV2 Research Apprentice', next: 300 }; // 5 hours
  if (minutes < 1200) return { title: 'LV3 Junior Scholar', next: 1200 }; // 20 hours
  if (minutes < 3000) return { title: 'LV4 Senior Analyst', next: 3000 }; // 50 hours
  if (minutes < 6000) return { title: 'LV5 Distinguished Fellow', next: 6000 }; // 100 hours
  if (minutes < 10000) return { title: 'LV6 Tenured Professor', next: 10000 }; 
  return { title: 'LV7 Nobel Laureate', next: null };
};

const App: React.FC = () => {
  const [user, setUser] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.SETTINGS);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Check for existing session
  useEffect(() => {
    const savedUser = localStorage.getItem('scholarAi_currentUser');
    if (savedUser) {
      handleLogin(savedUser);
    }
  }, []);

  const handleLogin = (username: string) => {
    setUser(username);
    localStorage.setItem('scholarAi_currentUser', username);
    
    // Load User Specific Data
    const savedStats = localStorage.getItem(`scholarAi_${username}_stats`);
    if (savedStats) setStats(JSON.parse(savedStats));
    else setStats(DEFAULT_STATS);

    const savedSettings = localStorage.getItem(`scholarAi_${username}_settings`);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      if (parsed.researchField) setCurrentView(View.DASHBOARD);
      else setCurrentView(View.SETTINGS);
    } else {
      setSettings(DEFAULT_SETTINGS);
      setCurrentView(View.SETTINGS);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('scholarAi_currentUser');
    setStats(DEFAULT_STATS);
    setSettings(DEFAULT_SETTINGS);
    setCurrentView(View.SETTINGS);
  };

  // Update Stats Persistence
  const updateStats = (newStats: UserStats) => {
    setStats(newStats);
    if (user) {
      localStorage.setItem(`scholarAi_${user}_stats`, JSON.stringify(newStats));
    }
  };

  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    if (user) {
      localStorage.setItem(`scholarAi_${user}_settings`, JSON.stringify(newSettings));
    }
    setCurrentView(View.DASHBOARD);
  };

  // Study Timer Logic
  useEffect(() => {
    if (!user) return;
    
    const timer = setInterval(() => {
      // Only count active study if window is focused (basic check) and not in Game Center
      if (document.hasFocus() && currentView !== View.GAME_CENTER) {
        setStats(prev => {
          const newMinutes = prev.minutesStudied + 1;
          const newPoints = prev.points + 10; // 10 points per minute
          const newStats = { ...prev, minutesStudied: newMinutes, points: newPoints };
          localStorage.setItem(`scholarAi_${user}_stats`, JSON.stringify(newStats));
          return newStats;
        });
      }
    }, 60000); // Check every minute

    return () => clearInterval(timer);
  }, [currentView, user]);

  const renderContent = () => {
    if (!user) return null;

    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard settings={settings} username={user} />;
      case View.CHAT:
        return <ResearchChat settings={settings} username={user} />; 
      case View.LIT_REVIEW:
        return <LitReview settings={settings} userStats={stats} onUpdateStats={updateStats} username={user} />;
      case View.GAME_CENTER:
        return <GameCenter stats={stats} onUpdateStats={updateStats} />;
      case View.SETTINGS:
        return <SettingsComponent settings={settings} onSave={handleSaveSettings} />;
      default:
        return <Dashboard settings={settings} username={user} />;
    }
  };

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  const scholarInfo = getScholarInfo(stats.minutesStudied);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onLogout={handleLogout}
        scholarTitle={scholarInfo.title}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
           <div className="flex items-center gap-2">
             <span className="font-serif font-bold text-slate-900">ScholarAI</span>
             <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{stats.points} pts</span>
           </div>
           <button onClick={() => setIsMobileOpen(true)} className="p-2 text-slate-600">
             <Menu className="w-6 h-6" />
           </button>
        </div>

        {/* Desktop Header Stats */}
        <div className="hidden md:flex absolute top-4 right-8 z-20 gap-4 items-center">
           <div className="text-right">
             <div className="text-sm font-bold text-slate-800">{user}</div>
             <div className="text-xs text-blue-600 font-medium">{scholarInfo.title}</div>
           </div>
           <div className="bg-white/90 backdrop-blur shadow-sm border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold text-slate-600">
              {Math.floor(stats.minutesStudied / 60)}h {stats.minutesStudied % 60}m studied
           </div>
           <div className="bg-blue-600 shadow-md shadow-blue-900/20 px-3 py-1 rounded-lg text-xs font-bold text-white">
              {stats.points} Points
           </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;