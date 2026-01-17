
import React from 'react';
import { Job } from '../types';

interface JobSidebarProps {
  jobs: Job[];
  activeJobId: string | null;
  onSelectJob: (id: string) => void;
  onNewJob: () => void;
  onDeleteJob: (id: string) => void;
}

const JobSidebar: React.FC<JobSidebarProps> = ({ jobs, activeJobId, onSelectJob, onNewJob, onDeleteJob }) => {
  const handleClearAll = () => {
    if (confirm("هل أنت متأكد من مسح جميع سجلات المهام؟ هذا الإجراء لا يمكن التراجع عنه.")) {
      jobs.forEach(j => onDeleteJob(j.id));
    }
  };

  return (
    <aside className="w-80 border-l border-white/5 bg-slate-950/80 backdrop-blur-md flex flex-col">
      <div className="p-6 border-b border-white/5 space-y-3">
        <button 
          onClick={onNewJob}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-4 rounded-xl flex items-center justify-center space-x-3 space-x-reverse transition-all font-bold shadow-lg shadow-indigo-600/10 active:scale-95"
        >
          <i className="fas fa-plus"></i>
          <span>مهمة جديدة</span>
        </button>
        {jobs.length > 0 && (
          <button 
            onClick={handleClearAll}
            className="w-full bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 py-2 px-4 rounded-xl flex items-center justify-center space-x-2 space-x-reverse transition-all text-[10px] font-bold border border-white/5"
          >
            <i className="fas fa-broom"></i>
            <span>مسح السجل بالكامل</span>
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-6 px-2">سجل المهام</h3>
          <div className="space-y-3">
            {jobs.length === 0 ? (
              <div className="text-gray-600 text-sm text-center py-12 flex flex-col items-center opacity-50">
                <i className="fas fa-folder-open text-3xl mb-3"></i>
                <p>لا يوجد سجلات حالياً</p>
              </div>
            ) : (
              jobs.map(job => (
                <div key={job.id} className="relative group px-1">
                  <button
                    onClick={() => onSelectJob(job.id)}
                    className={`w-full text-right p-4 rounded-2xl border transition-all duration-300 ${
                      activeJobId === job.id 
                        ? 'bg-indigo-600/10 border-indigo-500/50 shadow-xl shadow-indigo-500/5' 
                        : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-gray-500 font-mono opacity-60">#{job.id}</span>
                      <StatusBadge status={job.status} />
                    </div>
                    <h4 className={`text-sm font-semibold truncate mb-2 ${activeJobId === job.id ? 'text-indigo-300' : 'text-gray-300'}`}>
                      {job.task}
                    </h4>
                    <div className="flex items-center text-[10px] text-gray-500">
                      <i className="far fa-clock ml-1.5 opacity-60"></i>
                      <span>{new Date(job.created_at).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteJob(job.id); }}
                    className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 p-2 text-gray-600 hover:text-red-500 transition-all z-20 hover:bg-red-500/10 rounded-lg"
                    title="حذف المهمة"
                  >
                    <i className="fas fa-trash-alt text-xs"></i>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-white/5 bg-slate-950/40">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 border border-white/20 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
             <i className="fas fa-user-shield text-white text-sm"></i>
          </div>
          <div>
            <p className="text-sm font-bold text-white">مسؤول النظام</p>
            <p className="text-[10px] text-indigo-400/70 font-bold uppercase tracking-tighter">Celia V2.5 Pro</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

const StatusBadge: React.FC<{ status: Job['status'] }> = ({ status }) => {
  const configs = {
    pending: { color: 'bg-amber-500/20 text-amber-500', icon: 'fa-clock', label: 'قيد الانتظار' },
    running: { color: 'bg-indigo-500/20 text-indigo-400', icon: 'fa-spinner fa-spin', label: 'قيد التنفيذ' },
    completed: { color: 'bg-emerald-500/20 text-emerald-400', icon: 'fa-check-circle', label: 'مكتمل' },
    failed: { color: 'bg-rose-500/20 text-rose-400', icon: 'fa-exclamation-triangle', label: 'فشل' },
  };

  const config = configs[status];
  return (
    <span className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide ${config.color} border border-white/5`}>
      <i className={`fas ${config.icon}`}></i>
      <span>{config.label}</span>
    </span>
  );
};

export default JobSidebar;
