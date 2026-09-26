import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateCinematicTrackWav } from '../src/server/soundSynth.ts';

describe('Sound Synthesizer (soundSynth)', () => {
  test('generates valid 44.1kHz 16-bit stereo PCM WAV file', () => {
    const dataUrl = generateCinematicTrackWav({ durationSeconds: 5 });
    assert.ok(dataUrl.startsWith('data:audio/wav;base64,'));

    const base64Data = dataUrl.replace('data:audio/wav;base64,', '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Verify RIFF header
    assert.strictEqual(buffer.toString('ascii', 0, 4), 'RIFF');
    assert.strictEqual(buffer.toString('ascii', 8, 12), 'WAVE');

    // Verify fmt subchunk
    assert.strictEqual(buffer.toString('ascii', 12, 16), 'fmt ');
    assert.strictEqual(buffer.readUInt32LE(16), 16); // Subchunk1Size
    assert.strictEqual(buffer.readUInt16LE(20), 1);  // AudioFormat (1 = PCM)
    assert.strictEqual(buffer.readUInt16LE(22), 2);  // NumChannels (2 = stereo)
    assert.strictEqual(buffer.readUInt32LE(24), 44100); // SampleRate
    assert.strictEqual(buffer.readUInt16LE(34), 16); // BitsPerSample

    // Verify data subchunk
    assert.strictEqual(buffer.toString('ascii', 36, 40), 'data');
    const dataSize = buffer.readUInt32LE(40);

    // 44100 samples/sec * 5 sec * 2 channels * 2 bytes/sample = 882,000 bytes
    const expectedDataSize = 44100 * 5 * 2 * 2;
    assert.strictEqual(dataSize, expectedDataSize);
    assert.strictEqual(buffer.length, 44 + expectedDataSize);
  });

  test('respects duration bounds and caps at 20 seconds maximum', () => {
    const dataUrl = generateCinematicTrackWav({ durationSeconds: 25 });
    const buffer = Buffer.from(dataUrl.replace('data:audio/wav;base64,', ''), 'base64');
    const expectedDataSize = 44100 * 20 * 2 * 2; // Capped at 20s
    assert.strictEqual(buffer.readUInt32LE(40), expectedDataSize);
  });
});
