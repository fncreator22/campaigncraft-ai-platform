# CampaignCraft AI Platform 🎬

> **Multimodal AI Creative Campaign Generator & Post-Production Studio Platform**  
> Powered by Google Gemini 3.8 Flash, Nano Banana 2 Lite, Gemini Omni 1.1 Flash, Lyria 3.5, and an FFmpeg Post-Production Engine.

---

## Table of Contents
1. [Project Overview & Core Idea](#project-overview--core-idea)
2. [High-Level Architecture & End-to-End Workflow](#high-level-architecture--end-to-end-workflow)
3. [Tech Stack & Tools](#tech-stack--tools)
4. [Repository Structure](#repository-structure)
5. [Backend Deep Dive](#backend-deep-dive)
   - [API Endpoints](#api-endpoints)
   - [Gemini Models & SDK Integration](#gemini-models--sdk-integration)
   - [Post-Production Media Engine & Audio Mixing](#post-production-media-engine--audio-mixing)
6. [Frontend Deep Dive](#frontend-deep-dive)
   - [State Machine & Asynchronous Lifecycle](#state-machine--asynchronous-lifecycle)
   - [Component Hierarchy](#component-hierarchy)
7. [Credentials & Environment Variables](#credentials--environment-variables)
8. [Setup & Installation Guide](#setup--installation-guide)
   - [Prerequisites](#prerequisites)
   - [Step-by-Step Local Setup](#step-by-step-local-setup)
   - [Running the App](#running-the-app)
9. [Platform & Deployment Details](#platform--deployment-details)
10. [Troubleshooting & Known Considerations](#troubleshooting--known-considerations)

---

## Project Overview & Core Idea

### The Problem
Creating a high-impact advertising video campaign traditionally requires multiple disparate teams:
- Creative directors to write the concept and narrative arc.
- Storyboard artists to sketch key visual frames.
- Cinematographers and video generators to produce film footage.
- Sound designers and composers to compose, align, and master soundtracks.
- Audio engineers and video editors to strip unwanted native audio, mix background ambience, apply peak limiting, and mux the final assets into an MP4 commercial.

### The Solution: CampaignCraft AI Platform
**CampaignCraft AI Platform** unifies the entire creative advertising production pipeline into a single, cohesive multimodal studio. From a single natural language brief (e.g. *"I run a Hyderabad café. Create a monsoon campaign for college students."*), CampaignCraft AI Platform automatically executes a structured 5-stage production sequence:

1. **Strategic Creative Brief & Timeline Architecture:** Generates campaign titles, audience profiles, emotional arcs, cinematographic visual styles, color palettes, and chronological scene timelines synchronized to a user-specified target duration (5s, 10s, 15s, or 20s).
2. **Visual Storyboarding:** Generates 16:9 cinematic keyframe images for each chronological scene in parallel.
3. **Continuous Cinematic Video Synthesis:** Uses the generated storyboard keyframes as temporal visual anchors to synthesize a continuous 16:9 film.
4. **Original Commercial Soundtrack:** Composes an original acoustic musical score dynamically structured around scene-by-scene narrative beats, with an offline procedural PCM synthesizer fallback.
5. **Post-Production Media Composition:** Strips native audio from the video, normalizes and pads/trims audio tracks, generates procedural environmental ambience (e.g., rain texture, room tone, synchronized glass clinks), limits peaks at -0.5 dB, normalizes loudness, and muxes everything into a finalized MP4 commercial.

---

## High-Level Architecture & End-to-End Workflow

```
[ User Input: Creative Vision Brief + Target Duration (5s, 10s, 15s, 20s) ]
                                    │
                                    ▼
       1. STRATEGY ORCHESTRATION (POST /api/campaign/generate)
          Engine: Gemini 3.8 Flash (responseSchema: JSON)
          Outputs: Title, Concept, Audience, Scenes, Master Video & Music Prompts
                                    │
                                    ▼
       2. VISUAL STORYBOARDING (POST /api/campaign/generate-scene-image)
          Engine: Nano Banana 2 Lite (gemini-3.1-flash-lite-image)
          Outputs: Parallel 16:9 Photorealistic Keyframe Stills (Base64 JPEG)
                                    │
                                    ▼
       3. CINEMATIC VIDEO SYNTHESIS (POST /api/campaign/generate-video)
          Engine: Gemini Omni 1.1 Flash via Interactions API
          Inputs: Multi-image visual conditioning + master prompt
          Outputs: 16:9 Continuous Video (MP4)
          Post-processing: FFmpeg stripVideoAudio() -> Silent Video Master
                                    │
                                    ▼
       4. SOUNDTRACK SYNTHESIS (POST /api/campaign/generate-soundtrack)
          Engine: Lyria 3.5 (lyria-3-clip-preview) + soundSynth PCM WAV Fallback
          Inputs: Storyboard-derived scene-by-scene musical timeline
          Outputs: 44.1kHz Stereo Soundtrack (WAV/AAC)
          Post-processing: FFmpeg processSoundtrackOutput() -> Normalized Audio
                                    │
                                    ▼
       5. MULTI-LAYER MEDIA COMPOSITION (POST /api/campaign/compose-media)
          Engine: FFmpeg Multi-Track Mixer & FastStart Muxer
          - Layer 1: Lyria Music Track (Gain: 0–100%, default 100%)
          - Layer 2: Procedural Ambience / SFX (Gain: 0–100%, default 80%)
          - Layer 3: Original Video Audio (Gain: 0–100%, default 0% / Muted)
          - Mastering: alimiter (limit=0.95) + dynaudnorm (loudness normalization)
          Outputs: Finalized Broadcast-Ready 16:9 MP4 Commercial
```

---

## Tech Stack & Tools

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Language** | TypeScript | `7.0.2` / `5.8` | Full-stack type safety |
| **Server Framework** | Express | `4.21.2` | REST API routes, JSON parsing (20MB limit) |
| **Frontend Framework** | React | `19.0.1` | Client UI rendering |
| **Bundler / Dev Server**| Vite | `8.3.0` | Client bundling & HMR middleware |
| **TypeScript Runner** | tsx | `4.21.0` | Zero-transpile execution for server.ts |
| **CSS & Styling** | Tailwind CSS | `4.3.3` | Utility styling (`@tailwindcss/vite`) |
| **Icons** | Lucide React | `0.546.0` | UI iconography |
| **Motion & FX** | Canvas Confetti | `1.9.4` | Milestone celebration particles |
| **AI Client SDK** | `@google/genai` | `2.4.0` | Unified Google GenAI SDK |
| **Media Processing** | FFmpeg & FFprobe | System PATH | Video audio stripping, audio mixing, MP4 muxing |
| **Package Management** | Bun / NPM | `bun.lock` / `package-lock.json` | Dependency management |

---

## Repository Structure

```
├── .env.example               # Template environment configuration
├── .gitignore                 # Git ignore rules (node_modules, dist, etc.)
├── bun.lock                   # Lockfile for Bun runtime
├── package.json               # NPM scripts and dependencies
├── package-lock.json          # Deterministic dependency tree for NPM
├── metadata.json              # AI Studio Applet configuration metadata
├── tsconfig.json              # TypeScript compilation configuration
├── vite.config.ts             # Vite 8 config with Tailwind v4 & React plugins
├── index.html                 # Single Page Application HTML shell
├── server.ts                  # Express backend entry point & Vite middleware
└── src/
    ├── main.tsx               # React 19 client mount
    ├── App.tsx                # Top-level state orchestrator & pipeline flow
    ├── index.css              # Global styles, fonts, and dark theme definitions
    ├── types.ts               # Core domain models, state interfaces & validators
    ├── components/
    │   ├── Header.tsx                    # Studio header with status and reset controls
    │   ├── CreativeBriefForm.tsx         # Landing view form with presets & duration selector
    │   ├── GenerationPipelineStatus.tsx  # 3-step active pipeline card display
    │   ├── CampaignWorkspace.tsx         # Main studio workspace container
    │   ├── StoryboardGrid.tsx            # 16:9 keyframe card grid with lightbox zoom
    │   ├── CinematicVideoPlayer.tsx      # Video player with multi-asset inspector tabs
    │   ├── SoundtrackPlayer.tsx          # Audio player with scene beat breakdown
    │   └── MediaProductionControls.tsx   # Mixer sliders & duration verification matrix
    ├── server/
    │   ├── orchestration.ts   # Campaign brief strategy generator (Gemini 3.8 Flash)
    │   ├── imageGen.ts        # Keyframe generator (gemini-3.1-flash-lite-image)
    │   ├── videoGen.ts        # Cinematic video generator (gemini-omni-1.1-flash)
    │   ├── soundtrackGen.ts   # Soundtrack generator (lyria-3-clip-preview + fallback)
    │   ├── soundSynth.ts      # Pure Node.js 44.1kHz 16-bit PCM WAV synthesizer
    │   ├── mediaComposer.ts   # FFmpeg video stripping, audio normalization & muxing
    │   ├── audioGen.ts        # Legacy audio generation reference module
    │   └── diagnostics.ts     # Error sanitization, credential redaction & categorization
    └── utils/
        └── pipelineState.ts   # Independent stage state machine derivation logic
```

---

## Backend Deep Dive

All backend logic runs in Node.js via `server.ts` and modular handlers in `src/server/`.

### API Endpoints

#### 1. `GET /api/health`
- **Purpose:** Quick health check and configuration telemetry.
- **Response:**
  ```json
  {
    "status": "ok",
    "hasApiKey": true,
    "model": "gemini-3.8-flash"
  }
  ```

#### 2. `POST /api/campaign/generate`
- **Handler:** `src/server/orchestration.ts` (`orchestrateCampaignWithGemini`)
- **Model:** `gemini-3.8-flash`
- **Request Body:** `{ creativeVision, audience, location, duration }`
- **Behavior:** Enforces strict JSON Schema generation. Parses target duration (`5s`, `10s`, `15s`, `20s`) and dynamically calculates chronological scene durations (using `synchronizeStoryboardTimeline`) so all scenes sum exactly to the target duration. Includes tailored directorial heuristics for Hyderabad monsoon campaigns.

#### 3. `POST /api/campaign/generate-scene-image`
- **Handler:** `src/server/imageGen.ts` (`generateKeyframeImage`)
- **Model:** `gemini-3.1-flash-lite-image` ("Nano Banana 2 Lite")
- **Request Body:** `{ imagePrompt, sceneNumber, title }`
- **Behavior:** Configures `imageConfig.aspectRatio = "16:9"` and returns a base64 Data URI (`data:image/jpeg;base64,...`).

#### 4. `POST /api/campaign/generate-video`
- **Handler:** `src/server/videoGen.ts` (`generateCinematicVideoWithOmni`)
- **Model:** `gemini-omni-1.1-flash` via the Interactions API (`ai.interactions.create`)
- **Request Body:** `{ videoPrompt, scenes, campaignTitle, creativeConcept, targetDuration }`
- **Behavior:** 
  - Passes generated storyboard keyframes as chronological reference images (`type: 'image'`) alongside the master prompt.
  - Normalizes target duration to `'5s'` or `'10s'` as required by Gemini Omni.
  - Automatically pipes output to `processVideoOutput` in `mediaComposer.ts` to probe video streams and strip native audio, creating a silent video master.

#### 5. `POST /api/campaign/generate-soundtrack`
- **Handler:** `src/server/soundtrackGen.ts` (`generateSoundtrackWithLyria`)
- **Model:** `lyria-3-clip-preview` ("Lyria 3.5") with `soundSynth.ts` procedural fallback
- **Request Body:** `{ musicPrompt, campaignTitle, scenes, targetDuration }`
- **Behavior:**
  - Constructs a prompt conditioned on storyboard scene timestamps, narrative actions, and emotional transitions.
  - Streams audio chunks via `responseModalities: [Modality.AUDIO]`.
  - If Lyria is unavailable or `GEMINI_API_KEY` is omitted, gracefully falls back to `src/server/soundSynth.ts` to synthesize a 44.1kHz stereo WAV track.
  - Calls `processSoundtrackOutput` in `mediaComposer.ts` to pad/trim the track to the exact target video duration with smooth fades.

#### 6. `POST /api/campaign/compose-media`
- **Handler:** `src/server/mediaComposer.ts` (`composeFinalMedia`)
- **Engine:** FFmpeg Multi-Layer Mixer & Muxer
- **Request Body:**
  ```json
  {
    "silentVideoUrl": "data:video/mp4;base64,...",
    "normalizedAudioUrl": "data:audio/mp4;base64,...",
    "rawVideo": "data:video/mp4;base64,...",
    "targetDuration": 10.0,
    "campaignTitle": "Hyderabad Monsoon",
    "mixerSettings": {
      "musicEnabled": true,
      "musicVolume": 100,
      "ambienceEnabled": true,
      "ambienceVolume": 80,
      "originalVideoAudioEnabled": false,
      "originalVideoAudioVolume": 0
    }
  }
  ```
- **Behavior:**
  - Synthesizes procedural rain texture, café room tone, and a glass-clink SFX pulse via FFmpeg `lavfi` (`anoisesrc`, `sine`, `adelay`).
  - Blends music, ambience, and optional native video audio using `amix`.
  - Applies peak limiting at -0.5 dB (`alimiter=limit=0.95:attack=5:release=50`) and dynamic audio normalization (`dynaudnorm`).
  - Muxes the master audio with the silent video master using `-movflags +faststart` to produce a fast-streaming MP4 commercial.

---

## Frontend Deep Dive

### State Machine & Independent Lifecycles
The frontend architecture in `src/App.tsx` and `src/utils/pipelineState.ts` avoids coupled states. Each asset has an independent lifecycle:
- **Video Stage:** `idle` → `generating` → `success` | `error`
- **Soundtrack Stage:** `waiting` → `idle` → `generating` → `success` | `error`
- **Composition Stage:** `waiting` → `idle` → `generating` → `success` | `error`

**Key Resilience Guarantees:**
- If soundtrack generation fails, the synthesized video master is **preserved**.
- If final media composition fails, both the video and soundtrack remain cached and previewable.
- Audio gains can be adjusted in `MediaProductionControls.tsx` to re-trigger composition without re-generating expensive video or soundtrack assets.

### Component Hierarchy
- `App.tsx`
  - `Header.tsx` (Status badges, target duration, quick reset)
  - `GenerationPipelineStatus.tsx` (Top visual stepper with real-time status)
  - `CreativeBriefForm.tsx` (Landing view with prompt input, duration pills, preset chips)
  - `CampaignWorkspace.tsx` (Studio workspace active view)
    - `CinematicVideoPlayer.tsx` (Hero 16:9 video player with Inspector tabs for Final, Silent Master, and Raw assets)
    - `StoryboardGrid.tsx` (16:9 responsive grid of scene keyframes with retry buttons and lightbox zoom)
    - `MediaProductionControls.tsx` (3-step action flow, mixer sliders, duration validation matrix)
    - `SoundtrackPlayer.tsx` (Audio player with waveform simulation and scene-by-scene audio directions)

---

## Credentials & Environment Variables

Configure environment variables in a `.env` file in the project root:

```bash
# GEMINI_API_KEY (Required for live Gemini AI inference)
# Obtain from Google AI Studio: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="AIzaSy..."

# APP_URL (Optional: Used in hosted Cloud Run environments for self-referential links)
APP_URL="http://localhost:3000"

# PORT & NODE_ENV (Optional)
PORT=3000
NODE_ENV=development
```

### Credential Handling & Security
- API keys are strictly accessed server-side in `server.ts`.
- `src/server/diagnostics.ts` redacts API keys, bearer tokens, and secrets from all server logs and client-facing error payloads.

---

## Setup & Installation Guide

### Prerequisites
1. **Node.js**: v20.11+ (recommended: Node 22+)
2. **FFmpeg & FFprobe**: Required for media composition, duration probing, and audio normalization.
   - **Windows:** Run `winget install Gyan.FFmpeg` or download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) and add its `bin` folder to system `PATH`.
   - **macOS:** `brew install ffmpeg`
   - **Linux (Ubuntu/Debian):** `sudo apt update && sudo apt install -y ffmpeg`

### Step-by-Step Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/fncreator22/campaigncraft-ai-platform.git
   cd campaigncraft-ai-platform
   ```

2. **Install dependencies:**
   - With **NPM** (use `--legacy-peer-deps` due to Vite 8 peer optional dependencies):
     ```bash
     npm install --legacy-peer-deps
     ```
   - With **Bun**:
     ```bash
     bun install
     ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env and paste your GEMINI_API_KEY
   ```

4. **Verify Build, Types & Tests:**
   ```bash
   npm run lint    # Verifies TypeScript types with zero errors
   npm test        # Runs unit tests for diagnostics, soundSynth, mediaComposer & state
   npm run build   # Compiles client production assets into dist/
   ```

5. **Start the Application:**
   - **Development mode** (starts Express backend with Vite HMR middleware on port 3000):
     ```bash
     npm run dev
     ```
   - **Production mode**:
     ```bash
     npm run build
     npm start
     ```
   - Open your browser at `http://localhost:3000`.

---

## Platform & Deployment Details

- **Google AI Studio Applet / Cloud Run:**
  The repository contains `metadata.json` declaring `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`. When deployed inside Google AI Studio, `GEMINI_API_KEY` and `APP_URL` are injected automatically by the platform runtime.
- **Docker / Container Deployment:**
  For containerized deployments, ensure the base image includes `ffmpeg`:
  ```dockerfile
  FROM node:22-alpine
  RUN apk add --no-cache ffmpeg
  WORKDIR /app
  COPY package*.json ./
  RUN npm install --legacy-peer-deps
  COPY . .
  RUN npm run build
  EXPOSE 3000
  CMD ["npm", "start"]
  ```

---

## Troubleshooting & Known Considerations

1. **Host Without FFmpeg:**
   - *Behavior:* Video probing, soundtrack normalization, and final media composition gracefully fall back to native assets without crashing or logging error spam.
   - *Full Capabilities:* To enable native 3-track audio mixing, rain/ambience synthesis, and fast-start MP4 muxing, install FFmpeg (`winget install Gyan.FFmpeg` on Windows, `brew install ffmpeg` on macOS, or `apt install ffmpeg` on Linux).
2. **Model Availability & Access:**
   - `gemini-omni-1.1-flash` and `lyria-3-clip-preview` are specialized multimodal models. Ensure your Google AI Studio project or API key has access to these preview endpoints.
   - If Lyria is unavailable, CampaignCraft AI automatically falls back to its built-in procedural audio synthesizer (`soundSynth.ts`).
3. **Cross-Platform Clean:**
   - `npm run clean` is configured cross-platform via Node.js `fs.rmSync`, operating consistently across Windows, macOS, and Linux.
