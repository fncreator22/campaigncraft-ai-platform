import React, { useState } from 'react';
import {
  Target,
  MapPin,
  Sparkles,
  Film,
  Palette,
  Eye,
  Copy,
  Check,
  Video,
  Music,
  Layers,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Play,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  VolumeX,
} from 'lucide-react';
import { StructuredCampaign, AudioMixerSettings } from '../types.ts';
import { deriveProductionStages } from '../utils/pipelineState.ts';
import { StoryboardGrid } from './StoryboardGrid.tsx';
import { MediaProductionControls } from './MediaProductionControls.tsx';
import { CinematicVideoPlayer } from './CinematicVideoPlayer.tsx';
import { SoundtrackPlayer } from './SoundtrackPlayer.tsx';

interface CampaignWorkspaceProps {
  campaign: StructuredCampaign;
  onReset: () => void;
  onRetryScene?: (sceneNumber: number) => void;
  onGenerateVideo: () => void;
  onGenerateSoundtrack: () => void;
  onComposeMedia: (mixerSettings?: AudioMixerSettings) => void;
}

export const CampaignWorkspace: React.FC<CampaignWorkspaceProps> = ({
  campaign,
  onReset,
  onRetryScene,
  onGenerateVideo,
  onGenerateSoundtrack,
  onComposeMedia,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isVideoPromptExpanded, setIsVideoPromptExpanded] = useState<boolean>(false);
  const [isMusicPromptExpanded, setIsMusicPromptExpanded] = useState<boolean>(false);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 1500);
  };

  // 1. CAMPAIGN READY STATE: Verified strictly against real campaign state
  const isStrategyComplete = Boolean(campaign.campaignTitle && campaign.creativeConcept);
  const isStoryboardComplete =
    campaign.scenes.length > 0 &&
    campaign.scenes.every(
      (s) => (s.imageStatus === 'ready' || s.status === 'completed') && Boolean(s.imageUrl)
    );
  const isSilentVideoComplete =
    (campaign.video?.status === 'completed' || campaign.videoStatus === 'ready') &&
    Boolean(
      campaign.video?.asset?.silentVideoUrl ||
        campaign.videoData?.silentVideoUrl ||
        campaign.videoData?.videoUrl
    );
  const isSoundtrackComplete =
    (campaign.soundtrack?.status === 'completed' || campaign.soundtrackStatus === 'ready') &&
    Boolean(
      campaign.soundtrack?.asset?.normalizedAudioUrl ||
        campaign.soundtrackData?.normalizedAudioUrl ||
        campaign.soundtrackData?.audioUrl
    );
  const isFinalCompositionComplete =
    (campaign.finalComposition?.status === 'completed' ||
      campaign.composition?.status === 'completed' ||
      campaign.mediaPipelineStage === 'FINAL_MEDIA_READY') &&
    Boolean(
      campaign.composedMedia?.finalVideoUrl ||
        campaign.finalComposition?.asset?.finalVideoUrl
    );

  const stages = deriveProductionStages(campaign);

  const isCampaignReady =
    isStrategyComplete &&
    isStoryboardComplete &&
    stages.video === 'success' &&
    stages.soundtrack === 'success' &&
    stages.composition === 'success';

  // Single authoritative source of truth for duration
  const targetDur = campaign.targetDuration || 10.0;
  const actualVideoDur =
    campaign.composedMedia?.videoDuration ||
    campaign.videoData?.actualDuration ||
    campaign.video?.actualDuration ||
    targetDur;
  const soundtrackSourceDur =
    campaign.soundtrackData?.sourceDuration ||
    campaign.composedMedia?.originalAudioDuration ||
    campaign.soundtrack?.actualDuration ||
    28.6;
  const normalizedSoundtrackDur =
    campaign.soundtrackData?.normalizedDuration ||
    campaign.composedMedia?.finalDuration ||
    campaign.soundtrack?.normalizedDuration ||
    targetDur;
  const finalCompositionDur =
    campaign.composedMedia?.finalDuration ||
    campaign.finalComposition?.actualDuration ||
    targetDur;

  const durationNumber = Math.round(targetDur);
  const durationLabel = `${durationNumber}-second cinematic campaign`;

  const handlePreviewFinal = () => {
    const videoEl = document.querySelector<HTMLVideoElement>(
      '#final-campaign-player video, #cinema-player video'
    );
    if (videoEl) {
      videoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      videoEl.play().catch(console.error);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
      {/* Top Workspace Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition text-xs font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>New Creative Vision</span>
          </button>
          <span className="text-zinc-600 text-sm hidden sm:inline">•</span>
          <span className="text-xs font-mono text-zinc-400">
            Campaign Workspace • <strong className="text-cyan-300 font-normal">Active Session</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-800/50 text-amber-300 font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{durationNumber}s Target Duration</span>
          </span>

          {isCampaignReady ? (
            <span className="px-3 py-1 rounded-md bg-emerald-950/90 border border-emerald-700/80 text-emerald-300 font-bold flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>CAMPAIGN READY</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>{campaign.overallStatus || 'In Progress'}</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. FINAL CAMPAIGN HEADER CARD */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div
          className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 ${
            isCampaignReady ? 'bg-emerald-500/10' : 'bg-cyan-500/10'
          }`}
        />

        {/* Title, Badges, & Creative Concept */}
        <div className="space-y-4 pb-8 border-b border-zinc-800/80">
          <div className="flex flex-wrap items-center gap-2.5">
            {isCampaignReady ? (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/80 flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>CAMPAIGN READY</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/50 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Orchestrated Campaign Concept</span>
              </span>
            )}

            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-700/60 flex items-center gap-1.5 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{durationLabel} · 16:9</span>
            </span>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-medium">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              <span>{campaign.targetAudience}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-medium">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{campaign.location}</span>
            </div>
          </div>

          <div>
            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {campaign.campaignTitle}
            </h1>
            <p className="text-xs sm:text-sm font-mono text-zinc-400 mt-1">
              {durationLabel} · 16:9 Cinematic Sequence
            </p>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-5 relative group">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>Creative Concept</span>
              </span>
              <button
                onClick={() => copyToClipboard(campaign.creativeConcept, 'concept')}
                className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-1 font-mono transition cursor-pointer"
              >
                {copiedSection === 'concept' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Concept</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-base sm:text-lg text-zinc-200 leading-relaxed font-sans font-normal">
              {campaign.creativeConcept}
            </p>
          </div>
        </div>

        {/* Foundation Grid: Emotional Arc, Visual Style, Color Palette */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Emotional Arc</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{campaign.emotionalArc}</p>
          </div>

          <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              <Film className="w-4 h-4" />
              <span>Cinematography & Visual Style</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{campaign.visualStyle}</p>
          </div>

          <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-pink-400 uppercase tracking-wider">
              <Palette className="w-4 h-4" />
              <span>Color Palette</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed font-mono">{campaign.colorPalette}</p>
          </div>
        </div>
      </div>

      {/* 8. FINAL ACTIONS TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-zinc-300 font-semibold uppercase tracking-wider">
            Campaign Actions:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handlePreviewFinal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95"
            title="Preview final campaign film"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Preview Campaign</span>
          </button>

          <button
            onClick={onGenerateVideo}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono transition cursor-pointer active:scale-95"
            title="Regenerate Video only (preserves strategy & storyboard)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Regenerate Video</span>
          </button>

          <button
            onClick={onGenerateSoundtrack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono transition cursor-pointer active:scale-95"
            title="Regenerate Soundtrack only (preserves video)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Regenerate Soundtrack</span>
          </button>

          <button
            onClick={() => onComposeMedia()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono transition cursor-pointer active:scale-95"
            title="Recompose final video and soundtrack with audio mixing (does NOT regenerate video or soundtrack)"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Recompose</span>
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-mono transition cursor-pointer active:scale-95"
            title="Reset and start new campaign"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-500" />
            <span>Start New Campaign</span>
          </button>
        </div>
      </div>

      {/* 3, 4, 6. FINAL VIDEO AS HERO OUTPUT + CAMPAIGN ASSET SUMMARY + MEDIA VERIFICATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Main Column: Hero Video Player */}
        <div id="final-campaign-player" className="lg:col-span-8 w-full">
          <CinematicVideoPlayer
            composedMedia={campaign.composedMedia}
            rawVideoData={campaign.videoData}
            mediaPipelineStage={campaign.mediaPipelineStage}
            compositionError={campaign.compositionError}
            videoError={campaign.videoError}
            hasAllStoryboards={isStoryboardComplete}
            targetDuration={targetDur}
            scenes={campaign.scenes}
            onGenerateVideo={onGenerateVideo}
            onComposeMedia={onComposeMedia}
          />
        </div>

        {/* Right / Secondary Column: Asset Summary & Technical Media Verification */}
        <div className="lg:col-span-4 w-full space-y-6">
          {/* 4. CAMPAIGN ASSET SUMMARY */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                  Campaign Asset Summary
                </h4>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                {isCampaignReady ? 'Complete' : 'In Production'}
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/50">
                <span className="text-zinc-400 font-medium">STRATEGY</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Complete</span>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/50">
                <span className="text-zinc-400 font-medium">STORYBOARD</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{campaign.scenes.length} scenes</span>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/50">
                <span className="text-zinc-400 font-medium">CINEMATIC VIDEO</span>
                {stages.video === 'success' ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{actualVideoDur.toFixed(1)}s</span>
                  </span>
                ) : stages.video === 'generating' ? (
                  <span className="text-indigo-400 font-medium">Generating...</span>
                ) : stages.video === 'error' ? (
                  <span className="text-red-400 font-medium">Error</span>
                ) : (
                  <span className="text-zinc-500">Pending</span>
                )}
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/50">
                <span className="text-zinc-400 font-medium">SOUNDTRACK</span>
                {stages.soundtrack === 'success' ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{normalizedSoundtrackDur.toFixed(1)}s normalized</span>
                  </span>
                ) : stages.soundtrack === 'generating' ? (
                  <span className="text-emerald-400 font-medium">Generating...</span>
                ) : stages.soundtrack === 'error' ? (
                  <span className="text-red-400 font-medium">Error</span>
                ) : (
                  <span className="text-zinc-500">Pending</span>
                )}
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-zinc-400 font-medium">FINAL COMPOSITION</span>
                {stages.composition === 'success' ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{finalCompositionDur.toFixed(1)}s</span>
                  </span>
                ) : stages.composition === 'generating' ? (
                  <span className="text-cyan-400 font-medium">Composing...</span>
                ) : stages.composition === 'error' ? (
                  <span className="text-red-400 font-medium">Error</span>
                ) : (
                  <span className="text-zinc-500">Pending</span>
                )}
              </div>
            </div>
          </div>

          {/* 6. MEDIA VERIFICATION */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                  Media Verification
                </h4>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 font-semibold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                Model Telemetry
              </span>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between py-1 border-b border-zinc-800/40">
                <span className="text-zinc-400">Target Duration</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span>{targetDur.toFixed(1)}s</span>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-zinc-800/40">
                <span className="text-zinc-400">Video Duration</span>
                {isSilentVideoComplete ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span>{actualVideoDur.toFixed(1)}s</span>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                ) : (
                  <span className="text-zinc-500">Pending</span>
                )}
              </div>

              <div className="flex items-center justify-between py-1 border-b border-zinc-800/40">
                <span className="text-zinc-400">Soundtrack Source</span>
                {isSoundtrackComplete ? (
                  <span className="text-amber-300 font-semibold">
                    <span>{soundtrackSourceDur.toFixed(1)}s</span>
                  </span>
                ) : (
                  <span className="text-zinc-500">Pending</span>
                )}
              </div>

              <div className="flex items-center justify-between py-1 border-b border-zinc-800/40">
                <span className="text-zinc-400">Normalized Soundtrack</span>
                {isSoundtrackComplete ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span>{normalizedSoundtrackDur.toFixed(1)}s</span>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                ) : (
                  <span className="text-zinc-500">Pending</span>
                )}
              </div>

              <div className="flex items-center justify-between py-1 border-b border-zinc-800/40">
                <span className="text-zinc-400">Final Composition</span>
                {isFinalCompositionComplete ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span>{finalCompositionDur.toFixed(1)}s</span>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                ) : (
                  <span className="text-zinc-500">Pending</span>
                )}
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-zinc-400">Native Video Audio</span>
                {isSilentVideoComplete ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span>Removed</span>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                ) : (
                  <span className="text-zinc-500">Pending</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. VISUAL STORYBOARD GRID */}
      <StoryboardGrid scenes={campaign.scenes} onRetryScene={onRetryScene} />

      {/* MEDIA PRODUCTION ORCHESTRATION CONTROLS (Pipeline status, Mixer settings, Execution logs) */}
      <MediaProductionControls
        campaign={campaign}
        hasAllStoryboards={isStoryboardComplete}
        onGenerateVideo={onGenerateVideo}
        onGenerateSoundtrack={onGenerateSoundtrack}
        onComposeMedia={onComposeMedia}
        onPreviewFinal={handlePreviewFinal}
      />

      {/* SOUNDTRACK PLAYER (Preserved for independent inspection, waveform & lyric sync) */}
      <SoundtrackPlayer
        soundtrackData={campaign.soundtrackData}
        soundtrackStatus={campaign.soundtrackStatus}
        soundtrackError={campaign.soundtrackError}
        musicPrompt={campaign.musicPrompt}
        campaignTitle={campaign.campaignTitle}
        soundtrackTimeline={campaign.soundtrackTimeline}
        targetDuration={targetDur}
        onGenerateSoundtrack={onGenerateSoundtrack}
      />

      {/* 7. PROMPT VISIBILITY (Collapsible sections so they do not dominate the final view) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="font-heading text-lg font-bold text-white tracking-tight">
              Multimodal Prompt Inspector
            </h3>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            Synthesized by Gemini 3.8 Flash for downstream generation
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Master Video Prompt - Collapsible */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-heading text-sm sm:text-base font-bold text-white">
                    Master Video Prompt
                  </h4>
                  <p className="text-[11px] text-zinc-400 font-mono">Gemini Omni 1.1 Flash</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(campaign.videoPrompt, 'video')}
                  className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 transition cursor-pointer"
                >
                  {copiedSection === 'video' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsVideoPromptExpanded(!isVideoPromptExpanded)}
                  className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 transition cursor-pointer"
                  title={isVideoPromptExpanded ? 'Collapse Prompt' : 'Expand Prompt'}
                >
                  {isVideoPromptExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs font-mono text-zinc-300 leading-relaxed transition-all ${
                isVideoPromptExpanded ? 'max-h-96 overflow-y-auto' : 'line-clamp-3'
              }`}
            >
              {campaign.videoPrompt}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
              <span>{campaign.videoPrompt?.length || 0} characters</span>
              <button
                onClick={() => setIsVideoPromptExpanded(!isVideoPromptExpanded)}
                className="text-cyan-400 hover:underline cursor-pointer"
              >
                {isVideoPromptExpanded ? 'Show less' : 'View full prompt'}
              </button>
            </div>
          </div>

          {/* Master Music Prompt - Collapsible */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-heading text-sm sm:text-base font-bold text-white">
                    Soundtrack Prompt
                  </h4>
                  <p className="text-[11px] text-zinc-400 font-mono">Lyria 3.5</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(campaign.musicPrompt, 'music')}
                  className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 transition cursor-pointer"
                >
                  {copiedSection === 'music' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsMusicPromptExpanded(!isMusicPromptExpanded)}
                  className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 transition cursor-pointer"
                  title={isMusicPromptExpanded ? 'Collapse Prompt' : 'Expand Prompt'}
                >
                  {isMusicPromptExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs font-mono text-zinc-300 leading-relaxed transition-all ${
                isMusicPromptExpanded ? 'max-h-96 overflow-y-auto' : 'line-clamp-3'
              }`}
            >
              {campaign.musicPrompt}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
              <span>{campaign.musicPrompt?.length || 0} characters</span>
              <button
                onClick={() => setIsMusicPromptExpanded(!isMusicPromptExpanded)}
                className="text-cyan-400 hover:underline cursor-pointer"
              >
                {isMusicPromptExpanded ? 'Show less' : 'View full prompt'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
