import { GoogleGenAI, Type } from '@google/genai';
import { StructuredCampaign, synchronizeStoryboardTimeline } from '../types.ts';

export async function orchestrateCampaignWithGemini(
  ai: GoogleGenAI | null,
  creativeVision: string,
  audience?: string,
  location?: string,
  duration?: string | number
): Promise<StructuredCampaign> {
  const visionText = creativeVision?.trim() || '';
  if (!visionText) {
    throw new Error('Creative vision is required');
  }

  const userAudience = audience?.trim() || 'General demographic fitting the brand';
  const userLocation = location?.trim() || 'Relevant location fitting the brief';

  // Parse targetDuration into a clean number (5, 10, 15, 20)
  let targetDurationNum = 10.0;
  if (typeof duration === 'number' && !isNaN(duration) && duration > 0) {
    targetDurationNum = duration;
  } else if (typeof duration === 'string') {
    const parsedNum = parseFloat(duration.replace(/[^\d.]/g, ''));
    if (!isNaN(parsedNum) && parsedNum > 0) {
      targetDurationNum = parsedNum;
    }
  }

  const userDurationStr = `${targetDurationNum.toFixed(1)}s`;

  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please provide a valid Gemini API key.');
  }

  // Determine approximate scene guidance based on duration
  let recommendedSceneCount = 4;
  let sceneRangeText = '4 scenes';
  if (targetDurationNum <= 5.0) {
    recommendedSceneCount = 3;
    sceneRangeText = '2–3 scenes (recommend 3 scenes)';
  } else if (targetDurationNum <= 10.0) {
    recommendedSceneCount = 4;
    sceneRangeText = '4 scenes';
  } else if (targetDurationNum <= 15.0) {
    recommendedSceneCount = 5;
    sceneRangeText = '5–6 scenes (recommend 5 scenes)';
  } else {
    recommendedSceneCount = 6;
    sceneRangeText = '6–8 scenes (recommend 6 scenes)';
  }

  // Detect whether this is the Hyderabad Monsoon campaign
  const isHyderabadMonsoon =
    visionText.toLowerCase().includes('hyderabad') ||
    visionText.toLowerCase().includes('monsoon');

  const durationConstraint = `
CRITICAL DURATION & SCENE ORCHESTRATION INSTRUCTION:
The user explicitly specified an authoritative target video duration of ${userDurationStr} (${targetDurationNum.toFixed(1)} seconds).
You MUST strictly architect the campaign for this duration:
- Generate ${sceneRangeText} keyframe scenes.
- The chronological scene durations MUST add up EXACTLY to ${targetDurationNum.toFixed(1)}s.
- Narrative arc MUST maintain: beginning (atmosphere/hook) → development (sensory/substance) → climax (peak engagement) → resolution (brand/hero finish).
- Each scene duration MUST explicitly state its timestamp window (e.g. "0.0–2.5s", "2.5–5.0s", etc.) and the final scene must conclude at exactly ${targetDurationNum.toFixed(1)}s.
- The master "videoPrompt" and "musicPrompt" MUST be explicitly composed for this exact ${targetDurationNum.toFixed(1)}-second timeline.
`;

  let hyderabadGuidance = '';
  if (isHyderabadMonsoon) {
    if (targetDurationNum <= 5.0) {
      hyderabadGuidance = `
HYDERABAD MONSOON 5-SECOND ARCHITECTURE (3 SCENES):
Scene 1 (0.0–1.5s): Monsoon window opening with cool rain, passing yellow auto-rickshaw in soft bokeh, warm tungsten cafe glow.
Scene 2 (1.5–3.5s): Steaming Irani chai pouring stream macro into traditional thick-ridged glass with toasted buttery Bun Maska.
Scene 3 (3.5–5.0s): Hero celebratory chai toast with four glasses clinking in frame center, dual-toned bokeh and tagline space.
`;
    } else if (targetDurationNum <= 10.0) {
      hyderabadGuidance = `
HYDERABAD MONSOON 10-SECOND ARCHITECTURE (4 SCENES):
Scene 1 (0.0–2.5s): Rain-slicked Hyderabad café window, cool blue-grey rain, blurred street and yellow auto-rickshaw in soft bokeh, warm tungsten cafe glow spilling outward.
Scene 2 (2.5–5.0s): Extreme macro Irani chai pour into the traditional thick-ridged transparent glass cup with steaming Bun Maska and crumbly Osmania biscuits.
Scene 3 (5.0–8.0s): Four young Indian college students inside the cozy café, laughing and sharing chai and food with torrential blue-grey rain outside.
Scene 4 (8.0–10.0s): Four hands clinking traditional thick-ridged chai glasses in a centered celebratory toast with blue and amber bokeh.
`;
    } else if (targetDurationNum <= 15.0) {
      hyderabadGuidance = `
HYDERABAD MONSOON 15-SECOND ARCHITECTURE (5 SCENES):
Scene 1 (0.0–3.0s): Atmospheric monsoon exterior, heavy raindrops streaming down café glass, Hyderabad street traffic and yellow auto-rickshaw.
Scene 2 (3.0–6.0s): Simmering brass kettle, steaming Irani chai pouring into a traditional thick-ridged transparent glass cup.
Scene 3 (6.0–9.0s): Close-up macro of fresh toasted Bun Maska slathered with golden butter and crumbly Osmania biscuits.
Scene 4 (9.0–12.0s): Four young Indian college students laughing heartily around a rustic café table, vibrant camaraderie.
Scene 5 (12.0–15.0s): Four hands clinking chai glasses in the center of frame in a celebratory toast, dual amber/blue bokeh.
`;
    } else {
      hyderabadGuidance = `
HYDERABAD MONSOON 20-SECOND ARCHITECTURE (6 SCENES):
Scene 1 (0.0–3.5s): Cinematic Hyderabad rainy cityscape, distant Charminar silhouette under moody monsoon clouds.
Scene 2 (3.5–7.0s): Rain-slicked café window close-up with warm tungsten interior light spilling onto water droplets.
Scene 3 (7.0–10.5s): Steaming Irani chai stream pouring from a height into a traditional thick-ridged glass cup.
Scene 4 (10.5–14.0s): Toasted Bun Maska with melting butter and freshly baked crumbly Osmania biscuits macro.
Scene 5 (14.0–17.0s): Four college friends laughing, sharing stories, genuine warmth contrasting against cool monsoon rain.
Scene 6 (17.0–20.0s): Four glasses raised in unison, central celebratory clink with golden amber bokeh and clean negative space.
`;
    }
  }

  const prompt = `You are the lead Creative Director and Multimodal Campaign Architect at CampaignCraft AI Platform.
Analyze the following creative vision and synthesize a structured, cohesive, high-impact advertising campaign plan.

Creative Vision: "${visionText}"
Audience: "${userAudience}"
Location: "${userLocation}"
Target Video Duration: ${targetDurationNum.toFixed(1)} seconds (${userDurationStr})

${durationConstraint}
${hyderabadGuidance}

Visual Continuity & Style Rules:
- 16:9 aspect ratio
- Cinematic photorealism
- Consistent visual identity, colour grade, and lighting mood across all scenes
- Smooth cinematic camera movement
- Strong object and visual continuity between scenes
- Master videoPrompt must describe the complete continuous cinematic film spanning the exact ${targetDurationNum.toFixed(1)}-second duration
- Music prompt must describe an original soundtrack tailored precisely to the ${targetDurationNum.toFixed(1)}-second emotional arc

Return a JSON object conforming to this schema:
{
  "campaignTitle": "Catchy, evocative, memorable campaign title",
  "creativeConcept": "Comprehensive 2-3 sentence strategic creative concept summarizing the core idea, message, and conversion hook",
  "targetAudience": "Specific psychographic & demographic audience definition",
  "location": "Geographic, cultural, or physical environment/setting",
  "emotionalArc": "Emotional journey (e.g. Curiosity -> Warmth -> Connection -> Joy)",
  "visualStyle": "Detailed cinematography, lens choice, lighting style, color grading, and textures",
  "colorPalette": "Descriptive color palette string",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": "Timestamp window (e.g. '0.0–2.5s')",
      "description": "Vivid narrative scene description of what occurs in Scene 1",
      "imagePrompt": "Directorial, highly detailed photorealistic prompt for generating keyframe 1",
      "videoDirection": "Precise camera movement, angle, framing, and action transition"
    }
  ],
  "videoPrompt": "Full master prompt for generating the continuous cinematic video combining the scenes into a coherent film of exactly ${targetDurationNum.toFixed(1)} seconds",
  "musicPrompt": "Soundtrack prompt describing mood, instrumentation, tempo, and emotional climax tailored to ${targetDurationNum.toFixed(1)} seconds"
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          campaignTitle: { type: Type.STRING },
          creativeConcept: { type: Type.STRING },
          targetAudience: { type: Type.STRING },
          location: { type: Type.STRING },
          emotionalArc: { type: Type.STRING },
          visualStyle: { type: Type.STRING },
          colorPalette: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sceneNumber: { type: Type.INTEGER },
                duration: { type: Type.STRING },
                description: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
                videoDirection: { type: Type.STRING },
              },
              required: ['sceneNumber', 'duration', 'description', 'imagePrompt', 'videoDirection'],
            },
          },
          videoPrompt: { type: Type.STRING },
          musicPrompt: { type: Type.STRING },
        },
        required: [
          'campaignTitle',
          'creativeConcept',
          'targetAudience',
          'location',
          'emotionalArc',
          'visualStyle',
          'colorPalette',
          'scenes',
          'videoPrompt',
          'musicPrompt',
        ],
      },
    },
  });

  const text = response.text?.trim() || '';
  if (!text) {
    throw new Error('Gemini 3.8 Flash returned an empty response.');
  }

  const parsed = JSON.parse(text) as StructuredCampaign;
  if (!parsed.campaignTitle || !Array.isArray(parsed.scenes) || parsed.scenes.length < 2) {
    throw new Error(`Gemini 3.8 Flash response did not return a valid multi-scene campaign structure (got ${parsed.scenes?.length || 0} scenes).`);
  }

  // Synchronize chronological storyboard timeline to add up exactly to targetDuration
  const synchronizedScenes = synchronizeStoryboardTimeline(parsed.scenes, targetDurationNum);

  parsed.scenes = synchronizedScenes;
  parsed.storyboard = synchronizedScenes;
  parsed.targetDuration = targetDurationNum;
  parsed.requestedDuration = targetDurationNum;

  // Populate campaign brief & strategy objects
  parsed.brief = {
    creativeVision: visionText,
    audience: userAudience,
    location: userLocation,
    duration: userDurationStr,
  };

  parsed.strategy = {
    campaignTitle: parsed.campaignTitle,
    creativeConcept: parsed.creativeConcept,
    targetAudience: parsed.targetAudience,
    location: parsed.location,
    emotionalArc: parsed.emotionalArc,
    visualStyle: parsed.visualStyle,
    colorPalette: parsed.colorPalette,
    videoPrompt: parsed.videoPrompt,
    musicPrompt: parsed.musicPrompt,
  };

  parsed.video = {
    status: 'idle',
    requestedDuration: targetDurationNum,
    actualDuration: 0,
    hasNativeAudio: false,
    silentMasterReady: false,
  };

  parsed.soundtrack = {
    status: 'idle',
    requestedDuration: targetDurationNum,
    actualDuration: 0,
    normalizedDuration: 0,
  };

  parsed.audioComposition = {
    mixerSettings: {
      musicEnabled: true,
      musicVolume: 100,
      ambienceEnabled: true,
      ambienceVolume: 80,
      originalVideoAudioEnabled: false,
      originalVideoAudioVolume: 0,
    },
    activeLayers: [],
  };

  parsed.finalComposition = {
    status: 'idle',
    targetDuration: targetDurationNum,
    actualDuration: 0,
  };
  parsed.composition = parsed.finalComposition;

  parsed.pipelineStage = 'STRATEGY_READY';
  parsed.overallStatus = 'Preparing Campaign';

  return parsed;
}
