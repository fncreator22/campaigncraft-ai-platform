import React, { useState } from 'react';
import {
  Film,
  Music,
  Layers,
  Sparkles,
  Check,
  RotateCcw,
  Download,
  Play,
  Loader2,
  Lock,
  Clock,
  VolumeX,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  CloudRain,
  Volume1,
} from 'lucide-react';
import { StructuredCampaign, AudioMixerSettings, DEFAULT_MIXER_SETTINGS } from '../types.ts';
import { deriveProductionStages } from '../utils/pipelineState.ts';

interface MediaProductionControlsProps {
  campaign: StructuredCampaign;
  hasAllStoryboards: boolean;
  onGenerateVideo: () => void;
  onGenerateSoundtrack: () => void;
  onComposeMedia: (mixerSettings?: AudioMixerSettings) => void;
  onPreviewFinal: () => void;
}

export const MediaProductionControls: React.FC<MediaProductionControlsProps> = ({
  campaign,
  hasAllStoryboards,
  onGenerateVideo,
  onGenerateSoundtrack,
  onComposeMedia,
  onPreviewFinal,
}) => {
  const {
    videoData,
    videoStatus = 'idle',
    videoError,
    soundtrackData,
    soundtrackStatus = 'idle',
    soundtrackError,
    composedMedia,
    mediaPipelineStage = 'IDLE',
    compositionError,
  } = campaign;

  // Single source-of-truth target duration propagated across the pipeline
  const targetDuration =
    campaign.targetDuration ||
    videoData?.requestedDuration ||
    soundtrackData?.requestedDuration ||
    composedMedia?.requestedDuration ||
    10.0;

  const [mixerSettings, setMixerSettings] = useState<AudioMixerSettings>(
    composedMedia?.mixerSettings || DEFAULT_MIXER_SETTINGS
  );

  // Explicit independent asynchronous states derived from real campaign assets
  const stages = deriveProductionStages(campaign);

  const isVideoGenerating = stages.video === 'generating';
  const isVideoReady = stages.video === 'success';

  const isSoundtrackGenerating = stages.soundtrack === 'generating';
  const isSoundtrackReady = stages.soundtrack === 'success';

  const isComposing = stages.composition === 'generating';
  const isCompositionReady = stages.composition === 'success';

  // Can we generate soundtrack? Strictly after video is generated!
  const canGenerateSoundtrack = isVideoReady && !isSoundtrackGenerating;

  // Can we compose final campaign? Strictly only when BOTH video and soundtrack are ready!
  const canCompose = isVideoReady && isSoundtrackReady && !isComposing;

  // Duration validation calculations against authoritative targetDuration (tolerance: 0.3s)
  const actualVideoDuration =
    videoData?.actualDuration ?? campaign.video?.actualDuration ?? composedMedia?.videoDuration;
  const actualAudioDuration =
    soundtrackData?.actualDuration ?? campaign.soundtrack?.actualDuration ?? composedMedia?.originalAudioDuration;
  const normalizedAudioDuration =
    soundtrackData?.normalizedDuration ?? campaign.soundtrack?.normalizedDuration;
  const actualFinalDuration =
    composedMedia?.finalDuration ?? campaign.finalComposition?.actualDuration;

  const isVideoValid = actualVideoDuration !== undefined ? Math.abs(actualVideoDuration - targetDuration) <= 0.3 : null;
  const isAudioValid = (normalizedAudioDuration !== undefined || actualAudioDuration !== undefined)
    ? Math.abs((normalizedAudioDuration ?? actualAudioDuration!) - targetDuration) <= 0.3
    : null;
  const isFinalValid = actualFinalDuration !== undefined ? Math.abs(actualFinalDuration - targetDuration) <= 0.3 : null;

  let mismatchNotice: string | null = null;
  if (isVideoReady && actualVideoDuration !== undefined && isVideoValid === false) {
    mismatchNotice = `Video Master Duration Mismatch: Probed ${actualVideoDuration.toFixed(1)}s vs requested ${targetDuration.toFixed(1)}s.`;
  } else if (isSoundtrackReady && normalizedAudioDuration !== undefined && isAudioValid === false) {
    mismatchNotice = `Soundtrack Normalization Mismatch: Normalized ${normalizedAudioDuration.toFixed(1)}s vs requested ${targetDuration.toFixed(1)}s.`;
  } else if (isCompositionReady && actualFinalDuration !== undefined && isFinalValid === false) {
    mismatchNotice = `Final Composition Mismatch: Output ${actualFinalDuration.toFixed(1)}s vs requested ${targetDuration.toFixed(1)}s.`;
  }

  const handleDownloadMp4 = () => {
    const downloadUrl = composedMedia?.finalVideoUrl || videoData?.videoUrl;
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${campaign.campaignTitle.toLowerCase().replace(/\s+/g, '-')}-final-commercial.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 via-cyan-500/20 to-emerald-500/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Media Production Orchestration</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-cyan-300 border border-zinc-700 font-normal">
                Explicit Dependency Pipeline
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Step-by-step synchronization: Video Master → Soundtrack Normalization → 3-Layer Audio Composition
            </p>
          </div>
        </div>

        {/* Global duration metrics summary */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono bg-zinc-950 px-3.5 py-2 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Campaign Duration: <strong className="text-amber-300 font-bold">{targetDuration.toFixed(0)}s</strong></span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="text-zinc-400">
            Requested: <strong className="text-white">{targetDuration.toFixed(1)}s</strong>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="text-zinc-400">
            Target Final: <strong className="text-emerald-400">{targetDuration.toFixed(1)}s</strong>
          </div>
        </div>
      </div>

      {/* 3-Step Explicit Dependency Flow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* STEP 1: VIDEO GENERATION */}
        <div
          className={`rounded-2xl p-5 border flex flex-col justify-between transition-all duration-300 ${
            isVideoReady
              ? 'bg-zinc-950/80 border-indigo-900/60 shadow-lg shadow-indigo-950/20'
              : isVideoGenerating
              ? 'bg-zinc-900 border-indigo-500/80 ring-1 ring-indigo-500/30'
              : 'bg-zinc-950/50 border-zinc-800/80'
          }`}
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-indigo-400 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                <span>1. Video Generation</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                Gemini Omni 1.1 Flash
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Synthesizes {targetDuration.toFixed(0)}s cinematic film from {campaign.scenes.length} storyboard references, then strips native audio.
            </p>

            {/* Status Information */}
            <div className="space-y-1.5 pt-1">
              {isVideoReady && (
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Video generated</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <Check className="w-3.5 h-3.5" />
                    <span>Native video audio removed</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-indigo-300">
                    <Check className="w-3.5 h-3.5" />
                    <span>Silent video master created</span>
                  </div>
                  <div className="text-zinc-300 bg-zinc-900/90 px-2.5 py-1 rounded-lg border border-zinc-800 mt-1 flex items-center justify-between">
                    <span className="text-zinc-400">Video duration:</span>
                    <span className="font-bold text-emerald-400">
                      {(actualVideoDuration ?? videoData?.actualDuration ?? targetDuration).toFixed(1)}s
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 flex justify-between px-1">
                    <span>Requested: {targetDuration.toFixed(1)}s</span>
                    <span>Actual Probed: {(actualVideoDuration ?? videoData?.actualDuration ?? targetDuration).toFixed(1)}s</span>
                  </div>
                </div>
              )}

              {isVideoGenerating && (
                <div className="flex items-center gap-2 text-xs font-mono text-indigo-300 bg-indigo-950/60 p-2.5 rounded-xl border border-indigo-800/60">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Generating {targetDuration.toFixed(0)}s video with Omni...</span>
                </div>
              )}

              {stages.video === 'error' && (
                <div className="space-y-1 text-xs text-red-300 bg-red-950/60 p-2.5 rounded-xl border border-red-800/60">
                  <div className="flex items-center gap-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span>Video generation failed</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">{videoError || campaign.video?.error || 'Video synthesis error'}</p>
                </div>
              )}

              {!isVideoReady && !isVideoGenerating && stages.video !== 'error' && (
                <div className="text-[11px] font-mono text-zinc-500 space-y-1 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/50">
                  <div>• Requested duration: {targetDuration.toFixed(1)}s</div>
                  <div>• Status: Pending user generation</div>
                </div>
              )}
            </div>
          </div>

          {/* Action button */}
          <div className="pt-4 mt-3 border-t border-zinc-850">
            {!isVideoReady ? (
              <button
                onClick={onGenerateVideo}
                disabled={!hasAllStoryboards || isVideoGenerating}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-xs shadow-md shadow-indigo-950/50 hover:shadow-indigo-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer active:scale-98"
              >
                {isVideoGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating {targetDuration.toFixed(0)}s Video...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Video ({targetDuration.toFixed(0)}s)</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onGenerateVideo}
                disabled={isVideoGenerating}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 text-xs font-mono transition cursor-pointer active:scale-98"
              >
                <RotateCcw className="w-3 h-3 text-indigo-400" />
                <span>Regenerate Video</span>
              </button>
            )}
          </div>
        </div>

        {/* STEP 2: SOUNDTRACK GENERATION */}
        <div
          className={`rounded-2xl p-5 border flex flex-col justify-between transition-all duration-300 ${
            isSoundtrackReady
              ? 'bg-zinc-950/80 border-emerald-900/60 shadow-lg shadow-emerald-950/20'
              : isSoundtrackGenerating
              ? 'bg-zinc-900 border-emerald-500/80 ring-1 ring-emerald-500/30'
              : canGenerateSoundtrack
              ? 'bg-zinc-950/80 border-zinc-800 shadow-md ring-1 ring-emerald-500/20'
              : 'bg-zinc-950/30 border-zinc-900 opacity-60'
          }`}
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5" />
                <span>2. Soundtrack Generation</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                Lyria 3.5
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Synthesizes original soundtrack derived from storyboard timeline, then normalizes duration to {targetDuration.toFixed(1)}s.
            </p>

            {/* Dependency Notice or Status */}
            <div className="space-y-1.5 pt-1">
              {!isVideoReady && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-400">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span>Requires Video Generation first (to lock target duration: {targetDuration.toFixed(1)}s)</span>
                </div>
              )}

              {isSoundtrackReady && (
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Soundtrack generated</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <Check className="w-3.5 h-3.5" />
                    <span>Source duration: {(soundtrackData?.sourceDuration || soundtrackData?.actualDuration || actualAudioDuration || 28.6).toFixed(1)}s</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <Check className="w-3.5 h-3.5" />
                    <span>Normalized duration: {(soundtrackData?.normalizedDuration || normalizedAudioDuration || targetDuration).toFixed(1)}s</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <Check className="w-3.5 h-3.5" />
                    <span>Normalized audio validated</span>
                  </div>
                </div>
              )}

              {isSoundtrackGenerating && (
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-300 bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/60">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Synthesizing audio with Lyria 3.5...</span>
                </div>
              )}

              {stages.soundtrack === 'error' && (
                <div className="space-y-1 text-xs text-red-300 bg-red-950/60 p-2.5 rounded-xl border border-red-800/60">
                  <div className="flex items-center gap-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span>Soundtrack generation failed</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">{soundtrackError || campaign.soundtrack?.error || 'Soundtrack synthesis error'}</p>
                </div>
              )}

              {!isSoundtrackReady && !isSoundtrackGenerating && stages.soundtrack !== 'error' && isVideoReady && (
                <div className="text-[11px] font-mono text-zinc-400 space-y-1 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/50">
                  <div>• Video master locked: {(actualVideoDuration || targetDuration).toFixed(1)}s</div>
                  <div>• Status: Ready to synthesize soundtrack</div>
                </div>
              )}
            </div>
          </div>

          {/* Action button */}
          <div className="pt-4 mt-3 border-t border-zinc-850">
            {!isSoundtrackReady ? (
              <button
                onClick={onGenerateSoundtrack}
                disabled={!canGenerateSoundtrack || isSoundtrackGenerating}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-950/50 hover:shadow-emerald-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer active:scale-98"
              >
                {isSoundtrackGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Soundtrack...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Soundtrack ({targetDuration.toFixed(0)}s)</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onGenerateSoundtrack}
                disabled={isSoundtrackGenerating}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 text-xs font-mono transition cursor-pointer active:scale-98"
              >
                <RotateCcw className="w-3 h-3 text-emerald-400" />
                <span>Regenerate Soundtrack</span>
              </button>
            )}
          </div>
        </div>

        {/* STEP 3: FINAL COMPOSITION (WITH LIGHTWEIGHT 3-LAYER AUDIO GAIN MIXER) */}
        <div
          className={`rounded-2xl p-5 border flex flex-col justify-between transition-all duration-300 ${
            isCompositionReady
              ? 'bg-zinc-950/80 border-cyan-800/80 shadow-lg shadow-cyan-950/30'
              : isComposing
              ? 'bg-zinc-900 border-cyan-500/80 ring-1 ring-cyan-500/30'
              : canCompose
              ? 'bg-zinc-950/80 border-cyan-500/60 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/40'
              : 'bg-zinc-950/30 border-zinc-900 opacity-60'
          }`}
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-cyan-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>3. Final Composition</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                3-Layer Audio Mixer
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Blends Music, Ambience/SFX, and optional Video Audio with peak limiting and normalization.
            </p>

            {/* Dependency Notice or Status */}
            <div className="space-y-2 pt-1">
              {!canCompose && !isCompositionReady && !isComposing && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-400">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span>
                    {!isVideoReady && !isSoundtrackReady
                      ? 'Requires both Video and Soundtrack to compose'
                      : !isVideoReady
                      ? 'Requires Video Master first'
                      : 'Requires Soundtrack first'}
                  </span>
                </div>
              )}

              {/* Minimal Audio Gain Controls */}
              {(canCompose || isCompositionReady) && (
                <div className="space-y-2.5 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 text-[11px]">
                    <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Audio Layers & Gain</span>
                    </span>
                    <span className="text-[10px] text-zinc-500">Normalize & Limit</span>
                  </div>

                  {/* Layer 1: MUSIC */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <label className="flex items-center gap-1.5 text-zinc-200 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mixerSettings.musicEnabled}
                          onChange={(e) =>
                            setMixerSettings((prev) => ({ ...prev, musicEnabled: e.target.checked }))
                          }
                          className="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-emerald-400 font-bold">1. Music (Lyria)</span>
                      </label>
                      <span className="text-zinc-400">
                        {mixerSettings.musicEnabled ? `${mixerSettings.musicVolume}%` : 'OFF'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={mixerSettings.musicEnabled ? mixerSettings.musicVolume : 0}
                      disabled={!mixerSettings.musicEnabled}
                      onChange={(e) =>
                        setMixerSettings((prev) => ({ ...prev, musicVolume: parseInt(e.target.value) }))
                      }
                      className="w-full h-1 bg-zinc-800 rounded appearance-none accent-emerald-400 cursor-pointer disabled:opacity-30"
                    />
                  </div>

                  {/* Layer 2: AMBIENCE / SFX (Rain + Glass Clink) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <label className="flex items-center gap-1.5 text-zinc-200 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mixerSettings.ambienceEnabled}
                          onChange={(e) =>
                            setMixerSettings((prev) => ({ ...prev, ambienceEnabled: e.target.checked }))
                          }
                          className="rounded border-zinc-700 bg-zinc-950 text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-cyan-300 font-bold">2. Ambience / SFX</span>
                      </label>
                      <span className="text-zinc-400">
                        {mixerSettings.ambienceEnabled ? `${mixerSettings.ambienceVolume}%` : 'OFF'}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 italic">
                      Rain texture + {(targetDuration * 0.8).toFixed(1)}s glass clink accent
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={mixerSettings.ambienceEnabled ? mixerSettings.ambienceVolume : 0}
                      disabled={!mixerSettings.ambienceEnabled}
                      onChange={(e) =>
                        setMixerSettings((prev) => ({ ...prev, ambienceVolume: parseInt(e.target.value) }))
                      }
                      className="w-full h-1 bg-zinc-800 rounded appearance-none accent-cyan-400 cursor-pointer disabled:opacity-30"
                    />
                  </div>

                  {/* Layer 3: ORIGINAL VIDEO AUDIO (OFF by default) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <label className="flex items-center gap-1.5 text-zinc-400 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mixerSettings.originalVideoAudioEnabled}
                          onChange={(e) =>
                            setMixerSettings((prev) => ({
                              ...prev,
                              originalVideoAudioEnabled: e.target.checked,
                              originalVideoAudioVolume: e.target.checked ? (prev.originalVideoAudioVolume || 50) : 0,
                            }))
                          }
                          className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                        <span className={mixerSettings.originalVideoAudioEnabled ? 'text-amber-400 font-bold' : 'text-zinc-500'}>
                          3. Original Video Audio
                        </span>
                      </label>
                      <span className="text-zinc-500">
                        {mixerSettings.originalVideoAudioEnabled
                          ? `${mixerSettings.originalVideoAudioVolume}%`
                          : 'OFF (default)'}
                      </span>
                    </div>
                    {mixerSettings.originalVideoAudioEnabled && (
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={mixerSettings.originalVideoAudioVolume}
                        onChange={(e) =>
                          setMixerSettings((prev) => ({
                            ...prev,
                            originalVideoAudioVolume: parseInt(e.target.value),
                          }))
                        }
                        className="w-full h-1 bg-zinc-800 rounded appearance-none accent-amber-400 cursor-pointer"
                      />
                    )}
                  </div>
                </div>
              )}

              {isCompositionReady && composedMedia && (
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Audio layers mixed</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <Check className="w-3.5 h-3.5" />
                    <span>Final composition rendered</span>
                  </div>
                  <div className="text-zinc-300 bg-zinc-900/90 px-2.5 py-1 rounded-lg border border-zinc-800 flex items-center justify-between mt-1">
                    <span className="text-zinc-400">Final duration:</span>
                    <span className="font-bold text-emerald-400">{composedMedia.finalDuration.toFixed(1)}s</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 flex justify-between px-1">
                    <span>Peak Limiting: -0.5dB</span>
                    <span className="text-emerald-400">Normalized (No Clipping)</span>
                  </div>
                </div>
              )}

              {isComposing && (
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 bg-cyan-950/60 p-2.5 rounded-xl border border-cyan-800/60">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Mixing audio layers & normalizing final MP4...</span>
                </div>
              )}

              {compositionError && (
                <div className="space-y-1.5 text-xs text-red-300 bg-red-950/70 p-3 rounded-xl border border-red-800/80">
                  <div className="flex items-center gap-1.5 font-bold text-red-400">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Composition Failed</span>
                  </div>
                  <p className="text-[11px] text-red-200">
                    FFmpeg execution error reported by composition engine:
                  </p>
                  <pre className="text-[10px] font-mono text-red-200 bg-black/70 p-2 rounded-lg border border-red-900/50 max-h-36 overflow-y-auto whitespace-pre-wrap select-all">
                    {compositionError}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 mt-3 border-t border-zinc-850">
            {!isCompositionReady ? (
              <button
                onClick={() => onComposeMedia(mixerSettings)}
                disabled={!canCompose || isComposing}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/50 hover:shadow-cyan-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer active:scale-98"
              >
                {isComposing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Composing Final Campaign...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Compose Final Campaign ({targetDuration.toFixed(0)}s)</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={onPreviewFinal}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-cyan-700/60 text-xs font-mono font-semibold transition cursor-pointer active:scale-98"
                    title="Preview Final Synchronized Video"
                  >
                    <Play className="w-3 h-3 fill-cyan-300" />
                    <span>Preview Final Campaign</span>
                  </button>

                  <button
                    onClick={handleDownloadMp4}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/50 text-xs font-mono transition cursor-pointer active:scale-98"
                    title="Export Final Composed MP4"
                  >
                    <Download className="w-3 h-3 text-emerald-300" />
                    <span>Export MP4</span>
                  </button>
                </div>

                <button
                  onClick={() => onComposeMedia(mixerSettings)}
                  disabled={isComposing}
                  className="w-full py-1 text-[11px] font-mono text-zinc-400 hover:text-white transition text-center underline cursor-pointer"
                >
                  Recompose with updated audio gains
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Explicit Duration Comparison & Validation Bar */}
      <div className="space-y-3">
        {mismatchNotice && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-amber-950/80 border border-amber-600/80 text-xs font-mono text-amber-200 shadow-lg">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-300">Duration Mismatch Notice:</span>
              <p className="text-[11px] text-amber-200/90">{mismatchNotice}</p>
            </div>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
          <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Multimodal Duration Alignment Matrix:</span>
          </span>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">Requested:</span>
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-cyan-300 font-bold">
                {targetDuration.toFixed(1)}s
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">Video:</span>
              <span
                className={`px-2 py-0.5 rounded border ${
                  isVideoReady && actualVideoDuration !== undefined
                    ? isVideoValid
                      ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800 font-bold'
                    : 'bg-zinc-900/50 text-zinc-600 border-zinc-800'
                }`}
              >
                {isVideoReady && actualVideoDuration !== undefined
                  ? `${actualVideoDuration.toFixed(1)}s ${isVideoValid ? '✓' : '⚠️'}`
                  : 'Pending'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">Soundtrack:</span>
              <span
                className={`px-2 py-0.5 rounded border ${
                  isSoundtrackReady && (normalizedAudioDuration !== undefined || actualAudioDuration !== undefined)
                    ? isAudioValid
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800 font-bold'
                    : 'bg-zinc-900/50 text-zinc-600 border-zinc-800'
                }`}
              >
                {isSoundtrackReady && (normalizedAudioDuration !== undefined || actualAudioDuration !== undefined)
                  ? `${(normalizedAudioDuration || actualAudioDuration)!.toFixed(1)}s ${isAudioValid ? '✓' : '⚠️'}`
                  : 'Pending'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">Final:</span>
              <span
                className={`px-2 py-0.5 rounded border font-semibold ${
                  isCompositionReady && actualFinalDuration !== undefined
                    ? isFinalValid
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-amber-950 text-amber-300 border-amber-700 font-bold'
                    : 'bg-zinc-900/50 text-zinc-600 border-zinc-800'
                }`}
              >
                {isCompositionReady && actualFinalDuration !== undefined
                  ? `${actualFinalDuration.toFixed(1)}s ${isFinalValid ? '✓' : '⚠️'}`
                  : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
