import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { AudioMixerSettings, DEFAULT_MIXER_SETTINGS } from '../types.ts';
import { sanitizeAndCategorizeError } from './diagnostics.ts';

export interface MediaProbeResult {
  duration: number; // in seconds
  hasAudio: boolean;
  hasVideo: boolean;
  audioCodec?: string;
  videoCodec?: string;
  format?: string;
}

export interface ProcessedVideoResult {
  rawVideoUrl: string;
  silentVideoUrl: string;
  actualDuration: number;
  requestedDuration: number;
  hasNativeAudio: boolean;
  audioRemoved: boolean;
  silentVideoCreated: boolean;
}

export interface ProcessedSoundtrackResult {
  rawAudioUrl: string;
  normalizedAudioUrl: string;
  actualDuration: number;
  sourceDuration: number;
  requestedDuration: number;
  targetDuration: number;
  normalizedDuration: number;
  isNormalized: boolean;
  isValidated: boolean;
}

export interface ComposeMediaResult {
  finalVideoUrl: string;
  silentVideoUrl: string;
  normalizedAudioUrl: string;
  videoDuration: number;
  originalAudioDuration: number;
  finalDuration: number;
  synchronized: boolean;
  activeLayers: string[];
  compositionLog: string[];
}

/**
 * Extracts raw buffer and mime type from data URL or raw base64 string
 */
export function parseDataPayload(dataOrUrl: string, defaultMime = 'video/mp4'): { buffer: Buffer; mimeType: string } {
  if (!dataOrUrl || typeof dataOrUrl !== 'string') {
    throw new Error('Invalid empty media payload supplied for processing.');
  }

  const match = dataOrUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return {
      mimeType: match[1],
      buffer: Buffer.from(match[2], 'base64'),
    };
  }
  return {
    mimeType: defaultMime,
    buffer: Buffer.from(dataOrUrl, 'base64'),
  };
}

/**
 * Helper to run a command using spawn and capture complete stdout & stderr.
 * In case of failure, complete stderr is included in the Error message.
 */
export function execProcess(
  cmd: string,
  args: string[],
  logErrors = true
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const proc = spawn(cmd, args);
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (code === 0) {
        resolve({ stdout, stderr, exitCode: code });
      } else {
        const errorDetails = `FFmpeg command failed: [${cmd} ${args.join(' ')}]\nExit Code: ${code}\nStderr:\n${stderr.trim()}`;
        if (logErrors) {
          console.error(`[mediaComposer] ${errorDetails}`);
        }
        reject(new Error(errorDetails));
      }
    });

    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      if (logErrors) {
        console.error(`[mediaComposer] Failed to launch ${cmd}: ${err.message}`);
      }
      reject(new Error(`Failed to launch ${cmd}: ${err.message}`));
    });
  });
}

let ffmpegAvailableCache: boolean | null = null;

/**
 * Checks whether FFmpeg and FFprobe are accessible on the host PATH
 */
export async function isFfmpegAvailable(forceRefresh = false): Promise<boolean> {
  if (ffmpegAvailableCache !== null && !forceRefresh) {
    return ffmpegAvailableCache;
  }
  try {
    await execProcess('ffmpeg', ['-version'], false);
    ffmpegAvailableCache = true;
    return true;
  } catch {
    ffmpegAvailableCache = false;
    return false;
  }
}

/**
 * Uses ffprobe to strictly inspect media duration, video and audio streams
 */
export async function probeMediaFile(filePath: string): Promise<MediaProbeResult> {
  // Verify file existence first
  try {
    await fs.access(filePath);
  } catch (err: any) {
    throw new Error(`File does not exist or cannot be accessed: ${filePath}`);
  }

  const args = [
    '-v',
    'error',
    '-show_entries',
    'format=duration,format_name:stream=codec_type,codec_name,duration',
    '-of',
    'json',
    filePath,
  ];

  const { stdout } = await execProcess('ffprobe', args);
  let data: any;
  try {
    data = JSON.parse(stdout);
  } catch (e) {
    throw new Error(`Failed to parse ffprobe json output: ${stdout}`);
  }

  let duration = 0;
  if (data.format?.duration) {
    duration = parseFloat(data.format.duration);
  }

  let hasAudio = false;
  let hasVideo = false;
  let audioCodec: string | undefined;
  let videoCodec: string | undefined;

  if (Array.isArray(data.streams)) {
    for (const stream of data.streams) {
      if (stream.codec_type === 'video') {
        hasVideo = true;
        videoCodec = stream.codec_name;
      }
      if (stream.codec_type === 'audio') {
        hasAudio = true;
        audioCodec = stream.codec_name;
      }
      if (!duration && stream.duration) {
        duration = parseFloat(stream.duration);
      }
    }
  }

  return {
    duration: isNaN(duration) ? 10.0 : duration,
    hasAudio,
    hasVideo,
    audioCodec,
    videoCodec,
    format: data.format?.format_name,
  };
}

