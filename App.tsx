
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, PosterData, TemplateStyle, LayoutType, TextEffect, PosterAspect, UserProfile } from './types';
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
  const [isSaving, setIsSaving] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  
  // Real App: Initialize with Firebase Auth
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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

  const handleLogin = () => {
    // Logic: firebase.auth().signInWithPopup(googleProvider)
    const mockUser: UserProfile = {
        uid: "user_123",
        name: "John Faith",
        email: "john@grace.com",
        phone: "+1 234 567 890",
        isPro: false,
        savedDesignsCount: 5,
        lastLogin: new Date().toISOString()
    };
    setUser(mockUser);
  };

  const handleSaveToCloud = async () => {
    if (!user) {
        handleLogin();
        return;
    }
    setIsSaving(true);
    // Logic: await firestore.collection('designs').add({ ...data, userId: user.uid })
    await new Promise(r => setTimeout(r, 1500)); // Mock delay
    setIsSaving(false);
    alert("Saved successfully to your GraceLens cloud account!");
  };

  const handleGoPro = () => {
    setShowPricing(true);
    setIsUserMenuOpen(false);
  };

  // Pricing Modal Component
  const PricingModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden relative border border-slate-100">
            <button onClick={() => setShowPricing(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={20} />
            </button>
            
            <div className="p-8 pt-12 text-center">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Crown size={32} />
                </div>
                <h2 className="text-3xl font-bold text-slate-900">Upgrade to Pro</h2>
                <p className="text-slate-500 mt-2">Unlock unlimited cloud storage and HD downloads.</p>
                
                <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-3 text-left p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <ShieldCheck className="text-green-500" />
                        <div>
                            <p className="font-bold text-slate-800">Unlimited Cloud Saves</p>
                            <p className="text-xs text-slate-500">Keep all your designs forever.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-left p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <Wand2 className="text-blue-500" />
                        <div>
                            <p className="font-bold text-slate-800">Premium AI Textures</p>
                            <p className="text-xs text-slate-500">Exclusive access to new abstract styles.</p>
                        </div>
                    </div>
                </div>

                <div className="mt-10 mb-2">
                    <div className="text-4xl font-black text-slate-900">$4.99<span className="text-sm font-medium text-slate-400">/month</span></div>
                </div>

                <button 
                    onClick={() => alert("Redirecting to Stripe Checkout...")}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-200 mt-4 group"
                >
                    <CreditCard size={20} /> Pay Safely with Stripe
                </button>
                <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-widest flex items-center justify-center gap-1">
                    <ShieldCheck size={10} /> Secure SSL Encrypted Payment
                </p>
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {showPricing && <PricingModal />}
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
             {user ? (
                <div className="relative">
                    <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm hover:border-blue-400 transition-all">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">{user.name[0]}</div>
                        <span className="text-xs font-bold text-slate-700 hidden sm:inline">{user.name}</span>
                        {user.isPro && <Crown size={12} className="text-amber-500" />}
                    </button>
                    {isUserMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in slide-in-from-top-2">
                            <div className="p-5 border-b border-slate-50 bg-slate-50/50">
                                <p className="font-bold text-slate-900">{user.name}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1"><Phone size={10} /> {user.phone}</p>
                                {!user.isPro && (
                                    <button onClick={handleGoPro} className="mt-4 w-full bg-amber-100 text-amber-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-200 transition-all">
                                        <Crown size={14} /> Upgrade to Pro
                                    </button>
                                )}
                            </div>
                            <div className="p-2">
                                <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2"><Cloud size={14} /> My Cloud Designs</button>
                                <button onClick={() => setUser(null)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"><LogOut size={14} /> Sign Out</button>
                            </div>
                        </div>
                    )}
                </div>
             ) : (
                <button onClick={handleLogin} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-black transition-all shadow-lg">
                    <LogIn size={14} /> Sign In
                </button>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 flex flex-col items-center gap-8">
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
                <button onClick={handleSaveToCloud} disabled={isSaving} className={`flex-none w-16 ${isSaving ? 'bg-slate-100' : 'bg-green-50'} text-green-600 border border-green-100 py-4 rounded-2xl font-bold flex justify-center items-center`}>
                    {isSaving ? <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div> : <Save size={20} />}
                </button>
                <button onClick={() => navigator.share && navigator.share({title: 'My Poster', text: 'Created with GraceLens'})} className="flex-none w-16 bg-white text-slate-700 border-2 border-slate-100 py-4 rounded-2xl font-bold flex justify-center items-center"><Share2 size={20} /></button>
            </div>
        </div>

        <EditorPanel data={data} onUpdate={updateData} />
      </main>

      <footer className="bg-white border-t border-slate-200 mt-12 py-8 text-center">
        <p className="text-slate-400 text-sm font-medium">&copy; {new Date().getFullYear()} GraceLens. Built with Firebase & Stripe.</p>
        <div className="flex justify-center gap-6 mt-4">
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter flex items-center gap-1"><Cloud size={10}/> Data Encrypted</span>
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter flex items-center gap-1"><ShieldCheck size={10}/> Payment Secure</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
