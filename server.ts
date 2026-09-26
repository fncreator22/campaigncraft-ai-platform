import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { orchestrateCampaignWithGemini } from './src/server/orchestration.ts';
import { generateKeyframeImage } from './src/server/imageGen.ts';
import { generateCinematicVideoWithOmni } from './src/server/videoGen.ts';
import { generateSoundtrackWithLyria } from './src/server/soundtrackGen.ts';
import {
  processVideoOutput,
  processSoundtrackOutput,
  composeFinalMedia,
  executeMediaCompositionPipeline,
} from './src/server/mediaComposer.ts';
import { sanitizeAndCategorizeError } from './src/server/diagnostics.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Initialize Google GenAI with environment variable
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

if (!apiKey) {
  console.warn('⚠️ GEMINI_API_KEY is not defined in environment variables.');
} else {
  console.log('✅ Gemini client initialized with server-side GEMINI_API_KEY.');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
    model: 'gemini-3.8-flash',
  });
});

// Primary endpoint: Functional Campaign Generation via Gemini 3.8 Flash
app.post('/api/campaign/generate', async (req, res) => {
  try {
    const { creativeVision, audience, location, duration } = req.body;
    console.log(`[CampaignCraft] Orchestrating campaign with Gemini 3.8 Flash for: "${creativeVision?.slice(0, 60)}..."`);
    
    if (!creativeVision || !creativeVision.trim()) {
      return res.status(400).json({ error: 'Creative vision prompt is required' });
    }

    const campaign = await orchestrateCampaignWithGemini(ai, creativeVision, audience, location, duration);
    res.json(campaign);
  } catch (error: any) {
    console.error('Error in /api/campaign/generate:', error);
    res.status(500).json({ error: error.message || 'Failed to generate campaign with Gemini 3.8 Flash' });
  }
});

// Secondary endpoint: Visual Storyboard Keyframe Generation via Nano Banana 2 Lite
app.post('/api/campaign/generate-scene-image', async (req, res) => {
  try {
    const { imagePrompt, sceneNumber, title } = req.body;
    console.log(`[CampaignCraft] Generating keyframe for Scene ${sceneNumber} with Nano Banana 2 Lite...`);

    if (!imagePrompt || !imagePrompt.trim()) {
      return res.status(400).json({ error: 'imagePrompt is required' });
    }

    const result = await generateKeyframeImage(ai, imagePrompt.trim(), Number(sceneNumber) || 1, title);
    res.json(result);
  } catch (error: any) {
    console.error(`Error in /api/campaign/generate-scene-image for Scene ${req.body?.sceneNumber}:`, error);
    res.status(500).json({ error: error.message || 'Failed to generate keyframe image with Nano Banana 2 Lite' });
  }
});

// Tertiary endpoint: Cinematic Video Generation via Gemini Omni 1.1 Flash
app.post('/api/campaign/generate-video', async (req, res) => {
  try {
    const { videoPrompt, scenes, campaignTitle, creativeConcept, targetDuration = 10.0 } = req.body;
    const targetDurationNum = Number(targetDuration) || 10.0;
    console.log(`[CampaignCraft] Orchestrating video synthesis with Gemini Omni 1.1 Flash for "${campaignTitle}" (target: ${targetDurationNum}s)...`);

    if (!videoPrompt || !videoPrompt.trim()) {
      return res.status(400).json({ error: 'videoPrompt is required for video synthesis' });
    }

    if (!Array.isArray(scenes) || scenes.length === 0) {
      return res.status(400).json({ error: 'scenes array with image references is required' });
    }

    const videoResult = await generateCinematicVideoWithOmni(ai, {
      videoPrompt: videoPrompt.trim(),
      scenes,
      campaignTitle: campaignTitle || 'CampaignCraft Production',
      creativeConcept,
      targetDuration: targetDurationNum,
    });

    // Immediately inspect the generated video's duration and strip native video audio
    console.log('[CampaignCraft] Probing generated video duration and stripping native audio track...');
    const processedVideo = await processVideoOutput(videoResult.videoUrl, targetDurationNum);

    res.json({
      videoUrl: videoResult.videoUrl,
      silentVideoUrl: processedVideo.silentVideoUrl,
      duration: `${processedVideo.actualDuration.toFixed(1)}s`,
      actualDuration: processedVideo.actualDuration,
      requestedDuration: targetDurationNum,
      aspectRatio: videoResult.aspectRatio || '16:9',
      model: videoResult.model || 'gemini-omni-1.1-flash',
      hasNativeAudio: processedVideo.hasNativeAudio,
      audioRemoved: true,
      silentVideoCreated: true,
    });
  } catch (error: any) {
    const diag = sanitizeAndCategorizeError(error, 'VIDEO_API_ERROR');
    console.error('Error in /api/campaign/generate-video:', diag.message);
    res.status(500).json({
      error: diag.message,
      category: diag.category,
    });
  }
});