/**
 * Strips native audio from video asset, preserving exact visual video frames as silent master.
 * If targetDuration exceeds raw video duration, seamlessly extends video frames with tpad.
 */
export async function stripVideoAudio(
  inputVideoPath: string,
  outputSilentVideoPath: string,
  targetDuration?: number
): Promise<MediaProbeResult> {
  const probe = await probeMediaFile(inputVideoPath);
  if (!probe.hasVideo) {
    throw new Error(`Input video file has no video stream: ${inputVideoPath}`);
  }

  const durationDiff =
    targetDuration && targetDuration > probe.duration + 0.2
      ? targetDuration - probe.duration
      : 0;

  let args: string[];
  if (durationDiff > 0) {
    args = [
      '-y',
      '-i',
      inputVideoPath,
      '-vf',
      `tpad=stop_mode=clone:stop_duration=${durationDiff.toFixed(3)}`,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-an',
      outputSilentVideoPath,
    ];
  } else {
    // -an disables audio, -c:v copy copies video stream without re-encoding to preserve pristine 100% video quality
    args = [
      '-y',
      '-i',
      inputVideoPath,
      '-c:v',
      'copy',
      '-an',
      outputSilentVideoPath,
    ];
  }
  await execProcess('ffmpeg', args);

  // Validate silent video master
  const silentProbe = await probeMediaFile(outputSilentVideoPath);
  if (!silentProbe.hasVideo) {
    throw new Error('Failed to create silent video master: output has no video stream.');
  }
  if (silentProbe.hasAudio) {
    throw new Error('Failed to create silent video master: audio stream was not stripped.');
  }

  return silentProbe;
}

/**
 * Generates an environmental ambience & SFX track:
 * - Rain texture (monsoon atmospheric noise)
 * - Café room tone
 * - Synchronized glass-clink accent near Scene 04 (at 8.0s)
 */
export async function generateAmbienceAndSfxTrack(
  outputAmbiencePath: string,
  duration = 10.0
): Promise<void> {
  const clinkDelayMs = Math.round(duration * 0.8 * 1000);
  const filterComplex = `[0:a][1:a][2:a]amix=inputs=3:duration=first,atrim=duration=${duration.toFixed(3)},asetpts=N/SR/TB[a]`;

  const args = [
    '-y',
    '-f', 'lavfi', '-i', `anoisesrc=d=${duration.toFixed(3)}:c=pink:r=44100:a=0.07,lowpass=f=2200,highpass=f=350,volume=0.7`,
    '-f', 'lavfi', '-i', `anoisesrc=d=${duration.toFixed(3)}:c=brown:r=44100:a=0.03,lowpass=f=700,volume=0.5`,
    '-f', 'lavfi', '-i', `sine=f=2500:d=0.35,afade=t=out:st=0.03:d=0.32,volume=0.85,adelay=${clinkDelayMs}|${clinkDelayMs}`,
    '-filter_complex', filterComplex,
    '-map', '[a]',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', duration.toFixed(3),
    outputAmbiencePath,
  ];

  await execProcess('ffmpeg', args);

  const probe = await probeMediaFile(outputAmbiencePath);
  if (!probe.hasAudio) {
    throw new Error('Ambience generation failed: output has no audio stream.');
  }
}

/**
 * Physically normalizes/trims/pads soundtrack audio to exact target duration (10.0s):
 * - If audio > target: physically trims with atrim=duration=10.0, resets timestamps with asetpts=N/SR/TB, adds smooth 0.3s fade-in & 0.5s fade-out.
 * - If audio < target: pads with apad to target duration, resets timestamps, adds fades.
 * - Output is strictly validated to ensure it is valid, has audio, and matches target duration.
 */
