import React, { useState } from 'react';
import { Sparkles, Users, MapPin, Clock, ArrowRight, Play, Lightbulb, AlertCircle, Film } from 'lucide-react';

interface CreativeBriefFormProps {
  onGenerate: (data: {
    creativeVision: string;
    audience: string;
    location: string;
    duration: string;
  }) => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

const DURATION_OPTIONS = [
  { value: '5s', label: '5 Seconds', scenes: '2–3 Scenes', badge: 'Quick Hook' },
  { value: '10s', label: '10 Seconds', scenes: '4 Scenes', badge: 'Standard Social' },
  { value: '15s', label: '15 Seconds', scenes: '5–6 Scenes', badge: 'Story / Reel' },
  { value: '20s', label: '20 Seconds', scenes: '6–8 Scenes', badge: 'Extended Spot' },
];

const SAMPLE_VISIONS = [
  {
    label: 'Hyderabad Monsoon Café',
    vision: 'I run a Hyderabad café. Create a monsoon campaign for college students.',
    audience: 'College students, young dreamers & remote creatives',
    location: 'Hyderabad, India',
    duration: '10s',
  },
  {
    label: 'Tokyo Cyberpunk Streetwear',
    vision: 'Launch an underground sustainable techwear hoodie drop with luminous neon accents in Shibuya rainy alleys.',
    audience: 'Gen Z streetwear collectors & electronic music producers',
    location: 'Tokyo, Japan',
    duration: '15s',
  },
  {
    label: 'Artisanal Sourdough Bakery',
    vision: 'Introduce sunrise sourdough loaves baked in a wood-fired brick oven with slow golden morning light.',
    audience: 'Foodies, weekend brunch lovers & neighborhood families',
    location: 'Portland, Oregon',
    duration: '5s',
  },
  {
    label: 'Alpine Electric Overland',
    vision: 'An all-electric expedition vehicle quietly climbing snowy switchbacks under the Northern Lights.',
    audience: 'Adventure photographers & eco-conscious explorers',
    location: 'Lofoten, Norway',
    duration: '20s',
  },
];

export const CreativeBriefForm: React.FC<CreativeBriefFormProps> = ({
  onGenerate,
  isLoading,
  errorMessage,
}) => {
  const [creativeVision, setCreativeVision] = useState(
    'I run a Hyderabad café. Create a monsoon campaign for college students.'
  );
  const [audience, setAudience] = useState('College students & young creatives');
  const [location, setLocation] = useState('Hyderabad, India');
  const [duration, setDuration] = useState('10s');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creativeVision.trim() || isLoading) return;
    onGenerate({
      creativeVision: creativeVision.trim(),
      audience: audience.trim(),
      location: location.trim(),
      duration: duration.trim(),
    });
  };

  const applySample = (sample: typeof SAMPLE_VISIONS[0]) => {
    setCreativeVision(sample.vision);
    setAudience(sample.audience);
    setLocation(sample.location);
    setDuration(sample.duration);
  };

  return (
    <div id="brief-form" className="w-full max-w-4xl mx-auto py-6 sm:py-10 px-4 sm:px-6">
      {/* Hero Title & Subtitle */}
      <div className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 text-xs font-medium mb-4 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Multimodal Campaign Engine</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-4">
          CampaignCraft <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">AI</span>
        </h1>
        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Turn one creative idea into a complete multimodal campaign.
        </p>
        <p className="text-xs sm:text-sm text-zinc-500 mt-2">
          Campaign Reasoning & Strategy Orchestration powered by{' '}
          <strong className="text-cyan-300 font-semibold font-mono">Gemini 3.8 Flash</strong>
        </p>
      </div>

      {/* Main Vision Input Card */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-amber-500/20 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>

        <div className="relative bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800/60 flex items-start gap-3 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-red-300">Campaign Orchestration Error</span>
                <p className="text-xs text-red-300/90">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="creativeVision" className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <span>Your Creative Vision</span>
                  <span className="text-xs font-normal text-cyan-400 bg-cyan-950/70 border border-cyan-800/40 px-2 py-0.5 rounded-full">
                    Core Prompt
                  </span>
                </label>
                <span className="text-xs text-zinc-500 font-mono">Gemini 3.8 Flash</span>
              </div>

              <div className="relative">
                <textarea
                  id="creativeVision"
                  rows={4}
                  value={creativeVision}
                  onChange={(e) => setCreativeVision(e.target.value)}
                  placeholder="I run a Hyderabad café. Create a monsoon campaign for college students."
                  className="w-full bg-zinc-950/80 border border-zinc-700/80 focus:border-cyan-500 rounded-xl p-4 text-zinc-100 placeholder-zinc-500 text-base focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition resize-y font-sans leading-relaxed"
                  required
                />
              </div>
            </div>

            {/* Inspiration Chips */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick demo presets (Click to test different creative visions):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_VISIONS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applySample(sample)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 transition flex items-center gap-1.5 group/chip active:scale-95 cursor-pointer"
                  >
                    <span className="text-zinc-500 group-hover/chip:text-cyan-400 transition-colors">•</span>
                    <span>{sample.label}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">({sample.duration})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* FIRST-CLASS CAMPAIGN DURATION SELECTOR */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Campaign Duration (Orchestration Target)</span>
                </label>
                <span className="text-[11px] font-mono text-zinc-400">
                  Selected: <strong className="text-cyan-300">{duration}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {DURATION_OPTIONS.map((opt) => {
                  const isSelected = duration === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDuration(opt.value)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-cyan-950/80 to-indigo-950/80 border-cyan-500 text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                          : 'bg-zinc-900/60 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-bold font-mono ${isSelected ? 'text-cyan-300' : 'text-zinc-200'}`}>
                          {opt.label}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                            isSelected
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {opt.value}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Film className="w-3 h-3 text-zinc-500" />
                        <span>{opt.scenes}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1 italic">
                        {opt.badge}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Fields Toggle */}
            <div className="pt-2 border-t border-zinc-800/70">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-zinc-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>{showAdvanced ? 'Hide advanced parameters' : 'Customize Target Audience & Setting Location'}</span>
                <span className="text-zinc-500">[{showAdvanced ? '−' : '+'}]</span>
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-2">
                  <div>
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mb-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Target Audience</span>
                    </label>
                    <input
                      type="text"
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      placeholder="e.g. College students & young creatives"
                      className="w-full bg-zinc-950/90 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Location / Setting</span>
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Hyderabad, India"
                      className="w-full bg-zinc-950/90 border border-zinc-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Prominent Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !creativeVision.trim()}
                className="w-full relative group/btn overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-amber-500 p-px font-semibold text-white shadow-xl shadow-cyan-950/50 hover:shadow-cyan-900/60 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 active:scale-[0.99] cursor-pointer"
              >
                <div className="relative flex items-center justify-center gap-3 px-8 py-4 rounded-[11px] bg-zinc-950 transition duration-300 group-hover/btn:bg-opacity-80">
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-base tracking-wide font-medium bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                        Gemini 3.8 Flash is Orchestrating {duration} Campaign...
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-cyan-400 text-cyan-400 group-hover/btn:scale-110 transition-transform" />
                      <span className="text-base tracking-wide font-bold text-white group-hover/btn:text-cyan-200">
                        Generate {duration} Campaign
                      </span>
                      <ArrowRight className="w-4 h-4 text-zinc-400 group-hover/btn:translate-x-1 group-hover/btn:text-white transition-all" />
                    </>
                  )}
                </div>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
