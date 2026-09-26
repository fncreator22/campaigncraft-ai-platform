import { StructuredCampaign, ProductionPipelineStages, AsyncStageState } from '../types.ts';

/**
 * Log pipeline transitions in development mode only without exposing credentials or internal secrets.
 */
export function logPipelineTransition(
  stage: 'VIDEO' | 'AUDIO' | 'COMPOSITION',
  from: string,
  to?: string
) {
  if (import.meta.env.DEV) {
    if (to) {
      console.log(`[PIPELINE] ${stage}: ${from} → ${to}`);
    } else {
      console.log(`[PIPELINE] ${stage}: ${from}`);
    }
  }
}

/**
 * Derives explicit independent asynchronous states for Video, Soundtrack, and Final Composition.
 * Prevents race conditions, stale React closures, and maintains persistent stage progress.
 */
export function deriveProductionStages(
  campaign: StructuredCampaign | null,
  inFlight?: {
    isVideoGenerating?: boolean;
    isSoundtrackGenerating?: boolean;
    isComposing?: boolean;
  }
): ProductionPipelineStages {
  if (!campaign) {
    return {
      video: 'idle',
      soundtrack: 'waiting',
      composition: 'waiting',
    };
  }

  // 1. VIDEO STAGE: Independent asynchronous state
  let video: AsyncStageState = 'waiting';
  const hasVideoAsset = Boolean(
    campaign.videoData?.videoUrl ||
    campaign.video?.asset?.videoUrl ||
    campaign.video?.asset?.silentVideoUrl ||
    campaign.videoData?.silentVideoUrl
  );
  const isVideoFailed = Boolean(
    campaign.videoError ||
    campaign.video?.status === 'failed' ||
    (campaign.videoStatus === 'error' && !hasVideoAsset)
  );
  const isVideoGenerating = Boolean(
    inFlight?.isVideoGenerating ||
    (campaign.videoStatus === 'generating' && !hasVideoAsset) ||
    (campaign.productionStages?.video === 'generating' && !hasVideoAsset) ||
    (campaign.video?.status === 'generating' && !hasVideoAsset)
  );

  if (hasVideoAsset && !inFlight?.isVideoGenerating) {
    video = 'success';
  } else if (isVideoFailed) {
    video = 'error';
  } else if (isVideoGenerating) {
    video = 'generating';
  } else {
    const allStoryboardsReady =
      campaign.scenes &&
      campaign.scenes.length > 0 &&
      campaign.scenes.every(
        (s) => (s.imageStatus === 'ready' || s.status === 'completed') && Boolean(s.imageUrl)
      );
    video = allStoryboardsReady ? 'idle' : 'waiting';
  }

  // 2. SOUNDTRACK STAGE: Independent asynchronous state
  let soundtrack: AsyncStageState = 'waiting';
  const hasSoundtrackAsset = Boolean(
    campaign.soundtrackData?.audioUrl ||
    campaign.soundtrack?.asset?.audioUrl ||
    campaign.soundtrack?.asset?.normalizedAudioUrl ||
    campaign.soundtrackData?.normalizedAudioUrl
  );
  const isSoundtrackFailed = Boolean(
    campaign.soundtrackError ||
    campaign.soundtrack?.status === 'failed' ||
    (campaign.soundtrackStatus === 'error' && !hasSoundtrackAsset)
  );
  const isSoundtrackGenerating = Boolean(
    inFlight?.isSoundtrackGenerating ||
    (campaign.soundtrackStatus === 'generating' && !hasSoundtrackAsset) ||
    (campaign.productionStages?.soundtrack === 'generating' && !hasSoundtrackAsset) ||
    (campaign.soundtrack?.status === 'generating' && !hasSoundtrackAsset) ||
    (campaign.mediaPipelineStage === 'GENERATING_SOUNDTRACK' && !hasSoundtrackAsset)
  );

  if (hasSoundtrackAsset && !inFlight?.isSoundtrackGenerating) {
    soundtrack = 'success';
  } else if (isSoundtrackFailed) {
    soundtrack = 'error';
  } else if (isSoundtrackGenerating) {
    soundtrack = 'generating';
  } else if (video === 'success') {
    soundtrack = 'idle'; // ready to generate
  } else {
    soundtrack = 'waiting'; // waiting for video master
  }

  // 3. FINAL COMPOSITION STAGE: Independent asynchronous state
  let composition: AsyncStageState = 'waiting';
  const hasComposedAsset = Boolean(
    campaign.composedMedia?.finalVideoUrl ||
    campaign.finalComposition?.asset?.finalVideoUrl
  );
  const isCompositionFailed = Boolean(
    campaign.compositionError ||
    campaign.finalComposition?.status === 'failed'
  );
  const isComposing = Boolean(
    inFlight?.isComposing ||
    (campaign.productionStages?.composition === 'generating' && !hasComposedAsset) ||
    (campaign.finalComposition?.status === 'generating' && !hasComposedAsset) ||
    ((campaign.mediaPipelineStage === 'COMPOSING_MEDIA' || campaign.mediaPipelineStage === 'NORMALIZING_AUDIO') && !hasComposedAsset)
  );

  if (hasComposedAsset && !inFlight?.isComposing) {
    composition = 'success';
  } else if (isCompositionFailed) {
    composition = 'error';
  } else if (isComposing) {
    composition = 'generating';
  } else if (video === 'success' && soundtrack === 'success') {
    composition = 'idle'; // ready to compose
  } else {
    composition = 'waiting'; // waiting for both video and soundtrack
  }

  return { video, soundtrack, composition };
}
