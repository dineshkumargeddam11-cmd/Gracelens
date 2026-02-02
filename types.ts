
export enum AppMode {
  VERSE = 'VERSE',
  EVENT = 'EVENT'
}

export enum TemplateStyle {
  MINIMAL = 'Minimal',
  NATURE = 'Nature',
  ABSTRACT = 'Abstract',
  GOLDEN = 'Golden',
  GRADIENT = 'Gradient'
}

export enum LayoutType {
  RIGHT_CORNER = 'Right Corner',
  LEFT_CORNER = 'Left Corner',
  BOTTOM_MIDDLE = 'Bottom Middle',
  CINEMATIC = 'Cinematic'
}

export enum PosterAspect {
  PORTRAIT = 'Portrait',
  SQUARE = 'Square',
  LANDSCAPE = 'Desktop'
}

export enum TextEffect {
  NONE = 'none',
  SHADOW_SOFT = 'shadow-soft',
  SHADOW_HARD = 'shadow-hard',
  OUTLINE = 'outline',
  NEON = 'neon',
  RETRO = 'retro',
  ELEGANT = 'elegant',
  GLITCH = 'glitch'
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  isPro: boolean;
  savedDesignsCount: number;
  lastLogin: string;
}

export interface PosterData {
  id?: string; // Database ID
  userId?: string; // Owner ID
  mode: AppMode;
  verseReference: string;
  verseReferenceEnglish: string;
  verseText: string;
  eventTitle: string;
  eventDetails: string;
  language: string;
  interfaceLanguage: string;
  template: TemplateStyle;
  layout: LayoutType;
  posterAspect: PosterAspect;
  backgroundImageUrl: string | null;
  uploadedPhotoUrl: string | null;
  logoUrl: string | null;
  customName: string;
  fontFamily: string;
  textColor: string;
  textEffect: TextEffect;
  textPosition: { x: number; y: number };
  textWidth: number;
  textScale: number;
  logoPosition: { x: number; y: number };
  logoWidth: number;
  photoPosition: { x: number; y: number };
  photoWidth: number;
}

declare global {
  interface Window {
    html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
  }
}
