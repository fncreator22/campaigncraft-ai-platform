import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAndCategorizeError } from '../src/server/diagnostics.ts';

describe('Diagnostics & Error Sanitization', () => {
  test('redacts Google AI Studio API keys (AIza...)', () => {
    const errorWithKey = new Error('Request failed with status 403: Invalid key AIzaSyD987654321012345678901234567890AB provided.');
    const diag = sanitizeAndCategorizeError(errorWithKey);

    assert.ok(!diag.message.includes('AIzaSyD987654321012345678901234567890AB'));
    assert.ok(diag.message.includes('[REDACTED_API_KEY]'));
    assert.strictEqual(diag.category, 'ENVIRONMENT_ERROR');
  });

  test('redacts generic secrets and credentials in query or body', () => {
    const errorWithSecret = 'Failed connection to endpoint?apiKey=supersecretpassword123&client=test';
    const diag = sanitizeAndCategorizeError(errorWithSecret);

    assert.ok(!diag.message.includes('supersecretpassword123'));
    assert.strictEqual(diag.category, 'ENVIRONMENT_ERROR');
  });

  test('correctly categorizes timeout errors', () => {
    const timeoutErr = new Error('Gateway timed out after 30000ms');
    const diag = sanitizeAndCategorizeError(timeoutErr);

    assert.strictEqual(diag.category, 'TIMEOUT_ERROR');
    assert.ok(diag.message.startsWith('[TIMEOUT_ERROR]'));
  });

  test('correctly categorizes FFmpeg errors', () => {
    const ffmpegErr = new Error('FFmpeg and FFprobe binaries were not found on the system PATH.');
    const diag = sanitizeAndCategorizeError(ffmpegErr);

    assert.strictEqual(diag.category, 'FFMPEG_ERROR');
    assert.ok(diag.message.startsWith('[FFMPEG_ERROR]'));
  });

  test('correctly categorizes video API errors', () => {
    const videoErr = new Error('Gemini Omni 1.1 Flash failed to synthesize output_video stream');
    const diag = sanitizeAndCategorizeError(videoErr);

    assert.strictEqual(diag.category, 'VIDEO_API_ERROR');
  });

  test('correctly categorizes audio API errors', () => {
    const audioErr = new Error('Lyria soundtrack synthesis failed: audio stream disconnected');
    const diag = sanitizeAndCategorizeError(audioErr);

    assert.strictEqual(diag.category, 'AUDIO_API_ERROR');
  });
});
