
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Job, JobStatus, LogEntry } from './services/types';
import JobSidebar from './components/JobSidebar';
import JobView from './components/JobView';
import NewJobModal from './components/NewJobModal';
import LiveInterface from './components/LiveInterface';
import VideoInterface from './components/VideoInterface';
import ImageInterface from './components/ImageInterface';
import MapsInterface from './components/MapsInterface';
import { apiService } from './services/apiService';
import { simulateAgentExecution } from './services/geminiService';

const App: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isMapsOpen, setIsMapsOpen] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(true);
  
  const activeJob = jobs.find(j => j.id === activeJobId) || null;

  const fetchJobsList = useCallback(async () => {
    try {
      const data = await apiService.listJobs();
      setIsBackendOnline(true);
      setJobs(prev => {
        const simulationJobs = prev.filter(j => j.is_simulation);
        const apiJobs = data.map((j: any) => ({ ...j, is_simulation: false }));
        const merged = [...apiJobs];
        simulationJobs.forEach(sim => {
          if (!merged.find(m => m.id === sim.id)) merged.push(sim);
        });
        return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      });
    } catch (err) {
      setIsBackendOnline(false);
      console.warn("Backend API not reachable. Simulation mode active.");
    }
  }, []);

  useEffect(() => {
    fetchJobsList();
    const interval = setInterval(fetchJobsList, 10000);
    return () => clearInterval(interval);
  }, [fetchJobsList]);

  const handleCreateJob = async (task: string, repo?: string, persona?: string, useSearch?: boolean) => {
    try {
      if (!isBackendOnline) throw new Error("Backend offline");
      
      const { job_id } = await apiService.createJob(task, repo);
      setIsModalOpen(false);
      await fetchJobsList();
      setActiveJobId(job_id);
    } catch (err) {
      // Logic for Simulation Mode (Offline Fallback)
      const mockId = "sim-" + Math.random().toString(36).substr(2, 6);
      const newJob: Job = {
        id: mockId,
        task,
        persona,
        use_search: useSearch,
        repo_url: repo,
        status: 'running',
        created_at: new Date().toISOString(),
        logs: `[${new Date().toLocaleTimeString('ar-EG')}] [SYSTEM] المحرك الخلفي غير متصل. بدء المحاكاة المحلية المستقلة...\n`,
        files: [],
        is_simulation: true
      };
      
      setJobs(prev => [newJob, ...prev]);
      setActiveJobId(mockId);
      setIsModalOpen(false);

      simulateAgentExecution(task, repo, persona, useSearch,
        (log) => {
          setJobs(prev => prev.map(j => 
            j.id === mockId ? { ...j, logs: j.logs + `[${log.timestamp}] ${log.message}\n` } : j
          ));
        },
        (files) => {
          setJobs(prev => prev.map(j => 
            j.id === mockId ? { ...j, status: 'completed', files: files } : j
          ));
        }
      );
    }
  };

  const handleDeleteJob = (id: string) => {
    if (!confirm("حذف المهمة؟")) return;
    setJobs(prev => prev.filter(j => j.id !== id));
    if (activeJobId === id) setActiveJobId(null);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 font-sans" dir="rtl">
      <JobSidebar 
        jobs={jobs} 
        activeJobId={activeJobId} 
        onSelectJob={setActiveJobId} 
        onNewJob={() => setIsModalOpen(true)}
        onDeleteJob={handleDeleteJob}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 glass z-10">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <i className="fas fa-robot text-white text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Celia <span className="text-indigo-400">Agent</span></h1>
            </div>
            {!isBackendOnline && (
              <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded-md border border-amber-500/20 font-bold animate-pulse">
                Offline Mode
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3 space-x-reverse">
            <button onClick={() => setIsMapsOpen(true)} className="btn-header"><i className="fas fa-map"></i> <span>Maps</span></button>
            <button onClick={() => setIsImageOpen(true)} className="btn-header"><i className="fas fa-image"></i> <span>Vision</span></button>
            <button onClick={() => setIsVideoOpen(true)} className="btn-header"><i className="fas fa-video"></i> <span>Video</span></button>
            <button onClick={() => setIsLiveOpen(true)} className="btn-header-active"><i className="fas fa-microphone-lines animate-pulse"></i> <span>Live</span></button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-950/50 relative z-10">
          {activeJob ? <JobView job={activeJob} /> : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12">
              <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
                <i className="fas fa-terminal text-4xl text-indigo-500 opacity-50"></i>
              </div>
              <h2 className="text-3xl font-bold mb-4 text-white tracking-tighter">مرحباً بك في Celia AI</h2>
              <p className="text-gray-400 max-w-lg mb-10 leading-relaxed font-medium">ابدأ مهمة برمجية جديدة أو استكشف قدرات Celia المتعددة.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20 active:scale-95">مهمة برمجية جديدة</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {isModalOpen && <NewJobModal onClose={() => setIsModalOpen(false)} onSubmit={handleCreateJob} />}
      {isLiveOpen && <LiveInterface onClose={() => setIsLiveOpen(false)} persona={activeJob?.persona} />}
      {isVideoOpen && <VideoInterface onClose={() => setIsVideoOpen(false)} />}
      {isImageOpen && <ImageInterface onClose={() => setIsImageOpen(false)} />}
      {isMapsOpen && <MapsInterface onClose={() => setIsMapsOpen(false)} />}

      <style>{`
        .btn-header { @apply bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-4 py-2 rounded-xl text-[10px] font-bold border border-white/5 transition-all flex items-center space-x-2 space-x-reverse; }
        .btn-header-active { @apply bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center space-x-2 space-x-reverse; }
      `}</style>
    </div>
  );
};

export default App;
