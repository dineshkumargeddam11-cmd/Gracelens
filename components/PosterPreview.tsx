import React, { forwardRef, useMemo, useState, useEffect } from 'react';
import { PosterData, AppMode, TemplateStyle, LayoutType, TextEffect } from '../types';
import { POSTER_DIMENSIONS } from '../constants';
import { Upload, Camera, Image as ImageIcon, Move, ArrowRightLeft, Maximize } from 'lucide-react';

interface Props {
  data: PosterData;
  scale?: number;
  onTriggerUpload?: (field: keyof PosterData) => void;
  onUpdateData?: (newData: Partial<PosterData>) => void;
}

// Extracted DraggableElement to fix TS error and improve performance
interface DraggableElementProps {
    position: { x: number, y: number };
    children: React.ReactNode;
    width?: number;
    resizable?: boolean;
    isActive: boolean;
    onMouseDown: (e: React.MouseEvent, action: 'drag' | 'resize' | 'scale') => void;
}

const DraggableElement: React.FC<DraggableElementProps> = ({ 
    position, 
    children, 
    width, 
    resizable = false,
    isActive,
    onMouseDown
}) => (
  <div 
      className="absolute z-50 group/element flex flex-col items-center justify-center cursor-move"
      style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          width: width ? `${width}%` : 'auto',
          transform: 'translate(-50%, -50%)',
          userSelect: 'none'
      }}
      onMouseDown={(e) => onMouseDown(e, 'drag')}
  >
      {/* Border indicating selected/hover */}
      <div className={`absolute -inset-2 border-2 border-dashed border-blue-400 rounded-lg pointer-events-none transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover/element:opacity-100'}`}></div>
      
      {/* Move Handle (Visual) */}
      <div className={`absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-2 py-0.5 rounded-t-md text-[9px] font-bold uppercase flex items-center gap-1 transition-opacity duration-200 pointer-events-none ${isActive ? 'opacity-100' : 'opacity-0 group-hover/element:opacity-100'}`}>
          <Move size={10} /> Move
      </div>

      {/* Resize Handles */}
      {resizable && (
          <>
              {/* Width Resize Handle (Right) */}
              <div 
                  className={`absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-10 bg-blue-500 rounded-md cursor-ew-resize flex items-center justify-center shadow-lg transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover/element:opacity-100'}`}
                  onMouseDown={(e) => onMouseDown(e, 'resize')}
                  title="Drag to resize width"
              >
                  <ArrowRightLeft size={14} className="text-white" />
              </div>
              
              {/* Scale/Size Handle (Bottom Right) */}
              <div 
                  className={`absolute -right-4 -bottom-4 w-8 h-8 bg-blue-600 rounded-full cursor-nwse-resize flex items-center justify-center shadow-lg transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover/element:opacity-100'}`}
                  onMouseDown={(e) => onMouseDown(e, 'scale')}
                  title="Drag to scale"
              >
                  <Maximize size={14} className="text-white" />
              </div>
          </>
      )}

      {children}
  </div>
);

