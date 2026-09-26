/**
 * High-fidelity procedural WAV synthesizer
 * Generates valid stereo 44.1kHz 16-bit WAV audio for campaign soundtracks
 * when streaming Lyria audio needs preview fallback or instant offline demo playback.
 */

export function generateCinematicTrackWav(options: {
  mood?: string;
  genre?: string;
  durationSeconds?: number;
}): string {
  const duration = Math.min(options.durationSeconds || 12, 20);
  const sampleRate = 44100;
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit
  const totalSamples = Math.floor(sampleRate * duration);
  const byteRate = sampleRate * numChannels * bytesPerSample;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = totalSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = Buffer.alloc(bufferSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(bufferSize - 8, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Determine musical scale (A minor / C major pentatonic for warm emotional resonance)
  // Frequencies: A3=220, C4=261.63, D4=293.66, E4=329.63, G4=392.00, A4=440, C5=523.25
  const chords = [
    [220, 261.63, 329.63, 440],    // Am9
    [174.61, 220, 261.63, 329.63], // Fmaj7
    [261.63, 329.63, 392, 523.25], // Cmaj9
    [196, 246.94, 293.66, 392],    // Gsus4
  ];

  const chordDuration = duration / chords.length;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const currentChordIndex = Math.min(Math.floor(t / chordDuration), chords.length - 1);
    const chord = chords[currentChordIndex];

    // Master fade-in (1s) and fade-out (2s)
    let masterEnvelope = 1.0;
    if (t < 1.0) masterEnvelope = t;
    else if (t > duration - 2.0) masterEnvelope = Math.max(0, (duration - t) / 2.0);

    // Warm pad / organ synth: sum of chord notes with gentle detuning & vibrato
    let synthSample = 0;
    const vibrato = Math.sin(2 * Math.PI * 4.5 * t) * 1.5;

    for (let c = 0; c < chord.length; c++) {
      const baseFreq = chord[c] + vibrato;
      // Fundamental sine + soft 2nd harmonic + subtle 3rd
      const s1 = Math.sin(2 * Math.PI * baseFreq * t);
      const s2 = Math.sin(2 * Math.PI * (baseFreq * 2) * t) * 0.35;
      const s3 = Math.sin(2 * Math.PI * (baseFreq * 0.5) * t) * 0.4; // sub-octave warmth
      synthSample += (s1 + s2 + s3) * 0.18;
    }

    // Melodic arpeggio pluck every 0.5s
    const arpStep = Math.floor(t * 2) % chord.length;
    const arpFreq = chord[arpStep] * 2;
    const arpTime = (t * 2) % 1.0;
    const arpEnv = Math.exp(-arpTime * 6); // fast exponential decay
    const arpPluck = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv * 0.25;

    // Ambient monsoon rain / tape texture (filtered white noise)
    const whiteNoise = (Math.random() * 2 - 1) * 0.04;
    const rainTexture = whiteNoise * (1 + 0.3 * Math.sin(2 * Math.PI * 0.2 * t));

    // Lo-fi kick & soft snare beat (every 1 second)
    const beatPhase = t % 1.0;
    let kick = 0;
    if (beatPhase < 0.2) {
      const kickFreq = 110 * Math.exp(-beatPhase * 25);
      kick = Math.sin(2 * Math.PI * kickFreq * beatPhase) * Math.exp(-beatPhase * 15) * 0.4;
    }

    const mixedLeft = (synthSample * 0.7 + arpPluck * 0.8 + kick * 0.6 + rainTexture * 0.35) * masterEnvelope;
    const mixedRight = (synthSample * 0.75 + arpPluck * 0.6 + kick * 0.6 + rainTexture * 0.35) * masterEnvelope;

    // Clamp and write 16-bit stereo PCM
    const clampedLeft = Math.max(-1, Math.min(1, mixedLeft));
    const clampedRight = Math.max(-1, Math.min(1, mixedRight));

    const intLeft = Math.floor(clampedLeft * 32767);
    const intRight = Math.floor(clampedRight * 32767);

    const offset = 44 + i * 4;
    buffer.writeInt16LE(intLeft, offset);
    buffer.writeInt16LE(intRight, offset + 2);
  }

  return `data:audio/wav;base64,${buffer.toString('base64')}`;
}
