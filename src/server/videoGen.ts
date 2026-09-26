import { GoogleGenAI } from '@google/genai';
import { sanitizeAndCategorizeError } from './diagnostics.ts';

export interface SceneReferenceInput {
  sceneNumber: number;
  duration: string;
  description: string;
  imageUrl: string;
}

export interface VideoGenerationResult {
  videoUrl: string;
  duration: string;
  aspectRatio: string;
  model: string;
}

/**
 * Extracts base64 payload and mimeType from data URLs or base64 strings
 */
function parseImageData(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return {
      mimeType: match[1],
      data: match[2],
    };
  }
  return {
    mimeType: 'image/jpeg',
    data: dataUrl,
  };
}

export async function generateCinematicVideoWithOmni(
  ai: GoogleGenAI | null,
  params: {
    videoPrompt: string;
    scenes: SceneReferenceInput[];
    campaignTitle: string;
    creativeConcept?: string;
    targetDuration?: number;
  }
): Promise<VideoGenerationResult> {
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const { videoPrompt, scenes, campaignTitle, targetDuration = 10.0 } = params;
  const targetDurationStr = `${targetDuration.toFixed(1)}s`;

  // Build the chronological storyboard sequence instructions with exact timings
  const sceneTimelineText = scenes
    .sort((a, b) => a.sceneNumber - b.sceneNumber)
    .map((s) => `Scene 0${s.sceneNumber} (${s.duration}): ${s.description}`)
    .join('\n');

  const fullPromptText = `You are an elite cinematic commercial director and AI video synthesis model.
Generate a continuous, seamless, 16:9 cinematic commercial of exactly ${targetDuration.toFixed(1)} seconds duration for the campaign: "${campaignTitle}".

CHRONOLOGICAL STORYBOARD STRUCTURE (EXACT ${targetDuration.toFixed(1)}-SECOND TIMELINE):
${sceneTimelineText}

CINEMATIC MASTER VIDEO DIRECTION:
${videoPrompt}

CRITICAL VISUAL CONTINUITY & OBJECT PERSISTENCE RULES:
- The ${scenes.length} input images represent the chronological key visual reference anchors for Scene 1 through Scene ${scenes.length}.
- Preserve identical visual identity, colour grade, and lighting mood across all scenes.
- Seamless, photorealistic camera transitions between all keyframe milestones without jarring cuts.
- Total video duration: exactly ${targetDuration.toFixed(1)} seconds (${targetDurationStr}).
- Aspect ratio: 16:9 widescreen composition, 24fps filmic cadence.`;

  // Prepare multimodal input parts for Gemini Omni 1.1 Flash via Interactions API
  const inputParts: any[] = [];

  // Pass each of the actual generated images as visual reference conditioning
  for (const scene of scenes) {
    if (scene.imageUrl) {
      const { mimeType, data } = parseImageData(scene.imageUrl);
      inputParts.push({
        type: 'image',
        mime_type: mimeType,
        data: data,
      });
    }
  }

  // Append master prompt direction
  inputParts.push({
    type: 'text',
    text: fullPromptText,
  });

  console.log(
    `[CampaignCraft] Sending request to gemini-omni-1.1-flash with ${scenes.length} reference images for exact ${targetDurationStr} video...`
  );

  try {
    // Gemini Omni 1.1 Flash strictly allows '5s' or '10s' in response_format.duration
    const omniDuration = targetDuration <= 5.0 ? '5s' : '10s';

    const interaction = await ai.interactions.create(
      {
        model: 'gemini-omni-1.1-flash',
        input: inputParts,
        background: false,
        store: false,
        stream: false,
        response_format: {
          type: 'video',
          aspect_ratio: '16:9',
          duration: omniDuration,
        },
      },
      { timeout: 300000 } // 5 minute timeout for video rendering
    );

    const videoPart = interaction.output_video;
    if (videoPart?.data) {
      const mimeType = videoPart.mime_type || 'video/mp4';
      return {
        videoUrl: `data:${mimeType};base64,${videoPart.data}`,
        duration: targetDurationStr,
        aspectRatio: '16:9',
        model: 'gemini-omni-1.1-flash',
      };
    }

    if (videoPart?.uri) {
      return {
        videoUrl: videoPart.uri,
        duration: targetDurationStr,
        aspectRatio: '16:9',
        model: 'gemini-omni-1.1-flash',
      };
    }

    // Inspect steps for any model output or error details
    for (const step of interaction.steps || []) {
      if (step.type === 'model_output') {
        const vid: any = step.content?.find((c: any) => c.type === 'video');
        if (vid?.data) {
          const mimeType = vid.mime_type || 'video/mp4';
          return {
            videoUrl: `data:${mimeType};base64,${vid.data}`,
            duration: targetDurationStr,
            aspectRatio: '16:9',
            model: 'gemini-omni-1.1-flash',
          };
        }
      }
    }

    throw new Error('Gemini Omni 1.1 Flash did not return a valid video payload in response.');
  } catch (error: any) {
    console.error('Error generating video with Gemini Omni 1.1 Flash:', error);
    const diag = sanitizeAndCategorizeError(error, 'VIDEO_API_ERROR');
    throw new Error(diag.message);
  }
}
