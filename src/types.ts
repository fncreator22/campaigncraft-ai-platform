export type AssetStatus = 'idle' | 'generating' | 'completed' | 'failed';

export type PipelineStage =
  | 'BRIEF_READY'
  | 'STRATEGY_READY'
  | 'STORYBOARD_GENERATING'
  | 'STORYBOARD_READY'
  | 'VIDEO_GENERATING'
  | 'VIDEO_READY'
  | 'SILENT_VIDEO_READY'
  | 'SOUNDTRACK_GENERATING'
  | 'SOUNDTRACK_READY'
  | 'AUDIO_NORMALIZING'
  | 'AUDIO_READY'
  | 'COMPOSING'
  | 'CAMPAIGN_READY'
  | 'FAILED';

export type OverallCampaignStatus =
  | 'Preparing Campaign'
  | 'Generating Assets'
  | 'Composing Campaign'
  | 'Campaign Ready'
  | 'Campaign Failed';

export interface CampaignBrief {
  creativeVision: string;
  audience: string;
  location: string;
  duration: string; // e.g. "10s", "15s"
}

export interface CampaignStrategy {
  campaignTitle: string;
  creativeConcept: string;
  targetAudience: string;
  location: string;
  emotionalArc: string;
  visualStyle: string;
  colorPalette: string;
  videoPrompt: string;
  musicPrompt: string;
}

export interface StoryboardScene {
  sceneNumber: number;
  startTime: number; // in seconds (e.g. 0.0)
  endTime: number;   // in seconds (e.g. 2.5)
  duration: string;  // e.g. "0.0–2.5s" or "2.5s"
  narrativeAction: string;
  visualPrompt: string;
  videoDirection: string;
  status: AssetStatus;
  imageUrl?: string;
  error?: string;

  // Compatibility aliases
  description: string;
  imagePrompt: string;
  imageGenerationPrompt?: string;
  imageStatus?: 'pending' | 'generating' | 'ready' | 'error';
  imageError?: string;
}

// Backwards compatibility alias
export type CampaignScene = StoryboardScene;

export interface StoryboardSceneAudioDetail {
  sceneNumber: number;
  startTime: string;
  endTime: string;
  duration: string;
  narrativeAction: string;
  emotionalTone: string;
  sensoryEvents: string;
  transition: string;
  soundDirection: string;
}

export interface VideoTrack {
  status: AssetStatus;
  requestedDuration: number;
  actualDuration: number;
  hasNativeAudio: boolean;
  silentMasterReady: boolean;
  asset?: {
    videoUrl: string;
    silentVideoUrl?: string;
    aspectRatio?: string;
    model?: string;
  };
  error?: string;
}

export interface SoundtrackTrack {
  status: AssetStatus;
  requestedDuration: number;
  actualDuration: number;
  normalizedDuration: number;
  asset?: {
    audioUrl: string;
    normalizedAudioUrl?: string;
    mimeType?: string;
    model?: string;
    lyrics?: string;
    musicTimeline?: StoryboardSceneAudioDetail[];
    derivedPrompt?: string;
  };
  error?: string;
}

export interface AudioMixerSettings {
  musicEnabled: boolean;
  musicVolume: number; // 0 to 100
  ambienceEnabled: boolean;
  ambienceVolume: number; // 0 to 100
  originalVideoAudioEnabled: boolean;
  originalVideoAudioVolume: number; // 0 to 100
}

export const DEFAULT_MIXER_SETTINGS: AudioMixerSettings = {
  musicEnabled: true,
  musicVolume: 100,
  ambienceEnabled: true,
  ambienceVolume: 80,
  originalVideoAudioEnabled: false,
  originalVideoAudioVolume: 0,
};

export interface AudioCompositionState {
  mixerSettings: AudioMixerSettings;
  activeLayers: string[];
}

export interface FinalComposition {
  status: AssetStatus;
  targetDuration: number;
  actualDuration: number;
  asset?: {
    finalVideoUrl: string;
    silentVideoUrl?: string;
    normalizedAudioUrl?: string;
    activeLayers?: string[];
    compositionLog?: string[];
  };
  error?: string;
}

