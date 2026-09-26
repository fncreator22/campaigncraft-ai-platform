import { GoogleGenAI, Modality } from '@google/genai';
import { CampaignScene, StoryboardSceneAudioDetail } from '../types.ts';
import { sanitizeAndCategorizeError } from './diagnostics.ts';
import { generateCinematicTrackWav } from './soundSynth.ts';

export interface SoundtrackGenerationResult {
  audioUrl: string;
  duration: string;
  mimeType: string;
  model: string;
  lyrics?: string;
  musicTimeline: StoryboardSceneAudioDetail[];
  derivedPrompt: string;
}

/**
 * Parses time window string like "0.0–2.5s" or calculates proportionally
 */
function parseSceneTimeWindow(
  rawDuration: string | undefined,
  sceneNumber: number,
  totalScenes: number,
  targetDuration = 10.0
): { startTime: string; endTime: string; duration: string } {
  if (rawDuration) {
    const match = rawDuration.match(/(\d+\.?\d*)\s*[–-]\s*(\d+\.?\d*)\s*s?/);
    if (match) {
      const s = parseFloat(match[1]);
      const e = parseFloat(match[2]);
      return {
        startTime: `${s.toFixed(1)}s`,
        endTime: `${e.toFixed(1)}s`,
        duration: `${(e - s).toFixed(1)}s`,
      };
    }
  }

  // Fallback: Partition targetDuration proportionally
  const slice = targetDuration / Math.max(1, totalScenes);
  const start = (sceneNumber - 1) * slice;
  const end = sceneNumber === totalScenes ? targetDuration : sceneNumber * slice;

  return {
    startTime: `${start.toFixed(1)}s`,
    endTime: `${end.toFixed(1)}s`,
    duration: `${(end - start).toFixed(1)}s`,
  };
}

/**
 * Builds the structured scene-level music timeline from the storyboard scenes.
 * The storyboard is the source of truth for soundtrack structure.
 */
export function buildStoryboardMusicTimeline(
  scenes: CampaignScene[],
  targetDuration = 10.0
): StoryboardSceneAudioDetail[] {
  const sortedScenes = [...scenes].sort((a, b) => a.sceneNumber - b.sceneNumber);
  const total = sortedScenes.length;

  return sortedScenes.map((scene, idx) => {
    const num = idx + 1;
    const isFirst = num === 1;
    const isLast = num === total;
    const isSecond = num === 2;
    const timing = parseSceneTimeWindow(scene.duration, num, total, targetDuration);

    let emotionalTone = 'Narrative progression and visual focus';
    let sensoryEvents = scene.description || 'Key visual action and atmosphere';
    let transition = 'Smooth musical flow bridging into subsequent visual keyframe.';
    let soundDirection = 'Melodic progression synchronized to scene dynamics.';

    if (isFirst) {
      emotionalTone = 'Atmospheric opening / anticipation; quiet intimacy and thematic introduction.';
      sensoryEvents = scene.description || 'Opening environment, subtle lighting, establishing atmosphere.';
      transition = 'Camera glides into the space; ambient textures smoothly lead into warm acoustic chords.';
      soundDirection = 'Rain texture, subtle atmosphere, restrained instrumentation, gentle acoustic fingerpicking establishing melodic motif immediately at 0.0s.';
    } else if (isLast) {
      emotionalTone = 'Celebratory togetherness / resolution; definitive heartfelt commercial finish.';
      sensoryEvents = scene.description || 'Hero brand moment, celebratory toast, clean resolution.';
      transition = `Final resolved chord resonates cleanly, settling into acoustic warmth within the exact ${targetDuration.toFixed(1)}s duration window.`;
      soundDirection = `Musical lift followed by a clear celebratory accent and warm decay; definitive cadence completing cleanly within ${targetDuration.toFixed(1)}s.`;
    } else if (isSecond) {
      emotionalTone = 'Sensory indulgence, warm culinary intimacy, appetizing comfort.';
      sensoryEvents = scene.description || 'Close-up texture, steam, appetizing culinary detail.';
      transition = 'Movement concludes at scene boundary; rhythmic momentum expands toward group setting.';
      soundDirection = 'Warm acoustic entry, subtle rhythmic accent synchronized to action, rich bass and warm acoustic resonance.';
    } else {
      emotionalTone = 'Dynamic energy, vibrant camaraderie, genuine shared happiness.';
      sensoryEvents = scene.description || 'Lively interaction, group energy, joyful conversation.';
      transition = 'Motion arcs toward the central climax; melodic build into the resolution.';
      soundDirection = 'Music becomes brighter and more rhythmic, vibrant acoustic strumming, upbeat tempo, joyful percussive accents.';
    }

    return {
      sceneNumber: num,
      startTime: timing.startTime,
      endTime: timing.endTime,
      duration: timing.duration,
      narrativeAction: scene.description || `Scene ${num} action and visual details.`,
      emotionalTone,
      sensoryEvents,
      transition,
      soundDirection,
    };
  });
}

/**
 * Dynamically synthesizes the prompt for Lyria 3.5 derived strictly from the storyboard music timeline.
 */
