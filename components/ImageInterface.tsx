
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';

interface ImageInterfaceProps {
  onClose: () => void;
}

const ImageInterface: React.FC<ImageInterfaceProps> = ({ onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim() && !sourceImage) return;

    setIsGenerating(true);
    setStatus('جاري استدعاء المحرك البصري...');
    
    try {
      // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const contents: any = {
        parts: [{ text: prompt || "تحسين الصورة وتعديلها بناءً على النمط العصبي" }]
      };

      if (sourceImage) {
        const base64Data = sourceImage.split(',')[1];
        contents.parts.unshift({
          inlineData: {
            data: base64Data,
            mimeType: "image/png"
          }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: contents,
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      let foundImage = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        setStatus('اكتملت المعالجة ولكن لم يتم العثور على صورة في النتيجة.');
      } else {
        setStatus('اكتمل التوليد البصري بنجاح.');
      }

    } catch (err: any) {
      console.error(err);
      setStatus(`خطأ: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 overflow-y-auto">
      <button 
        onClick={onClose}
        className="absolute top-8 left-8 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 flex items-center justify-center transition-all z-20"
      >
        <i className="fas fa-times"></i>
      </button>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Control Panel */}
        <div className="space-y-8 flex flex-col justify-center">
          <header className="text-right">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-6 border border-emerald-400/30">
              <i className="fas fa-wand-magic-sparkles text-2xl text-white"></i>
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter mb-2">Celia Vision</h2>
            <p className="text-gray-400">توليد وتعديل الصور باستخدام الذكاء الاصطناعي التوليدي.</p>
          </header>

          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
               <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-4 mr-1">وصف الصورة أو التعديل</label>
               <textarea 
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none h-32"
                 placeholder="اكتب وصفاً لما تريد رؤيته..."
               />
            </div>

            <div className="flex space-x-4 space-x-reverse">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white px-6 py-4 rounded-2xl font-bold border border-white/10 transition-all flex items-center justify-center space-x-3 space-x-reverse"
              >
                <i className="fas fa-upload"></i>
                <span>رفع صورة مرجعية</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
              
              <button 
                onClick={generateImage}
                disabled={isGenerating || (!prompt && !sourceImage)}
                className="flex-[1.5] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center space-x-3 space-x-reverse"
              >
                {isGenerating ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-bolt"></i>}
                <span>توليد</span>
              </button>
            </div>
            
            {status && (
              <div className="text-[11px] font-bold text-emerald-400/70 text-center animate-pulse tracking-widest uppercase">
                {status}
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="relative flex items-center justify-center min-h-[400px]">
          <div className="absolute inset-0 bg-emerald-500/5 rounded-[3rem] blur-3xl animate-pulse"></div>
          
          <div className="relative w-full aspect-square bg-slate-900 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl flex items-center justify-center">
            {generatedImage ? (
              <img src={generatedImage} alt="Generated" className="w-full h-full object-cover animate-in zoom-in duration-500" />
            ) : sourceImage ? (
              <div className="relative w-full h-full">
                <img src={sourceImage} alt="Source" className="w-full h-full object-cover opacity-50 grayscale" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold bg-black/60 px-6 py-3 rounded-full border border-white/20 backdrop-blur-md">بانتظار التعديل...</span>
                </div>
              </div>
            ) : (
              <div className="text-center p-12 space-y-4">
                <i className="fas fa-image text-6xl text-white/5 mb-4"></i>
                <p className="text-gray-600 text-sm font-medium">سيظهر المخرج البصري هنا</p>
              </div>
            )}

            {generatedImage && (
              <div className="absolute bottom-6 right-6 flex space-x-2 space-x-reverse">
                <a 
                  href={generatedImage} 
                  download="celia-vision.png"
                  className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/10 transition-all"
                  title="تحميل"
                >
                  <i className="fas fa-download"></i>
                </a>
                <button 
                  onClick={() => setGeneratedImage(null)}
                  className="w-12 h-12 bg-rose-500/10 hover:bg-rose-500/20 backdrop-blur-md rounded-xl flex items-center justify-center text-rose-400 border border-rose-500/10 transition-all"
                  title="مسح"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageInterface;
