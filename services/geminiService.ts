
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AVAILABLE_FONTS } from "../constants";

// Helper to get AI instance safely
const getAiInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Translates text into the target language using Gemini 3 Flash.
 */
export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
  if (targetLanguage === "English") return text;

  try {
    const ai = getAiInstance();
    const prompt = `Translate the following Christian text accurately into ${targetLanguage}. Keep the spiritual tone. Return ONLY the translated text without quotes or explanations.\n\nText: "${text}"`;

    // Fix: Updated to recommended gemini-3-flash-preview model for text tasks
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || text;
  } catch (error) {
    console.error("Translation error:", error);
    // Fallback to original text if translation fails
    return text;
  }
};

/**
 * Translates Bible reference (Book Name) into target language.
 */
export const translateReference = async (reference: string, targetLanguage: string): Promise<string> => {
  if (targetLanguage === "English") return reference;

  try {
    const ai = getAiInstance();
    // Specific prompt to ensure Book Name is translated but numbers are kept
    const prompt = `Translate the Bible book name in this reference into ${targetLanguage}. Keep the chapter and verse numbers as they are. Return ONLY the translated reference string (e.g., if target is French, "John 3:16" -> "Jean 3:16").\n\nReference: "${reference}"`;

    // Fix: Updated to recommended gemini-3-flash-preview model for text tasks
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || reference;
  } catch (error) {
    console.error("Reference translation error:", error);
    return reference;
  }
};

/**
 * Interprets a non-English verse reference query (e.g., "मार्क 3:7") 
 * and converts it to a standard English Bible reference (e.g., "Mark 3:7")
 * so the Bible API can understand it.
 */
export const interpretVerseReference = async (query: string): Promise<string> => {
    try {
      const ai = getAiInstance();
      const prompt = `Convert this localized or transliterated Bible reference query into a standard English Bible reference format (Book Chapter:Verse).
      
      Examples:
      Input: "मार्क 3:7" -> Output: "Mark 3:7"
      Input: "Yohanu 3:16" -> Output: "John 3:16"
      Input: "Genesis 1:1" -> Output: "Genesis 1:1"
      
      Input: "${query}"
      
      Return ONLY the English reference. No explanation.`;
  
      // Fix: Updated to recommended gemini-3-flash-preview model for text tasks
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
  
      return response.text?.trim() || query;
    } catch (error) {
      console.error("Query interpretation error:", error);
      return query; // Fallback to sending original query
    }
};

/**
 * Generates a background image using Gemini 2.5 Flash Image.
 * Supports 'abstract' (colors/gradients only) vs 'realistic' (scene based on text).
 */
export const generateBackground = async (style: string, type: 'abstract' | 'realistic', contextText: string = ""): Promise<string | null> => {
  try {
    const ai = getAiInstance();
    
    let prompt = "";
    
    if (type === 'abstract') {
        // If contextText is provided for abstract, use it as the specific style instruction
        // Otherwise use the default heavenly/abstract description
        const specificInstruction = contextText || "Focus on soft color gradients, smooth textures, matte finishes, heavenly light rays, and artistic color combinations.";

        prompt = `A beautiful, high-quality abstract background image for a Christian poster. Style: ${style}. 
        ${specificInstruction}
        NO specific objects, NO people, NO landscapes, NO buildings. Purely abstract and atmospheric. 
        Vertical aspect ratio. No text in image.`;
    } else {
        // Option 2: Realistic/Contextual Scene
        const safeContext = contextText.slice(0, 400).replace(/\n/g, " ");
        prompt = `A high-quality, photorealistic or cinematic background image that visually interprets this text: "${safeContext}".
        Style: ${style}. 
        Create a scene, environment, nature, cosmos, or symbolic setting with objects that matches the mood of the text. 
        High resolution, 4k. Vertical aspect ratio. No text in image.`;
    }

    // Fix: Call generateContent with image model gemini-2.5-flash-image
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt }
        ]
      },
    });

    // Iterate through parts to find the image
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          // Assuming PNG or JPEG based on model output defaults
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodeString}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Background generation error:", error);
    return null;
  }
};

/**
 * Recommends fonts from the available list based on a mood/style description.
 */
export const recommendFonts = async (description: string): Promise<{ fontValues: string[], suggestedColor?: string }> => {
  try {
    const ai = getAiInstance();
    
    const availableFontNames = AVAILABLE_FONTS.map(f => f.name).join(", ");
    
    const prompt = `
      I have a list of available fonts: [${availableFontNames}].
      The user wants a font that matches this mood: "${description}".
      
      Please select the top 3 specific fonts from my list that best match this description.
      Also suggest a hex color code that fits this mood.
      
      Return JSON with this structure:
      {
        "recommendedFonts": ["Exact Font Name 1", "Exact Font Name 2", "Exact Font Name 3"],
        "suggestedColor": "#RRGGBB"
      }
    `;

    // Fix: Updated to recommended gemini-3-flash-preview model for text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    // Map names back to values
    const fontValues: string[] = [];
    if (result.recommendedFonts && Array.isArray(result.recommendedFonts)) {
      result.recommendedFonts.forEach((name: string) => {
        const found = AVAILABLE_FONTS.find(f => f.name === name || f.name.includes(name));
        if (found) fontValues.push(found.value);
      });
    }

    return {
      fontValues,
      suggestedColor: result.suggestedColor
    };
  } catch (error) {
    console.error("Font recommendation error:", error);
    return { fontValues: [] };
  }
};
