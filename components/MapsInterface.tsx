
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { MapPlace } from '../services/types';

interface MapsInterfaceProps {
  onClose: () => void;
}

const MapsInterface: React.FC<MapsInterfaceProps> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<MapPlace[]>([]);
  const [answer, setAnswer] = useState('');
  // Correct the state structure to match LatLng required by the SDK.
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => console.warn("Location access denied", err)
      );
    }
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setResults([]);
    setAnswer('');

    try {
      // Create a new GoogleGenAI instance right before making an API call.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        // Maps grounding is only supported in Gemini 2.5 series models.
        model: "gemini-2.5-flash",
        contents: query,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: userLocation || { latitude: 37.78193, longitude: -122.40476 }
            }
          }
        },
      });

      setAnswer(response.text || 'لم يتم العثور على رد نصي محدد.');

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const places: MapPlace[] = chunks
          .filter((chunk: any) => chunk.maps)
          .map((chunk: any) => ({
            title: chunk.maps.title,
            uri: chunk.maps.uri,
          }));
        setResults(places);
      }

    } catch (error: any) {
      console.error("Maps search failed:", error);
      setAnswer(`خطأ في النظام: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center p-6 animate-in fade-in duration-500 overflow-y-auto">
      <button 
        onClick={onClose}
        className="absolute top-8 left-8 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 flex items-center justify-center transition-all z-20"
      >
        <i className="fas fa-times"></i>
      </button>

      <div className="max-w-4xl w-full space-y-12 py-10">
        <header className="text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/20 mx-auto mb-6 border border-blue-400/30 animate-bounce">
            <i className="fas fa-map-location-dot text-3xl text-white"></i>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter mb-4">Celia Maps</h2>
          <p className="text-gray-400 font-medium">مستكشف المواقع الجغرافي المدعوم بالذكاء الاصطناعي.</p>
        </header>

        <div className="bg-white/5 border border-white/10 p-2 rounded-3xl flex items-center pr-6 shadow-2xl backdrop-blur-md">
          <i className="fas fa-search text-blue-500 ml-4"></i>
          <input 
            type="text"
            className="flex-1 bg-transparent border-none outline-none py-4 text-white placeholder:text-gray-600 font-medium"
            placeholder="عن ماذا تبحث؟ (مثلاً: أقرب صيدلية، مطاعم في الرياض...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white px-10 py-4 rounded-2xl font-bold transition-all ml-2 shadow-lg shadow-blue-600/20 active:scale-95"
          >
            {isSearching ? <i className="fas fa-circle-notch fa-spin"></i> : 'استكشاف'}
          </button>
        </div>

        {(answer || results.length > 0) && (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
            {answer && (
              <div className="bg-blue-500/5 border border-blue-500/10 p-8 rounded-[2.5rem] text-gray-300 leading-relaxed font-medium shadow-inner">
                <p className="whitespace-pre-wrap">{answer}</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {results.map((place, idx) => (
                  <a 
                    key={idx}
                    href={place.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-blue-600/10 hover:border-blue-500/40 transition-all group backdrop-blur-sm"
                  >
                    <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center mr-4 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg">
                      <i className="fas fa-location-dot text-blue-400 group-hover:text-white"></i>
                    </div>
                    <div className="flex-1 text-right">
                      <h4 className="text-white font-bold mb-1 group-hover:text-blue-300 transition-colors">{place.title}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest group-hover:text-blue-400/80">فتح في خرائط جوجل</p>
                    </div>
                    <i className="fas fa-chevron-left text-gray-700 mr-4 group-hover:text-blue-400 transform group-hover:-translate-x-1 transition-all"></i>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapsInterface;
