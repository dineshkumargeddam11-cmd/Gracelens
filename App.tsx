
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, PosterData, TemplateStyle, LayoutType, TextEffect, PosterAspect } from './types';
import { DEFAULT_BACKGROUNDS, AVAILABLE_FONTS, SUPPORTED_LANGUAGES, UI_TRANSLATIONS } from './constants';
import { generateBackground } from './services/geminiService';
import PosterPreview from './components/PosterPreview';
import EditorPanel from './components/EditorPanel';
import { Download, Share2, BookOpen, Calendar, AlertTriangle, Image as ImageIcon, Upload, ChevronRight, ChevronLeft, Sparkles, Languages, Wand2, Cross, RectangleVertical, Square, Monitor, Youtube, Palette, User, LogIn, Save, Crown, LogOut, ShieldCheck, CreditCard, X, Cloud, Phone } from 'lucide-react';

const App: React.FC = () => {
  const posterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadField, setActiveUploadField] = useState<keyof PosterData | null>(null);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  
  const [data, setData] = useState<PosterData>({
    mode: AppMode.VERSE,
    verseReference: "John 3:16",
    verseReferenceEnglish: "John 3:16",
    verseText: "For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.",
    eventTitle: "Sunday Service",
    eventDetails: "Sunday, 9:00 AM\nMain Sanctuary\nPastor John Doe",
    language: "English",
    interfaceLanguage: "en",
    template: TemplateStyle.NATURE,
    layout: LayoutType.RIGHT_CORNER,
    posterAspect: PosterAspect.PORTRAIT,
    backgroundImageUrl: DEFAULT_BACKGROUNDS[TemplateStyle.NATURE],
    uploadedPhotoUrl: null,
    logoUrl: null,
    customName: "",
    fontFamily: AVAILABLE_FONTS[1].value,
    textColor: "#FFFFFF",
    textEffect: TextEffect.SHADOW_SOFT,
    textPosition: { x: 50, y: 50 },
    textWidth: 80,
    textScale: 1.0, 
    logoPosition: { x: 10, y: 10 },
    logoWidth: 16,
    photoPosition: { x: 90, y: 10 },
    photoWidth: 24,
  });

  const updateData = (newData: Partial<PosterData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  // Fix: Added missing handleAiBackgroundGen function to resolve errors in lines 209 and 212
  const handleAiBackgroundGen = async (type: 'abstract' | 'realistic') => {
    setIsGeneratingBg(true);
    try {
      const contextText = data.mode === AppMode.VERSE ? data.verseText : data.eventTitle;
      const imageUrl = await generateBackground(data.template, type, contextText);
      if (imageUrl) {
        updateData({ backgroundImageUrl: imageUrl });
      }
    } catch (error) {
      console.error("Background generation error:", error);
    } finally {
      setIsGeneratingBg(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
        if (e.target.files && e.target.files[0] && activeUploadField) {
            const reader = new FileReader();
            reader.onload = (ev) => updateData({ [activeUploadField]: ev.target?.result as string });
            reader.readAsDataURL(e.target.files[0]);
        }
      }} />

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-auto py-3 flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3 group cursor-pointer">
             <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-20 group-hover:opacity-40 rounded-full"></div>
                <div className="relative bg-slate-900 rounded-xl p-2 shadow-lg flex items-center justify-center">
                   <Cross className="text-cyan-400 w-full h-full" />
                </div>
             </div>
             <div className="flex flex-col">
                <h1 className="text-2xl font-bold tracking-tight font-[Orbitron]">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600">GraceLens</span>
                </h1>
                <span className="text-[10px] font-bold text-slate-400 uppercase -mt-1 tracking-widest">PRO DESIGNER</span>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Sign in removed */}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 flex flex-col items-center gap-8">
        {/* Mode Switcher */}
        <div className="flex bg-slate-200/50 p-1 rounded-2xl w-full max-w-sm shadow-inner border border-slate-200">
            <button 
                onClick={() => updateData({ mode: AppMode.VERSE })}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${data.mode === AppMode.VERSE ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <BookOpen size={16} /> Bible Verse
            </button>
            <button 
                onClick={() => updateData({ mode: AppMode.EVENT })}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${data.mode === AppMode.EVENT ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Calendar size={16} /> Event Poster
            </button>
        </div>

        {/* Preview Area */}
        <div className="relative w-fit flex flex-col items-center gap-6">
            <PosterPreview data={data} ref={posterRef} onTriggerUpload={(f) => { setActiveUploadField(f); fileInputRef.current?.click(); }} onUpdateData={updateData} />
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleAiBackgroundGen('abstract')} disabled={isGeneratingBg} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl font-bold shadow-lg hover:scale-[1.01] transition-all flex flex-col items-center gap-1 disabled:opacity-50">
                    <div className="flex items-center gap-2"><Palette size={18} /> <span>Abstract Art</span></div>
                </button>
                <button onClick={() => handleAiBackgroundGen('realistic')} disabled={isGeneratingBg} className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:scale-[1.01] transition-all flex flex-col items-center gap-1 disabled:opacity-50">
                    <div className="flex items-center gap-2"><Wand2 size={18} /> <span>Smart Scene</span></div>
                </button>
            </div>

            <div className="flex gap-3 w-full">
                <button onClick={() => posterRef.current && window.html2canvas(posterRef.current).then(c => { const a = document.createElement('a'); a.download='poster.png'; a.href=c.toDataURL(); a.click(); })} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold flex justify-center items-center gap-2 shadow-xl hover:bg-black"><Download size={20} /> Download</button>
                <button onClick={() => navigator.share && navigator.share({title: 'My Poster', text: 'Created with GraceLens'})} className="flex-none w-16 bg-white text-slate-700 border-2 border-slate-100 py-4 rounded-2xl font-bold flex justify-center items-center"><Share2 size={20} /></button>
            </div>
        </div>

        <EditorPanel data={data} onUpdate={updateData} />
      </main>

      <footer className="bg-white border-t border-slate-200 mt-12 py-8 text-center">
        <p className="text-slate-400 text-sm font-medium">&copy; {new Date().getFullYear()} GraceLens. Create and share spiritual posters.</p>
      </footer>
    </div>
  );
};

export default App;