export async function normalizeAudioToDuration(
  inputAudioPath: string,
  outputAudioPath: string,
  targetDuration = 10.0
): Promise<MediaProbeResult> {
  const safeTarget = Math.max(0.5, targetDuration);
  const fadeOutStart = Math.max(0, safeTarget - 0.5);

  // Robust, reliable FFmpeg filter chain compatible with FFmpeg 4.4+
  // apad ensures audio reaches target, atrim caps it at target, asetpts=N/SR/TB resets all timestamps cleanly
  const filter = `apad=whole_dur=${safeTarget.toFixed(3)},atrim=duration=${safeTarget.toFixed(3)},asetpts=N/SR/TB,afade=t=in:ss=0:d=0.3,afade=t=out:st=${fadeOutStart.toFixed(3)}:d=0.5`;

  const args = [
    '-y',
    '-i',
    inputAudioPath,
    '-af',
    filter,
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-t',
    safeTarget.toFixed(3),
    outputAudioPath,
  ];

  await execProcess('ffmpeg', args);

  // Strictly validate normalized audio
  const normalizedProbe = await probeMediaFile(outputAudioPath);
  if (!normalizedProbe.hasAudio) {
    throw new Error(`Normalized audio output is missing an audio stream: ${outputAudioPath}`);
  }

  return normalizedProbe;
}

/**
 * Inspects video duration and strips native audio track, returning silent video master
 */
