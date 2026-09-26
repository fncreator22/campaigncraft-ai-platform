import { GoogleGenAI } from '@google/genai';

export interface KeyframeGenerationResult {
  imageUrl: string;
  model: string;
}

export async function generateKeyframeImage(
  ai: GoogleGenAI | null,
  prompt: string,
  sceneNumber: number,
  title?: string
): Promise<KeyframeGenerationResult> {
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  // Use Nano Banana 2 Lite (gemini-3.1-flash-lite-image) with 16:9 cinematic aspect ratio
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite-image',
    contents: {
      parts: [
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: '16:9',
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || 'image/jpeg';
      return {
        imageUrl: `data:${mimeType};base64,${part.inlineData.data}`,
        model: 'gemini-3.1-flash-lite-image (Nano Banana 2 Lite)',
      };
    }
  }

  throw new Error(`Nano Banana 2 Lite did not return image data for Scene ${sceneNumber}.`);
}
