import { GoogleGenAI, Modality, Type, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";

export const ai = new GoogleGenAI({ apiKey });

export interface VideoScript {
  hook: string;
  content: string;
  cta: string;
  fullScript: string;
  visualPrompt: string;
}

export async function generateScript(topic: string, category: string): Promise<VideoScript> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Generate a viral short-form video script for social media.
Topic: ${topic}
Category: ${category}
The script should be 30-60 seconds long.
Include a hook (first 3s), main content, and a strong call to action.
Also provide a detailed visual prompt for an AI video generator like Veo that describes the scenes.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hook: { type: Type.STRING },
          content: { type: Type.STRING },
          cta: { type: Type.STRING },
          fullScript: { type: Type.STRING },
          visualPrompt: { type: Type.STRING, description: "A descriptive prompt for video generation" },
        },
        required: ["hook", "content", "cta", "fullScript", "visualPrompt"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function generateVoiceover(text: string, voiceName: string = "Kore"): Promise<string | null> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio ? `data:audio/mp3;base64,${base64Audio}` : null;
}

export async function generateThumbnail(prompt: string): Promise<string | null> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: {
      parts: [{ text: `High-click vertical thumbnail for a social media short: ${prompt}. Cinematic, vibrant, eye-catching.` }],
    },
    config: {
      imageConfig: {
        aspectRatio: "9:16",
        imageSize: "1K",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function startVideoGeneration(prompt: string) {
  const operation = await ai.models.generateVideos({
    model: "veo-3.1-fast-generate-preview",
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: "720p",
      aspectRatio: "9:16",
    },
  });
  return operation;
}

export async function pollVideoStatus(operation: any) {
  let currentOp = operation;
  while (!currentOp.done) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    currentOp = await ai.operations.getVideosOperation({ operation: currentOp });
  }
  return currentOp;
}

export async function analyzeVirality(script: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Analyze this video script for virality potential on TikTok/Reels/Shorts. 
Script: ${script}
Provide a virality score (0-100), trending hashtags, and suggestions for improvement.`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["score", "hashtags", "suggestions"],
      },
    },
  });
  return JSON.parse(response.text || "{}");
}
