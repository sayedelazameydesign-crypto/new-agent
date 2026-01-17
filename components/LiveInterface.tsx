
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { decodeAudio, decodeAudioData, createPcmBlob } from '../services/audioUtils';

interface LiveInterfaceProps {
  onClose: () => void;
  persona?: string;
}

interface ChatMsg {
  role: 'user' | 'celia';
  text: string;
  id: number;
}

const LiveInterface: React.FC<LiveInterfaceProps> = ({ onClose, persona }) => {
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const outAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentInput, currentOutput]);

  const startSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = audioCtxRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioCtxRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioCtxRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Audio Logic
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outAudioCtxRef.current) {
              const ctx = outAudioCtxRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decodeAudio(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.onended = () => sourcesRef.current.delete(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Interruptions
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            // Transcription Logic
            if (message.serverContent?.inputTranscription) {
              setCurrentInput(prev => prev + message.serverContent!.inputTranscription!.text);
            }
            if (message.serverContent?.outputTranscription) {
              setCurrentOutput(prev => prev + message.serverContent!.outputTranscription!.text);
            }

            if (message.serverContent?.turnComplete) {
              if (currentInput) {
                setMessages(prev => [...prev, { role: 'user', text: currentInput, id: Date.now() }]);
                setCurrentInput('');
              }
              if (currentOutput) {
                setMessages(prev => [...prev, { role: 'celia', text: currentOutput, id: Date.now() + 1 }]);
                setCurrentOutput('');
              }
            }
          },
          onclose: () => setIsActive(false),
          onerror: (e) => console.error("Live Error:", e)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: `أنت Celia AI. شخصيتك: ${persona || 'مساعدة تقنية ودودة'}. تحدث بالعربية وكن موجزاً وذكياً.`
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Live session failed:", err);
    }
  };

  useEffect(() => {
    startSession();
    return () => {
      sessionRef.current?.close();
      audioCtxRef.current?.close();
      outAudioCtxRef.current?.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/98 flex animate-in fade-in duration-500 overflow-hidden">
      {/* Sidebar - History */}
      <div className="w-1/3 border-l border-white/5 bg-black/40 flex flex-col">
        <div className="p-8 border-b border-white/5">
          <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">تنسيق المحادثة</h3>
          <p className="text-[10px] text-gray-500 mt-1">يتم تحويل الصوت إلى نص لحظياً</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
              <span className="text-[9px] font-bold text-gray-600 uppercase mb-1">{msg.role === 'user' ? 'أنت' : 'Celia'}</span>
              <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user' ? 'bg-white/5 text-gray-300' : 'bg-indigo-600/10 text-indigo-300 border border-indigo-500/20'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {(currentInput || currentOutput) && (
             <div className="animate-pulse flex flex-col space-y-2">
                {currentInput && <div className="text-[11px] text-gray-500 italic">أنت: {currentInput}...</div>}
                {currentOutput && <div className="text-[11px] text-indigo-400 italic">Celia: {currentOutput}...</div>}
             </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Main - Neural Core */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-12">
        <button onClick={onClose} className="absolute top-8 left-8 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 flex items-center justify-center transition-all">
          <i className="fas fa-times"></i>
        </button>

        <div className="relative group">
          <div className={`absolute inset-0 rounded-full bg-indigo-500/20 blur-3xl transition-transform duration-700 ${isActive ? 'scale-150 animate-pulse' : 'scale-100'}`}></div>
          <div className={`relative w-64 h-64 rounded-full bg-gradient-to-tr from-indigo-900 via-indigo-600 to-purple-900 p-1 flex items-center justify-center border-2 border-white/20 shadow-[0_0_80px_rgba(79,70,229,0.3)]`}>
             <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-500/5 animate-pulse"></div>
                <i className={`fas fa-brain text-7xl text-indigo-400 mb-4 ${isActive ? 'animate-bounce' : 'opacity-40'}`}></i>
                <div className="flex space-x-1.5 space-x-reverse h-8 items-center">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`w-1 rounded-full bg-indigo-500 transition-all duration-300 ${isActive ? 'animate-bar' : 'h-1 opacity-20'}`} style={{animationDelay: `${i * 0.1}s`}}></div>
                  ))}
                </div>
             </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">Celia Live</h2>
          <div className="inline-flex items-center space-x-2 space-x-reverse bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20">
             <span className={`w-2 h-2 rounded-full bg-indigo-500 ${isActive ? 'animate-ping' : ''}`}></span>
             <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
               {isActive ? 'النظام متصل - جارِ الاستماع' : 'جاري إنشاء جسر عصبي...'}
             </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bar {
          0%, 100% { height: 10%; }
          50% { height: 100%; }
        }
        .animate-bar {
          animation: bar 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LiveInterface;
