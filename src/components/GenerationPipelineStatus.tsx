import React from 'react';
import {
  Check,
  Loader2,
  Video,
  Music,
  Layers,
  AlertTriangle,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { PipelineStepStatus, StructuredCampaign } from '../types.ts';
import { deriveProductionStages } from '../utils/pipelineState.ts';

export type StageStatus = 'pending' | 'generating' | 'ready' | 'failed';

export interface StageCardData {
  id: 'video' | 'soundtrack' | 'composition';
  stepNumber: number;
  title: string;
  engine: string;
  status: StageStatus;
  statusLabel: string;
  statusDescription: string;
  canTrigger: boolean;
  onRetry?: () => void;
  onClick?: () => void;
}

interface GenerationPipelineStatusProps {
  steps?: PipelineStepStatus[];
  campaign?: StructuredCampaign | null;
  isLoading?: boolean;
  onStepClick?: (stepId: string) => void;
  canTriggerVideo?: boolean;
  canTriggerSoundtrack?: boolean;
  canTriggerComposition?: boolean;
  onRetryVideo?: () => void;
  onRetrySoundtrack?: () => void;
  onRetryComposition?: () => void;
}

export const GenerationPipelineStatus: React.FC<GenerationPipelineStatusProps> = ({
  steps = [],
  campaign,
  isLoading = false,
  onStepClick,
  canTriggerVideo = false,
  canTriggerSoundtrack = false,
  canTriggerComposition = false,
  onRetryVideo,
  onRetrySoundtrack,
  onRetryComposition,
}) => {
  // Derive independent asynchronous production stages (video, soundtrack, composition)
  const stages = deriveProductionStages(campaign || null);

  // Authoritative duration
  const targetDuration = campaign?.targetDuration || 10.0;

  // Determine if campaign preparation / storyboard is actively running
  const isPreparing = Boolean(
    isLoading ||
    !campaign ||
    campaign.pipelineStage === 'BRIEF_READY' ||
    campaign.pipelineStage === 'STRATEGY_READY' ||
    campaign.pipelineStage === 'STORYBOARD_GENERATING' ||
    campaign.scenes.length === 0 ||
    !campaign.scenes.every((s) => (s.imageStatus === 'ready' || s.status === 'completed') && Boolean(s.imageUrl))
  );

  // 1. VIDEO STAGE STATUS DERIVATION
  const hasVideoAsset = Boolean(
    campaign?.videoData?.videoUrl ||
    campaign?.video?.asset?.videoUrl ||
    campaign?.videoData?.silentVideoUrl ||
    campaign?.video?.asset?.silentVideoUrl
  );

  const isVideoGenerating = Boolean(
    stages.video === 'generating' ||
    (campaign?.videoStatus === 'generating' && !hasVideoAsset) ||
    (campaign?.productionStages?.video === 'generating' && !hasVideoAsset) ||
    (campaign?.video?.status === 'generating' && !hasVideoAsset)
  );

  const isVideoFailed = Boolean(
    stages.video === 'error' ||
    campaign?.videoError ||
    campaign?.video?.status === 'failed' ||
    (campaign?.videoStatus === 'error' && !hasVideoAsset)
  );

  const isVideoReady = Boolean(
    (hasVideoAsset && !isVideoGenerating) ||
    stages.video === 'success' ||
    campaign?.videoStatus === 'ready'
  );

  const videoStatus: StageStatus = isVideoFailed
    ? 'failed'
    : isVideoGenerating
    ? 'generating'
    : isVideoReady
    ? 'ready'
    : 'pending';

  const videoLabel =
    videoStatus === 'ready'
      ? 'Video generated'
      : videoStatus === 'generating'
      ? 'Generating video...'
      : videoStatus === 'failed'
      ? 'Video generation failed'
      : 'Waiting to generate';

  const videoSubText =
    videoStatus === 'ready'
      ? `Silent video master: ${(campaign?.videoData?.actualDuration || targetDuration).toFixed(1)}s`
      : videoStatus === 'generating'
      ? `Duration: ${targetDuration.toFixed(0)}s sequence`
      : videoStatus === 'failed'
      ? 'API generation encountered an issue'
      : isPreparing
      ? 'Waiting for storyboard'
      : canTriggerVideo
      ? 'Ready to generate (click to start)'
      : 'Waiting to generate';

  // 2. SOUNDTRACK STAGE STATUS DERIVATION
  const hasSoundtrackAsset = Boolean(
    campaign?.soundtrackData?.audioUrl ||
    campaign?.soundtrack?.asset?.audioUrl ||
    campaign?.soundtrackData?.normalizedAudioUrl ||
    campaign?.soundtrack?.asset?.normalizedAudioUrl
  );

  const isSoundtrackGenerating = Boolean(
    stages.soundtrack === 'generating' ||
    (campaign?.soundtrackStatus === 'generating' && !hasSoundtrackAsset) ||
    (campaign?.productionStages?.soundtrack === 'generating' && !hasSoundtrackAsset) ||
    (campaign?.soundtrack?.status === 'generating' && !hasSoundtrackAsset) ||
    (campaign?.mediaPipelineStage === 'GENERATING_SOUNDTRACK' && !hasSoundtrackAsset)
  );

  const isSoundtrackFailed = Boolean(
    stages.soundtrack === 'error' ||
    campaign?.soundtrackError ||
    campaign?.soundtrack?.status === 'failed' ||
    (campaign?.soundtrackStatus === 'error' && !hasSoundtrackAsset)
  );

  const isSoundtrackReady = Boolean(
    (hasSoundtrackAsset && !isSoundtrackGenerating) ||
    stages.soundtrack === 'success' ||
    campaign?.soundtrackStatus === 'ready'
  );

  const soundtrackStatus: StageStatus = isSoundtrackFailed
    ? 'failed'
    : isSoundtrackGenerating
    ? 'generating'
    : isSoundtrackReady
    ? 'ready'
    : 'pending';

  const soundtrackLabel =
    soundtrackStatus === 'ready'
      ? 'Soundtrack ready'
      : soundtrackStatus === 'generating'
      ? 'Generating soundtrack...'
      : soundtrackStatus === 'failed'
      ? 'Soundtrack generation failed'
      : 'Waiting for video';

  const soundtrackSubText =
    soundtrackStatus === 'ready'
      ? `Normalized: ${(campaign?.soundtrackData?.normalizedDuration || targetDuration).toFixed(1)}s`
      : soundtrackStatus === 'generating'
      ? `Target: ${targetDuration.toFixed(1)}s sync`
      : soundtrackStatus === 'failed'
      ? 'Lyria synthesis encountered an issue'
      : isVideoReady
      ? 'Ready to synthesize (click to start)'
      : 'Requires video duration lock';

  // 3. FINAL COMPOSITION STAGE STATUS DERIVATION
  const hasComposedAsset = Boolean(
    campaign?.composedMedia?.finalVideoUrl ||
    campaign?.finalComposition?.asset?.finalVideoUrl
  );

  const isCompositionGenerating = Boolean(
    stages.composition === 'generating' ||
    (campaign?.productionStages?.composition === 'generating' && !hasComposedAsset) ||
    (campaign?.finalComposition?.status === 'generating' && !hasComposedAsset) ||
    ((campaign?.mediaPipelineStage === 'COMPOSING_MEDIA' || campaign?.mediaPipelineStage === 'NORMALIZING_AUDIO') && !hasComposedAsset)
  );

  const isCompositionFailed = Boolean(
    stages.composition === 'error' ||
    campaign?.compositionError ||
    campaign?.finalComposition?.status === 'failed'
  );

  const isCompositionReady = Boolean(
    (hasComposedAsset && !isCompositionGenerating) ||
    stages.composition === 'success' ||
    campaign?.mediaPipelineStage === 'FINAL_MEDIA_READY'
  );

  const compositionStatus: StageStatus = isCompositionFailed
    ? 'failed'
    : isCompositionGenerating
    ? 'generating'
    : isCompositionReady
    ? 'ready'
    : 'pending';

  const compositionLabel =
    compositionStatus === 'ready'
      ? 'Final composition ready'
      : compositionStatus === 'generating'
      ? 'Composing final campaign...'
      : compositionStatus === 'failed'
      ? 'Final composition failed'
      : 'Waiting for soundtrack';

  const compositionSubText =
    compositionStatus === 'ready'
      ? `Final MP4: ${(campaign?.composedMedia?.finalDuration || targetDuration).toFixed(1)}s`
      : compositionStatus === 'generating'
      ? 'Peak limiting & normalize (-0.5dB)'
      : compositionStatus === 'failed'
      ? 'Muxing encountered an issue'
      : !isVideoReady
      ? 'Requires video + soundtrack'
      : 'Requires soundtrack completion';

  // Handlers for retry buttons
  const handleRetryVideo = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onRetryVideo) {
      onRetryVideo();
    } else if (onStepClick) {
      onStepClick('video');
    }
  };

  const handleRetrySoundtrack = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onRetrySoundtrack) {
      onRetrySoundtrack();
    } else if (onStepClick) {
      onStepClick('soundtrack');
    }
  };

  const handleRetryComposition = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onRetryComposition) {
      onRetryComposition();
    } else if (onStepClick) {
      onStepClick('composition');
    }
  };

  // STABLE PIPELINE STAGE MODEL: Exactly 3 stages, always present, never filtered
  const stageCards: StageCardData[] = [
    {
      id: 'video',
      stepNumber: 1,
      title: 'Video Generation',
      engine: 'Gemini Omni 1.1 Flash',
      status: videoStatus,
      statusLabel: videoLabel,
      statusDescription: videoSubText,
      canTrigger: videoStatus === 'pending' && canTriggerVideo,
      onRetry: handleRetryVideo,
      onClick: () => {
        if (videoStatus === 'pending' && canTriggerVideo && onStepClick) {
          onStepClick('video');
        }
      },
    },
    {
      id: 'soundtrack',
      stepNumber: 2,
      title: 'Soundtrack Generation',
      engine: 'Lyria 3.5',
      status: soundtrackStatus,
      statusLabel: soundtrackLabel,
      statusDescription: soundtrackSubText,
      canTrigger: soundtrackStatus === 'pending' && isVideoReady,
      onRetry: handleRetrySoundtrack,
      onClick: () => {
        if (soundtrackStatus === 'pending' && isVideoReady && onStepClick) {
          onStepClick('soundtrack');
        }
      },
    },
    {
      id: 'composition',
      stepNumber: 3,
      title: 'Final Composition',
      engine: '3-Layer Audio Mixer',
      status: compositionStatus,
      statusLabel: compositionLabel,
      statusDescription: compositionSubText,
      canTrigger: compositionStatus === 'pending' && isVideoReady && isSoundtrackReady,
      onRetry: handleRetryComposition,
      onClick: () => {
        if (compositionStatus === 'pending' && isVideoReady && isSoundtrackReady && onStepClick) {
          onStepClick('composition');
        }
      },
    },
  ];

  // Overall status label
  const overallLabel = campaign?.overallStatus
    ? campaign.overallStatus
    : isPreparing
    ? 'Preparing Campaign'
    : 'In Production';

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 mb-8">
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <h3 className="font-heading text-sm font-semibold tracking-wide text-zinc-100 uppercase">
              MULTIMODAL GENERATION PIPELINE
            </h3>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-2.5 py-0.5 rounded-full border border-zinc-800">
              Status: <strong className="text-zinc-200 font-semibold">{overallLabel}</strong>
            </span>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-800/50 px-2.5 py-0.5 rounded-full">
              Real API Verifications Only
            </span>
          </div>
        </div>

        {/* Campaign Preparation Status Sub-bar: clean text notice without floating spinners */}
        {isPreparing && (
          <div className="mb-5 px-4 py-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
              <div>
                <span className="text-zinc-100 font-semibold">Preparing campaign...</span>
                <span className="text-zinc-400 text-[11px] ml-2">Building synchronized storyboard and media timeline</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 self-start sm:self-auto font-mono">
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">Gemini 3.8 Flash</span>
              <span>→</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">Nano Banana 2 Lite</span>
            </div>
          </div>
        )}

        {/* Three Primary Multimodal Stages: Always rendered, solid cards, loaders strictly INSIDE corresponding active card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 relative">
          {stageCards.map((stage, idx) => {
            const isClickable = stage.canTrigger;
            const isVideo = stage.id === 'video';
            const isSoundtrack = stage.id === 'soundtrack';
            const isComposition = stage.id === 'composition';

            // Distinct themes per stage
            const stageAccentColor = isVideo
              ? 'indigo'
              : isSoundtrack
              ? 'emerald'
              : 'cyan';

            // Container visual styling based on stage status
            let containerClasses = 'bg-zinc-950/80 border-zinc-800/90 text-zinc-400';
            if (stage.status === 'generating') {
              if (isVideo) {
                containerClasses = 'bg-zinc-900/90 border-indigo-500/80 ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-950/30 text-zinc-200';
              } else if (isSoundtrack) {
                containerClasses = 'bg-zinc-900/90 border-emerald-500/80 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-950/30 text-zinc-200';
              } else {
                containerClasses = 'bg-zinc-900/90 border-cyan-500/80 ring-1 ring-cyan-500/30 shadow-lg shadow-cyan-950/30 text-zinc-200';
              }
            } else if (stage.status === 'ready') {
              containerClasses = 'bg-zinc-950/90 border-emerald-800/50 text-emerald-300 shadow-md shadow-emerald-950/20';
            } else if (stage.status === 'failed') {
              containerClasses = 'bg-red-950/40 border-red-800/60 text-red-300 shadow-md shadow-red-950/20';
            } else if (isClickable) {
              containerClasses = 'bg-zinc-950/90 border-zinc-700/80 hover:border-zinc-500 text-zinc-300 hover:text-white cursor-pointer hover:shadow-lg active:scale-98 transition';
            }

            // Icon styling
            let iconContainerClasses = 'bg-zinc-900 text-zinc-500';
            if (stage.status === 'generating') {
              iconContainerClasses = isVideo
                ? 'bg-indigo-500/20 text-indigo-300'
                : isSoundtrack
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-cyan-500/20 text-cyan-300';
            } else if (stage.status === 'ready') {
              iconContainerClasses = 'bg-emerald-500/20 text-emerald-400';
            } else if (stage.status === 'failed') {
              iconContainerClasses = 'bg-red-500/20 text-red-400';
            } else if (isClickable) {
              iconContainerClasses = isVideo
                ? 'bg-indigo-500/20 text-indigo-300'
                : isSoundtrack
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-cyan-500/20 text-cyan-300';
            }

            return (
              <div
                key={stage.id}
                onClick={stage.onClick}
                className={`relative rounded-xl p-4 border transition-all duration-200 flex flex-col justify-between min-h-[145px] ${containerClasses}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconContainerClasses}`}>
                      {isVideo ? (
                        <Video className="w-3.5 h-3.5" />
                      ) : isSoundtrack ? (
                        <Music className="w-3.5 h-3.5" />
                      ) : (
                        <Layers className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Top right status badge - loader strictly inside card when running */}
                    <div>
                      {stage.status === 'ready' ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xs font-bold">
                          ✓
                        </span>
                      ) : stage.status === 'generating' ? (
                        <Loader2
                          className={`w-4 h-4 animate-spin ${
                            isVideo
                              ? 'text-indigo-400'
                              : isSoundtrack
                              ? 'text-emerald-400'
                              : 'text-cyan-400'
                          }`}
                        />
                      ) : stage.status === 'failed' ? (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      ) : (
                        <span className="text-zinc-600 text-xs font-bold">○</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold tracking-tight uppercase text-zinc-100">
                      {stage.stepNumber}. {stage.title}
                    </p>
                    <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">
                      {stage.engine}
                    </span>
                  </div>
                </div>

                {/* Stage Status Display */}
                <div className="mt-3 pt-2.5 border-t border-zinc-800/70 text-xs font-mono">
                  {stage.status === 'ready' ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>{stage.statusLabel}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400">{stage.statusDescription}</p>
                    </div>
                  ) : stage.status === 'generating' ? (
                    <div className="space-y-0.5">
                      <div
                        className={`flex items-center gap-1.5 font-semibold ${
                          isVideo
                            ? 'text-indigo-300'
                            : isSoundtrack
                            ? 'text-emerald-300'
                            : 'text-cyan-300'
                        }`}
                      >
                        <Loader2
                          className={`w-3.5 h-3.5 animate-spin shrink-0 ${
                            isVideo
                              ? 'text-indigo-400'
                              : isSoundtrack
                              ? 'text-emerald-400'
                              : 'text-cyan-400'
                          }`}
                        />
                        <span>{stage.statusLabel}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400">{stage.statusDescription}</p>
                    </div>
                  ) : stage.status === 'failed' ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-red-400 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>{stage.statusLabel}</span>
                      </div>
                      <button
                        onClick={stage.onRetry}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-900/50 hover:bg-red-900/80 border border-red-700/60 text-red-200 text-[11px] font-mono font-semibold transition cursor-pointer active:scale-95"
                      >
                        <RotateCcw className="w-3 h-3 text-red-300" />
                        <span>Retry</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-0.5 text-zinc-400">
                      <div className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span className={isClickable ? 'text-zinc-200 font-semibold' : 'text-zinc-400'}>
                          {stage.statusLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500">{stage.statusDescription}</p>
                    </div>
                  )}
                </div>

                {/* Arrow connector between stages on desktop */}
                {idx < stageCards.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="hidden md:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700 items-center justify-center text-zinc-400 text-[10px] shadow pointer-events-none"
                  >
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
