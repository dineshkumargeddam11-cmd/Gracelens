
// Using bible-api.com which is free and CORS friendly

export interface VerseResult {
  reference: string;
  text: string;
  translation_id: string;
}

export const fetchVerse = async (reference: string, version: string = 'web'): Promise<VerseResult | null> => {
  const tryFetch = async (v: string): Promise<VerseResult | null> => {
    try {
      const encodedRef = encodeURIComponent(reference);
      const response = await fetch(`https://bible-api.com/${encodedRef}?translation=${v}`); 
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        reference: data.reference,
        text: data.text.trim(),
        translation_id: v.toUpperCase()
      };
    } catch (error) {
      console.error(`Error fetching verse (${v}):`, error);
      return null;
    }
  };

  // 1. Try requested version
  let result = await tryFetch(version);
  
  // 2. Fallback to English (WEB) if specific version fails
  if (!result && version !== 'web') {
    console.warn(`Verse not found in ${version}, falling back to WEB.`);
    result = await tryFetch('web');
  }

  return result;
};