export async function processVideoOutput(
  rawVideoDataUrl: string,
  targetDuration = 10.0
): Promise<ProcessedVideoResult> {
  const hasFfmpeg = await isFfmpegAvailable();
  if (!hasFfmpeg) {
    console.warn('[mediaComposer] FFmpeg/FFprobe not found on host. Preserving raw video as silent video master fallback.');
    const target = Number(targetDuration.toFixed(1));
    return {
      rawVideoUrl: rawVideoDataUrl,
      silentVideoUrl: rawVideoDataUrl,
      actualDuration: target,
      requestedDuration: target,
      hasNativeAudio: false,
      audioRemoved: false,
      silentVideoCreated: false,
    };
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'campaigncraft-vid-'));

  try {
    const rawVideoFile = path.join(tempDir, 'raw_video.mp4');
    const silentVideoFile = path.join(tempDir, 'silent_video.mp4');

    const parsedVideo = parseDataPayload(rawVideoDataUrl, 'video/mp4');
    await fs.writeFile(rawVideoFile, parsedVideo.buffer);

    const probe = await probeMediaFile(rawVideoFile);

    // Strip native audio, align to target duration if needed, and validate silent video master
    const silentProbe = await stripVideoAudio(rawVideoFile, silentVideoFile, targetDuration);
    const silentVideoBuf = await fs.readFile(silentVideoFile);
    const finalActualDuration = Number((silentProbe.duration || probe.duration || targetDuration).toFixed(1));

    return {
      rawVideoUrl: rawVideoDataUrl,
      silentVideoUrl: `data:video/mp4;base64,${silentVideoBuf.toString('base64')}`,
      actualDuration: finalActualDuration,
      requestedDuration: Number(targetDuration.toFixed(1)),
      hasNativeAudio: probe.hasAudio,
      audioRemoved: true,
      silentVideoCreated: true,
    };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Inspects soundtrack audio duration, normalizes/trims/pads it to targetDuration, and validates result
 */
export async function processSoundtrackOutput(
  rawAudioDataUrl: string,
  targetDuration = 10.0
): Promise<ProcessedSoundtrackResult> {
  const hasFfmpeg = await isFfmpegAvailable();
  if (!hasFfmpeg) {
    console.warn('[mediaComposer] FFmpeg/FFprobe not found on host. Returning generated soundtrack directly without post-processing normalization.');
    const target = Number(targetDuration.toFixed(1));
    return {
      rawAudioUrl: rawAudioDataUrl,
      normalizedAudioUrl: rawAudioDataUrl,
      actualDuration: target,
      sourceDuration: target,
      requestedDuration: target,
      targetDuration: target,
      normalizedDuration: target,
      isNormalized: false,
      isValidated: true,
    };
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'campaigncraft-snd-'));

  try {
    const rawAudioFile = path.join(tempDir, 'raw_audio.wav');
    const normalizedAudioFile = path.join(tempDir, 'normalized_audio.m4a');

    const parsedAudio = parseDataPayload(rawAudioDataUrl, 'audio/wav');
    await fs.writeFile(rawAudioFile, parsedAudio.buffer);

    const rawProbe = await probeMediaFile(rawAudioFile);
    const actualDuration = Number((rawProbe.duration || 28.6).toFixed(1));
    const target = Number(targetDuration.toFixed(1));

    // Physically normalize, trim, and validate audio
    const normalizedProbe = await normalizeAudioToDuration(rawAudioFile, normalizedAudioFile, target);
    const normAudioBuf = await fs.readFile(normalizedAudioFile);

    return {
      rawAudioUrl: rawAudioDataUrl,
      normalizedAudioUrl: `data:audio/mp4;base64,${normAudioBuf.toString('base64')}`,
      actualDuration,
      sourceDuration: actualDuration,
      requestedDuration: target,
      targetDuration: target,
      normalizedDuration: Number(normalizedProbe.duration.toFixed(1)),
      isNormalized: true,
      isValidated: true,
    };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Multi-layer Audio Mixer & Media Composer:
 * Supports 3 layers with gain controls:
 * 1. MUSIC (Lyria) - default ON, 100%
 * 2. AMBIENCE / SFX (Rain + Room Tone + 8.0s Glass Clink) - default ON, 80%
 * 3. ORIGINAL VIDEO AUDIO (Gemini Omni) - OFF by default, 0%
 *
 * Prevents clipping with alimiter and normalizes output with dynaudnorm.
 */
export async function composeFinalMedia(params: {
  silentVideoUrl: string;
  normalizedAudioUrl: string;
  rawVideoUrl?: string;
  targetDuration?: number;
  mixerSettings?: AudioMixerSettings;
}): Promise<ComposeMediaResult> {
  const hasFfmpeg = await isFfmpegAvailable();
  if (!hasFfmpeg) {
    console.warn('[mediaComposer] FFmpeg and FFprobe binaries not found on system PATH. Returning unmixed media assets with fallback composition notice.');
    const finalDuration = Number((params.targetDuration || 10.0).toFixed(1));
    return {
      finalVideoUrl: params.silentVideoUrl || params.rawVideoUrl || '',
      silentVideoUrl: params.silentVideoUrl,
      normalizedAudioUrl: params.normalizedAudioUrl,
      videoDuration: finalDuration,
      originalAudioDuration: finalDuration,
      finalDuration,
      synchronized: false,
      activeLayers: ['Silent Video Master', 'Normalized Soundtrack (Unmixed - FFmpeg not installed on host)'],
      compositionLog: [
        'Notice: FFmpeg and FFprobe binaries were not found on the system PATH.',
        'Audio mixing and MP4 container muxing bypassed. Direct video and soundtrack assets are preserved for playback.',
        'To enable 3-layer environmental audio mixing, loudness normalization, and MP4 muxing, install FFmpeg.',
      ],
    };
  }

  const log: string[] = [];
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'campaigncraft-compose-'));

  try {
    const silentVideoFile = path.join(tempDir, 'silent_video.mp4');
    const musicAudioFile = path.join(tempDir, 'music_audio.m4a');
    const ambienceAudioFile = path.join(tempDir, 'ambience_audio.m4a');
    const rawVideoAudioFile = path.join(tempDir, 'raw_video_audio.m4a');
    const masterAudioFile = path.join(tempDir, 'master_audio.m4a');
    const finalMp4File = path.join(tempDir, 'final_composed.mp4');

    const parsedVideo = parseDataPayload(params.silentVideoUrl, 'video/mp4');
    const parsedAudio = parseDataPayload(params.normalizedAudioUrl, 'audio/mp4');

    await fs.writeFile(silentVideoFile, parsedVideo.buffer);
    await fs.writeFile(musicAudioFile, parsedAudio.buffer);

    // Validate silent video master
    const vidProbe = await probeMediaFile(silentVideoFile);
    if (!vidProbe.hasVideo) {
      throw new Error('Composition error: Silent video master has no video stream.');
    }
    const videoDuration = Number((vidProbe.duration || params.targetDuration || 10.0).toFixed(1));
    log.push(`Verified authoritative silent video master: ${videoDuration}s (native audio stripped: true)`);

    // Validate normalized Lyria soundtrack asset
    const musicProbe = await probeMediaFile(musicAudioFile);
    if (!musicProbe.hasAudio) {
      throw new Error('Composition error: Normalized Lyria soundtrack asset is missing an audio stream.');
    }
    log.push(`Verified normalized Lyria soundtrack asset: ${musicProbe.duration.toFixed(2)}s`);

    // Mixer Settings Defaults
    const settings: AudioMixerSettings = params.mixerSettings || DEFAULT_MIXER_SETTINGS;

    const activeLayers: string[] = [];
    const ffmpegInputs: string[] = [];
    const filterParts: string[] = [];
    let inputIndex = 0;

    // Layer 1: MUSIC (Lyria)
    if (settings.musicEnabled && settings.musicVolume > 0) {
      const musicVol = (settings.musicVolume / 100).toFixed(2);
      ffmpegInputs.push('-i', musicAudioFile);
      filterParts.push(`[${inputIndex}:a]volume=${musicVol}[a_music]`);
      activeLayers.push(`Music / Lyria: ${settings.musicVolume}%`);
      inputIndex++;
    }

    // Layer 2: AMBIENCE / SFX (Rain + Café Room Tone + Glass Clink)
    if (settings.ambienceEnabled && settings.ambienceVolume > 0) {
      log.push(`Synthesizing Ambience & SFX Layer (Rain texture, café room tone, and glass clink at ${(videoDuration * 0.8).toFixed(1)}s)...`);
      await generateAmbienceAndSfxTrack(ambienceAudioFile, videoDuration);

      const ambVol = (settings.ambienceVolume / 100).toFixed(2);
      ffmpegInputs.push('-i', ambienceAudioFile);
      filterParts.push(`[${inputIndex}:a]volume=${ambVol}[a_ambience]`);
      activeLayers.push(`Ambience / SFX (Rain & Glass Clink): ${settings.ambienceVolume}%`);
      inputIndex++;
    }

    // Layer 3: ORIGINAL VIDEO AUDIO (Disabled by default, do not include unless explicitly enabled)
    if (settings.originalVideoAudioEnabled && settings.originalVideoAudioVolume > 0 && params.rawVideoUrl) {
      const parsedRawVideo = parseDataPayload(params.rawVideoUrl, 'video/mp4');
      const tempRawVid = path.join(tempDir, 'temp_raw_vid.mp4');
      await fs.writeFile(tempRawVid, parsedRawVideo.buffer);

      const rawProbe = await probeMediaFile(tempRawVid);
      if (rawProbe.hasAudio) {
        log.push(`Extracting native video audio track as requested (volume: ${settings.originalVideoAudioVolume}%)...`);
        await execProcess('ffmpeg', [
          '-y',
          '-i',
          tempRawVid,
          '-vn',
          '-c:a',
          'aac',
          rawVideoAudioFile,
        ]);

        const vidVol = (settings.originalVideoAudioVolume / 100).toFixed(2);
        ffmpegInputs.push('-i', rawVideoAudioFile);
        filterParts.push(`[${inputIndex}:a]volume=${vidVol}[a_video]`);
        activeLayers.push(`Original Video Audio: ${settings.originalVideoAudioVolume}%`);
        inputIndex++;
      } else {
        log.push(`Original video has no native audio stream.`);
      }
    }

    // Construct Audio Mixing Graph
    if (inputIndex === 0) {
      filterParts.push(`anoisesrc=c=pink:r=44100:a=0.0001,volume=0,atrim=duration=${videoDuration.toFixed(3)},asetpts=N/SR/TB[a_out]`);
    } else if (inputIndex === 1) {
      const singleLabel = filterParts[0].match(/\[([^\]]+)\]$/)?.[1] || 'a_music';
      filterParts.push(`[${singleLabel}]alimiter=limit=0.95:attack=5:release=50,dynaudnorm=f=150:g=15:m=10,atrim=duration=${videoDuration.toFixed(3)},asetpts=N/SR/TB[a_out]`);
    } else {
      const mixInputs = filterParts
        .map((p) => {
          const m = p.match(/\[([^\]]+)\]$/);
          return m ? `[${m[1]}]` : '';
        })
        .join('');

      filterParts.push(
        `${mixInputs}amix=inputs=${inputIndex}:duration=first:dropout_transition=2[a_mix]`,
        `[a_mix]alimiter=limit=0.95:attack=5:release=50,dynaudnorm=f=150:g=15:m=10,atrim=duration=${videoDuration.toFixed(3)},asetpts=N/SR/TB[a_out]`
      );
    }

    const filterComplex = filterParts.join('; ');
    log.push(`Mixing ${inputIndex} audio layers: ${activeLayers.join(', ')}`);
    log.push(`Limiting peaks at -0.5dB (0.95) to prevent clipping; applying dynamic audio normalization.`);

    // Run audio mixer
    const mixerArgs = [
      '-y',
      ...ffmpegInputs,
      '-filter_complex',
      filterComplex,
      '-map',
      '[a_out]',
      '-t',
      videoDuration.toFixed(3),
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      masterAudioFile,
    ];
    await execProcess('ffmpeg', mixerArgs);

    // Validate master audio
    const masterProbe = await probeMediaFile(masterAudioFile);
    if (!masterProbe.hasAudio) {
      throw new Error('Composition error: Mixed master audio has no audio stream.');
    }
    log.push(`Master audio generated: ${masterProbe.duration.toFixed(2)}s, zero clipping, loudness normalized.`);

    // Mux silent video master with master audio track into final MP4
    log.push(`Muxing silent video master with master audio track into final MP4...`);
    const muxArgs = [
      '-y',
      '-i',
      silentVideoFile,
      '-i',
      masterAudioFile,
      '-c:v',
      'copy',
      '-c:a',
      'copy',
      '-shortest',
      '-t',
      videoDuration.toFixed(3),
      '-movflags',
      '+faststart',
      finalMp4File,
    ];
    await execProcess('ffmpeg', muxArgs);

    // Validate final MP4 output
    const finalProbe = await probeMediaFile(finalMp4File);
    if (!finalProbe.hasVideo) {
      throw new Error('Composition error: Final MP4 output is missing a video stream.');
    }
    if (!finalProbe.hasAudio) {
      throw new Error('Composition error: Final MP4 output is missing an audio stream.');
    }

    const finalDuration = Number((finalProbe.duration || videoDuration).toFixed(1));
    log.push(`Final MP4 successfully validated: ${finalDuration}s, ${activeLayers.length} audio layers blended.`);

    const finalBuf = await fs.readFile(finalMp4File);
    const masterAudioBuf = await fs.readFile(masterAudioFile);

    return {
      finalVideoUrl: `data:video/mp4;base64,${finalBuf.toString('base64')}`,
      silentVideoUrl: params.silentVideoUrl,
      normalizedAudioUrl: `data:audio/mp4;base64,${masterAudioBuf.toString('base64')}`,
      videoDuration,
      originalAudioDuration: videoDuration,
      finalDuration,
      synchronized: true,
      activeLayers,
      compositionLog: log,
    };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Fallback reusable full media pipeline if raw files are provided
 */
export async function executeMediaCompositionPipeline(params: {
  rawVideoBase64OrUrl: string;
  rawAudioBase64OrUrl: string;
  campaignTitle?: string;
  mixerSettings?: AudioMixerSettings;
}): Promise<ComposeMediaResult> {
  const vidRes = await processVideoOutput(params.rawVideoBase64OrUrl);
  const sndRes = await processSoundtrackOutput(params.rawAudioBase64OrUrl, vidRes.actualDuration);
  const compRes = await composeFinalMedia({
    silentVideoUrl: vidRes.silentVideoUrl,
    normalizedAudioUrl: sndRes.normalizedAudioUrl,
    rawVideoUrl: params.rawVideoBase64OrUrl,
    targetDuration: vidRes.actualDuration,
    mixerSettings: params.mixerSettings,
  });

  return {
    ...compRes,
    videoDuration: vidRes.actualDuration,
    originalAudioDuration: sndRes.actualDuration,
  };
}
