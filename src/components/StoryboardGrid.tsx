import React, { useState } from 'react';
import { Clock, Camera, Copy, Check, Sparkles, Image as ImageIcon, RotateCcw, AlertTriangle, ZoomIn, Loader2 } from 'lucide-react';
import { CampaignScene } from '../types.ts';

interface StoryboardGridProps {
  scenes: CampaignScene[];
  onRetryScene?: (sceneNumber: number) => void;
}

export const StoryboardGrid: React.FC<StoryboardGridProps> = ({ scenes, onRetryScene }) => {
  const [copiedScenePrompt, setCopiedScenePrompt] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; sceneNumber: number; prompt: string } | null>(null);

  const copyPrompt = (sceneNumber: number, prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedScenePrompt(sceneNumber);
    setTimeout(() => setCopiedScenePrompt(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-tight">
              Visual Storyboard
            </h3>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-950/70 text-amber-300 border border-amber-800/40">
              Nano Banana 2 Lite
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Cinematic 16:9 keyframes rendered independently via <span className="font-mono text-cyan-300">gemini-3.1-flash-lite-image</span>
          </p>
        </div>

        <div className="text-xs text-zinc-500 font-mono">
          {scenes.length} Chronological Sequences • 16:9 Directorial Frame
        </div>
      </div>

      {/* Dynamic Storyboard Grid */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          scenes.length <= 3
            ? 'lg:grid-cols-3'
            : scenes.length === 4
            ? 'lg:grid-cols-4'
            : 'lg:grid-cols-3 xl:grid-cols-5'
        } gap-5`}
      >
        {scenes.map((scene) => {
          const isGenerating = scene.imageStatus === 'generating';
          const isError = scene.imageStatus === 'error';
          const isReady = scene.imageStatus === 'ready' && Boolean(scene.imageUrl);

          return (
            <div
              key={scene.sceneNumber}
              className={`flex flex-col bg-zinc-900/90 border rounded-2xl overflow-hidden shadow-xl transition-all duration-300 ${
                isError
                  ? 'border-red-800/80 ring-1 ring-red-800/40'
                  : isGenerating
                  ? 'border-cyan-500/50 shadow-cyan-950/20'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Storyboard Keyframe Container (16:9 Aspect Ratio) */}
              <div className="relative aspect-video bg-zinc-950 border-b border-zinc-800/80 overflow-hidden group">
                {/* 1. Successfully generated image state */}
                {isReady && scene.imageUrl && (
                  <>
                    <img
                      src={scene.imageUrl}
                      alt={`Scene 0${scene.sceneNumber}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Gradient overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-zinc-950/50 pointer-events-none" />

                    {/* Reticle markings for studio feel */}
                    <div className="absolute inset-2 border border-white/10 rounded-lg pointer-events-none" />

                    {/* Inspect button on hover */}
                    <button
                      onClick={() =>
                        setSelectedImage({
                          url: scene.imageUrl!,
                          sceneNumber: scene.sceneNumber,
                          prompt: scene.imagePrompt || scene.imageGenerationPrompt || scene.description,
                        })
                      }
                      className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-zinc-950/80 border border-zinc-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-xl cursor-pointer hover:scale-110"
                      title="Inspect Keyframe"
                    >
                      <ZoomIn className="w-4 h-4 text-cyan-400" />
                    </button>
                  </>
                )}

                {/* 2. Loading State: "Generating Scene 0X..." */}
                {isGenerating && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-4 text-center space-y-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                      <Sparkles className="w-5 h-5 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-heading font-semibold text-cyan-200">
                        Generating Scene 0{scene.sceneNumber}...
                      </p>
                      <span className="text-[10px] font-mono text-zinc-500 block">
                        Nano Banana 2 Lite
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. Error State with Retry Button */}
                {isError && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950/90 p-4 text-center space-y-2.5">
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-zinc-200">
                        Scene 0{scene.sceneNumber} Failed
                      </p>
                      <p className="text-[10px] text-zinc-500 line-clamp-1 max-w-[180px]">
                        {scene.imageError || 'Image generation error'}
                      </p>
                    </div>

                    {onRetryScene && (
                      <button
                        onClick={() => onRetryScene(scene.sceneNumber)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium transition cursor-pointer active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retry Scene 0{scene.sceneNumber}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 4. Pending State (before trigger) */}
                {!isReady && !isGenerating && !isError && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-4 text-center space-y-2 text-zinc-600">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-[10px] font-mono">Ready to render keyframe</span>
                  </div>
                )}

                {/* Top Overlay Badges: Scene number and duration */}
                <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-950/85 backdrop-blur-md text-[11px] font-mono font-bold text-white border border-zinc-700/80 shadow-sm">
                    Scene 0{scene.sceneNumber}
                  </span>
                </div>

                <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-950/85 backdrop-blur-md text-[11px] font-mono text-amber-300 border border-zinc-700/80 shadow-sm">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{scene.duration}</span>
                  </span>
                </div>

                {/* Bottom Model Badge when ready */}
                {isReady && (
                  <div className="absolute bottom-2 left-2.5 z-10">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono text-zinc-300 bg-zinc-950/80 backdrop-blur-md border border-zinc-800">
                      16:9 • gemini-3.1-flash-lite-image
                    </span>
                  </div>
                )}
              </div>

              {/* Scene Content Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                {/* Scene Header & Narrative Action */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/60">
                    <span className="font-mono text-xs font-bold text-white tracking-tight">
                      Scene 0{scene.sceneNumber}
                    </span>
                    <span className="font-mono text-[11px] text-amber-300 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{scene.duration}</span>
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase font-semibold text-zinc-400 tracking-wider block">
                      Narrative Action
                    </span>
                    <p className="text-xs text-zinc-200 leading-relaxed font-sans font-medium">
                      {scene.narrativeAction || scene.description}
                    </p>
                  </div>
                </div>

                {/* Video Camera Direction */}
                <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-400 text-[11px] font-semibold">
                    <Camera className="w-3.5 h-3.5 shrink-0" />
                    <span>Video Direction & Movement</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 italic leading-snug">
                    {scene.videoDirection}
                  </p>
                </div>

                {/* Directorial Image Prompt with Copy Action */}
                <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase font-semibold text-zinc-400">
                    <span>Nano Banana 2 Lite Prompt</span>
                    <button
                      onClick={() =>
                        copyPrompt(
                          scene.sceneNumber,
                          scene.imagePrompt || scene.imageGenerationPrompt || scene.description
                        )
                      }
                      className="text-zinc-500 hover:text-cyan-400 transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedScenePrompt === scene.sceneNumber ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-[11px] font-mono text-zinc-300 leading-normal line-clamp-3 hover:line-clamp-none transition-all">
                    "{scene.imagePrompt || scene.imageGenerationPrompt}"
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal for Keyframe Inspection */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950">
              <span className="font-mono text-xs font-semibold text-cyan-300">
                Scene 0{selectedImage.sceneNumber} • 16:9 Keyframe Still (gemini-3.1-flash-lite-image)
              </span>
              <button
                onClick={() => setSelectedImage(null)}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center overflow-hidden">
              <img
                src={selectedImage.url}
                alt={`Scene 0${selectedImage.sceneNumber}`}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 text-xs font-mono text-zinc-400">
              <span className="text-zinc-500 uppercase block text-[10px] mb-1 font-semibold">Visual Prompt:</span>
              "{selectedImage.prompt}"
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
