/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header.tsx';
import { CreativeBriefForm } from './components/CreativeBriefForm.tsx';
import { GenerationPipelineStatus } from './components/GenerationPipelineStatus.tsx';
import { CampaignWorkspace } from './components/CampaignWorkspace.tsx';
import {
  StructuredCampaign,
  CampaignState,
  PipelineStepStatus,
  CampaignScene,
  StoryboardScene,
  VideoData,
  VideoTrack,
  SoundtrackData,
  SoundtrackTrack,
  ComposedMediaData,
  FinalComposition,
  AudioMixerSettings,
  DEFAULT_MIXER_SETTINGS,
  PipelineStage,
  computeOverallCampaignStatus,
  synchronizeStoryboardTimeline,
  AssetStatus,
} from './types.ts';
import { logPipelineTransition } from './utils/pipelineState.ts';

const INITIAL_PIPELINE_STEPS: PipelineStepStatus[] = [
  { id: 'brief', label: 'Creative brief analyzed', status: 'pending', model: 'Gemini 3.8 Flash' },
  { id: 'strategy', label: 'Campaign strategy created', status: 'pending', model: 'Gemini 3.8 Flash' },
  { id: 'storyboard', label: 'Generating visual storyboard', status: 'pending', model: 'Nano Banana 2 Lite' },
  { id: 'video', label: 'Generating cinematic video', status: 'pending', model: 'Gemini Omni 1.1 Flash' },
  { id: 'soundtrack', label: 'Creating soundtrack', status: 'pending', model: 'Lyria 3.5' },
];

