import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { synchronizeStoryboardTimeline, StoryboardScene } from '../src/types.ts';

describe('Storyboard Timeline Synchronization', () => {
  test('synchronizes scenes with missing durations across target duration', () => {
    const rawScenes: Partial<StoryboardScene>[] = [
      {
        sceneNumber: 1,
        startTime: 0,
        endTime: 0,
        duration: '',
        narrativeAction: 'Opening shot',
        visualPrompt: 'Café exterior',
      },
      {
        sceneNumber: 2,
        startTime: 0,
        endTime: 0,
        duration: '',
        narrativeAction: 'Chai pour',
        visualPrompt: 'Steaming chai',
      },
      {
        sceneNumber: 3,
        startTime: 0,
        endTime: 0,
        duration: '',
        narrativeAction: 'Friends toast',
        visualPrompt: 'Toast glasses',
      },
    ];

    const synced = synchronizeStoryboardTimeline(rawScenes, 15.0);

    assert.strictEqual(synced.length, 3);
    assert.strictEqual(synced[0].startTime, 0.0);
    assert.strictEqual(synced[0].endTime, 5.0);
    assert.strictEqual(synced[0].duration, '0.0–5.0s');

    assert.strictEqual(synced[1].startTime, 5.0);
    assert.strictEqual(synced[1].endTime, 10.0);
    assert.strictEqual(synced[1].duration, '5.0–10.0s');

    assert.strictEqual(synced[2].startTime, 10.0);
    assert.strictEqual(synced[2].endTime, 15.0);
    assert.strictEqual(synced[2].duration, '10.0–15.0s');
  });

  test('parses pre-formatted duration ranges and caps last scene at targetDuration', () => {
    const rawScenes: Partial<StoryboardScene>[] = [
      {
        sceneNumber: 1,
        startTime: 0,
        endTime: 2.5,
        duration: '0.0–2.5s',
        narrativeAction: 'Opening',
        visualPrompt: 'Rain window',
      },
      {
        sceneNumber: 2,
        startTime: 2.5,
        endTime: 6.0,
        duration: '2.5–6.0s',
        narrativeAction: 'Chai',
        visualPrompt: 'Steaming chai',
      },
      {
        sceneNumber: 3,
        startTime: 6.0,
        endTime: 9.0,
        duration: '6.0–9.0s',
        narrativeAction: 'Students',
        visualPrompt: 'Friends laughing',
      },
      {
        sceneNumber: 4,
        startTime: 9.0,
        endTime: 12.0, // Extends beyond target
        duration: '9.0–12.0s',
        narrativeAction: 'Final toast',
        visualPrompt: 'Glass toast',
      },
    ];

    const synced = synchronizeStoryboardTimeline(rawScenes, 10.0);

    assert.strictEqual(synced.length, 4);
    assert.strictEqual(synced[0].startTime, 0.0);
    assert.strictEqual(synced[3].endTime, 10.0);
    assert.strictEqual(synced[3].duration, '9.0–10.0s');
  });
});
