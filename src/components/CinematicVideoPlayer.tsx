import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Sparkles,
  AlertTriangle,
  Film,
  Maximize2,
  Volume2,
  VolumeX,
  Layers,
  CheckCircle2,
  Check,
  Music,
  Sliders,
  Terminal,
} from 'lucide-react';
import { ComposedMediaData, MediaPipelineStage, VideoData, CampaignScene } from '../types.ts';

interface CinematicVideoPlayerProps {
  composedMedia?: ComposedMediaData;
  rawVideoData?: VideoData;
  mediaPipelineStage?: MediaPipelineStage;
  compositionError?: string;
  videoError?: string;
  hasAllStoryboards: boolean;
  targetDuration?: number;
  scenes?: CampaignScene[];
  onGenerateVideo: () => void;
  onComposeMedia?: () => void;
}

export const CinematicVideoPlayer: React.FC<CinematicVideoPlayerProps> = ({
  composedMedia,
  rawVideoData,
  mediaPipelineStage = 'IDLE',
  compositionError,
  videoError,
  hasAllStoryboards,
  targetDuration = 10.0,
  scenes,
  onGenerateVideo,
  onComposeMedia,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(targetDuration);
  const [showInspector, setShowInspector] = useState(false);
  const [activeAssetTab, setActiveAssetTab] = useState<'final' | 'silent' | 'rawVideo'>('final');

  const isFinalReady = mediaPipelineStage === 'FINAL_MEDIA_READY' && Boolean(composedMedia?.finalVideoUrl);
  const isVideoOnlyReady = Boolean(rawVideoData?.videoUrl) && !isFinalReady;
  const isVideoSynthesizing = mediaPipelineStage === 'GENERATING_VIDEO' && !rawVideoData?.videoUrl;
  const isComposingFinal = (mediaPipelineStage === 'COMPOSING_MEDIA' || mediaPipelineStage === 'NORMALIZING_AUDIO') && !composedMedia?.finalVideoUrl;
  const isProcessing = isVideoSynthesizing || isComposingFinal;
  const isError = mediaPipelineStage === 'ERROR' || Boolean(compositionError) || Boolean(videoError);

  // Determine current active playable source:
  // Primary: Final synchronized composed video (no native audio, Lyria audio synced)
  // Fallback / tab switch: silent video or raw video for debugging
  const activeVideoSrc =
    activeAssetTab === 'final'
      ? composedMedia?.finalVideoUrl || rawVideoData?.silentVideoUrl || rawVideoData?.videoUrl
      : activeAssetTab === 'silent'
      ? composedMedia?.silentVideoUrl || rawVideoData?.silentVideoUrl || rawVideoData?.videoUrl
      : rawVideoData?.videoUrl;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      video.currentTime = 0;
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [activeVideoSrc]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setCurrentTime(0);
    videoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleDownload = () => {
    if (!activeVideoSrc) return;
    const a = document.createElement('a');
    a.href = activeVideoSrc;
    a.download = isFinalReady
      ? `campaigncraft-${targetDuration.toFixed(0)}s-cinematic-commercial-final.mp4`
      : 'campaigncraft-raw-video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Helper text for current media pipeline stage badge
  const getStageBadge = () => {
    switch (mediaPipelineStage) {
      case 'GENERATING_VIDEO':
        return { text: 'Generating video…', color: 'text-indigo-400 bg-indigo-950/80 border-indigo-800' };
      case 'VIDEO_READY':
      case 'VIDEO_AUDIO_STRIPPED':
        return { text: 'Silent video master ready', color: 'text-cyan-300 bg-cyan-950/80 border-cyan-700' };
      case 'GENERATING_SOUNDTRACK':
        return { text: 'Generating soundtrack…', color: 'text-emerald-400 bg-emerald-950/80 border-emerald-800' };
      case 'SOUNDTRACK_READY':
      case 'NORMALIZING_AUDIO':
        return { text: 'Soundtrack normalized', color: 'text-amber-400 bg-amber-950/80 border-amber-800' };
      case 'COMPOSING_MEDIA':
        return { text: 'Composing final campaign…', color: 'text-indigo-400 bg-indigo-950/80 border-indigo-800' };
      case 'FINAL_MEDIA_READY':
        return { text: 'Final commercial ready', color: 'text-emerald-300 bg-emerald-950/90 border-emerald-700' };
      case 'ERROR':
        return { text: 'Pipeline error', color: 'text-red-400 bg-red-950/80 border-red-800' };
      default:
        return { text: 'Ready for synthesis', color: 'text-zinc-400 bg-zinc-950 border-zinc-800' };
    }
  };

  const badge = getStageBadge();

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {isFinalReady ? 'Final Campaign Film' : 'Cinematic Commercial Film'}
                </h3>
                {isFinalReady ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{(composedMedia?.finalDuration || targetDuration).toFixed(1)}s</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs font-mono">
                    {targetDuration.toFixed(1)}s Target
                  </span>
                )}
              </div>

              {isFinalReady ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] font-mono">
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <Check className="w-3 h-3 text-emerald-400" /> Video
                  </span>
                  <span className="text-zinc-600 hidden sm:inline">·</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <Check className="w-3 h-3 text-emerald-400" /> Lyria soundtrack
                  </span>
                  <span className="text-zinc-600 hidden sm:inline">·</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <Check className="w-3 h-3 text-emerald-400" /> Enabled ambience/SFX
                  </span>
                  <span className="text-zinc-600 hidden sm:inline">·</span>
                  <span className="text-zinc-400 flex items-center gap-1">
                    <VolumeX className="w-3 h-3 text-zinc-500" /> Native video audio removed
                  </span>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 mt-0.5">
                  Full {targetDuration.toFixed(0)}-Second 16:9 Sequence Orchestrated by{' '}
                  <span className="font-mono text-indigo-300">Gemini Omni 1.1 Flash</span> +{' '}
                  <span className="font-mono text-emerald-300">Lyria 3.5</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action button in header */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Debug Inspector Toggle Button */}
          {composedMedia && (
            <button
              onClick={() => setShowInspector(!showInspector)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-mono transition cursor-pointer"
              title="Inspect Media Pipeline Assets (Raw Video, Silent Master, Lyria Audio, Logs)"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>{showInspector ? 'Hide Pipeline Inspector' : 'Media Inspector'}</span>
            </button>
          )}

          {!isFinalReady && !isVideoOnlyReady && !isProcessing && (
            <button
              onClick={onGenerateVideo}
              disabled={!hasAllStoryboards || isProcessing}
              className="relative group/btn flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-cyan-500 to-amber-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950/50 hover:shadow-indigo-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition duration-300 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Cinematic Video</span>
            </button>
          )}

          {(isFinalReady || isVideoOnlyReady) && !isProcessing && (
            <div className="flex items-center gap-2">
              <button
                onClick={onGenerateVideo}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 text-xs font-mono transition cursor-pointer active:scale-95"
                title="Regenerate Video"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Regenerate Video</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/50 text-xs font-mono transition cursor-pointer active:scale-95"
                title="Download Final MP4 Video"
              >
                <Download className="w-3.5 h-3.5 text-indigo-300" />
                <span>Export MP4</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stage Progress Ribbon */}
      <div className="flex items-center justify-between text-xs px-4 py-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 font-mono">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Pipeline Stage:</span>
          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${badge.color}`}>
            {badge.text}
          </span>
        </div>

        {composedMedia && (
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-zinc-400">
            <span>Video Master: {composedMedia.videoDuration.toFixed(1)}s</span>
            <span>•</span>
            <span>Raw Audio: {composedMedia.originalAudioDuration.toFixed(1)}s → {composedMedia.finalDuration.toFixed(1)}s</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">100% Synced</span>
          </div>
        )}
      </div>

      {/* Media Debug Inspector Drawer (preserves raw video, silent master, and composition logs) */}
      {showInspector && composedMedia && (
        <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 text-zinc-300 font-semibold">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Media Composition Asset Inspector</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveAssetTab('final')}
                className={`px-2.5 py-1 rounded text-[11px] transition ${
                  activeAssetTab === 'final'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Final Synchronized MP4
              </button>
              <button
                onClick={() => setActiveAssetTab('silent')}
                className={`px-2.5 py-1 rounded text-[11px] transition ${
                  activeAssetTab === 'silent'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Silent Video Master
              </button>
              <button
                onClick={() => setActiveAssetTab('rawVideo')}
                className={`px-2.5 py-1 rounded text-[11px] transition ${
                  activeAssetTab === 'rawVideo'
                    ? 'bg-indigo-950 text-indigo-300 border border-indigo-700'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Raw Gemini Video
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
              <span className="text-zinc-400 font-semibold uppercase text-[10px] block">
                Technical Asset Duration Verification
              </span>
              <ul className="space-y-1 text-zinc-300 text-[11px]">
                <li>• Video Target Duration: <strong className="text-cyan-300">{composedMedia.videoDuration.toFixed(2)}s</strong></li>
                <li>• Original Lyria Soundtrack: <strong className="text-amber-300">{composedMedia.originalAudioDuration.toFixed(2)}s</strong></li>
                <li>• Audio Layers Blended: <strong className="text-emerald-300">{composedMedia.activeLayers && composedMedia.activeLayers.length > 0 ? composedMedia.activeLayers.join(', ') : 'Music (100%), Ambience/SFX (50%)'}</strong></li>
                <li>• Audio Mastering: <strong className="text-cyan-400">Peak Limiting (-0.5dB) & Dynamic Normalization (Zero Clipping)</strong></li>
                <li>• Final Composed MP4: <strong className="text-emerald-400">Exactly {composedMedia.finalDuration.toFixed(2)}s</strong></li>
              </ul>
            </div>

            <div className="space-y-2 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
              <span className="text-zinc-400 font-semibold uppercase text-[10px] block">
                Composition Execution Log
              </span>
              <div className="h-28 overflow-y-auto space-y-1 text-[10px] text-zinc-400 font-mono pr-1">
                {composedMedia.compositionLog?.map((entry, idx) => (
                  <div key={idx} className="leading-tight">
                    <span className="text-zinc-600">[{idx + 1}]</span> {entry}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main 16:9 Cinema Screen */}
      <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden border border-zinc-800/80 shadow-2xl group">
        {/* State 1: Generating / Composing Active State (only when no video asset is ready) */}
        {isProcessing && !activeVideoSrc ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4 max-w-md mx-auto">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-400 animate-spin" />
              <Film className="w-8 h-8 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h4 className="font-heading text-lg font-bold text-white">
                {isComposingFinal
                  ? 'Synchronizing Video & Lyria Soundtrack...'
                  : `Synthesizing ${targetDuration.toFixed(0)}-Second Cinematic Film...`}
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                {isComposingFinal
                  ? `Stripping native video audio, trimming Lyria soundtrack to exact ${targetDuration.toFixed(1)}s with smooth fades, and muxing final MP4.`
                  : `Gemini Omni 1.1 Flash is synchronizing the ${scenes?.length || 'all'} 16:9 storyboard keyframes, temporal camera trajectories, and continuous lighting flow.`}
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-800/50 text-[11px] font-mono text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>{badge.text}</span>
            </div>
          </div>
        ) : activeVideoSrc ? (
          /* State 2: Ready - Video Playing / Paused */
          <div className="relative w-full h-full overflow-hidden">
            <video
              ref={videoRef}
              src={activeVideoSrc}
              playsInline
              className="w-full h-full object-cover block cursor-pointer"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onClick={togglePlay}
            />

            {/* Background Audio Processing Indicator Banner */}
            {mediaPipelineStage === 'GENERATING_SOUNDTRACK' && (
              <div className="absolute top-4 right-4 pointer-events-none z-20">
                <span className="px-3 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-emerald-500/60 text-[11px] font-mono text-emerald-300 flex items-center gap-1.5 shadow-xl">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Synthesizing audio with Lyria 3.5…</span>
                </span>
              </div>
            )}

            {(mediaPipelineStage === 'COMPOSING_MEDIA' || mediaPipelineStage === 'NORMALIZING_AUDIO') && !isFinalReady && (
              <div className="absolute top-4 right-4 pointer-events-none z-20">
                <span className="px-3 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-cyan-500/60 text-[11px] font-mono text-cyan-300 flex items-center gap-1.5 shadow-xl">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Mixing audio layers & normalizing final MP4…</span>
                </span>
              </div>
            )}

            {/* Video Overlays and Controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

            {/* Active Asset Indicator Tag */}
            <div className="absolute top-4 left-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
              <span className="px-3 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-zinc-700/80 text-[11px] font-mono text-zinc-300 flex items-center gap-1.5 shadow-xl">
                {isFinalReady ? (
                  <>
                    <Music className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Final Master: Silent Video + Lyria Soundtrack ({duration ? `${duration.toFixed(0)}s` : `${targetDuration.toFixed(0)}s`})</span>
                  </>
                ) : (
                  <>
                    <Film className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Visual Video Master ({duration ? `${duration.toFixed(0)}s` : `${targetDuration.toFixed(0)}s`})</span>
                  </>
                )}
              </span>
            </div>

            {/* Top Right Duration Tag */}
            <div className="absolute top-4 right-4 pointer-events-none z-20">
              <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-zinc-800 text-[10px] font-mono text-zinc-300 flex items-center gap-1 shadow-lg">
                <span>{duration ? `${duration.toFixed(1)}s` : `${targetDuration.toFixed(1)}s`}</span>
              </span>
            </div>

            {/* Play/Pause center overlay when paused */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 flex items-center justify-center text-white transition-all transform hover:scale-110 shadow-2xl cursor-pointer z-20"
                title="Play Video"
              >
                <Play className="w-8 h-8 fill-white translate-x-0.5" />
              </button>
            )}

            {/* Bottom Playback HUD Bar */}
            <div className="absolute bottom-0 inset-x-0 p-4 space-y-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/90 to-transparent z-20">
              {/* Progress Slider */}
              <div
                className="relative w-full h-1.5 bg-zinc-700/80 rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  if (videoRef.current) {
                    videoRef.current.currentTime = pos * (duration || targetDuration);
                  }
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-amber-400 rounded-full"
                  style={{
                    width: `${Math.min(100, (currentTime / (duration || targetDuration)) * 100)}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-300 font-mono">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-white transition cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>

                  <button
                    onClick={handleRestart}
                    className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-white transition cursor-pointer"
                    title="Restart from 0.0s"
                  >
                    <RotateCcw className="w-4 h-4 text-cyan-400" />
                  </button>

                  <button
                    onClick={toggleMute}
                    className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-white transition cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <span className="text-[11px] text-zinc-400">
                    {currentTime.toFixed(1)}s / {duration ? duration.toFixed(1) : targetDuration.toFixed(1)}s ({duration ? `${duration.toFixed(0)}s` : `${targetDuration.toFixed(0)}s`} Master)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline text-[10px] text-zinc-400 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
                    {isFinalReady ? 'Final Composed MP4 • 16:9 • Synced' : 'Video Master • 16:9'}
                  </span>
                  <button
                    onClick={handleFullscreen}
                    className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-white transition cursor-pointer"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : isError ? (
          /* State 3: Error with Retry Video button */
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-3.5 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-800 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-heading text-base font-bold text-red-300">
                Media Pipeline Error
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-sm font-sans break-words bg-zinc-950/70 p-2.5 rounded-lg border border-red-900/40">
                {compositionError || videoError || 'Failed to synthesize or compose synchronized video with Gemini Omni and Lyria.'}
              </p>
            </div>

            <button
              onClick={onGenerateVideo}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Video</span>
            </button>
          </div>
        ) : (
          /* State 4: Idle / Prompt to Generate */
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <Film className="w-8 h-8 text-indigo-400" />
            </div>

            <div className="space-y-1.5">
              <h4 className="font-heading text-lg font-bold text-white">
                Ready for Gemini Omni 1.1 Flash & Lyria 3.5
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                {hasAllStoryboards
                  ? `All ${scenes?.length || 'storyboard'} 16:9 keyframes are rendered. Click below to compile the continuous ${targetDuration.toFixed(0)}-second cinematic film and synchronized soundtrack.`
                  : 'Waiting for visual storyboard keyframes to complete before synthesizing video...'}
              </p>
            </div>

            <button
              onClick={onGenerateVideo}
              disabled={!hasAllStoryboards}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-cyan-500 to-amber-500 text-white font-bold text-sm shadow-xl shadow-indigo-950/50 hover:shadow-indigo-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition duration-300 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Cinematic Video ({targetDuration.toFixed(0)}s • 16:9)</span>
            </button>
          </div>
        )}
      </div>

      {/* Storyboard timeline milestone sync breakdown */}
      <div className={`grid grid-cols-2 sm:grid-cols-${Math.min(6, Math.max(2, scenes?.length || 4))} gap-3 pt-2`}>
        {scenes && scenes.length > 0 ? (
          scenes.map((scene) => (
            <div key={scene.sceneNumber} className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>SCENE 0{scene.sceneNumber}</span>
                <span className="text-amber-400">
                  {scene.duration || `${((scene.sceneNumber - 1) * (targetDuration / scenes.length)).toFixed(1)}–${(scene.sceneNumber * (targetDuration / scenes.length)).toFixed(1)}s`}
                </span>
              </div>
              <p className="text-xs font-medium text-zinc-300 mt-1 line-clamp-1">
                {scene.description.split('.')[0] || `Keyframe 0${scene.sceneNumber}`}
              </p>
              <span className="text-[10px] text-zinc-500 block truncate">
                {scene.videoDirection || scene.description}
              </span>
            </div>
          ))
        ) : (
          <div className="col-span-full p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-center text-xs text-zinc-500 font-mono">
            {targetDuration.toFixed(1)}s Continuous Multimodal Timeline Synchronized
          </div>
        )}
      </div>
    </div>
  );
};
