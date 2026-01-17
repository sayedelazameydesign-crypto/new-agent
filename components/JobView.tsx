
import React, { useState, useMemo } from 'react';
import { Job, LogEntry, JobFile } from '../types';
import LogViewer from './LogViewer';
import { apiService } from '../services/apiService';

interface JobViewProps {
  job: Job;
}

const JobView: React.FC<JobViewProps> = ({ job }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'files'>('logs');

  const formattedLogs = useMemo(() => {
    return job.logs.split('\n').filter(l => l.trim()).map((line) => {
      let type: LogEntry['type'] = 'info';
      let message = line;
      let timestamp = '';

      const tsMatch = line.match(/^\[(.*?)\]\s*(.*)$/);
      if (tsMatch) {
        timestamp = tsMatch[1].includes('T') ? tsMatch[1].split('T')[1].split('.')[0] : tsMatch[1];
        message = tsMatch[2];
      }

      if (message.includes('[ERROR]') || message.toLowerCase().includes('failed')) type = 'error';
      else if (message.includes('[SUCCESS]') || message.toLowerCase().includes('completed')) type = 'success';
      else if (message.includes('[GIT]')) type = 'git';
      else if (message.includes('[BRAIN]')) type = 'brain';
      else if (message.includes('[PLAN]') || message.includes('[STEP')) type = 'plan';
      else if (message.includes('[SYSTEM]') || message.includes('[CMD]')) type = 'process';

      return { timestamp, message, type } as LogEntry;
    });
  }, [job.logs]);

  return (
    <div className="h-full flex flex-col">
      {/* Header Panel */}
      <div className="px-8 py-8 bg-white/5 border-b border-white/5 backdrop-blur-md">
        <div className="flex items-start justify-between mb-8">
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center space-x-3 space-x-reverse">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">مهمة نشطة</span>
              {job.is_simulation && (
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                  <i className="fas fa-bolt mr-1"></i> محاكاة محلية
                </span>
              )}
              <span className="text-[10px] font-mono text-gray-500">ID: {job.id}</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight leading-normal">{job.task}</h2>
            {job.repo_url && (
              <div className="flex items-center text-xs text-indigo-300 bg-indigo-500/5 w-fit px-4 py-2 rounded-xl border border-indigo-500/10 hover:bg-indigo-500/10 transition-colors">
                <i className="fab fa-github ml-2 text-indigo-400/70"></i>
                <code className="text-indigo-400/90 font-mono tracking-tight">{job.repo_url}</code>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end space-y-4">
             <StatusLarge status={job.status} />
             <div className="text-[10px] text-gray-500 font-bold bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                بدأت في {new Date(job.created_at).toLocaleString('ar-EG')}
             </div>
          </div>
        </div>

        <div className="flex items-center space-x-10 space-x-reverse">
          <TabButton 
            active={activeTab === 'logs'} 
            onClick={() => setActiveTab('logs')}
            icon="fa-terminal"
            label="سجل التنفيذ (Console)"
            count={formattedLogs.length}
          />
          <TabButton 
            active={activeTab === 'files'} 
            onClick={() => setActiveTab('files')}
            icon="fa-box-open"
            label="الملفات والنتائج (Artifacts)"
            count={job.files.length}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'logs' ? (
          <LogViewer logs={formattedLogs} />
        ) : (
          <FileBrowser jobId={job.id} files={job.files} isSimulation={!!job.is_simulation} />
        )}
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string; count: number }> = ({ active, onClick, icon, label, count }) => (
  <button 
    onClick={onClick}
    className={`group flex items-center space-x-3 space-x-reverse pb-4 border-b-2 transition-all duration-300 relative ${
      active 
        ? 'border-indigo-500 text-indigo-400' 
        : 'border-transparent text-gray-500 hover:text-gray-300'
    }`}
  >
    <i className={`fas ${icon} text-sm ${active ? 'animate-pulse' : ''}`}></i>
    <span className="text-sm font-bold tracking-wide">{label}</span>
    {count > 0 && (
      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors ${active ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-500 group-hover:bg-white/10'}`}>
        {count}
      </span>
    )}
  </button>
);

const StatusLarge: React.FC<{ status: Job['status'] }> = ({ status }) => {
    const configs = {
      pending: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: 'fa-hourglass-start', label: 'بانتظار الموارد' },
      running: { color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20', icon: 'fa-sync-alt fa-spin', label: 'جاري المعالجة الذكية' },
      completed: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: 'fa-check-double', label: 'المهمة مكتملة' },
      failed: { color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20', icon: 'fa-shield-virus', label: 'حدث خطأ' },
    };
    const config = configs[status];
    return (
        <div className={`px-6 py-3 rounded-2xl border ${config.border} ${config.bg} ${config.color} text-[11px] font-bold uppercase tracking-widest flex items-center space-x-3 space-x-reverse shadow-2xl shadow-black/40`}>
            <i className={`fas ${config.icon}`}></i>
            <span>{config.label}</span>
        </div>
    );
};

const FileBrowser: React.FC<{ jobId: string; files: (string | JobFile)[]; isSimulation: boolean }> = ({ jobId, files, isSimulation }) => {
  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-gray-600 bg-[#020617]">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-10 border border-white/10">
           <i className="fas fa-folder-open text-4xl opacity-10"></i>
        </div>
        <p className="text-xl font-bold text-gray-400 mb-3">مساحة العمل فارغة حالياً</p>
        <p className="text-sm text-gray-500 max-w-xs text-center leading-relaxed">لم يتم إنشاء أي ملفات دائمة حتى الآن. Celia لا يزال يعالج الهدف المطلوب.</p>
      </div>
    );
  }

  return (
    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 h-full overflow-y-auto custom-scrollbar bg-[#020617]">
      {files.map((file, idx) => {
        const fileName = typeof file === 'string' ? file.split('/').pop() || file : file.name;
        const filePath = typeof file === 'string' ? file : file.path;
        const fileSize = typeof file === 'string' ? 'Unknown size' : file.size || 'Unknown size';
        
        // Simulations don't have real download URLs usually, so we mock or handle locally
        const downloadUrl = isSimulation ? '#' : apiService.getDownloadUrl(jobId, fileName);
        
        return (
          <div 
            key={idx} 
            className="group relative bg-white/5 border border-white/5 p-6 rounded-3xl flex flex-col space-y-5 hover:border-indigo-500/40 hover:bg-white/10 transition-all duration-500 overflow-hidden shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-all border border-indigo-500/10">
                <i className="fas fa-file-code text-xl text-indigo-400"></i>
              </div>
              {!isSimulation && (
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-indigo-400 transition-colors">
                  <i className="fas fa-download text-sm"></i>
                </a>
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-bold text-gray-200 truncate group-hover:text-white transition-colors text-right" dir="ltr">{fileName}</p>
              <p className="text-[10px] text-gray-500 font-bold truncate uppercase tracking-tighter opacity-60 group-hover:opacity-100 transition-opacity">
                {isSimulation ? 'أصل برمجى مُحاكى' : 'جاهز للتحميل'}
              </p>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-white/5">
               <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{fileSize}</span>
               <span className="text-[9px] text-indigo-400/70 font-bold">ملف مُنتج</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default JobView;
