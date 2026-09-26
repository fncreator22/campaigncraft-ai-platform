export type ErrorCategory =
  | 'VIDEO_API_ERROR'
  | 'AUDIO_API_ERROR'
  | 'MEDIA_PROCESSING_ERROR'
  | 'FFMPEG_ERROR'
  | 'FILE_ACCESS_ERROR'
  | 'ENVIRONMENT_ERROR'
  | 'TIMEOUT_ERROR'
  | 'COMPOSITION_ERROR';

export interface DiagnosticError {
  category: ErrorCategory;
  message: string;
  originalMessage: string;
}

/**
 * Sanitizes errors to strictly prevent credential leakage
 * and classifies errors into safe production categories.
 */
export function sanitizeAndCategorizeError(
  error: any,
  defaultCategory: ErrorCategory = 'MEDIA_PROCESSING_ERROR'
): DiagnosticError {
  let rawMsg = '';
  if (typeof error === 'string') {
    rawMsg = error;
  } else if (error?.message) {
    rawMsg = error.message;
  } else if (error?.error?.message) {
    rawMsg = error.error.message;
  } else {
    rawMsg = 'An unexpected runtime error occurred';
  }

  // Redact any Google API keys, secrets, tokens, or passwords
  const sanitized = rawMsg
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/((?:api_?key|key|token|secret|password)=)[^\s&]+/gi, '$1[REDACTED]');

  let category: ErrorCategory = defaultCategory;
  const lower = sanitized.toLowerCase();

  if (
    lower.includes('api_key') ||
    lower.includes('apikey') ||
    lower.includes('api key') ||
    lower.includes('not configured') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('403') ||
    lower.includes('quota')
  ) {
    category = 'ENVIRONMENT_ERROR';
  } else if (
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('deadline') ||
    lower.includes('econnaborted')
  ) {
    category = 'TIMEOUT_ERROR';
  } else if (
    lower.includes('ffmpeg') ||
    lower.includes('ffprobe') ||
    lower.includes('failed to launch ffmpeg') ||
    lower.includes('exit code')
  ) {
    category = 'FFMPEG_ERROR';
  } else if (
    lower.includes('enoent') ||
    lower.includes('eacces') ||
    lower.includes('file does not exist') ||
    lower.includes('cannot be accessed')
  ) {
    category = 'FILE_ACCESS_ERROR';
  } else if (
    lower.includes('gemini-omni') ||
    lower.includes('omni') ||
    lower.includes('video synthesis') ||
    lower.includes('output_video') ||
    lower.includes('video duration')
  ) {
    category = 'VIDEO_API_ERROR';
  } else if (
    lower.includes('lyria') ||
    lower.includes('soundtrack') ||
    lower.includes('audio stream') ||
    lower.includes('audio data chunks')
  ) {
    category = 'AUDIO_API_ERROR';
  } else if (
    lower.includes('composition') ||
    lower.includes('compose') ||
    lower.includes('mux') ||
    lower.includes('synchroniz')
  ) {
    category = 'COMPOSITION_ERROR';
  }

  return {
    category,
    originalMessage: sanitized,
    message: `[${category}] ${sanitized}`,
  };
}
