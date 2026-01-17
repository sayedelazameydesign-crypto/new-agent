
import React, { useState } from 'react';

interface NewJobModalProps {
  onClose: () => void;
  onSubmit: (task: string, repo?: string, persona?: string, useSearch?: boolean) => void;
}

const NewJobModal: React.FC<NewJobModalProps> = ({ onClose, onSubmit }) => {
  const [task, setTask] = useState('');
  const [repo, setRepo] = useState('');
  const [persona, setPersona] = useState('');
  const [useSearch, setUseSearch] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) return;
    onSubmit(task, repo.trim() || undefined, persona.trim() || undefined, useSearch);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md">
      <div className="absolute inset-0 bg-slate-950/80" onClick={onClose}></div>
      
      <div className="relative bg-slate-900 border border-white/10 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">تهيئة مهمة جديدة</h2>
            <p className="text-xs text-gray-500 font-medium">قم بتحديد الأهداف والتعليمات للوكيل الذكي</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-all flex items-center justify-center">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 mr-2">الهدف الرئيسي للمهمة</label>
            <textarea
              required
              autoFocus
              className="w-full bg-slate-950/50 border border-white/5 rounded-3xl p-6 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all resize-none h-32 leading-relaxed placeholder:text-gray-700"
              placeholder="مثال: قم بتحليل كود المصدر وتحسين أداء الدوال الثقيلة..."
              value={task}
              onChange={(e) => setTask(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="flex items-center space-x-3 space-x-reverse">
              <i className="fas fa-globe text-indigo-400"></i>
              <div>
                <p className="text-xs font-bold text-gray-200">تمكين البحث في الويب</p>
                <p className="text-[9px] text-gray-500">استخدام Google Search لجلب أحدث البيانات</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setUseSearch(!useSearch)}
              className={`w-12 h-6 rounded-full transition-all relative ${useSearch ? 'bg-indigo-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${useSearch ? 'right-7' : 'right-1'}`}></div>
            </button>
          </div>

          <div>
            <button 
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-2 space-x-reverse transition-colors mb-4"
            >
              <i className={`fas ${showAdvanced ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
              <span>إعدادات متقدمة</span>
            </button>
            
            {showAdvanced && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-2 mr-2">شخصية الوكيل (Persona)</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-6 py-4 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
                    placeholder="مثال: خبير أمن سيبراني..."
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-2 mr-2">رابط المستودع</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-6 py-4 text-white text-xs font-mono"
                    placeholder="https://github.com/..."
                    dir="ltr"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex space-x-4 space-x-reverse">
            <button 
              type="submit"
              disabled={!task.trim()}
              className="flex-[2] px-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center space-x-3 space-x-reverse"
            >
              <i className="fas fa-rocket"></i>
              <span>إرسال الوكيل</span>
            </button>
            <button type="button" onClick={onClose} className="flex-1 px-6 py-4 bg-white/5 text-gray-300 rounded-2xl font-bold border border-white/5">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewJobModal;