const PosterPreview = forwardRef<HTMLDivElement, Props>(({ data, scale = 1, onTriggerUpload, onUpdateData }, ref) => {
  // Styles based on template
  const getTemplateStyles = () => {
    switch (data.template) {
      case TemplateStyle.MINIMAL:
        return { overlay: "bg-white/90", textBase: "text-slate-900" };
      case TemplateStyle.NATURE:
        return { overlay: "bg-black/20", textBase: "text-white" };
      case TemplateStyle.ABSTRACT:
        return { overlay: "bg-purple-900/40", textBase: "text-white" };
      case TemplateStyle.GOLDEN:
        return { overlay: "bg-black/60", textBase: "text-amber-100" };
      case TemplateStyle.GRADIENT:
        return { overlay: "bg-gradient-to-t from-blue-900/80 via-transparent to-transparent", textBase: "text-white" };
      default:
        return { overlay: "bg-black/40", textBase: "text-white" };
    }
  };

  const styles = getTemplateStyles();

  // Helper to generate text styles based on Effect
  const getTextEffectStyles = (effect: TextEffect, color: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      fontFamily: data.fontFamily,
      color: color,
    };

    if (color.startsWith('linear-gradient')) {
        base.backgroundImage = color;
        base.backgroundClip = 'text';
        base.WebkitBackgroundClip = 'text';
        base.WebkitTextFillColor = 'transparent';
        base.color = 'transparent'; 
    }

    switch (effect) {
      case TextEffect.SHADOW_SOFT:
        return { ...base, textShadow: '0 4px 8px rgba(0,0,0,0.5)' };
      case TextEffect.SHADOW_HARD:
        return { ...base, textShadow: '3px 3px 0px rgba(0,0,0,1)' };
      case TextEffect.OUTLINE:
        return { 
          ...base, 
          WebkitTextStroke: `1px ${color === '#000000' ? '#ffffff' : '#000000'}`, 
          textShadow: 'none' 
        };
      case TextEffect.NEON:
        return { 
          ...base, 
          textShadow: `0 0 5px #fff, 0 0 10px ${color}, 0 0 20px ${color}` 
        };
      case TextEffect.RETRO:
        return { ...base, textShadow: '2px 2px 0 #d1d5db, 4px 4px 0 #9ca3af' };
      case TextEffect.ELEGANT:
        return { ...base, textShadow: '0px 1px 0px rgba(255,255,255,0.4), 0px -1px 0px rgba(0,0,0,0.4)' };
      case TextEffect.GLITCH:
        return { ...base, textShadow: '2px 0 rgba(255,0,0,0.5), -2px 0 rgba(0,0,255,0.5)' };
      case TextEffect.NONE:
      default:
        return base;
    }
  };

  const textStyle = getTextEffectStyles(data.textEffect, data.textColor);
  const accentStyle: React.CSSProperties = {
    fontFamily: data.fontFamily,
    color: data.textColor.startsWith('linear-gradient') ? '#ffffff' : data.textColor,
    opacity: 0.9,
    textShadow: '0px 1px 2px rgba(0,0,0,0.5)',
  };

  // Dynamic dimensions based on aspect ratio
  const dimensions = POSTER_DIMENSIONS[data.posterAspect] || { width: 400, height: 500 };
  const baseWidth = dimensions.width;
  const baseHeight = dimensions.height;

  // --- Intelligent Highlighting Logic ---
  const highlightedKeywords = useMemo(() => {
    if (data.mode !== AppMode.VERSE || !data.verseText) return new Set<string>();

    const text = data.verseText;
    const commonStopWords = new Set(['the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but', 'his', 'from', 'they', 'we', 'say', 'her', 'she', 'will', 'an', 'one', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'are', 'is', 'was', 'be', 'been', 'being']);
    const christianKeywords = new Set(['god', 'jesus', 'lord', 'christ', 'holy', 'spirit', 'father', 'faith', 'love', 'grace', 'mercy', 'peace', 'joy', 'hope', 'life', 'light', 'truth', 'heart', 'soul', 'pray', 'bless', 'glory', 'saved', 'world', 'son', 'heaven', 'believe', 'eternal', 'word', 'king', 'cross', 'blood', 'lamb', 'shepherd']);
    const words = text.split(/[\s,.!?;:"'-]+/); 
    const candidates = words.map((w, i) => {
        const clean = w.toLowerCase();
        let score = 0;
        if (clean.length < 3) return { word: clean, score: 0 };
        if (christianKeywords.has(clean)) score += 20;
        if (!commonStopWords.has(clean)) score += clean.length;
        if (w.length > 0 && w[0] === w[0].toUpperCase() && /^[A-Z]/.test(w)) score += 5;
        return { word: clean, score };
    });
    const sorted = candidates.filter(c => c.score > 0).sort((a, b) => b.score - a.score);
    const topWords = new Set<string>();
    for (const c of sorted) {
        if (topWords.size >= 3) break;
        topWords.add(c.word);
    }
    return topWords;
  }, [data.verseText, data.mode]);

  const highlightStyle = useMemo(() => {
    const isBaseScript = data.fontFamily.includes('cursive') || data.fontFamily.includes('Vibes') || data.fontFamily.includes('Script') || data.fontFamily.includes('Pacifico');
    const font = isBaseScript ? "'Cinzel', serif" : "'Great Vibes', cursive";
    const isDarkText = data.textColor === '#000000' || data.textColor.startsWith('#0') || data.textColor.startsWith('#1') || data.textColor.startsWith('#3');
    const color = isDarkText ? '#B45309' : '#FCD34D';
    return {
        fontFamily: font,
        color: color,
        fontWeight: isBaseScript ? 'bold' : 'normal',
        textShadow: isDarkText ? 'none' : '0 0 10px rgba(252, 211, 77, 0.5)',
    };
  }, [data.fontFamily, data.textColor]);

  // --- Generic Draggable Logic ---
  const [activeDragId, setActiveDragId] = useState<'text' | 'logo' | 'photo' | null>(null);
  const [dragAction, setDragAction] = useState<'drag' | 'resize' | 'scale'>('drag');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Track initial values on drag start to calculate deltas accurately
  const [initialScale, setInitialScale] = useState(1);
  const [initialWidth, setInitialWidth] = useState(0);
  
  const handleMouseDown = (e: React.MouseEvent, id: 'text' | 'logo' | 'photo', action: 'drag' | 'resize' | 'scale') => {
    e.stopPropagation();
    setActiveDragId(id);
    setDragAction(action);
    setDragStart({ x: e.clientX, y: e.clientY });
    
    // Capture initial values depending on what is being resized
    if (action === 'scale' && id === 'text') {
        setInitialScale(data.textScale || 1);
    }
    
    // For resizing Width
    if (action === 'resize' || (action === 'scale' && id !== 'text')) {
        if (id === 'text') setInitialWidth(data.textWidth);
        if (id === 'logo') setInitialWidth(data.logoWidth || 16);
        if (id === 'photo') setInitialWidth(data.photoWidth || 24);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeDragId) return;
      if (!onUpdateData) return;

      const deltaX = (e.clientX - dragStart.x) / scale;
      const deltaY = (e.clientY - dragStart.y) / scale;

      // Convert pixels to percentage relative to canvas
      const deltaXPercent = (deltaX / baseWidth) * 100;
      const deltaYPercent = (deltaY / baseHeight) * 100;

      if (activeDragId === 'text') {
          if (dragAction === 'drag') {
            onUpdateData({
              textPosition: {
                x: Math.max(0, Math.min(100, data.textPosition.x + deltaXPercent)),
                y: Math.max(0, Math.min(100, data.textPosition.y + deltaYPercent)),
              }
            });
          } else if (dragAction === 'resize') {
            onUpdateData({
                textWidth: Math.max(20, Math.min(100, initialWidth + deltaXPercent))
            });
          } else if (dragAction === 'scale') {
             // For Text, Scale affects font size
             const scaleDelta = (deltaX + deltaY) * 0.005; 
             const newScale = Math.max(0.5, Math.min(3.0, initialScale + scaleDelta));
             onUpdateData({ textScale: newScale });
          }
      } else if (activeDragId === 'logo') {
          if (dragAction === 'drag') {
             onUpdateData({
                logoPosition: {
                    x: Math.max(0, Math.min(100, (data.logoPosition?.x || 10) + deltaXPercent)),
                    y: Math.max(0, Math.min(100, (data.logoPosition?.y || 10) + deltaYPercent))
                }
            });
          } else if (dragAction === 'resize' || dragAction === 'scale') {
             // For Logo, Scale/Resize affects Width
             onUpdateData({
                logoWidth: Math.max(5, Math.min(60, initialWidth + deltaXPercent))
             });
          }
      } else if (activeDragId === 'photo') {
          if (dragAction === 'drag') {
             onUpdateData({
                photoPosition: {
                    x: Math.max(0, Math.min(100, (data.photoPosition?.x || 90) + deltaXPercent)),
                    y: Math.max(0, Math.min(100, (data.photoPosition?.y || 10) + deltaYPercent))
                }
            });
          } else if (dragAction === 'resize' || dragAction === 'scale') {
             // For Photo, Scale/Resize affects Width
             onUpdateData({
                photoWidth: Math.max(10, Math.min(90, initialWidth + deltaXPercent))
             });
          }
      }

      if (dragAction === 'drag') {
          // Continuous drag update logic requires resetting start for smooth movement if we were adding delta directly to current pos.
          // BUT here we add delta to the *initial* pos if we captured it, OR we add delta to current and reset start.
          // Current logic: data.pos + delta. 
          // To prevent compounding error with rapid updates, typical React drag pattern resets start on every move 
          // so delta is always small incremental.
          setDragStart({ x: e.clientX, y: e.clientY });
      }
      // For Resize/Scale, we rely on `initialWidth` + `totalDelta` (calculated from original dragStart), 
      // so we DO NOT reset dragStart for resize actions to keep the math consistent relative to initial click.
    };

    const handleMouseUp = () => {
      setActiveDragId(null);
    };

    if (activeDragId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDragId, dragAction, dragStart, initialScale, initialWidth, data, onUpdateData, scale, baseWidth, baseHeight]);


  // --- Components ---
  const HighlightedVerseText = () => {
    if (!data.verseText) return null;
    const parts = data.verseText.split(/(\s+|[.,!?;:"'-]+)/g);
    const fontSizeVal = `${(1.875 * (data.textScale || 1)).toFixed(3)}rem`;

    return (
        <p className="leading-snug italic px-4" style={{ ...textStyle, fontSize: fontSizeVal }}>
            "
            {parts.map((part, i) => {
                const clean = part.toLowerCase().replace(/[^a-z0-9]/g, '');
                const isHighlight = clean.length > 2 && highlightedKeywords.has(clean);
                if (isHighlight) {
                    return (
                        <span key={i} style={{ ...highlightStyle, display: 'inline-block', transform: 'scale(1.1)', fontSize: '1.25em' }}>
                            {part}
                        </span>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
            "
        </p>
    );
  };

  const UploadTrigger = ({ field, children, className = "" }: { field: keyof PosterData, children?: React.ReactNode, className?: string }) => (
    <div 
      className={`relative group cursor-pointer ${className}`}
      onClick={(e) => { e.stopPropagation(); onTriggerUpload?.(field); }}
      title={`Click to upload ${field === 'backgroundImageUrl' ? 'Background' : field === 'uploadedPhotoUrl' ? 'Photo' : 'Logo'}`}
    >
      {children}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-inherit z-50 pointer-events-none">
        <Upload size={16} className="text-white" />
      </div>
    </div>
  );

  const LogoElement = () => (
    <UploadTrigger field="logoUrl" className="inline-block rounded-full overflow-hidden w-full h-full">
      {data.logoUrl ? (
        <img src={data.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full drop-shadow-md" crossOrigin="anonymous"/>
      ) : (
        <div className="w-full h-full bg-white/20 border-2 border-dashed border-white/50 rounded-full flex items-center justify-center backdrop-blur-sm">
            <span className="text-[10px] text-white font-bold uppercase">Logo</span>
        </div>
      )}
    </UploadTrigger>
  );

  const PhotoElement = ({ className = "" }: { className?: string }) => (
     <UploadTrigger field="uploadedPhotoUrl" className={`w-full h-full ${className}`}>
        {data.uploadedPhotoUrl ? (
            <div className="w-full h-full rounded-[1.5rem] border-4 border-white/30 overflow-hidden shadow-2xl">
                <img src={data.uploadedPhotoUrl} alt="User" className="w-full h-full object-cover" crossOrigin="anonymous"/>
            </div>
        ) : (
            <div className="w-full h-full rounded-[1.5rem] border-4 border-dashed border-white/40 bg-white/10 flex flex-col items-center justify-center text-white/80 backdrop-blur-sm">
                <Camera size={24} />
                <span className="text-[10px] font-bold mt-1 uppercase">Photo</span>
            </div>
        )}
     </UploadTrigger>
  );

  const TextContent = () => (
    <div className={`flex flex-col gap-4 items-center text-center`}>
         {data.mode === AppMode.VERSE ? (
            <>
              <HighlightedVerseText />
              <div className="h-1 w-12 bg-current opacity-50 rounded-full" style={{ color: data.textColor }}></div>
              <div className="flex flex-col items-center gap-1">
                  <p className="text-lg font-bold uppercase tracking-widest" style={accentStyle}>{data.verseReference}</p>
                  {data.verseReferenceEnglish && data.verseReferenceEnglish !== data.verseReference && (
                      <p className="text-sm font-bold uppercase tracking-widest opacity-80" style={{ ...accentStyle, fontFamily: "'Inter', sans-serif" }}>
                        {data.verseReferenceEnglish}
                      </p>
                  )}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold leading-tight" style={textStyle}>{data.eventTitle || "Event Title"}</h1>
              <p className="text-lg whitespace-pre-wrap font-light opacity-90" style={textStyle}>{data.eventDetails || "Date • Time • Venue"}</p>
            </>
          )}
    </div>
  );

  const renderOverlays = () => {
    switch (data.layout) {
      case LayoutType.CINEMATIC:
        return (
           <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 z-0 pointer-events-none"></div>
        );
      default:
        // Generic overlay from template style if needed, can be empty if handled by root style
        return null;
    }
  };

  return (
    <div className="w-full flex justify-center py-4 select-none" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
      <div 
        ref={ref}
        id="poster-canvas"
        className={`relative bg-slate-200 overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col group/poster`}
        style={{ width: baseWidth, height: baseHeight }}
      >
        {/* Background Image (Click to Upload) */}
        <div 
            className="absolute inset-0 z-0 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onTriggerUpload?.('backgroundImageUrl'); }}
            title="Click background to change image"
        >
            {data.backgroundImageUrl ? (
            <img 
                src={data.backgroundImageUrl} 
                alt="Background" 
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                crossOrigin="anonymous"
            />
            ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                <ImageIcon className="text-slate-600" size={48} />
            </div>
            )}
        </div>

        {/* Overlay for non-cinematic modes (Template Color Overlay) */}
        {data.layout !== LayoutType.CINEMATIC && (
          <div className={`absolute inset-0 z-0 pointer-events-none ${styles.overlay}`}></div>
        )}
        
        {/* Layout Specific Overlays (e.g. Cinematic Gradient) */}
        {renderOverlays()}

        {/* --- MOVABLE LAYERS --- */}

        {/* 1. Logo */}
        <DraggableElement 
            position={data.logoPosition || {x: 10, y: 10}}
            width={data.logoWidth || 16}
            resizable={true}
            isActive={activeDragId === 'logo'}
            onMouseDown={(e, action) => handleMouseDown(e, 'logo', action)}
        >
             <div className="flex flex-col items-center w-full aspect-square">
                <LogoElement />
                {data.customName && <span className="text-[10px] font-bold uppercase tracking-widest text-white/90 mt-1 shadow-black drop-shadow-md">{data.customName}</span>}
             </div>
        </DraggableElement>

        {/* 2. Photo */}
        <DraggableElement 
            position={data.photoPosition || {x: 90, y: 10}}
            width={data.photoWidth || 24}
            resizable={true}
            isActive={activeDragId === 'photo'}
            onMouseDown={(e, action) => handleMouseDown(e, 'photo', action)}
        >
             <div className="w-full aspect-square">
                <PhotoElement />
             </div>
        </DraggableElement>

        {/* 3. Text (With Resize/Scale options) */}
        <DraggableElement 
            position={data.textPosition} 
            width={data.textWidth} 
            resizable={true}
            isActive={activeDragId === 'text'}
            onMouseDown={(e, action) => handleMouseDown(e, 'text', action)}
        >
            <TextContent />
        </DraggableElement>

      </div>
    </div>
  );
});

PosterPreview.displayName = 'PosterPreview';

export default PosterPreview;