
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

interface VideoInterfaceProps {
  onClose: () => void;
}

const VideoInterface: React.FC<VideoInterfaceProps> = ({ onClose }) => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    // Check if AI Studio key is selected
    if ((window as any).aistudio?.hasSelectedApiKey) {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    }
  };

  const handleOpenSelectKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true); // Proceed assuming success as per prompt instructions
    }
  };

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setVideoUrl(null);
    setStatusMessage('جاري تحليل الطلب والبدء في المعالجة العصبية...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      setStatusMessage('جاري توليد الفيديو عبر نموذج Veo 3.1... قد يستغرق هذا عدة دقائق.');
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      const loadingMessages = [
        'جاري رسم المشاهد الأولية...',
        'تطبيق التناسق الحركي المتقدم...',
        'تحسين جودة الإطارات والظلال...',
        'المسات النهائية للإنتاج الإبداعي...',
        'تجهيز ملف الفيديو للتحميل...'
      ];
      let msgIndex = 0;

      while (!operation.done) {
        setStatusMessage(loadingMessages[msgIndex % loadingMessages.length]);
        msgIndex++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        try {
          operation = await ai.operations.getVideosOperation({ operation: operation });
        } catch (opError: any) {
          if (opError.message?.includes("Requested entity was not found")) {
            setHasApiKey(false);
            throw new Error("حدث خطأ في ترخيص مفتاح API. يرجى اختيار مفتاح صالح من مشروع مدفوع.");
          }
          throw opError;
        }
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const videoBlob = await videoResponse.blob();
        setVideoUrl(URL.createObjectURL(videoBlob));
        setStatusMessage('اكتمل التوليد بنجاح! ✨');
      } else {
        throw new Error('لم يتم العثور على رابط تحميل للفيديو.');
      }
    } catch (error: any) {
      console.error('Video Generation Error:', error);
      setStatusMessage(`فشل التوليد: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 overflow-y-auto">
      <button 
        onClick={onClose}
        className="absolute top-8 left-8 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 flex items-center justify-center transition-all z-10"
      >
        <i className="fas fa-times"></i>
      </button>

      <div className="max-w-4xl w-full flex flex-col items-center">
        <header className="text-center mb-12">
          <div className="w-20 h-20 bg-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/20 mx-auto mb-6 border border-purple-400/30">
            <i className="fas fa-film text-3xl text-white"></i>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter mb-4">Celia Video Engine</h2>
          <p className="text-gray-400 max-w-lg mx-auto">توليد فيديوهات سينمائية عالية الجودة باستخدام نموذج Veo 3.1 المتطور.</p>
        </header>

        {!hasApiKey ? (
          <div className="bg-purple-900/10 border border-purple-500/20 p-10 rounded-[2.5rem] text-center max-w-xl w-full">
            <i className="fas fa-key text-4xl text-purple-400 mb-6"></i>
            <h3 className="text-xl font-bold text-white mb-4">تنشيط محرك الفيديو</h3>
            <p className="text-sm text-gray-400 mb-8 leading-relaxed">
              لاستخدام محرك Veo، يجب عليك تحديد مفتاح API خاص بك من مشروع GCP مدفوع.
              تأكد من مراجعة <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-purple-400 underline">وثائق الفوترة</a>.
            </p>
            <button 
              onClick={handleOpenSelectKey}
              className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-purple-600/20 flex items-center justify-center space-x-3 space-x-reverse mx-auto"
            >
              <i className="fas fa-plug"></i>
              <span>ربط بـ Google AI Studio</span>
            </button>
          </div>
        ) : (
          <div className="w-full space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
              <label className="block text-[11px] font-bold text-purple-400 uppercase tracking-[0.2em] mb-4 mr-2">وصف المشهد (Visual Prompt)</label>
              <textarea
                className="w-full bg-slate-950/50 border border-white/5 rounded-3xl p-6 text-white text-base focus:outline-none focus:ring-2 focus:ring-purple-600/50 transition-all resize-none h-40 leading-relaxed placeholder:text-gray-700"
                placeholder="مثال: لقطة سينمائية لغابة سحرية تتوهج فيها الأشجار باللون الأزرق النيون في الليل..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
              />
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <span className="text-[10px] bg-purple-600/20 text-purple-300 px-3 py-1.5 rounded-lg border border-purple-500/20 font-bold">1080p / 16:9</span>
                  <span className="text-[10px] bg-white/5 text-gray-500 px-3 py-1.5 rounded-lg border border-white/5 font-bold">نموذج Veo 3.1 Fast</span>
                </div>
                <button 
                  onClick={handleGenerateVideo}
                  disabled={isGenerating || !prompt.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-purple-600/20 flex items-center space-x-3 space-x-reverse"
                >
                  {isGenerating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                  <span>{isGenerating ? 'جاري التوليد...' : 'توليد الفيديو'}</span>
                </button>
              </div>
            </div>

            {statusMessage && (
              <div className={`p-4 rounded-xl border flex items-center space-x-3 space-x-reverse text-sm font-medium animate-pulse ${
                statusMessage.includes('فشل') ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
              }`}>
                {isGenerating && <i className="fas fa-circle-notch fa-spin text-purple-500"></i>}
                <span>{statusMessage}</span>
              </div>
            )}

            {videoUrl && (
              <div className="relative group rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-black">
                <video 
                  src={videoUrl} 
                  controls 
                  autoPlay 
                  loop 
                  className="w-full aspect-video"
                />
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a 
                    href={videoUrl} 
                    download="celia-generated-video.mp4"
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-bold border border-white/10 flex items-center space-x-2 space-x-reverse"
                  >
                    <i className="fas fa-download"></i>
                    <span>تحميل الفيديو</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoInterface;