export interface VideoData {
  videoUrl: string;
  silentVideoUrl?: string;
  duration: string;
  requestedDuration: number;
  actualDuration: number;
  aspectRatio: string;
  model: string;
  hasNativeAudio?: boolean;
  audioRemoved?: boolean;
  silentVideoCreated?: boolean;
}

export interface SoundtrackData {
  audioUrl: string;
  normalizedAudioUrl?: string;
  duration: string;
  requestedDuration: number;
  actualDuration: number;
  sourceDuration?: number;
  targetDuration: number;
  normalizedDuration: number;
  isNormalized?: boolean;
  isValidated?: boolean;
  mimeType: string;
  model: string;
  lyrics?: string;
  musicTimeline?: StoryboardSceneAudioDetail[];
  derivedPrompt?: string;
}

export interface ComposedMediaData {
  finalVideoUrl: string;
  silentVideoUrl: string;
  normalizedAudioUrl: string;
  rawVideoUrl?: string;
  rawAudioUrl?: string;
  requestedDuration: number;
  videoDuration: number;
  actualVideoDuration: number;
  originalAudioDuration: number;
  actualAudioDuration: number;
  finalDuration: number;
  synchronized: boolean;
  activeLayers?: string[];
  mixerSettings?: AudioMixerSettings;
  compositionLog: string[];
}

export type AsyncStageState =
  | 'idle'
  | 'preparing'
  | 'waiting'
  | 'generating'
  | 'success'
  | 'error';

export interface ProductionPipelineStages {
  video: AsyncStageState;
  soundtrack: AsyncStageState;
  composition: AsyncStageState;
}

export type MediaPipelineStage =
  | 'IDLE'
  | 'GENERATING_VIDEO'
  | 'VIDEO_READY'
  | 'VIDEO_AUDIO_STRIPPED'
  | 'GENERATING_SOUNDTRACK'
  | 'SOUNDTRACK_READY'
  | 'NORMALIZING_AUDIO'
  | 'COMPOSING_MEDIA'
  | 'FINAL_MEDIA_READY'
  | 'ERROR';

/**
 * The unified, single source-of-truth Campaign State
 */
export interface CampaignState {
  brief: CampaignBrief;
  strategy: CampaignStrategy;
  targetDuration: number; // authoritative duration: 5, 10, 15, or 20
  storyboard: StoryboardScene[];
  video: VideoTrack;
  soundtrack: SoundtrackTrack;
  audioComposition: AudioCompositionState;
  finalComposition: FinalComposition;
  composition: FinalComposition;
  pipelineStage: PipelineStage;
  overallStatus: OverallCampaignStatus;
  error?: string;

  // Backwards-compatible legacy properties for seamless integration
  campaignTitle: string;
  creativeConcept: string;
  targetAudience: string;
  location: string;
  emotionalArc: string;
  visualStyle: string;
  colorPalette: string;
  scenes: StoryboardScene[];
  videoPrompt: string;
  musicPrompt: string;
  requestedDuration?: number;
  videoData?: VideoData;
  videoStatus?: 'idle' | 'generating' | 'ready' | 'error';
  videoError?: string;
  soundtrackData?: SoundtrackData;
  soundtrackStatus?: 'idle' | 'generating' | 'ready' | 'error';
  soundtrackError?: string;
  soundtrackTimeline?: StoryboardSceneAudioDetail[];
  mediaPipelineStage?: MediaPipelineStage;
  composedMedia?: ComposedMediaData;
  compositionError?: string;
  productionStages?: ProductionPipelineStages;
}

export type StructuredCampaign = CampaignState;

export interface PipelineStepStatus {
  id: string;
  label: string;
  status: 'completed' | 'active' | 'pending' | 'error';
  model?: string;
}

/**
 * Computes compact overall campaign status for general UI
 */
