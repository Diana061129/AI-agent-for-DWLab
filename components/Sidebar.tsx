import React from 'react';
import { View } from '../types';
import { LayoutDashboard, MessageSquareText, BookOpenText, Settings, FlaskConical, Gamepad2, LogOut, Medal } from 'lucide-react';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onLogout: () => void;
  scholarTitle?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isMobileOpen, setIsMobileOpen, onLogout, scholarTitle }) => {
  const navItems = [
    { id: View.DASHBOARD, label: 'Research Bulletin', icon: LayoutDashboard },
    { id: View.CHAT, label: 'Scientific Q&A', icon: MessageSquareText },
    { id: View.LIT_REVIEW, label: 'Lit. Review', icon: BookOpenText },
    { id: View.GAME_CENTER, label: 'Game Center', icon: Gamepad2 },
    { id: View.SETTINGS, label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (view: View) => {
    onChangeView(view);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-64 bg-slate-900 text-slate-300 transform transition-transform duration-200 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 flex flex-col h-full shadow-xl
      `}>
        <div className="p-6 border-b border-slate-700 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
                <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-serif font-bold text-white tracking-wide">ScholarAI</span>
          </div>
          {scholarTitle && (
              <div className="flex items-center gap-2 mt-2 bg-slate-800 py-1 px-2 rounded border border-slate-700">
                  <Medal className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs text-yellow-500 font-bold uppercase tracking-wider">{scholarTitle}</span>
              </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-4">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
          
          <div className="text-xs text-slate-500 text-center">
            Powered by Gemini 3 Pro
            <br />
            &copy; 2025 ScholarAI
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;