export function constructLyriaPromptFromTimeline(
  timeline: StoryboardSceneAudioDetail[],
  targetDuration = 10.0,
  campaignTitle = 'CampaignCraft Production'
): string {
  const sceneTimelineBlocks = timeline
    .map(
      (s) =>
        `Scene 0${s.sceneNumber} (${s.startTime}–${s.endTime})
Narrative Action: ${s.narrativeAction}
Emotional Tone: ${s.emotionalTone}
Sensory & Visual Events: ${s.sensoryEvents}
Scene Transition: ${s.transition}
Sound Direction: ${s.soundDirection}`
    )
    .join('\n\n');

  const boundaryList = timeline.map((s) => `Scene ${s.sceneNumber}: ${s.startTime}–${s.endTime}`).join(', ');

  return `You are an elite cinematic commercial soundtrack composer synthesizing an original acoustic composition for the advertising campaign: "${campaignTitle}".

THE STORYBOARD TIMELINE IS THE SOURCE OF TRUTH FOR THIS MUSIC STRUCTURE.
Synchronize musical motifs, textural shifts, and dynamic accents directly to each scene's narrative beats:

${sceneTimelineBlocks}

MANDATORY TIMING & STRUCTURAL REQUIREMENTS:
1. TARGET DURATION: Exactly ${targetDuration.toFixed(1)} seconds (matching the video master duration).
2. IMMEDIATE MUSICAL ENGAGEMENT: Start musical phrasing immediately from 0.0s. Absolutely NO long ambient intro or delayed build-up.
3. SCENE BOUNDARY ALIGNMENT: Align tempo accents, rhythmic entrances, and dynamic shifts precisely to scene boundaries (${boundaryList}).
4. SYNCHRONIZED ACCENTS: Provide a warm rhythmic accent synchronized to early actions, and a clear musical lift with a distinct resolution accent in the final scene.
5. FINAL MUSICAL RESOLUTION: Deliver a definitive musical resolution and warm decay cleanly within the ${targetDuration.toFixed(1)}s mark. Absolutely NO long outro or trailing tail beyond the target duration.`;
}

export async function generateSoundtrackWithLyria(
  ai: GoogleGenAI | null,
  params: {
    musicPrompt?: string;
    campaignTitle: string;
    scenes?: CampaignScene[];
    targetDuration?: number;
  }
): Promise<SoundtrackGenerationResult> {
  const { musicPrompt, campaignTitle, scenes, targetDuration = 10.0 } = params;

  // Build the scene-level music timeline from the storyboard
  const timeline = scenes && scenes.length > 0 ? buildStoryboardMusicTimeline(scenes, targetDuration) : [];

  // Derive the Lyria prompt dynamically from the storyboard timeline if scenes are available
  const effectivePrompt =
    timeline.length > 0
      ? constructLyriaPromptFromTimeline(timeline, targetDuration, campaignTitle)
      : musicPrompt ||
        `Original acoustic commercial soundtrack for ${campaignTitle}, duration ${targetDuration}s, warm acoustic guitar and monsoon textures, immediate engagement from 0s, resolved ending by ${targetDuration}s.`;

  if (!ai) {
    console.warn('[Lyria 3.5] GEMINI_API_KEY is not configured on the server. Falling back to procedural 44.1kHz stereo audio synthesizer.');
    const wavDataUrl = generateCinematicTrackWav({
      durationSeconds: targetDuration,
      genre: 'Acoustic Indie / Monsoon Ambient',
      mood: 'Atmospheric & Nostalgic',
    });
    return {
      audioUrl: wavDataUrl,
      duration: `${targetDuration.toFixed(1)}s`,
      mimeType: 'audio/wav',
      model: 'soundSynth (Procedural 44.1kHz Stereo Fallback)',
      musicTimeline: timeline,
      derivedPrompt: effectivePrompt,
    };
  }

  console.log(
    `[CampaignCraft] Orchestrating soundtrack composition with Lyria for "${campaignTitle}" derived from ${timeline.length} storyboard scenes (target: ${targetDuration}s)...`
  );

  try {
    const response = await ai.models.generateContentStream({
      model: 'lyria-3-clip-preview',
      contents: effectivePrompt,
      config: {
        responseModalities: [Modality.AUDIO],
      },
    });

    let audioBase64 = '';
    let lyrics = '';
    let mimeType = 'audio/wav';

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
        if (part.text && !lyrics) {
          lyrics = part.text;
        }
      }
    }

    if (!audioBase64) {
      throw new Error('Lyria did not return audio data chunks in stream.');
    }

    return {
      audioUrl: `data:${mimeType};base64,${audioBase64}`,
      duration: `${targetDuration.toFixed(1)}s`,
      mimeType,
      model: 'lyria-3-clip-preview (Lyria 3.5)',
      lyrics: lyrics || undefined,
      musicTimeline: timeline,
      derivedPrompt: effectivePrompt,
    };
  } catch (error: any) {
    console.warn('[Lyria 3.5] Stream failed or unavailable; falling back to procedural synthesizer:', error?.message || error);
    try {
      const wavDataUrl = generateCinematicTrackWav({
        durationSeconds: targetDuration,
        genre: 'Acoustic Indie / Monsoon Ambient',
        mood: 'Atmospheric & Nostalgic',
      });
      return {
        audioUrl: wavDataUrl,
        duration: `${targetDuration.toFixed(1)}s`,
        mimeType: 'audio/wav',
        model: 'lyria-3-clip-preview (Procedural Fallback)',
        musicTimeline: timeline,
        derivedPrompt: effectivePrompt,
      };
    } catch {
      const diag = sanitizeAndCategorizeError(error, 'AUDIO_API_ERROR');
      throw new Error(diag.message);
    }
  }
}
