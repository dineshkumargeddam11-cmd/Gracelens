import React, { useState, useRef, useEffect } from 'react';
import { AppMode, PosterData, TemplateStyle, TextEffect } from '../types';
import { CONTENT_LANGUAGES, DEFAULT_BACKGROUNDS, AVAILABLE_FONTS, UI_TRANSLATIONS, SUPPORTED_LANGUAGES, INPUT_METHOD_CODES } from '../constants';
import { fetchVerse } from '../services/bibleService';
import { translateText, translateReference, recommendFonts, interpretVerseReference } from '../services/geminiService';
import { Search, Sparkles, Type, Calendar, Palette, ChevronDown, Globe, BookOpen, Wand2, ChevronLeft, ChevronRight, Keyboard, PenTool } from 'lucide-react';

interface Props {
  data: PosterData;
  onUpdate: (data: Partial<PosterData>) => void;
}

const EditorPanel: React.FC<Props> = ({ data, onUpdate }) => {
  const [verseQuery, setVerseQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Font AI State
  const [isAiFontMode, setIsAiFontMode] = useState(false);
  const [fontAiQuery, setFontAiQuery] = useState("");
  const [isGeneratingFont, setIsGeneratingFont] = useState(false);
  const [suggestedFonts, setSuggestedFonts] = useState<string[]>([]);
  
  // Font Carousel State
  const [fontPage, setFontPage] = useState(0);
  const FONTS_PER_PAGE = 6;
  const totalFontPages = Math.ceil(AVAILABLE_FONTS.length / FONTS_PER_PAGE);
  
  // State for custom dropdowns
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Transliteration State
  const [isTransliterationEnabled, setIsTransliterationEnabled] = useState(true);

  const LIGHT_COLORS = [
    "#FFFFFF", "#F1F5F9", "#FEF08A", "#BAE6FD", "#FECDD3", "#BBF7D0", "#E9D5FF"
  ];
  const DARK_COLORS = [
    "#000000", "#334155", "#1E3A8A", "#881337", "#14532D", "#581C87", "#451A03"
  ];

  // New Gradient Colors
  const GRADIENT_COLORS = [
    "linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)", // Gold
    "linear-gradient(to right, #D7D7D7, #FFFFFF, #EAEAEA, #C0C0C0)", // Silver
    "linear-gradient(to right, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)", // Rose
    "linear-gradient(to right, #4facfe 0%, #00f2fe 100%)", // Blue
    "linear-gradient(135deg, #FFF 0%, #000 100%)", // Mono
    "linear-gradient(to right, #f83600 0%, #f9d423 100%)", // Fire
  ];

  const TEXT_EFFECTS = [
    { id: TextEffect.NONE, label: 'None', style: {} },
    { id: TextEffect.SHADOW_SOFT, label: 'Soft', style: { textShadow: '0 2px 4px rgba(0,0,0,0.4)' } },
    { id: TextEffect.SHADOW_HARD, label: 'Bold', style: { textShadow: '2px 2px 0 #000' } },
    { id: TextEffect.OUTLINE, label: 'Outline', style: { WebkitTextStroke: '1px black', color: 'transparent' } },
    { id: TextEffect.NEON, label: 'Neon', style: { textShadow: '0 0 5px #fff, 0 0 10px currentColor' } },
    { id: TextEffect.RETRO, label: 'Retro', style: { textShadow: '2px 2px 0 #ccc, 4px 4px 0 #999' } },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helpers
  const currentLangCode = data.interfaceLanguage || 'en';
  const t = (key: keyof typeof UI_TRANSLATIONS['en']) => {
    // @ts-ignore - dynamic key access
    return UI_TRANSLATIONS[currentLangCode]?.[key] || UI_TRANSLATIONS['en'][key] || key;
  };

  // --- Transliteration Logic ---
  const handleTransliterate = async (word: string): Promise<string> => {
    const code = INPUT_METHOD_CODES[data.language];
    if (!code || !word) return word;

    try {
        const response = await fetch(`https://inputtools.google.com/request?text=${word}&itc=${code}&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`);
        const json = await response.json();
        // Structure: ["SUCCESS", [ [ "input_word", [ "suggestion1", ... ] ] ] ]
        if (json[0] === 'SUCCESS' && json[1] && json[1][0] && json[1][0][1]) {
            return json[1][0][1][0]; // Return the first suggestion
        }
    } catch (e) {
        console.error("Transliteration failed", e);
    }
    return word;
  };

  // Reusable Smart Input Handler for Transliteration
  const handleSmartInput = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    currentValue: string,
    updateState: (val: string) => void
  ) => {
    const newVal = e.target.value;
    
    // Determine the last character typed (or delimiter)
    const delimiter = newVal.slice(-1);
    const isDelimiter = delimiter === ' ' || delimiter === '\n'; // Handle Space or Enter
    
    if (isTransliterationEnabled && data.language !== 'English' && isDelimiter) {
        const textBeforeDelimiter = newVal.slice(0, -1);
        const match = textBeforeDelimiter.match(/([^\s]+)$/); // Find last word
        
        if (match) {
            const lastWord = match[1];
            // Only convert if it's alphanumeric (English typing)
            if (/^[a-zA-Z0-9]+$/.test(lastWord)) {
                const translated = await handleTransliterate(lastWord);
                if (translated !== lastWord) {
                    const prefix = textBeforeDelimiter.substring(0, textBeforeDelimiter.length - lastWord.length);
                    updateState(prefix + translated + delimiter);
                    return;
                }
            }
        }
    }
    
    updateState(newVal);
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleSmartInput(e, verseQuery, setVerseQuery);
  };

  // --- Language Change & Auto-Translate Logic ---
  const handleLanguageChange = async (newLang: string) => {
    // 1. Update Language State immediately
    onUpdate({ language: newLang });
    setIsLangOpen(false);

    // 2. Trigger Auto-Translation
    if (!process.env.API_KEY) return;
    setIsTranslating(true);
    
    try {
        if (data.mode === AppMode.EVENT) {
            // Translate both fields in parallel if they have content
            const promises: Promise<string>[] = [];
            
            if (data.eventTitle && data.eventTitle.trim()) {
                promises.push(translateText(data.eventTitle, newLang));
            } else {
                promises.push(Promise.resolve(data.eventTitle));
            }
            
            if (data.eventDetails && data.eventDetails.trim()) {
                promises.push(translateText(data.eventDetails, newLang));
            } else {
                promises.push(Promise.resolve(data.eventDetails));
            }

            const [newTitle, newDetails] = await Promise.all(promises);
            onUpdate({ eventTitle: newTitle, eventDetails: newDetails });

        } else if (data.mode === AppMode.VERSE) {
            // Verse Mode: Translate Text and Reference
            if (data.verseText && data.verseText.trim()) {
                 const [translatedText, translatedRef] = await Promise.all([
                    translateText(data.verseText, newLang),
                    // Use English ref as source if available to prevent drift
                    translateReference(data.verseReferenceEnglish || data.verseReference, newLang)
                 ]);
                 onUpdate({ verseText: translatedText, verseReference: translatedRef });
            }
        }
    } catch (e) {
        console.error("Auto-translation failed", e);
    } finally {
        setIsTranslating(false);
    }
  };

  // -----------------------------

  const handleSearchVerse = async () => {
    if (!verseQuery) return;
    setIsSearching(true);
    
    // Find the Bible Version ID for the current language
    const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === data.interfaceLanguage);
    const bibleVersion = langConfig?.bibleVersion || 'web'; // Default to WEB (English)

    // INTERCEPT: If the query is likely not English (because user typed in localized language),
    // we need to convert it to English Reference first (e.g. "मार्क 3:7" -> "Mark 3:7")
    // otherwise the API will fail.
    let searchQuery = verseQuery;
    if (data.language !== 'English' && /[^\x00-\x7F]/.test(verseQuery)) {
        searchQuery = await interpretVerseReference(verseQuery);
        console.log("Interpreted Search Query:", searchQuery);
    }

    // Pass the standard English version to fetchVerse
    const result = await fetchVerse(searchQuery, bibleVersion);
    setIsSearching(false);

    if (result) {
      // 1. Initially set what we got. 
      // Assumption: The API returns standard English refs usually, or we treat it as the "Source" ref.
      onUpdate({ 
        verseText: result.text,
        verseReference: result.reference, 
        verseReferenceEnglish: result.reference 
      });
      
      // 2. If the user has explicitly selected a Target Language that is NOT English,
      // translate the text AND reference.
      // NOTE: We also pass the *User's Typed Query* (verseQuery) as the potential reference 
      // if it was already in the target language!
      if (data.language !== 'English') {
         // If the user typed in the target language (e.g. Hindi), use that as the display reference immediately
         // otherwise translate it.
         if (/[^\x00-\x7F]/.test(verseQuery)) {
             // User typed localized ref, use it!
             onUpdate({ verseReference: verseQuery });
             // Just translate text
             const translatedText = await translateText(result.text, data.language);
             onUpdate({ verseText: translatedText });
         } else {
             // User typed English ref, so translate everything
             handleTranslate(result.text, data.language, result.reference);
         }
      }
    } else {
      alert(`Verse not found for "${searchQuery}". Try format 'John 3:16'`);
    }
  };

  const handleTranslate = async (text: string, langName: string, ref: string) => {
    setIsTranslating(true);
    
    // 1. Translate the Text
    const translatedTextPromise = translateText(text, langName);
    
    // 2. Translate the Reference explicitly if not English
    let translatedRefPromise = Promise.resolve(ref);
    if (langName !== 'English') {
        translatedRefPromise = translateReference(ref, langName);
    }

    const [translatedText, translatedRef] = await Promise.all([translatedTextPromise, translatedRefPromise]);

    // 3. Update State:
    onUpdate({ 
        verseText: translatedText, 
        verseReference: translatedRef, 
        verseReferenceEnglish: ref // Preserves the source/English ref
    });
    
    setIsTranslating(false);
  };

  const handleAiFontGeneration = async () => {
    if (!fontAiQuery.trim()) return;
    setIsGeneratingFont(true);
    const result = await recommendFonts(fontAiQuery);
    setIsGeneratingFont(false);

    if (result.fontValues.length > 0) {
      setSuggestedFonts(result.fontValues);
      onUpdate({ fontFamily: result.fontValues[0] });
      if (result.suggestedColor) {
        onUpdate({ textColor: result.suggestedColor });
      }
      setIsAiFontMode(false); 
    } else {
      alert("Could not find matching fonts.");
    }
  };

  const handleTemplateChange = (style: TemplateStyle) => {
    onUpdate({ 
      template: style,
      backgroundImageUrl: DEFAULT_BACKGROUNDS[style]
    });
  };

  const nextFontPage = () => {
    if (fontPage < totalFontPages - 1) {
        setFontPage(prev => prev + 1);
    }
  };

  const prevFontPage = () => {
    if (fontPage > 0) {
        setFontPage(prev => prev - 1);
    }
  };

  const currentFonts = AVAILABLE_FONTS.slice(fontPage * FONTS_PER_PAGE, (fontPage + 1) * FONTS_PER_PAGE);

  const TransliterationToggle = ({ minimal = false }) => (
    INPUT_METHOD_CODES[data.language] ? (
        <button 
            onClick={() => setIsTransliterationEnabled(!isTransliterationEnabled)}
            className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${isTransliterationEnabled ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}
            title={`When enabled, typing phonetically in English + Spacebar converts text to ${data.language}`}
        >
            <Keyboard size={10} /> 
            {minimal ? 'Typing ON' : `${data.language} Typing ${isTransliterationEnabled ? 'ON' : 'OFF'}`}
        </button>
    ) : null
  );

  return (
    <div className="space-y-6 p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
      
      {/* Header */}
      <div className="pb-2">
        <h2 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
          {data.mode === AppMode.VERSE ? <Sparkles className="w-6 h-6 text-gold" /> : <Calendar className="w-6 h-6 text-blue-500" />}
          <span className="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            {data.mode === AppMode.VERSE ? t('verse_editor') : t('event_editor')}
          </span>
        </h2>
        <p className="text-slate-400 text-sm mt-1">{t('customize_msg')}</p>
      </div>

      {/* RICH LANGUAGE SELECTOR (CONTENT LANGUAGE) */}
      <div className="relative group z-30" ref={langDropdownRef}>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
          <Globe size={12} /> Target Language
        </label>
        <button 
          onClick={() => setIsLangOpen(!isLangOpen)}
          className="w-full flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-300 hover:shadow-md transition-all group-hover:ring-2 group-hover:ring-blue-50"
        >
          <span className="font-semibold text-slate-800">{data.language}</span>
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isLangOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 max-h-60 overflow-y-auto p-1.5 z-40 animate-in fade-in zoom-in-95 duration-200">
            {CONTENT_LANGUAGES.map(lang => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${data.language === lang ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Input */}
      {data.mode === AppMode.VERSE ? (
        <div className="space-y-4">
          
          {/* RICH FIND VERSE SEARCH BAR */}
          <div className="relative z-20">
            <div className="flex justify-between items-end mb-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <BookOpen size={12} /> {t('find_verse')}
                </label>
                
                {/* Transliteration Toggle Badge */}
                <TransliterationToggle />
            </div>
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder={isTransliterationEnabled && data.language !== 'English' ? `Type in ${data.language} (e.g. mark...)` : t('search_placeholder')}
                className="w-full pl-10 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-800 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                value={verseQuery}
                onChange={handleQueryChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchVerse()}
              />
              <button 
                onClick={handleSearchVerse}
                disabled={isSearching}
                className="absolute right-2 top-2 p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
              >
                {isSearching ? <span className="block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span> : <ChevronDown className="rotate-[-90deg]" size={16} />}
              </button>
            </div>
            {isTransliterationEnabled && data.language !== 'English' && (
                <p className="text-[10px] text-slate-400 mt-1 pl-1">Tip: Type phonetically and press <b>Space</b> to convert to {data.language}.</p>
             )}
          </div>
          
          <div className="space-y-0 shadow-sm rounded-xl overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-blue-50 focus-within:border-blue-300 transition-all">
             <textarea 
               className="w-full p-4 h-28 text-base bg-slate-900 text-white placeholder-slate-400 resize-none outline-none font-serif leading-relaxed"
               value={data.verseText}
               onChange={(e) => onUpdate({ verseText: e.target.value })}
               placeholder={t('verse_text_placeholder')}
             />
             <div className="bg-slate-800 px-4 py-2 border-t border-slate-700 flex items-center gap-2">
               <span className="text-xs font-bold text-slate-400 uppercase">Ref:</span>
               <input 
                 type="text"
                 className="flex-1 bg-transparent text-sm font-bold text-slate-200 outline-none placeholder-slate-500"
                 value={data.verseReference}
                 onChange={(e) => onUpdate({ verseReference: e.target.value })}
                 placeholder="Genesis 1:1"
               />
               {isTranslating && <span className="text-xs text-blue-400 font-medium animate-pulse">Translating...</span>}
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                    {t('event_title')}
                    {isTranslating && data.mode === AppMode.EVENT && <span className="text-[10px] text-blue-500 font-normal ml-2 animate-pulse">Translating...</span>}
                </label>
                <TransliterationToggle />
            </div>
            <input 
              type="text" 
              placeholder="e.g. Youth Worship Night"
              className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl shadow-sm font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-900/50 transition-all placeholder:text-slate-500"
              value={data.eventTitle}
              onChange={(e) => handleSmartInput(e, data.eventTitle, (v) => onUpdate({ eventTitle: v }))}
            />
          </div>
          <div className="relative">
             <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                    {t('event_details')}
                    {isTranslating && data.mode === AppMode.EVENT && <span className="text-[10px] text-blue-500 font-normal ml-2 animate-pulse">Translating...</span>}
                </label>
                {/* Added visual indicator for Details as requested by user */}
                {isTransliterationEnabled && data.language !== 'English' && INPUT_METHOD_CODES[data.language] && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                        <Keyboard size={8} /> Typing ON
                    </span>
                )}
             </div>
             <textarea 
               placeholder={t('event_details_placeholder')}
               className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl shadow-sm h-28 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-900/50 transition-all resize-none text-white placeholder:text-slate-500"
               value={data.eventDetails}
               onChange={(e) => handleSmartInput(e, data.eventDetails, (v) => onUpdate({ eventDetails: v }))}
             />
             {isTransliterationEnabled && data.language !== 'English' && (
                <p className="text-[10px] text-slate-500 mt-1 pl-1">Phonetic typing active (Space or Enter to convert).</p>
             )}
          </div>
        </div>
      )}

      {/* Typography Section */}
      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 relative z-10">
        <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Palette size={12} /> {t('typography')}
            </label>
            
            {/* AI Font Generator Toggle */}
            <button 
                onClick={() => setIsAiFontMode(!isAiFontMode)}
                className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 transition-colors ${isAiFontMode ? 'bg-purple-100 text-purple-700 font-bold' : 'text-slate-400 hover:bg-slate-100'}`}
                title="Generate AI Font Recommendations"
            >
                <Wand2 size={12} /> AI Fonts
            </button>
        </div>
        
        {/* AI Font Input Area */}
        {isAiFontMode && (
             <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                <input 
                    type="text" 
                    placeholder="Describe mood (e.g. 'Spooky', 'Retro', 'Elegant')..."
                    className="flex-1 px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100"
                    value={fontAiQuery}
                    onChange={(e) => setFontAiQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiFontGeneration()}
                />
                <button 
                    onClick={handleAiFontGeneration}
                    disabled={isGeneratingFont}
                    className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                    {isGeneratingFont ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Sparkles size={16} />}
                </button>
             </div>
        )}

        {/* Font Slider (Paginated Grid) */}
        <div className="relative bg-white border border-slate-200 rounded-xl shadow-sm p-2 overflow-hidden">
             <div className="flex justify-between items-center mb-2 px-1">
                <button 
                  onClick={prevFontPage}
                  disabled={fontPage === 0}
                  className="p-1 rounded-full hover:bg-slate-100 disabled:opacity-30 transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Font ({fontPage + 1}/{totalFontPages})
                </span>
                <button 
                  onClick={nextFontPage}
                  disabled={fontPage === totalFontPages - 1}
                  className={`p-1 rounded-full hover:bg-slate-100 disabled:opacity-30 transition-colors ${fontPage < totalFontPages - 1 ? 'animate-pulse text-blue-500' : ''}`}
                >
                    <ChevronRight size={20} />
                </button>
             </div>

             <div className="grid grid-cols-2 gap-2">
                {currentFonts.map((font) => (
                    <button
                        key={font.name}
                        onClick={() => onUpdate({ fontFamily: font.value })}
                        className={`p-2.5 rounded-lg border text-center transition-all h-14 flex items-center justify-center ${data.fontFamily === font.value ? 'bg-blue-50 border-blue-400 text-blue-700 ring-1 ring-blue-100' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-white hover:border-blue-200'}`}
                        title={font.name}
                    >
                        <span className="truncate w-full text-sm" style={{ fontFamily: font.value.split(',')[0].replace(/'/g, "") }}>
                            {font.name.split('(')[0].trim()}
                        </span>
                    </button>
                ))}
             </div>
             
             {/* Pagination Dots */}
             <div className="flex justify-center gap-1.5 mt-2">
                {Array.from({ length: totalFontPages }).map((_, i) => (
                    <div 
                        key={i} 
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${i === fontPage ? 'bg-slate-800' : 'bg-slate-300'}`} 
                    />
                ))}
             </div>
        </div>

        {/* Color Palette & Gradient */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
           {/* Color Header + Custom Picker */}
           <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('text_color')}</label>
              <div className="flex items-center gap-2">
                 <div className="w-5 h-5 rounded-full border border-slate-200 shadow-inner overflow-hidden relative cursor-pointer ring-1 ring-offset-1 ring-slate-100">
                   <input 
                     type="color" 
                     value={data.textColor.startsWith('linear') ? '#ffffff' : data.textColor}
                     onChange={(e) => onUpdate({ textColor: e.target.value })}
                     className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer p-0 opacity-0" 
                   />
                   <div className="w-full h-full" style={{ background: data.textColor }}></div>
                 </div>
              </div>
           </div>

           {/* Color Grid */}
           <div className="space-y-3">
              <div className="flex justify-between">
                {LIGHT_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => onUpdate({ textColor: color })}
                    className={`w-6 h-6 rounded-full border transition-all ${data.textColor === color ? 'ring-2 ring-blue-500 scale-110 border-white' : 'border-slate-200 hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex justify-between">
                {DARK_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => onUpdate({ textColor: color })}
                    className={`w-6 h-6 rounded-full border transition-all ${data.textColor === color ? 'ring-2 ring-blue-500 scale-110 border-white' : 'border-slate-200 hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              
              {/* Gradient Options */}
              <div className="pt-2 border-t border-slate-100">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Gradients</p>
                 <div className="flex justify-between">
                    {GRADIENT_COLORS.map((gradient, i) => (
                        <button
                            key={i}
                            onClick={() => onUpdate({ textColor: gradient })}
                            className={`w-6 h-6 rounded-full border transition-all ${data.textColor === gradient ? 'ring-2 ring-blue-500 scale-110 border-white' : 'border-slate-200 hover:scale-110'}`}
                            style={{ background: gradient }}
                            title="Gradient"
                        />
                    ))}
                 </div>
              </div>
           </div>

           <div className="h-px bg-slate-100 w-full my-2"></div>

           {/* Text Effects Selector */}
           <div className="pt-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t('text_effects')}</label>
              <div className="grid grid-cols-3 gap-2">
                 {TEXT_EFFECTS.map((effect) => (
                    <button
                        key={effect.id}
                        onClick={() => onUpdate({ textEffect: effect.id })}
                        className={`text-xs py-2 px-1 rounded-lg border transition-all font-medium ${data.textEffect === effect.id ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200'}`}
                        style={{ fontFamily: 'sans-serif' }}
                    >
                        <span style={effect.style as any}>Aa</span> {effect.label}
                    </button>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Custom Name - HIGHLIGHTED */}
      <div className="space-y-2 pt-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <PenTool size={12} className="text-blue-500" />
            {t('footer_label')}
        </label>
        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm focus-within:ring-4 focus-within:ring-blue-100 transition-all">
          <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600 border border-blue-100">
             <Type size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Add your Family or Church Name..."
            className="flex-1 outline-none bg-transparent text-sm font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-normal"
            value={data.customName}
            onChange={(e) => onUpdate({ customName: e.target.value })}
          />
        </div>
      </div>

      {/* Template Selection */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('theme')}</label>
        <div className="grid grid-cols-5 gap-3">
          {Object.values(TemplateStyle).map((style) => (
            <button
              key={style}
              onClick={() => handleTemplateChange(style)}
              className={`group relative w-full aspect-[3/4] rounded-xl border-2 transition-all shadow-sm overflow-hidden ${data.template === style ? 'border-blue-600 ring-2 ring-blue-100 scale-105' : 'border-transparent hover:border-blue-200 hover:scale-105'}`}
              title={style}
            >
               {/* Use Real Image Thumbnail */}
               <div className="w-full h-full bg-cover bg-center transition-transform group-hover:scale-110 duration-700"
                    style={{ backgroundImage: `url(${DEFAULT_BACKGROUNDS[style]})` }}
               ></div>
               
               {/* Label Overlay */}
               <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4 flex justify-center">
                  <span className="text-[9px] font-bold text-white uppercase tracking-wider">{style}</span>
               </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;