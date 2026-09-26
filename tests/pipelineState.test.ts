import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { deriveProductionStages } from '../src/utils/pipelineState.ts';
import { StructuredCampaign } from '../src/types.ts';

describe('Pipeline State Derivation', () => {
  test('returns default idle/waiting state when campaign is null', () => {
    const stages = deriveProductionStages(null);
    assert.deepStrictEqual(stages, {
      video: 'idle',
      soundtrack: 'waiting',
      composition: 'waiting',
    });
  });

  test('transitions video to idle when all storyboard scenes have images', () => {
    const mockCampaign = {
      scenes: [
        { sceneNumber: 1, imageStatus: 'ready', imageUrl: 'data:image/jpeg;base64,123' },
        { sceneNumber: 2, imageStatus: 'ready', imageUrl: 'data:image/jpeg;base64,456' },
      ],
      videoStatus: 'idle',
      soundtrackStatus: 'idle',
    } as unknown as StructuredCampaign;

    const stages = deriveProductionStages(mockCampaign);
    assert.strictEqual(stages.video, 'idle');
    assert.strictEqual(stages.soundtrack, 'waiting');
    assert.strictEqual(stages.composition, 'waiting');
  });

  test('recognizes video success and enables soundtrack generation (idle)', () => {
    const mockCampaign = {
      videoData: {
        videoUrl: 'data:video/mp4;base64,vid',
        actualDuration: 10.0,
      },
      videoStatus: 'ready',
      soundtrackStatus: 'idle',
    } as unknown as StructuredCampaign;

    const stages = deriveProductionStages(mockCampaign);
    assert.strictEqual(stages.video, 'success');
    assert.strictEqual(stages.soundtrack, 'idle');
    assert.strictEqual(stages.composition, 'waiting');
  });

  test('enables composition when both video and soundtrack succeed', () => {
    const mockCampaign = {
      videoData: { videoUrl: 'data:video/mp4;base64,vid', actualDuration: 10.0 },
      soundtrackData: { audioUrl: 'data:audio/wav;base64,snd', actualDuration: 10.0 },
      videoStatus: 'ready',
      soundtrackStatus: 'ready',
    } as unknown as StructuredCampaign;

    const stages = deriveProductionStages(mockCampaign);
    assert.strictEqual(stages.video, 'success');
    assert.strictEqual(stages.soundtrack, 'success');
    assert.strictEqual(stages.composition, 'idle');
  });
});
