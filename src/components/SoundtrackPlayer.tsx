import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Music,
  Download,
  Sparkles,
  AlertTriangle,
  Radio,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SoundtrackData, StoryboardSceneAudioDetail } from '../types.ts';

interface SoundtrackPlayerProps {
  soundtrackData?: SoundtrackData;
  soundtrackStatus?: 'idle' | 'generating' | 'ready' | 'error';
  soundtrackError?: string;
  musicPrompt: string;
  campaignTitle: string;
  soundtrackTimeline?: StoryboardSceneAudioDetail[];
  targetDuration?: number;
  onGenerateSoundtrack: () => void;
}

export const SoundtrackPlayer: React.FC<SoundtrackPlayerProps> = ({
  soundtrackData,
  soundtrackStatus = 'idle',
  soundtrackError,
  musicPrompt,
  campaignTitle,
  soundtrackTimeline,
  targetDuration = 10.0,
  onGenerateSoundtrack,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(targetDuration);
  const [isMuted, setIsMuted] = useState(false);
  const [showTimelineDetails, setShowTimelineDetails] = useState(true);

  const isGenerating = soundtrackStatus === 'generating';
  const isReady =
    soundtrackStatus === 'ready' &&
    Boolean(soundtrackData?.normalizedAudioUrl || soundtrackData?.audioUrl);
  const isError = soundtrackStatus === 'error';

  // Use normalized audio if available (trimmed to video duration with fades), else raw
  const playableAudioSrc =
    soundtrackData?.normalizedAudioUrl || soundtrackData?.audioUrl;

  const timelineToDisplay = soundtrackTimeline || soundtrackData?.musicTimeline || [];
  const promptToDisplay = soundtrackData?.derivedPrompt || musicPrompt;
  const effectiveTargetDuration = soundtrackData?.targetDuration || targetDuration;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      audio.currentTime = 0;
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playableAudioSrc]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleRestart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !audioRef.current.muted;
    setIsMuted(audioRef.current.muted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleDownload = () => {
    if (!playableAudioSrc) return;
    const a = document.createElement('a');
    a.href = playableAudioSrc;
    a.download = `${campaignTitle.toLowerCase().replace(/\s+/g, '-')}-soundtrack.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
      {/* Hidden HTML5 Audio Element */}
      {isReady && playableAudioSrc && (
        <audio ref={audioRef} src={playableAudioSrc} preload="auto" />
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Original Campaign Soundtrack
                </h3>
                {isReady && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-400 text-[10px] font-mono font-semibold">
                    Storyboard Synchronized ({effectiveTargetDuration.toFixed(1)}s)
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Synthesized by <span className="font-mono text-emerald-300">Lyria 3.5</span> derived directly from the Storyboard Timeline
              </p>
            </div>
          </div>
        </div>

        {/* Action Button in Header */}
        <div className="flex items-center gap-2">
          {!isReady && !isGenerating && (
            <button
              onClick={onGenerateSoundtrack}
              disabled={isGenerating}
              className="relative group/btn flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition duration-300 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Soundtrack</span>
            </button>
          )}

          {isReady && (
            <div className="flex items-center gap-2">
              <button
                onClick={onGenerateSoundtrack}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 text-xs font-mono transition cursor-pointer active:scale-95"
                title="Regenerate Soundtrack"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Regenerate Soundtrack</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/50 text-xs font-mono transition cursor-pointer active:scale-95"
                title="Download Audio File"
              >
                <Download className="w-3.5 h-3.5 text-emerald-300" />
                <span>Export Audio</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Player Display Area */}
      <div className="relative w-full bg-zinc-950 rounded-2xl border border-zinc-800/80 p-5 sm:p-6 shadow-xl overflow-hidden">
        {/* State 1: Ready - Audio Player Controls */}
        {isReady && playableAudioSrc && (
          <div className="space-y-5">
            {/* Track Info & Visualizer Waves Simulation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>Now Playing • Normalized Campaign Soundtrack</span>
                </span>
                <h4 className="text-base font-bold text-white tracking-tight">
                  {campaignTitle} — "Acoustic Rain & Chai"
                </h4>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-mono">
                  <span>Model: {soundtrackData?.model || 'Lyria 3.5'}</span>
                  <span>•</span>
                  <span>Target Duration: {soundtrackData?.normalizedDuration || effectiveTargetDuration}s</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">Normalized & Faded</span>
                </div>
              </div>

              {/* Simulated Frequency Spectrum Bars */}
              <div className="flex items-end gap-1 h-8 px-3 py-1 bg-zinc-900 rounded-xl border border-zinc-800">
                {[12, 24, 18, 28, 14, 22, 30, 16, 26, 20, 10, 24, 16, 28].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full bg-gradient-to-t from-emerald-500 to-cyan-400 transition-all duration-300 ${
                      isPlaying ? 'animate-pulse' : 'opacity-40'
                    }`}
                    style={{
                      height: isPlaying ? `${Math.max(4, (h * ((i % 3) + 1)) % 28)}px` : `${h / 2}px`,
                      animationDelay: `${i * 70}ms`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Scrubber Progress Bar */}
            <div className="space-y-1.5">
              <input
                type="range"
                min="0"
                max={duration || effectiveTargetDuration}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>
                  {Math.floor(currentTime / 60)}:
                  {Math.floor(currentTime % 60).toString().padStart(2, '0')}.
                  {Math.floor((currentTime % 1) * 10)}
                </span>
                <span className="text-[11px] text-zinc-500">
                  Exact Duration: {duration ? duration.toFixed(1) : effectiveTargetDuration.toFixed(1)}s (Synchronized to Video)
                </span>
              </div>
            </div>

            {/* Playback Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-850">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/40 hover:scale-105 active:scale-95 transition cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-white" />
                  ) : (
                    <Play className="w-5 h-5 fill-white translate-x-0.5" />
                  )}
                </button>

                <button
                  onClick={handleRestart}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition cursor-pointer"
                  title="Restart Track"
                >
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                </button>

                <button
                  onClick={toggleMute}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition cursor-pointer"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-emerald-300">
                  Lyria Output Post-Processed to {soundtrackData?.normalizedDuration || effectiveTargetDuration}s
                </span>
              </div>
            </div>
          </div>
        )}

        {/* State 2: Generating - Live Animated Processing State */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
              <Music className="w-7 h-7 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h4 className="font-heading text-lg font-bold text-white">
                Composing Soundtrack from Storyboard Timeline...
              </h4>
              <p className="text-xs text-zinc-400 max-w-md font-sans">
                Lyria 3.5 is synthesizing acoustic movements aligned with the {timelineToDisplay.length || 4} storyboard scenes across {effectiveTargetDuration.toFixed(1)} seconds.
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/50 text-[11px] font-mono text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Storyboard Timeline Conditioned ({effectiveTargetDuration.toFixed(1)}s)</span>
            </div>
          </div>
        )}

        {/* State 3: Error State with Retry Soundtrack button */}
        {isError && (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3.5 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-800 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-heading text-base font-bold text-red-300">
                Soundtrack Generation Failed
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {soundtrackError || 'Lyria 3.5 soundtrack synthesis failed.'}
              </p>
            </div>

            <button
              onClick={onGenerateSoundtrack}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Soundtrack</span>
            </button>
          </div>
        )}

        {/* State 4: Idle / Prompt to Generate */}
        {!isReady && !isGenerating && !isError && (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <Music className="w-7 h-7 text-emerald-400" />
            </div>

            <div className="space-y-1.5">
              <h4 className="font-heading text-lg font-bold text-white">
                Storyboard Music Timeline Ready
              </h4>
              <p className="text-xs text-zinc-400 font-sans">
                The {timelineToDisplay.length || 4}-scene storyboard timeline is mapped for {effectiveTargetDuration.toFixed(1)}s. Click below to generate the synchronized acoustic soundtrack with Lyria 3.5.
              </p>
            </div>

            <button
              onClick={onGenerateSoundtrack}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold text-xs shadow-xl shadow-emerald-950/50 hover:shadow-emerald-900/60 transition cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Soundtrack (Lyria 3.5 • {effectiveTargetDuration.toFixed(1)}s)</span>
            </button>
          </div>
        )}
      </div>

      {/* Storyboard-Derived Music Timeline Breakdown */}
      <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800/80 overflow-hidden">
        <div
          onClick={() => setShowTimelineDetails(!showTimelineDetails)}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-900/40 transition select-none"
        >
          <div className="flex items-center gap-2 font-mono text-xs font-semibold text-emerald-400">
            <Layers className="w-4 h-4" />
            <span>Storyboard Music Timeline (Source of Truth for Soundtrack • {timelineToDisplay.length} Scenes)</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <span>{showTimelineDetails ? 'Hide Timeline' : 'View Scene Audio Directions'}</span>
            {showTimelineDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {showTimelineDetails && (
          <div className="p-4 pt-0 border-t border-zinc-850 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-3">
              {timelineToDisplay.map((sceneItem, idx) => {
                const colors = [
                  'text-cyan-300',
                  'text-amber-300',
                  'text-indigo-300',
                  'text-emerald-300',
                  'text-pink-300',
                  'text-teal-300',
                  'text-purple-300',
                  'text-rose-300',
                ];
                const colorClass = colors[idx % colors.length];

                return (
                  <div
                    key={sceneItem.sceneNumber || idx}
                    className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${colorClass}`}>
                        SCENE 0{sceneItem.sceneNumber}: {sceneItem.startTime}–{sceneItem.endTime}
                      </span>
                      <span className="text-[10px] text-zinc-500">Duration: {sceneItem.duration}</span>
                    </div>
                    <div className="text-zinc-300 font-sans text-xs">
                      <strong>Action & Tone:</strong> {sceneItem.emotionalTone}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      <strong className="text-zinc-300">Sound Direction:</strong> {sceneItem.soundDirection}
                    </div>
                    <div className="text-[10px] text-zinc-500 italic">
                      Transition: {sceneItem.transition}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Generated Lyria Master Prompt Derived from Timeline */}
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block">
                Derived Lyria 3.5 Prompt Sent to API ({effectiveTargetDuration.toFixed(1)}s):
              </span>
              <p className="text-xs font-mono text-zinc-300 leading-relaxed italic line-clamp-4">
                "{promptToDisplay}"
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
