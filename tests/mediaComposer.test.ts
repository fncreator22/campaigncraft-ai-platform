import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDataPayload,
  isFfmpegAvailable,
  processSoundtrackOutput,
  processVideoOutput,
  composeFinalMedia,
} from '../src/server/mediaComposer.ts';
import { generateCinematicTrackWav } from '../src/server/soundSynth.ts';

describe('Media Composer & Fallback Engine', () => {
  test('parseDataPayload extracts buffer from Data URL and raw base64', () => {
    const rawStr = 'Hello CampaignCraft';
    const b64 = Buffer.from(rawStr).toString('base64');
    const dataUrl = `data:text/plain;base64,${b64}`;

    const parsedFromUrl = parseDataPayload(dataUrl);
    assert.strictEqual(parsedFromUrl.mimeType, 'text/plain');
    assert.strictEqual(parsedFromUrl.buffer.toString(), rawStr);

    const parsedFromRaw = parseDataPayload(b64, 'video/mp4');
    assert.strictEqual(parsedFromRaw.mimeType, 'video/mp4');
    assert.strictEqual(parsedFromRaw.buffer.toString(), rawStr);
  });

  test('isFfmpegAvailable returns boolean without throwing or crashing', async () => {
    const available = await isFfmpegAvailable();
    assert.strictEqual(typeof available, 'boolean');
  });

  test('processSoundtrackOutput executes without crashing even if FFmpeg is unavailable', async () => {
    const sampleWav = generateCinematicTrackWav({ durationSeconds: 5 });
    const result = await processSoundtrackOutput(sampleWav, 5.0);

    assert.ok(result.rawAudioUrl);
    assert.ok(result.normalizedAudioUrl);
    assert.strictEqual(result.actualDuration, 5.0);
    assert.strictEqual(result.isValidated, true);
  });

  test('processVideoOutput executes without crashing and provides fallback', async () => {
    const dummyVideoData = 'data:video/mp4;base64,AAAA';
    const result = await processVideoOutput(dummyVideoData, 10.0);

    assert.strictEqual(result.rawVideoUrl, dummyVideoData);
    assert.strictEqual(result.silentVideoUrl, dummyVideoData);
    assert.strictEqual(result.actualDuration, 10.0);
    assert.strictEqual(result.requestedDuration, 10.0);
  });

  test('composeFinalMedia provides resilient fallback when FFmpeg is not available', async () => {
    const sampleWav = generateCinematicTrackWav({ durationSeconds: 5 });
    const dummyVideo = 'data:video/mp4;base64,AAAA';

    const result = await composeFinalMedia({
      silentVideoUrl: dummyVideo,
      normalizedAudioUrl: sampleWav,
      targetDuration: 5.0,
    });

    assert.ok(result.finalVideoUrl);
    assert.ok(result.normalizedAudioUrl);
    assert.strictEqual(result.finalDuration, 5.0);
    assert.ok(Array.isArray(result.activeLayers));
    assert.ok(Array.isArray(result.compositionLog));
  });
});
