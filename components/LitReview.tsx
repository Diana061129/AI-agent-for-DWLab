import React, { useState, useEffect } from 'react';
import { analyzeLiterature, generateQuiz } from '../services/geminiService';
import { LitReviewResult, UserSettings, UserStats, QuizQuestion } from '../types';
import { Search, FileText, FlaskConical, Lightbulb, Target, ArrowRight, Presentation, Mic, Image as ImageIcon, Download, AlertTriangle, GraduationCap, CheckCircle, XCircle, History, ChevronRight, PlusCircle, Trash2 } from 'lucide-react';
import { parse } from 'marked';

interface LitReviewProps {
  settings?: UserSettings;
  userStats: UserStats;
  onUpdateStats: (stats: UserStats) => void;
  username: string;
}

const LitReview: React.FC<LitReviewProps> = ({ settings, userStats, onUpdateStats, username }) => {
  const [url, setUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // History State
  const [history, setHistory] = useState<LitReviewResult[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'report' | 'ppt' | 'speech' | 'quiz'>('report');
  
  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  const historyKey = `scholarAi_${username}_lit_review_history`;

  // Load History
  useEffect(() => {
    const savedHistory = localStorage.getItem(historyKey);
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    } else {
      setHistory([]);
    }
  }, [username]);

  // Persist History
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem(historyKey, JSON.stringify(history));
    }
  }, [history, historyKey]);

  const activeReport = history.find(r => r.id === selectedReportId) || null;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setSelectedImage(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setQuizQuestions([]);
    setQuizSubmitted(false);
    
    try {
      const currentSettings = settings || { 
        researchField: '', updateFrequency: 'daily', experienceLevel: 'researcher', 
        timeRange: '1w', language: 'en', selectedModel: 'balanced' 
      };
      
      const result = await analyzeLiterature(url, selectedImage, currentSettings);
      
      const newReport: LitReviewResult = {
        ...result,
        id: Date.now().toString(),
        date: new Date().toISOString()
      };

      setHistory(prev => [newReport, ...prev]);
      setSelectedReportId(newReport.id!);

      // Only increment papers read count, do NOT give points for generation anymore.
      // Points must be earned via quizzes or study focus.
      onUpdateStats({ 
        ...userStats, 
        papersRead: userStats.papersRead + 1 
      });
      setUrl('');
      setSelectedImage(null);

    } catch (error) {
      alert("Could not analyze the link. Ensure it's a valid public URL or DOI.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this analysis?")) {
      setHistory(prev => prev.filter(h => h.id !== id));
      if (selectedReportId === id) setSelectedReportId(null);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!activeReport) return;
    setQuizLoading(true);
    setActiveTab('quiz');
    
    try {
      const context = `${activeReport.mainWork}\n${activeReport.significantProgress}\n${activeReport.principlesAndMethods}`;
      const questions = await generateQuiz(context, settings || { 
        researchField: '', updateFrequency: 'daily', experienceLevel: 'researcher', 
        timeRange: '1w', language: 'en', selectedModel: 'balanced' 
      });
      setQuizQuestions(questions);
      setQuizAnswers(new Array(questions.length).fill(-1));
      setQuizSubmitted(false);
    } catch (e) {
      alert("Failed to generate quiz.");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleQuizSubmit = () => {
    if (quizAnswers.includes(-1)) {
      alert("Please answer all questions before submitting.");
      return;
    }

    let correctCount = 0;
    quizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctAnswerIndex) correctCount++;
    });

    const earned = correctCount * 20;
    setPointsEarned(earned);
    setQuizSubmitted(true);
    
    onUpdateStats({
      ...userStats,
      points: userStats.points + earned,
      quizzesTaken: userStats.quizzesTaken + 1
    });
  };

  const getCriticalAnalysisString = (analysis: LitReviewResult['criticalAnalysis']) => {
    if (!analysis) return 'N/A';
    if (typeof analysis === 'string') return analysis;
    return `**Limitations:** ${analysis.limitations || 'N/A'}\n\n**Biases:** ${analysis.biases || 'N/A'}\n\n**Missing Validation:** ${analysis.missingValidation || 'N/A'}`;
  };

  const generateMarkdownReport = (report: LitReviewResult) => {
    return `
# ${report.title}

## Main Work
${report.mainWork}

## Significant Progress
${report.significantProgress}

## Critical Analysis
${getCriticalAnalysisString(report.criticalAnalysis)}

${report.imageAnalysis ? `## Visual Analysis\n${report.imageAnalysis}\n` : ''}

## Principles & Methodology
${report.principlesAndMethods}

## Implications
${report.implications}
    `.trim();
  };

  const handleExport = (format: 'md' | 'doc') => {
    if (!activeReport) return;
    const markdownContent = generateMarkdownReport(activeReport);

    let blob: Blob;
    let filename = `Analysis_${activeReport.title.substring(0, 20).replace(/\s+/g, '_')}`;

    if (format === 'md') {
       blob = new Blob([markdownContent], { type: 'text/markdown' });
       filename += '.md';
    } else {
       // Convert markdown to HTML for doc export
       const htmlContent = `<html><body>${parse(markdownContent)}</body></html>`;
       blob = new Blob([htmlContent], { type: 'application/msword' });
       filename += '.doc';
    }

    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(urlObj);
  };

  // If no report is active, show the Input Form and History List
  if (!activeReport) {
    return (
      <div className="max-w-4xl mx-auto pb-12">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">Deep Literature Analysis</h1>
            <p className="text-slate-500">
               Generate detailed reports, PPT drafts, and knowledge quizzes from any academic paper.
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mb-10">
          <form onSubmit={handleAnalyze} className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" /> New Analysis
            </h3>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste URL (e.g., https://arxiv.org/abs/...)"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               <label className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                 <ImageIcon className="w-5 h-5 text-slate-500" />
                 <span className="text-sm text-slate-600">
                   {selectedImage ? "Image Attached" : "Upload Figure (Optional)"}
                 </span>
                 <input 
                   type="file" 
                   accept="image/*" 
                   onChange={handleImageUpload} 
                   className="hidden" 
                 />
               </label>
               {selectedImage && (
                 <button 
                  type="button" 
                  onClick={() => setSelectedImage(null)}
                  className="text-xs text-red-500 hover:text-red-700"
                 >
                   Remove
                 </button>
               )}

              <button
                type="submit"
                disabled={loading || !url}
                className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? 'Analyzing...' : 'Generate'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          {loading && (
            <div className="mt-8 space-y-4 animate-pulse">
               <div className="h-4 bg-slate-200 rounded w-full"></div>
               <div className="h-4 bg-slate-200 rounded w-3/4"></div>
               <div className="flex justify-center mt-4 text-slate-500 text-sm">
                  {settings?.selectedModel === 'deep-think' ? 'Applying Deep Thinking (This may take a minute)...' : 'Reading and Analyzing...'}
               </div>
            </div>
          )}
        </div>

        <div>
           <h3 className="text-xl font-serif font-bold text-slate-800 mb-4 flex items-center gap-2">
             <History className="w-5 h-5 text-slate-500" /> Analysis History
           </h3>
           
           {history.length === 0 ? (
             <div className="text-center py-12 bg-slate-100 rounded-xl border border-slate-200 border-dashed text-slate-500">
                No history yet. Start your first analysis above.
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-4">
                {history.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedReportId(item.id!)}
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                     <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800 mb-1 group-hover:text-blue-700 transition-colors">
                             {item.title || "Untitled Paper"}
                          </h4>
                          <p className="text-sm text-slate-500 line-clamp-2 mb-2">
                             {item.mainWork}
                          </p>
                          <div className="text-xs text-slate-400">
                             Analyzed on {item.date ? new Date(item.date).toLocaleDateString() : 'Unknown Date'}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                           <button 
                             onClick={(e) => handleDeleteReport(item.id!, e)}
                             className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                           <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                        </div>
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>
    );
  }

  // Active Report View
  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-6">
         <button 
           onClick={() => setSelectedReportId(null)}
           className="text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-4 text-sm font-medium transition-colors"
         >
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to History
         </button>
      </div>

      <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 pt-6">
              <div className="flex justify-between items-start mb-6">
                 <h2 className="text-2xl font-serif font-bold text-slate-900">{activeReport.title}</h2>
                 <div className="flex gap-2">
                    <button onClick={() => handleExport('md')} className="p-2 bg-white border border-slate-200 rounded hover:bg-slate-50" title="Download Markdown"><FileText className="w-4 h-4" /></button>
                    <button onClick={() => handleExport('doc')} className="p-2 bg-white border border-slate-200 rounded hover:bg-slate-50" title="Download Word"><Download className="w-4 h-4" /></button>
                 </div>
              </div>
              
              <div className="flex gap-6 text-sm font-medium text-slate-600 overflow-x-auto">
                <button 
                  onClick={() => setActiveTab('report')}
                  className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'report' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-900'}`}
                >
                  <FileText className="w-4 h-4" /> Reading Report
                </button>
                <button 
                  onClick={() => setActiveTab('ppt')}
                  className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'ppt' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-900'}`}
                >
                  <Presentation className="w-4 h-4" /> PPT Slides
                </button>
                <button 
                  onClick={() => setActiveTab('speech')}
                  className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'speech' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-900'}`}
                >
                  <Mic className="w-4 h-4" /> Speech Script
                </button>
                <button 
                  onClick={handleGenerateQuiz}
                  className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'quiz' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-900'}`}
                >
                  <GraduationCap className="w-4 h-4" /> Take Knowledge Quiz
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {activeTab === 'report' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="prose prose-slate max-w-none prose-headings:font-serif prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-blue-600">
                     <div dangerouslySetInnerHTML={{ __html: parse(generateMarkdownReport(activeReport)) as string }} />
                  </div>
                </div>
              )}

              {activeTab === 'ppt' && activeReport.pptDraft && (
                 <div className="space-y-6">
                    {activeReport.pptDraft.map((slide, idx) => (
                      <div key={idx} className="border border-slate-300 rounded-lg p-4 shadow-sm bg-white">
                         <h4 className="font-bold text-lg text-slate-900 mb-2">Slide {idx + 1}: {slide.slideTitle}</h4>
                         <ul className="list-disc list-inside space-y-1 mb-4 text-slate-700">{slide.bulletPoints.map((p,i)=><li key={i}>{p}</li>)}</ul>
                      </div>
                    ))}
                 </div>
              )}

              {activeTab === 'speech' && activeReport.groupMeetingSpeech && (
                 <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 text-slate-800 leading-loose whitespace-pre-wrap font-serif text-lg">
                   {activeReport.groupMeetingSpeech}
                 </div>
              )}

              {activeTab === 'quiz' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {quizLoading ? (
                    <div className="text-center py-12 text-slate-500">Generating challenges...</div>
                  ) : quizQuestions.length > 0 ? (
                    <div className="space-y-8">
                       {quizQuestions.map((q, qIdx) => (
                         <div key={qIdx} className="border border-slate-200 rounded-lg p-6 bg-white shadow-sm">
                           <p className="font-bold text-lg text-slate-800 mb-4">{qIdx + 1}. {q.question}</p>
                           <div className="space-y-3">
                             {q.options.map((opt, oIdx) => {
                               const isSelected = quizAnswers[qIdx] === oIdx;
                               let btnClass = "w-full text-left px-4 py-3 rounded-lg border transition-all ";
                               if (quizSubmitted) {
                                  if (oIdx === q.correctAnswerIndex) btnClass += "bg-green-100 border-green-500 text-green-900";
                                  else if (isSelected && oIdx !== q.correctAnswerIndex) btnClass += "bg-red-100 border-red-500 text-red-900";
                                  else btnClass += "bg-slate-50 border-slate-200 opacity-60";
                               } else {
                                  btnClass += isSelected ? "bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500" : "bg-white border-slate-300 hover:bg-slate-50";
                               }

                               return (
                                 <button 
                                   key={oIdx}
                                   onClick={() => !quizSubmitted && setQuizAnswers(prev => {
                                      const next = [...prev];
                                      next[qIdx] = oIdx;
                                      return next;
                                   })}
                                   className={btnClass}
                                   disabled={quizSubmitted}
                                 >
                                   {opt}
                                 </button>
                               )
                             })}
                           </div>
                           {quizSubmitted && (
                             <div className="mt-4 p-3 bg-slate-50 rounded text-sm text-slate-700">
                               <strong>Explanation:</strong> {q.explanation}
                             </div>
                           )}
                         </div>
                       ))}

                       {!quizSubmitted ? (
                         <button 
                           onClick={handleQuizSubmit} 
                           className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-lg shadow-md"
                         >
                           Submit Answers
                         </button>
                       ) : (
                         <div className="bg-green-50 border border-green-200 p-6 rounded-xl text-center">
                            <h3 className="text-2xl font-bold text-green-800 mb-2">Quiz Complete!</h3>
                            <p className="text-green-700">You earned {pointsEarned} ScholarPoints!</p>
                         </div>
                       )}
                    </div>
                  ) : (
                    <div className="text-center">No questions generated.</div>
                  )}
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default LitReview;