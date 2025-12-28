import React, { useState } from 'react';
import { UserSettings, TimeRange, Language, ModelType } from '../types';
import { Save, Globe, Clock, Cpu } from 'lucide-react';

interface SettingsProps {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

const SettingsComponent: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(localSettings);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-2xl font-serif font-bold text-slate-900 mb-6 border-b pb-4">
          Research Configuration
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Primary Research Field
            </label>
            <input
              type="text"
              value={localSettings.researchField}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, researchField: e.target.value }))}
              placeholder="e.g., Condensed Matter Physics, CRISPR-Cas9, Large Language Models"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Globe className="w-4 h-4" /> Language
              </label>
              <select
                value={localSettings.language}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, language: e.target.value as Language }))}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="en">English</option>
                <option value="zh">中文 (Chinese)</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                 <Clock className="w-4 h-4" /> Search Horizon
              </label>
              <select
                value={localSettings.timeRange}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, timeRange: e.target.value as TimeRange }))}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="1w">Past Week (7 Days)</option>
                <option value="1m">Past Month</option>
                <option value="6m">Past 6 Months</option>
                <option value="1y">Past Year</option>
                <option value="all">All Time / Multi-year</option>
              </select>
            </div>

             <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                 <Cpu className="w-4 h-4" /> AI Model
              </label>
              <select
                value={localSettings.selectedModel}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, selectedModel: e.target.value as ModelType }))}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="fast">Gemini 3 Flash (High Speed / General)</option>
                <option value="balanced">Gemini 3 Pro (Balanced / Standard)</option>
                <option value="deep-think">Gemini 2.5 Thinking (Deep Reflection / Critical Analysis)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Select "Deep Reflection" for more detailed critical analysis and PPT generation (slower).
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bulletin Frequency
              </label>
              <select
                value={localSettings.updateFrequency}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, updateFrequency: e.target.value as 'daily' | 'weekly' }))}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="daily">Daily Briefing</option>
                <option value="weekly">Weekly Digest</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Detail Level
              </label>
              <select
                value={localSettings.experienceLevel}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, experienceLevel: e.target.value as 'student' | 'researcher' | 'expert' }))}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="student">Undergraduate (Broad)</option>
                <option value="researcher">Researcher (Technical)</option>
                <option value="expert">Expert (Cutting Edge)</option>
              </select>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6">
         <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2">Updates</h3>
         <p className="text-sm text-blue-800">
           <strong>Memory:</strong> Your chat history and reports are now saved automatically.<br/>
           <strong>Export:</strong> Download your research as Markdown or Word documents.<br/>
           <strong>Deep Thinking:</strong> Use the "Thinking" model for more critical PPT generation.
         </p>
      </div>
    </div>
  );
};

export default SettingsComponent;