export default function App() {
  const [campaign, setCampaign] = useState<StructuredCampaign | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStepStatus[]>(INITIAL_PIPELINE_STEPS);

  // Guards against duplicate concurrent requests
  const isVideoGeneratingRef = useRef<boolean>(false);
  const isSoundtrackGeneratingRef = useRef<boolean>(false);
  const isComposingRef = useRef<boolean>(false);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#818cf8', '#f59e0b', '#34d399', '#10b981'],
      });
    } catch (e) {
      // ignore
    }
  };

  // Helper to fetch keyframe image for an individual scene using Nano Banana 2 Lite
  const generateSceneKeyframe = async (
    sceneNumber: number,
    prompt: string
  ): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
    try {
      const response = await fetch('/api/campaign/generate-scene-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePrompt: prompt,
          sceneNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Scene ${sceneNumber} generation failed (${response.status})`);
      }

      const data = await response.json();
      return { success: true, imageUrl: data.imageUrl };
    } catch (err: any) {
      console.error(`Error generating Scene 0${sceneNumber}:`, err);
      return { success: false, error: err.message || 'Image generation failed' };
    }
  };

  // 1. VIDEO GENERATION: User-triggered or automated sequence
  const handleGenerateCinematicVideo = async (autoAdvance: boolean = true) => {
    if (!campaign) return;

    if (isVideoGeneratingRef.current || campaign.videoStatus === 'generating') {
      console.warn('[CampaignCraft] Video generation already in flight. Request ignored.');
      return;
    }

    const readyScenes = campaign.scenes.filter((s) => s.imageUrl && s.imageStatus === 'ready');
    if (readyScenes.length < campaign.scenes.length || readyScenes.length === 0) {
      alert('Please wait until all 16:9 storyboard keyframes are generated before creating the video.');
      return;
    }

    isVideoGeneratingRef.current = true;
    logPipelineTransition('VIDEO', 'idle', 'generating');
    logPipelineTransition('AUDIO', 'waiting');
    logPipelineTransition('COMPOSITION', 'waiting');

    setCampaign((prev) =>
      prev
        ? {
            ...prev,
            video: {
              ...prev.video,
              status: 'generating',
              error: undefined,
            },
            videoStatus: 'generating',
            videoError: undefined,
            composedMedia: undefined,
            productionStages: {
              video: 'generating',
              soundtrack: 'waiting',
              composition: 'waiting',
            },
            finalComposition: {
              status: 'idle',
              targetDuration: prev.targetDuration || 10.0,
              actualDuration: 0,
            },
            composition: {
              status: 'idle',
              targetDuration: prev.targetDuration || 10.0,
              actualDuration: 0,
            },
            pipelineStage: 'VIDEO_GENERATING',
            mediaPipelineStage: 'GENERATING_VIDEO',
            overallStatus: 'Generating Assets',
            compositionError: undefined,
          }
        : prev
    );

    setPipelineSteps((prev) =>
      prev.map((step) =>
        step.id === 'video'
          ? { ...step, label: 'Generating cinematic video', status: 'active' }
          : step
      )
    );

    try {
      const targetDurationNum = campaign.targetDuration || 10.0;
      const scenePayload = readyScenes.map((s, idx) => {
        let timing = s.duration;
        if (!timing || timing.trim() === '') {
          const slice = targetDurationNum / Math.max(1, readyScenes.length);
          const start = idx * slice;
          const end = idx === readyScenes.length - 1 ? targetDurationNum : (idx + 1) * slice;
          timing = `${start.toFixed(1)}–${end.toFixed(1)}s`;
        }
        return {
          sceneNumber: s.sceneNumber,
          duration: timing,
          description: s.description,
          imageUrl: s.imageUrl!,
        };
      });

      const response = await fetch('/api/campaign/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPrompt: campaign.videoPrompt,
          scenes: scenePayload,
          campaignTitle: campaign.campaignTitle,
          creativeConcept: campaign.creativeConcept,
          targetDuration: targetDurationNum,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Video synthesis failed with code ${response.status}`);
      }

      const videoResult: VideoData = await response.json();
      isVideoGeneratingRef.current = false;

      logPipelineTransition('VIDEO', 'generating', 'success');
      if (autoAdvance) {
        logPipelineTransition('AUDIO', 'waiting', 'generating');
        logPipelineTransition('COMPOSITION', 'waiting');
      }
      triggerCelebration();

      setCampaign((prev) => {
        if (!prev) return prev;
        const updatedVideo: VideoTrack = {
          status: 'completed',
          requestedDuration: targetDurationNum,
          actualDuration: videoResult.actualDuration,
          hasNativeAudio: videoResult.hasNativeAudio ?? false,
          silentMasterReady: true,
          asset: {
            videoUrl: videoResult.videoUrl,
            silentVideoUrl: videoResult.silentVideoUrl,
            aspectRatio: videoResult.aspectRatio,
            model: videoResult.model,
          },
        };
        const stage: PipelineStage = autoAdvance ? 'SOUNDTRACK_GENERATING' : 'SILENT_VIDEO_READY';
        return {
          ...prev,
          video: updatedVideo,
          videoData: videoResult,
          videoStatus: 'ready',
          videoError: undefined,
          soundtrackStatus: autoAdvance ? 'generating' : prev.soundtrackStatus,
          soundtrackError: undefined,
          productionStages: {
            video: 'success',
            soundtrack: autoAdvance ? 'generating' : 'waiting',
            composition: 'waiting',
          },
          pipelineStage: stage,
          mediaPipelineStage: autoAdvance ? 'GENERATING_SOUNDTRACK' : 'VIDEO_AUDIO_STRIPPED',
          overallStatus: autoAdvance ? 'Generating Assets' : computeOverallCampaignStatus(
            stage,
            prev.storyboard,
            updatedVideo,
            prev.soundtrack,
            prev.finalComposition
          ),
        };
      });

      setPipelineSteps((prev) =>
        prev.map((step) => {
          if (step.id === 'video') {
            return { ...step, label: 'Cinematic video generated', status: 'completed' };
          }
          if (autoAdvance && step.id === 'soundtrack') {
            return { ...step, label: 'Synthesizing soundtrack with Lyria 3.5', status: 'active' };
          }
          return step;
        })
      );

      if (autoAdvance) {
        // Guarantee clean React commit & re-render before soundtrack begins
        setTimeout(() => {
          handleGenerateSoundtrack(true, videoResult);
        }, 150);
      }
    } catch (err: any) {
      console.error('Failed to generate cinematic video with Omni:', err);
      logPipelineTransition('VIDEO', 'generating', 'error');
      const rawMsg = err.message || 'Gemini Omni 1.1 Flash video synthesis failed.';
      const errorMsg = rawMsg.startsWith('[') ? rawMsg : `[VIDEO_API_ERROR] ${rawMsg}`;
      setCampaign((prev) => {
        if (!prev) return prev;
        const failedVideo: VideoTrack = {
          ...prev.video,
          status: 'failed',
          error: errorMsg,
        };
        return {
          ...prev,
          video: failedVideo,
          videoStatus: 'error',
          videoError: errorMsg,
          compositionError: errorMsg,
          productionStages: {
            video: 'error',
            soundtrack: 'waiting',
            composition: 'waiting',
          },
          pipelineStage: 'FAILED',
          mediaPipelineStage: 'ERROR',
          overallStatus: 'Campaign Failed',
        };
      });

      setPipelineSteps((prev) =>
        prev.map((step) =>
          step.id === 'video'
            ? { ...step, label: 'Generating cinematic video', status: 'pending' }
            : step
        )
      );
    } finally {
      isVideoGeneratingRef.current = false;
    }
  };

  // 2. SOUNDTRACK GENERATION: User-triggered or automated sequence
  const handleGenerateSoundtrack = async (
    autoAdvance: boolean = false,
    explicitVideoData?: VideoData
  ) => {
    if (!campaign) return;

    const activeVideo = explicitVideoData || campaign.videoData;
    if (!activeVideo?.videoUrl) {
      alert(
        `Please generate the cinematic video first to lock the exact target duration (${(
          campaign.targetDuration || 10.0
        ).toFixed(1)}s).`
      );
      return;
    }

    if (isSoundtrackGeneratingRef.current || campaign.soundtrackStatus === 'generating') {
      console.warn('[CampaignCraft] Soundtrack generation already in flight. Request ignored.');
      return;
    }

    isSoundtrackGeneratingRef.current = true;

    setCampaign((prev) =>
      prev
        ? {
            ...prev,
            video: prev.video,
            videoData: explicitVideoData || prev.videoData,
            videoStatus: 'ready',
            soundtrack: {
              ...prev.soundtrack,
              status: 'generating',
              error: undefined,
            },
            soundtrackStatus: 'generating',
            soundtrackError: undefined,
            composedMedia: undefined,
            productionStages: {
              video: 'success',
              soundtrack: 'generating',
              composition: 'waiting',
            },
            finalComposition: {
              status: 'idle',
              targetDuration: prev.targetDuration || 10.0,
              actualDuration: 0,
            },
            composition: {
              status: 'idle',
              targetDuration: prev.targetDuration || 10.0,
              actualDuration: 0,
            },
            pipelineStage: 'SOUNDTRACK_GENERATING',
            mediaPipelineStage: 'GENERATING_SOUNDTRACK',
            overallStatus: 'Generating Assets',
          }
        : prev
    );

    setPipelineSteps((prev) =>
      prev.map((step) =>
        step.id === 'soundtrack'
          ? { ...step, label: 'Synthesizing soundtrack with Lyria 3.5', status: 'active' }
          : step
      )
    );

    try {
      const targetDuration =
        activeVideo.actualDuration || campaign.targetDuration || 10.0;

      const response = await fetch('/api/campaign/generate-soundtrack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          musicPrompt: campaign.musicPrompt,
          campaignTitle: campaign.campaignTitle,
          scenes: campaign.scenes,
          targetDuration,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Soundtrack composition failed with code ${response.status}`);
      }

      const soundtrackResult: SoundtrackData = await response.json();
      isSoundtrackGeneratingRef.current = false;

      logPipelineTransition('AUDIO', 'generating', 'success');
      if (autoAdvance) {
        logPipelineTransition('COMPOSITION', 'waiting', 'generating');
      }
      triggerCelebration();

      setCampaign((prev) => {
        if (!prev) return prev;
        const updatedSoundtrack: SoundtrackTrack = {
          status: 'completed',
          requestedDuration: targetDuration,
          actualDuration: soundtrackResult.sourceDuration || soundtrackResult.actualDuration,
          normalizedDuration: soundtrackResult.normalizedDuration || targetDuration,
          asset: {
            audioUrl: soundtrackResult.audioUrl,
            normalizedAudioUrl: soundtrackResult.normalizedAudioUrl,
            mimeType: soundtrackResult.mimeType,
            model: soundtrackResult.model,
            lyrics: soundtrackResult.lyrics,
            musicTimeline: soundtrackResult.musicTimeline,
            derivedPrompt: soundtrackResult.derivedPrompt,
          },
        };
        const stage: PipelineStage = autoAdvance ? 'COMPOSING' : 'AUDIO_READY';
        return {
          ...prev,
          video: prev.video,
          videoData: explicitVideoData || prev.videoData,
          videoStatus: 'ready',
          soundtrack: updatedSoundtrack,
          soundtrackData: soundtrackResult,
          soundtrackStatus: 'ready',
          soundtrackError: undefined,
          soundtrackTimeline: soundtrackResult.musicTimeline,
          productionStages: {
            video: 'success',
            soundtrack: 'success',
            composition: autoAdvance ? 'generating' : 'waiting',
          },
          pipelineStage: stage,
          mediaPipelineStage: autoAdvance ? 'COMPOSING_MEDIA' : 'SOUNDTRACK_READY',
          overallStatus: autoAdvance ? 'Composing Campaign' : computeOverallCampaignStatus(
            stage,
            prev.storyboard,
            prev.video,
            updatedSoundtrack,
            prev.finalComposition
          ),
        };
      });

      setPipelineSteps((prev) =>
        prev.map((step) =>
          step.id === 'soundtrack'
            ? { ...step, label: 'Soundtrack generated', status: 'completed' }
            : step
        )
      );

      if (autoAdvance) {
        // Guarantee clean React commit & re-render before final composition begins
        setTimeout(() => {
          handleComposeFinalCampaign(undefined, explicitVideoData || activeVideo, soundtrackResult);
        }, 150);
      }
    } catch (err: any) {
      console.error('Failed to generate soundtrack with Lyria:', err);
      logPipelineTransition('AUDIO', 'generating', 'error');
      logPipelineTransition('COMPOSITION', 'waiting');
      const rawMsg = err.message || 'Lyria 3.5 soundtrack synthesis failed.';
      const errorMsg = rawMsg.startsWith('[') ? rawMsg : `[AUDIO_API_ERROR] ${rawMsg}`;
      setCampaign((prev) => {
        if (!prev) return prev;
        const failedSoundtrack: SoundtrackTrack = {
          ...prev.soundtrack,
          status: 'failed',
          error: errorMsg,
        };
        return {
          ...prev,
          // PRESERVE SUCCESSFUL VIDEO STAGE (Requirement 8)
          video: prev.video,
          videoData: explicitVideoData || prev.videoData,
          videoStatus: 'ready',
          soundtrack: failedSoundtrack,
          soundtrackStatus: 'error',
          soundtrackError: errorMsg,
          compositionError: errorMsg,
          productionStages: {
            video: 'success',
            soundtrack: 'error',
            composition: 'waiting',
          },
          pipelineStage: 'FAILED',
          mediaPipelineStage: 'ERROR',
          overallStatus: 'Campaign Failed',
        };
      });

      setPipelineSteps((prev) =>
        prev.map((step) =>
          step.id === 'soundtrack'
            ? { ...step, label: 'Soundtrack generation failed', status: 'error' }
            : step
        )
      );
    } finally {
      isSoundtrackGeneratingRef.current = false;
    }
  };

  // 3. FINAL COMPOSITION: Triggered automatically by sequence or on-demand by user
  const handleComposeFinalCampaign = async (
    settings?: AudioMixerSettings,
    explicitVideoData?: VideoData,
    explicitSoundtrackData?: SoundtrackData
  ) => {
    const videoDataToUse = explicitVideoData || campaign?.videoData;
    const soundtrackDataToUse = explicitSoundtrackData || campaign?.soundtrackData;

    if (!videoDataToUse || !soundtrackDataToUse) {
      alert('Both cinematic video and soundtrack must be available before composing the final campaign.');
      return;
    }

    if (isComposingRef.current) return;
    isComposingRef.current = true;

    setCampaign((prev) =>
      prev
        ? {
            ...prev,
            video: prev.video,
            videoData: videoDataToUse,
            videoStatus: 'ready',
            soundtrack: prev.soundtrack,
            soundtrackData: soundtrackDataToUse,
            soundtrackStatus: 'ready',
            finalComposition: {
              ...prev.finalComposition,
              status: 'generating',
              error: undefined,
            },
            composition: {
              ...prev.finalComposition,
              status: 'generating',
              error: undefined,
            },
            productionStages: {
              video: 'success',
              soundtrack: 'success',
              composition: 'generating',
            },
            pipelineStage: 'COMPOSING',
            mediaPipelineStage: 'COMPOSING_MEDIA',
            overallStatus: 'Composing Campaign',
            compositionError: undefined,
          }
        : prev
    );

    try {
      const silentVideoSrc = videoDataToUse.silentVideoUrl || videoDataToUse.videoUrl;
      const normalizedAudioSrc =
        soundtrackDataToUse.normalizedAudioUrl || soundtrackDataToUse.audioUrl;
      const targetDuration = videoDataToUse.actualDuration || campaign?.targetDuration || 10.0;
      const mixerSettings = settings || DEFAULT_MIXER_SETTINGS;

      const response = await fetch('/api/campaign/compose-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          silentVideoUrl: silentVideoSrc,
          normalizedAudioUrl: normalizedAudioSrc,
          rawVideo: videoDataToUse.videoUrl,
          rawAudio: soundtrackDataToUse.audioUrl,
          targetDuration,
          campaignTitle: campaign?.campaignTitle || 'Commercial Film',
          mixerSettings,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Composition failed with code ${response.status}`);
      }

      const compositionResult = await response.json();

      const composedData: ComposedMediaData = {
        finalVideoUrl: compositionResult.finalVideoUrl,
        silentVideoUrl: compositionResult.silentVideoUrl || silentVideoSrc,
        normalizedAudioUrl: compositionResult.normalizedAudioUrl || normalizedAudioSrc,
        rawVideoUrl: videoDataToUse.videoUrl,
        rawAudioUrl: soundtrackDataToUse.audioUrl,
        requestedDuration: campaign?.targetDuration || targetDuration,
        videoDuration: compositionResult.videoDuration || targetDuration,
        actualVideoDuration: videoDataToUse.actualDuration || targetDuration,
        originalAudioDuration: compositionResult.originalAudioDuration || soundtrackDataToUse.actualDuration,
        actualAudioDuration: soundtrackDataToUse.actualDuration || targetDuration,
        finalDuration: compositionResult.finalDuration || targetDuration,
        synchronized: true,
        activeLayers: compositionResult.activeLayers || [],
        mixerSettings,
        compositionLog: compositionResult.compositionLog || [],
      };

      setCampaign((prev) => {
        if (!prev) return prev;
        const updatedFinalComp: FinalComposition = {
          status: 'completed',
          targetDuration: targetDuration,
          actualDuration: composedData.finalDuration,
          asset: {
            finalVideoUrl: composedData.finalVideoUrl,
            silentVideoUrl: composedData.silentVideoUrl,
            normalizedAudioUrl: composedData.normalizedAudioUrl,
            activeLayers: composedData.activeLayers,
            compositionLog: composedData.compositionLog,
          },
        };
        const stage: PipelineStage = 'CAMPAIGN_READY';
        return {
          ...prev,
          video: prev.video,
          videoData: videoDataToUse,
          videoStatus: 'ready',
          soundtrack: prev.soundtrack,
          soundtrackData: soundtrackDataToUse,
          soundtrackStatus: 'ready',
          finalComposition: updatedFinalComp,
          composition: updatedFinalComp,
          composedMedia: composedData,
          productionStages: {
            video: 'success',
            soundtrack: 'success',
            composition: 'success',
          },
          pipelineStage: stage,
          mediaPipelineStage: 'FINAL_MEDIA_READY',
          overallStatus: 'Campaign Ready',
          compositionError: undefined,
        };
      });

      logPipelineTransition('COMPOSITION', 'generating', 'success');
      triggerCelebration();
    } catch (err: any) {
      console.error('Error during media composition:', err);
      logPipelineTransition('COMPOSITION', 'generating', 'error');
      const rawMsg = err.message || 'Failed to compose and synchronize video and soundtrack.';
      const errorMsg = rawMsg.startsWith('[') ? rawMsg : `[COMPOSITION_ERROR] ${rawMsg}`;
      setCampaign((prev) => {
        if (!prev) return prev;
        const failedFinalComp: FinalComposition = {
          ...prev.finalComposition,
          status: 'failed',
          error: errorMsg,
        };
        return {
          ...prev,
          // PRESERVE SUCCESSFUL VIDEO AND SOUNDTRACK STAGES (Requirement 8)
          video: prev.video,
          videoData: videoDataToUse,
          videoStatus: 'ready',
          soundtrack: prev.soundtrack,
          soundtrackData: soundtrackDataToUse,
          soundtrackStatus: 'ready',
          finalComposition: failedFinalComp,
          composition: failedFinalComp,
          productionStages: {
            video: 'success',
            soundtrack: 'success',
            composition: 'error',
          },
          pipelineStage: 'FAILED',
          mediaPipelineStage: 'ERROR',
          compositionError: errorMsg,
          overallStatus: 'Campaign Failed',
        };
      });
    } finally {
      isComposingRef.current = false;
    }
  };

  const handleGenerateCampaign = async (data: {
    creativeVision: string;
    audience: string;
    location: string;
    duration: string;
  }) => {
    setIsLoading(true);
    setErrorMessage(null);

    // 1. Brief analyzed
    setPipelineSteps([
      { id: 'brief', label: 'Creative brief analyzed', status: 'active', model: 'Gemini 3.8 Flash' },
      { id: 'strategy', label: 'Campaign strategy created', status: 'pending', model: 'Gemini 3.8 Flash' },
      { id: 'storyboard', label: 'Generating visual storyboard', status: 'pending', model: 'Nano Banana 2 Lite' },
      { id: 'video', label: 'Generating cinematic video', status: 'pending', model: 'Gemini Omni 1.1 Flash' },
      { id: 'soundtrack', label: 'Creating soundtrack', status: 'pending', model: 'Lyria 3.5' },
    ]);

    try {
      await new Promise((r) => setTimeout(r, 400));

      // 2. Strategy creation with Gemini 3.8 Flash
      setPipelineSteps([
        { id: 'brief', label: 'Creative brief analyzed', status: 'completed', model: 'Gemini 3.8 Flash' },
        { id: 'strategy', label: 'Campaign strategy created', status: 'active', model: 'Gemini 3.8 Flash' },
        { id: 'storyboard', label: 'Generating visual storyboard', status: 'pending', model: 'Nano Banana 2 Lite' },
        { id: 'video', label: 'Generating cinematic video', status: 'pending', model: 'Gemini Omni 1.1 Flash' },
        { id: 'soundtrack', label: 'Creating soundtrack', status: 'pending', model: 'Lyria 3.5' },
      ]);

      const response = await fetch('/api/campaign/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned error (${response.status})`);
      }

      const campaignResult: StructuredCampaign = await response.json();

      const initializedScenes: CampaignScene[] = campaignResult.scenes.map((scene) => ({
        ...scene,
        status: 'generating' as const,
        imageStatus: 'generating' as const,
        imageUrl: undefined,
        imageError: undefined,
      }));

      const activeCampaign: StructuredCampaign = {
        ...campaignResult,
        scenes: initializedScenes,
        storyboard: initializedScenes,
        videoStatus: 'idle',
        soundtrackStatus: 'idle',
        mediaPipelineStage: 'IDLE',
        productionStages: {
          video: 'waiting',
          soundtrack: 'waiting',
          composition: 'waiting',
        },
        pipelineStage: 'STORYBOARD_GENERATING',
        overallStatus: 'Generating Assets',
      };

      setCampaign(activeCampaign);
      setIsLoading(false);

      // 3. Visual Storyboard Stage with Nano Banana 2 Lite
      setPipelineSteps([
        { id: 'brief', label: 'Creative brief analyzed', status: 'completed', model: 'Gemini 3.8 Flash' },
        { id: 'strategy', label: 'Campaign strategy created', status: 'completed', model: 'Gemini 3.8 Flash' },
        { id: 'storyboard', label: 'Generating visual storyboard', status: 'active', model: 'Nano Banana 2 Lite' },
        { id: 'video', label: 'Generating cinematic video', status: 'pending', model: 'Gemini Omni 1.1 Flash' },
        { id: 'soundtrack', label: 'Creating soundtrack', status: 'pending', model: 'Lyria 3.5' },
      ]);

      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Generate all scenes INDEPENDENTLY
      const generationPromises = campaignResult.scenes.map(async (scene) => {
        const prompt = scene.imagePrompt || scene.imageGenerationPrompt || scene.description;
        const res = await generateSceneKeyframe(scene.sceneNumber, prompt);

        setCampaign((prev) => {
          if (!prev) return prev;
          const updatedScenes = prev.scenes.map((s) => {
            if (s.sceneNumber === scene.sceneNumber) {
              return {
                ...s,
                status: res.success ? ('completed' as const) : ('failed' as const),
                imageUrl: res.imageUrl,
                imageStatus: res.success ? ('ready' as const) : ('error' as const),
                imageError: res.error,
              };
            }
            return s;
          });
          const allReady = updatedScenes.every((s) => s.imageStatus === 'ready');
          const anyFailed = updatedScenes.some((s) => s.imageStatus === 'error');
          const stage: PipelineStage = allReady
            ? 'STORYBOARD_READY'
            : anyFailed
            ? 'FAILED'
            : 'STORYBOARD_GENERATING';

          return {
            ...prev,
            scenes: updatedScenes,
            storyboard: updatedScenes,
            pipelineStage: stage,
            overallStatus: computeOverallCampaignStatus(
              stage,
              updatedScenes,
              prev.video,
              prev.soundtrack,
              prev.finalComposition
            ),
          };
        });

        return res.success;
      });

      const results = await Promise.all(generationPromises);
      const allSucceeded = results.every(Boolean);

      if (allSucceeded) {
        setCampaign((prev) =>
          prev
            ? {
                ...prev,
                productionStages: {
                  video: 'idle',
                  soundtrack: 'waiting',
                  composition: 'waiting',
                },
              }
            : prev
        );
        setPipelineSteps([
          { id: 'brief', label: 'Creative brief analyzed', status: 'completed', model: 'Gemini 3.8 Flash' },
          { id: 'strategy', label: 'Campaign strategy created', status: 'completed', model: 'Gemini 3.8 Flash' },
          { id: 'storyboard', label: 'Visual storyboard generated', status: 'completed', model: 'Nano Banana 2 Lite' },
          { id: 'video', label: 'Generating cinematic video', status: 'pending', model: 'Gemini Omni 1.1 Flash' },
          { id: 'soundtrack', label: 'Creating soundtrack', status: 'pending', model: 'Lyria 3.5' },
        ]);
        triggerCelebration();
      }
    } catch (err: any) {
      console.error('Failed to orchestrate campaign:', err);
      setErrorMessage(err.message || 'Failed to generate campaign plan with Gemini 3.8 Flash');
      setPipelineSteps(INITIAL_PIPELINE_STEPS);
      setIsLoading(false);
    }
  };

  const handleRetryScene = async (sceneNumber: number) => {
    if (!campaign) return;

    const targetScene = campaign.scenes.find((s) => s.sceneNumber === sceneNumber);
    if (!targetScene) return;

    const prompt = targetScene.imagePrompt || targetScene.imageGenerationPrompt || targetScene.description;

    setCampaign((prev) => {
      if (!prev) return prev;
      const updatedScenes = prev.scenes.map((s) =>
        s.sceneNumber === sceneNumber
          ? { ...s, status: 'generating' as const, imageStatus: 'generating' as const, imageError: undefined }
          : s
      );
      return {
        ...prev,
        scenes: updatedScenes,
        storyboard: updatedScenes,
        pipelineStage: 'STORYBOARD_GENERATING',
        overallStatus: 'Generating Assets',
      };
    });

    const res = await generateSceneKeyframe(sceneNumber, prompt);

    setCampaign((prev) => {
      if (!prev) return prev;
      const updatedScenes = prev.scenes.map((s) => {
        if (s.sceneNumber === sceneNumber) {
          return {
            ...s,
            status: res.success ? ('completed' as const) : ('failed' as const),
            imageUrl: res.imageUrl,
            imageStatus: res.success ? ('ready' as const) : ('error' as const),
            imageError: res.error,
          };
        }
        return s;
      });

      const allNowReady = updatedScenes.every((s) => s.imageStatus === 'ready');
      const anyFailed = updatedScenes.some((s) => s.imageStatus === 'error');
      const stage: PipelineStage = allNowReady
        ? 'STORYBOARD_READY'
        : anyFailed
        ? 'FAILED'
        : 'STORYBOARD_GENERATING';

      if (allNowReady) {
        setPipelineSteps((prevSteps) =>
          prevSteps.map((step) =>
            step.id === 'storyboard'
              ? { ...step, label: 'Visual storyboard generated', status: 'completed' }
              : step
          )
        );
        triggerCelebration();
      }

      return {
        ...prev,
        scenes: updatedScenes,
        storyboard: updatedScenes,
        pipelineStage: stage,
        overallStatus: computeOverallCampaignStatus(
          stage,
          updatedScenes,
          prev.video,
          prev.soundtrack,
          prev.finalComposition
        ),
      };
    });
  };

  const handleResetToBrief = () => {
    isVideoGeneratingRef.current = false;
    isSoundtrackGeneratingRef.current = false;
    isComposingRef.current = false;
    setCampaign(null);
    setErrorMessage(null);
    setPipelineSteps(INITIAL_PIPELINE_STEPS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasAllStoryboards =
    Boolean(campaign) &&
    campaign!.scenes.length > 0 &&
    campaign!.scenes.every((s) => s.imageStatus === 'ready' && Boolean(s.imageUrl));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <Header
        hasActiveCampaign={Boolean(campaign)}
        overallStatus={campaign?.overallStatus}
        targetDuration={campaign?.targetDuration}
        onReset={handleResetToBrief}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Visible Generation Pipeline Status */}
        {(isLoading || campaign) && (
          <GenerationPipelineStatus
            campaign={campaign}
            isLoading={isLoading}
            steps={pipelineSteps}
            onStepClick={(stepId) => {
              if (stepId === 'video') {
                handleGenerateCinematicVideo();
              } else if (stepId === 'soundtrack') {
                handleGenerateSoundtrack();
              } else if (stepId === 'composition') {
                handleComposeFinalCampaign();
              }
            }}
            onRetryVideo={() => handleGenerateCinematicVideo()}
            onRetrySoundtrack={() => handleGenerateSoundtrack()}
            onRetryComposition={() => handleComposeFinalCampaign()}
            canTriggerVideo={Boolean(hasAllStoryboards)}
            canTriggerSoundtrack={Boolean(campaign?.videoStatus === 'ready')}
            canTriggerComposition={Boolean(campaign?.videoStatus === 'ready' && campaign?.soundtrackStatus === 'ready')}
          />
        )}

        {/* View 1: Landing Page / Creative Vision Form */}
        {!campaign && (
          <CreativeBriefForm
            onGenerate={handleGenerateCampaign}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        )}

        {/* View 2: Campaign Workspace Page */}
        {campaign && (
          <CampaignWorkspace
            campaign={campaign}
            onReset={handleResetToBrief}
            onRetryScene={handleRetryScene}
            onGenerateVideo={handleGenerateCinematicVideo}
            onGenerateSoundtrack={handleGenerateSoundtrack}
            onComposeMedia={handleComposeFinalCampaign}
          />
        )}
      </main>

      {/* Studio Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 px-4 sm:px-8 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>CampaignCraft AI • Multimodal Creative Pipeline Platform</p>
          <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
            <span className="text-cyan-400">Gemini 3.8 Flash</span>
            <span className="text-zinc-600">•</span>
            <span className="text-amber-300">Nano Banana 2 Lite</span>
            <span className="text-zinc-600">•</span>
            <span className="text-indigo-400">Gemini Omni 1.1 Flash</span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400">Lyria 3.5</span>
            <span className="text-zinc-600">•</span>
            <span className="text-cyan-300 font-semibold">FFmpeg Synchronization Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