export function computeOverallCampaignStatus(
  pipelineStage: PipelineStage,
  storyboard: StoryboardScene[],
  video: VideoTrack,
  soundtrack: SoundtrackTrack,
  finalComposition: FinalComposition
): OverallCampaignStatus {
  if (finalComposition.status === 'completed' || pipelineStage === 'CAMPAIGN_READY') {
    return 'Campaign Ready';
  }

  if (
    pipelineStage === 'FAILED' ||
    video.status === 'failed' ||
    soundtrack.status === 'failed' ||
    finalComposition.status === 'failed' ||
    storyboard.some((s) => s.status === 'failed' || s.imageStatus === 'error')
  ) {
    return 'Campaign Failed';
  }

  if (
    pipelineStage === 'COMPOSING' ||
    pipelineStage === 'AUDIO_NORMALIZING' ||
    finalComposition.status === 'generating'
  ) {
    return 'Composing Campaign';
  }

  if (
    pipelineStage === 'STORYBOARD_GENERATING' ||
    pipelineStage === 'VIDEO_GENERATING' ||
    pipelineStage === 'SOUNDTRACK_GENERATING' ||
    video.status === 'generating' ||
    soundtrack.status === 'generating' ||
    storyboard.some((s) => s.status === 'generating' || s.imageStatus === 'generating')
  ) {
    return 'Generating Assets';
  }

  return 'Preparing Campaign';
}

/**
 * Helper to parse and ensure scene timestamps add up exactly to targetDuration
 */
export function synchronizeStoryboardTimeline(
  scenes: Array<Partial<StoryboardScene>>,
  targetDuration: number
): StoryboardScene[] {
  const total = scenes.length;
  if (total === 0) return [];

  let currentStart = 0.0;
  const result: StoryboardScene[] = [];

  for (let idx = 0; idx < total; idx++) {
    const scene = scenes[idx];
    const num = idx + 1;
    const isLast = idx === total - 1;

    let start = currentStart;
    let end: number;

    if (scene.duration) {
      const match = scene.duration.match(/(\d+\.?\d*)\s*[–-]\s*(\d+\.?\d*)\s*s?/);
      if (match) {
        const parsedStart = parseFloat(match[1]);
        const parsedEnd = parseFloat(match[2]);
        if (!isNaN(parsedStart) && !isNaN(parsedEnd) && parsedEnd > parsedStart) {
          if (idx === 0) {
            start = 0.0;
          }
          end = isLast ? targetDuration : parsedEnd;
        } else {
          const slice = (targetDuration - currentStart) / (total - idx);
          end = isLast ? targetDuration : currentStart + slice;
        }
      } else {
        const slice = (targetDuration - currentStart) / (total - idx);
        end = isLast ? targetDuration : currentStart + slice;
      }
    } else {
      const slice = (targetDuration - currentStart) / (total - idx);
      end = isLast ? targetDuration : currentStart + slice;
    }

    if (isLast) {
      end = targetDuration;
    }

    const startRounded = Number(start.toFixed(1));
    const endRounded = Number(end.toFixed(1));
    const durationStr = `${startRounded.toFixed(1)}–${endRounded.toFixed(1)}s`;
    currentStart = endRounded;

    const action = scene.narrativeAction || scene.description || `Scene ${num} sequence`;
    const prompt = scene.visualPrompt || scene.imagePrompt || action;
    const direction = scene.videoDirection || 'Cinematic camera movement';

    result.push({
      sceneNumber: num,
      startTime: startRounded,
      endTime: endRounded,
      duration: durationStr,
      narrativeAction: action,
      visualPrompt: prompt,
      videoDirection: direction,
      status: scene.status || (scene.imageUrl ? 'completed' : 'idle'),
      imageUrl: scene.imageUrl,
      error: scene.error || scene.imageError,
      description: action,
      imagePrompt: prompt,
      imageGenerationPrompt: scene.imageGenerationPrompt || prompt,
      imageStatus: scene.imageStatus || (scene.imageUrl ? 'ready' : 'pending'),
      imageError: scene.imageError || scene.error,
    });
  }

  return result;
}
