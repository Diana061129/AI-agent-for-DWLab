import React, { useEffect, useRef, useState } from 'react';
import { Webcam, Volume2, VolumeX, Sun, UserCheck, Armchair } from 'lucide-react';
import { analyzeStudyFrame } from '../services/geminiService';
import { Eye, Smartphone, Coffee, AlertCircle, Maximize2, Minimize2, Video, VideoOff } from 'lucide-react';

const ANALYSIS_INTERVAL = 30000; // Analyze every 30 seconds
const BREAK_THRESHOLD_MS = 45 * 60 * 1000; // 45 minutes

interface StudyCompanionProps {
  onEarnPoints?: (amount: number) => void;
  isSuspended?: boolean;
}

const StudyCompanion: React.FC<StudyCompanionProps> = ({ onEarnPoints, isSuspended = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  
  // Analysis State
  const [status, setStatus] = useState<'focused' | 'distracted' | 'absent' | 'idle'>('idle');
  const [ergonomics, setErgonomics] = useState<{slouching: boolean, lighting: 'good'|'dim'|'bright'}>({ slouching: false, lighting: 'good' });
  const [advice, setAdvice] = useState<string>("Ready to focus?");
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [showBreakAlert, setShowBreakAlert] = useState(false);
  
  // Gamification
  const [sessionPoints, setSessionPoints] = useState(0);

  // Helper for TTS
  const speak = (text: string) => {
    if (!voiceEnabled || !text) return;
    // Cancel previous speech to avoid queue buildup
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Suspend logic: if isSuspended becomes true, stop camera
  useEffect(() => {
    if (isSuspended && isActive) {
      stopCamera();
    }
  }, [isSuspended, isActive]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    let breakCheckId: ReturnType<typeof setInterval>;

    if (isActive && stream && !isSuspended) {
      if (!sessionStartTime) setSessionStartTime(Date.now());

      // 1. Vision Analysis Loop
      intervalId = setInterval(async () => {
        captureAndAnalyze();
      }, ANALYSIS_INTERVAL);

      // 2. Health Break Check Loop
      breakCheckId = setInterval(() => {
        if (sessionStartTime) {
          const duration = Date.now() - sessionStartTime;
          if (duration > BREAK_THRESHOLD_MS) {
            setShowBreakAlert(true);
            if (voiceEnabled) speak("Time for a health break. Please look away from the screen.");
          }
        }
      }, 60000); // Check every minute
    } else {
      setSessionStartTime(null);
      setShowBreakAlert(false);
      if (!isActive) setStatus('idle');
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (breakCheckId) clearInterval(breakCheckId);
    };
  }, [isActive, stream, sessionStartTime, voiceEnabled, isSuspended]);

  const startCamera = async () => {
    if (isSuspended) {
      alert("Camera is currently in use by the Game Center.");
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsActive(true);
      setAdvice("I'm watching your back. Let's study.");
      if (voiceEnabled) speak("I am watching your back. Let's study.");
    } catch (err) {
      alert("Unable to access camera. Please allow permissions to use the Study Companion.");
      setIsActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsActive(false);
    setAdvice(isSuspended ? "Paused for Game Mode" : "Session paused.");
    setStatus('idle');
    setSessionPoints(0);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isSuspended) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const base64Image = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
      
      // Call Gemini
      try {
        const result = await analyzeStudyFrame(base64Image);
        
        // Update Ergonomics
        setErgonomics({ 
            slouching: result.isSlouching, 
            lighting: result.lightingCondition 
        });

        // Determine Status & Give Feedback
        if (result.isUsingPhone) {
          setStatus('distracted');
          const msg = result.advice || "Put the phone away!";
          setAdvice(msg);
          speak(msg);
        } else if (result.isAbsent) {
          setStatus('absent');
          setAdvice("Session paused - User absent.");
        } else {
          // User is likely focused
          setStatus('focused');
          
          // Check for health issues even if focused
          if (result.isSlouching) {
             setAdvice("⚠️ " + (result.advice || "Sit up straight!"));
             speak("Please sit up straight.");
          } else if (result.lightingCondition === 'dim') {
             setAdvice("💡 " + (result.advice || "It's too dark."));
             speak("It is too dark. Protect your eyes.");
          } else {
             // All good
             setAdvice(result.advice || "Great focus.");
             
             // EARN POINTS logic
             // Modified: 1 point per check (30s interval)
             setSessionPoints(prev => prev + 1);
             if (onEarnPoints) onEarnPoints(1);
          }
        }
      } catch (e) {
        console.error("Analysis failed", e);
      }
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'focused': return 'bg-green-100 text-green-700 border-green-200';
      case 'distracted': return 'bg-red-100 text-red-700 border-red-200 animate-pulse';
      case 'absent': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const getVideoContainerStyle = () => {
    if (!isActive) return 'border border-slate-200';
    switch (status) {
      case 'focused': return 'ring-2 ring-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]';
      case 'distracted': return 'ring-4 ring-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]';
      case 'absent': return 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)]';
      default: return 'border border-slate-200';
    }
  };

  if (isSuspended) return null; // Or hide entirely

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isMinimized ? 'w-auto' : 'w-80'}`}>
      
      {/* Break Alert Modal */}
      {showBreakAlert && (
        <div className="absolute bottom-full right-0 mb-4 w-72 bg-white p-4 rounded-xl shadow-2xl border-2 border-blue-500 animate-bounce">
           <div className="flex items-start gap-3">
              <Coffee className="w-8 h-8 text-blue-600" />
              <div>
                <h4 className="font-bold text-slate-900">Health Break!</h4>
                <p className="text-sm text-slate-600">You've been studying for 45+ mins. Stand up, stretch, and look away from the screen.</p>
                <button 
                  onClick={() => { setSessionStartTime(Date.now()); setShowBreakAlert(false); }}
                  className="mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                >
                  I've taken a break
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Main Widget */}
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className={`flex items-center justify-between p-3 bg-slate-900 text-white cursor-pointer ${isMinimized ? 'rounded-xl' : ''}`} onClick={() => setIsMinimized(!isMinimized)}>
           <div className="flex items-center gap-2">
             <Webcam className="w-4 h-4" />
             <span className="font-serif font-bold text-sm">Study Guardian</span>
           </div>
           <button className="text-slate-400 hover:text-white">
             {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
           </button>
        </div>

        {/* Body */}
        {!isMinimized && (
          <div className="p-4">
             {/* Camera View */}
             <div className={`relative aspect-video bg-black rounded-lg overflow-hidden mb-3 transition-all duration-300 ${getVideoContainerStyle()}`}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  className={`w-full h-full object-cover ${!isActive ? 'hidden' : ''}`} 
                />
                {!isActive && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 flex-col gap-2">
                    <VideoOff className="w-8 h-8 opacity-50" />
                    <span className="text-xs">Camera Off</span>
                  </div>
                )}
                
                {/* HUD Overlays */}
                {isActive && (
                  <>
                      {/* Status Badge */}
                      <div className="absolute top-2 left-2 z-10">
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${getStatusColor()}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${status === 'focused' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            {status}
                        </div>
                      </div>

                      {/* Earned Points Badge */}
                      <div className="absolute top-2 right-2 z-10">
                         <div className="px-2 py-0.5 rounded-full bg-blue-600/90 text-white text-[10px] font-bold shadow-sm">
                           +{sessionPoints} pts
                         </div>
                      </div>

                      {/* Ergonomic Indicators */}
                      <div className="absolute bottom-2 left-2 flex gap-1 z-10">
                          {ergonomics.slouching && (
                              <div className="bg-red-500/90 p-1 rounded text-white" title="Bad Posture">
                                  <Armchair className="w-3 h-3" />
                              </div>
                          )}
                          {ergonomics.lighting === 'dim' && (
                              <div className="bg-yellow-500/90 p-1 rounded text-white" title="Poor Lighting">
                                  <Sun className="w-3 h-3" />
                              </div>
                          )}
                      </div>

                      {/* Visual Feed Overlays for Feedback */}
                      {status === 'distracted' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 pointer-events-none backdrop-blur-[1px]">
                             <div className="bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-bold animate-bounce shadow-lg flex items-center gap-1">
                                <Smartphone className="w-3 h-3" /> DISTRACTED
                             </div>
                          </div>
                      )}
                      {status === 'absent' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-yellow-500/10 pointer-events-none backdrop-blur-[1px]">
                             <div className="bg-yellow-600/90 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> ABSENT
                             </div>
                          </div>
                      )}
                      {status === 'focused' && (
                         <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_30px_rgba(34,197,94,0.15)]"></div>
                      )}
                  </>
                )}
             </div>

             {/* Advice Text */}
             <div className={`text-sm p-3 rounded-lg mb-3 border flex items-start gap-2 transition-colors duration-500 ${getStatusColor()}`}>
                {status === 'distracted' ? <Smartphone className="w-4 h-4 flex-shrink-0 mt-0.5" /> : 
                 status === 'absent' ? <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> :
                 ergonomics.slouching ? <UserCheck className="w-4 h-4 flex-shrink-0 mt-0.5" /> :
                 <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span className="leading-tight font-medium">{advice}</span>
             </div>

             {/* Controls */}
             {!isActive ? (
               <button 
                 onClick={startCamera}
                 className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
               >
                 <Video className="w-4 h-4" /> Start Monitoring
               </button>
             ) : (
               <div className="space-y-2">
                  <div className="flex gap-2">
                     <button 
                       onClick={() => setVoiceEnabled(!voiceEnabled)}
                       className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-colors ${voiceEnabled ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                     >
                        {voiceEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                        {voiceEnabled ? 'Voice On' : 'Voice Off'}
                     </button>
                     <button 
                       onClick={stopCamera}
                       className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                     >
                       <VideoOff className="w-3 h-3" /> Stop
                     </button>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">
                    Earn 1 pt every 30s by keeping good posture & focus.
                  </p>
               </div>
             )}
          </div>
        )}
      </div>

      {/* Hidden Canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default StudyCompanion;