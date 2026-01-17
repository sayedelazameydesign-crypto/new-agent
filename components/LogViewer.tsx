
import React, { useEffect, useRef, useState } from 'react';
import { LogEntry } from '../types';

interface LogViewerProps {
  logs: LogEntry[];
}

const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const copyToClipboard = () => {
    const text = logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full bg-[#0a0a0a] flex flex-col overflow-hidden relative group">
      <div className="absolute top-4 left-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={copyToClipboard}
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center space-x-2 space-x-reverse backdrop-blur-md"
        >
          <i className={`fas ${copied ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
          <span>{copied ? 'تم النسخ' : 'نسخ السجلات'}</span>
        </button>
      </div>

      <div className="flex-1 p-6 font-mono text-[13px] leading-relaxed overflow-y-auto scroll-smooth" ref={scrollRef}>
        <div className="max-w-5xl mx-auto space-y-1.5">
          {logs.length === 0 && (
            <div className="text-gray-600 italic animate-pulse">Initializing neural stream...</div>
          )}
          {logs.map((log, idx) => (
            <div key={idx} className="flex group animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-gray-700 select-none ml-4 w-20 flex-shrink-0 opacity-40 font-medium">
                {log.timestamp}
              </span>
              <LogMessage log={log} />
            </div>
          ))}
          <div className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
};

const LogMessage: React.FC<{ log: LogEntry }> = ({ log }) => {
  const getIcon = () => {
    switch (log.type) {
      case 'error': return <i className="fas fa-times-circle mr-2 text-red-500"></i>;
      case 'success': return <i className="fas fa-check-circle mr-2 text-emerald-400"></i>;
      case 'process': return <i className="fas fa-microchip mr-2 text-blue-400"></i>;
      case 'git': return <i className="fab fa-git-alt mr-2 text-orange-400"></i>;
      case 'brain': return <i className="fas fa-brain mr-2 text-purple-400 animate-pulse"></i>;
      case 'plan': return <i className="fas fa-list-ol mr-2 text-indigo-400"></i>;
      case 'tool': return <i className="fas fa-tools mr-2 text-amber-400"></i>;
      case 'search': return <i className="fas fa-search mr-2 text-emerald-400 animate-pulse"></i>;
      default: return <i className="fas fa-info-circle mr-2 text-gray-500"></i>;
    }
  };

  const colors: Record<string, string> = {
    error: 'text-red-400 bg-red-400/5 px-1 rounded',
    success: 'text-emerald-400 bg-emerald-400/5 px-1 rounded',
    process: 'text-blue-300',
    git: 'text-orange-300',
    brain: 'text-purple-300 font-bold',
    plan: 'text-indigo-300 italic',
    tool: 'text-amber-300 bg-amber-300/5 px-1 rounded border border-amber-300/10',
    search: 'text-emerald-300 bg-emerald-500/5 px-1 rounded border border-emerald-500/10',
    info: 'text-gray-400'
  };

  return (
    <span className={`${colors[log.type] || colors.info} flex-1`}>
      {getIcon()}
      <span className="break-all">{log.message}</span>
    </span>
  );
};

export default LogViewer;
