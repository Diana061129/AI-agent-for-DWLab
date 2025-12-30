import React, { useEffect, useState } from 'react';
import { UserSettings } from '../types';
import { generateResearchBulletin } from '../services/geminiService';
import { RefreshCw, Calendar, Sparkles, Download, FileJson } from 'lucide-react';
import { parse } from 'marked';

interface DashboardProps {
  settings: UserSettings;
  username: string;
}

const Dashboard: React.FC<DashboardProps> = ({ settings, username }) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const getStorageKey = (key: string) => `scholarAi_${username}_${key}_${settings.researchField}`;

  // Load from local storage on mount
  useEffect(() => {
    const savedContent = localStorage.getItem(getStorageKey('bulletin'));
    const savedDate = localStorage.getItem(getStorageKey('bulletin_date'));
    if (savedContent) {
      setContent(savedContent);
    } else {
      setContent(null); // Reset if new user/field
    }
    
    if (savedDate) {
      setLastUpdated(new Date(savedDate));
    } else {
      setLastUpdated(null);
    }
  }, [settings.researchField, username]);

  const fetchBulletin = async (isManualRefresh = false) => {
    if (!settings.researchField) return;

    setLoading(true);
    try {
      const result = await generateResearchBulletin(settings);
      setContent(result);
      const now = new Date();
      setLastUpdated(now);
      
      // Save to local storage
      localStorage.setItem(getStorageKey('bulletin'), result);
      localStorage.setItem(getStorageKey('bulletin_date'), now.toISOString());
      
    } catch (err) {
      setContent("Failed to load bulletin. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch automatically if we haven't fetched yet for this specific user/field context
    if (settings.researchField) {
      const existing = localStorage.getItem(getStorageKey('bulletin'));
      if (!existing && !loading && !content) {
        // Initial load is free or pre-loaded? Let's make initial load free to not block new users
        fetchBulletin(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.researchField, username]);

  const handleExport = (format: 'md' | 'doc') => {
    if (!content) return;
    
    let blob: Blob;
    let filename = `Research_Bulletin_${settings.researchField.replace(/\s+/g, '_')}`;

    if (format === 'md') {
      blob = new Blob([content], { type: 'text/markdown' });
      filename += '.md';
    } else {
      // Parse markdown to HTML for Word export using the same parser
      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>${parse(content)}</body>
        </html>
      `;
      blob = new Blob([htmlContent], { type: 'application/msword' });
      filename += '.doc';
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!settings.researchField) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
        <Sparkles className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-serif font-bold text-slate-700 mb-2">Welcome to ScholarAI</h2>
        <p className="text-slate-500 max-w-md">
          Please configure your research field in the Settings tab to start generating your personalized intelligence bulletin.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">
            {settings.researchField} Intelligence
          </h1>
          <p className="text-slate-500 flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4" />
            {settings.updateFrequency === 'daily' ? 'Daily' : 'Weekly'} Bulletin 
            {lastUpdated && ` • Updated: ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex gap-2 items-center">
           {content && (
            <>
              <button 
                onClick={() => handleExport('md')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                title="Export as Markdown"
              >
                <FileJson className="w-4 h-4" /> MD
              </button>
              <button 
                onClick={() => handleExport('doc')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                title="Export as Word"
              >
                <Download className="w-4 h-4" /> Doc
              </button>
            </>
          )}
          <button
            onClick={() => fetchBulletin(true)}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading && !content && (
        <div className="space-y-4 animate-pulse">
          <div className="h-64 bg-slate-200 rounded-xl"></div>
          <div className="h-32 bg-slate-200 rounded-xl"></div>
        </div>
      )}

      {content && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 prose prose-slate max-w-none prose-headings:font-serif prose-a:text-blue-600">
           <div dangerouslySetInnerHTML={{ 
               __html: parse(content) as string
            }} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;