// Quaternary endpoint: Original Soundtrack Composition via Lyria 3.5
app.post('/api/campaign/generate-soundtrack', async (req, res) => {
  try {
    const { musicPrompt, campaignTitle, scenes, targetDuration = 10.0 } = req.body;
    const targetDurationNum = Number(targetDuration) || 10.0;
    console.log(
      `[CampaignCraft] Synthesizing soundtrack with Lyria 3.5 for "${campaignTitle}" derived from ${scenes?.length || 0} storyboard scenes (target: ${targetDurationNum}s)...`
    );

    const soundtrackResult = await generateSoundtrackWithLyria(ai, {
      musicPrompt: musicPrompt?.trim(),
      campaignTitle: campaignTitle || 'CampaignCraft Production',
      scenes,
      targetDuration: targetDurationNum,
    });

    // Inspect actual generated audio duration and normalize to target video duration
    console.log('[CampaignCraft] Probing Lyria audio duration and normalizing to target video duration...');
    const processedSoundtrack = await processSoundtrackOutput(soundtrackResult.audioUrl, targetDurationNum);

    res.json({
      audioUrl: soundtrackResult.audioUrl,
      normalizedAudioUrl: processedSoundtrack.normalizedAudioUrl,
      duration: `${processedSoundtrack.actualDuration.toFixed(1)}s`,
      actualDuration: processedSoundtrack.actualDuration,
      sourceDuration: processedSoundtrack.sourceDuration,
      requestedDuration: targetDurationNum,
      targetDuration: processedSoundtrack.targetDuration,
      normalizedDuration: processedSoundtrack.normalizedDuration,
      isNormalized: true,
      isValidated: true,
      mimeType: soundtrackResult.mimeType || 'audio/wav',
      model: soundtrackResult.model || 'lyria-3-clip-preview (Lyria 3.5)',
      lyrics: soundtrackResult.lyrics,
      musicTimeline: soundtrackResult.musicTimeline,
      derivedPrompt: soundtrackResult.derivedPrompt,
    });
  } catch (error: any) {
    const diag = sanitizeAndCategorizeError(error, 'AUDIO_API_ERROR');
    console.error('Error in /api/campaign/generate-soundtrack:', diag.message);
    res.status(500).json({
      error: diag.message,
      category: diag.category,
    });
  }
});

// Media Composition endpoint: Synchronize Video & Soundtrack, Strip Native Video Audio, Normalize, Mux into Final MP4
app.post('/api/campaign/compose-media', async (req, res) => {
  try {
    const { silentVideoUrl, normalizedAudioUrl, rawVideo, rawAudio, targetDuration, campaignTitle, mixerSettings } = req.body;
    console.log(`[CampaignCraft] Composing final campaign media for "${campaignTitle}" with mixer settings:`, mixerSettings);

    let compositionResult;
    if (silentVideoUrl && normalizedAudioUrl) {
      compositionResult = await composeFinalMedia({
        silentVideoUrl,
        normalizedAudioUrl,
        rawVideoUrl: rawVideo,
        targetDuration: Number(targetDuration) || 10.0,
        mixerSettings,
      });
    } else if (rawVideo && rawAudio) {
      compositionResult = await executeMediaCompositionPipeline({
        rawVideoBase64OrUrl: rawVideo,
        rawAudioBase64OrUrl: rawAudio,
        campaignTitle: campaignTitle || 'CampaignCraft Production',
        mixerSettings,
      });
    } else {
      return res.status(400).json({
        error: 'Both silentVideoUrl and normalizedAudioUrl (or rawVideo and rawAudio) are required for composition.',
      });
    }

    res.json(compositionResult);
  } catch (error: any) {
    const diag = sanitizeAndCategorizeError(error, 'COMPOSITION_ERROR');
    console.error('Error in /api/campaign/compose-media:', diag.message);
    res.status(500).json({
      error: diag.message,
      category: diag.category,
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎬 CampaignCraft AI Platform Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
