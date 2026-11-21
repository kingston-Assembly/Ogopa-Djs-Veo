/**
 * Pure mathematical and algorithmic utilities for Video Mixing & Compositing
 * Aspect ratio bounding, Chroma Key color distance, and Transition coordinates.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AspectRatioMode = 'fit' | 'fill' | 'stretch';

/**
 * Calculates destination rectangle for rendering a video of (srcW, srcH)
 * into a canvas of (dstW, dstH) given an aspect ratio mode.
 */
export function calculateAspectRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  mode: AspectRatioMode
): Rect {
  if (mode === 'stretch' || srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) {
    return { x: 0, y: 0, width: dstW, height: dstH };
  }

  const srcAspect = srcW / srcH;
  const dstAspect = dstW / dstH;

  if (mode === 'fit') {
    // Letterbox / Pillarbox: ensure entire source is visible
    if (srcAspect > dstAspect) {
      const width = dstW;
      const height = dstW / srcAspect;
      const y = (dstH - height) / 2;
      return { x: 0, y, width, height };
    } else {
      const height = dstH;
      const width = dstH * srcAspect;
      const x = (dstW - width) / 2;
      return { x, y: 0, width, height };
    }
  }

  if (mode === 'fill') {
    // Crop to fill: fill canvas completely, cropping edges
    if (srcAspect > dstAspect) {
      const height = dstH;
      const width = dstH * srcAspect;
      const x = (dstW - width) / 2;
      return { x, y: 0, width, height };
    } else {
      const width = dstW;
      const height = dstW / srcAspect;
      const y = (dstH - height) / 2;
      return { x: 0, y, width, height };
    }
  }

  return { x: 0, y: 0, width: dstW, height: dstH };
}

/**
 * Computes Euclidean color distance in normalized RGB space (0.0 to 1.0)
 */
export function calculateColorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = (r1 - r2) / 255;
  const dg = (g1 - g2) / 255;
  const db = (b1 - b2) / 255;
  return Math.sqrt(dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114);
}

/**
 * Calculates alpha opacity for Chroma Key (Green Screen) pixel
 * @param r Red (0-255)
 * @param g Green (0-255)
 * @param b Blue (0-255)
 * @param targetR Key red (default 0)
 * @param targetG Key green (default 255)
 * @param targetB Key blue (default 0)
 * @param tolerance Similarity threshold (0.0 - 1.0)
 * @param smoothness Falloff smoothness (0.0 - 1.0)
 * @returns Alpha factor between 0.0 (fully transparent) and 1.0 (fully opaque)
 */
export function calculateChromaKeyAlpha(
  r: number,
  g: number,
  b: number,
  targetR = 0,
  targetG = 255,
  targetB = 0,
  tolerance = 0.35,
  smoothness = 0.1
): number {
  const dist = calculateColorDistance(r, g, b, targetR, targetG, targetB);
  if (dist < tolerance) {
    return 0; // Key color removed
  }
  if (dist < tolerance + smoothness && smoothness > 0.0001) {
    return (dist - tolerance) / smoothness; // Soft edge gradient
  }
  return 1.0;
}

/**
 * Calculates Picture-in-Picture (PiP) viewport rectangle
 */
export type PiPPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'split-h' | 'off';

export function calculatePiPRect(
  dstW: number,
  dstH: number,
  position: PiPPosition,
  scale = 0.32,
  padding = 16
): Rect | null {
  if (position === 'off') return null;

  if (position === 'split-h') {
    return {
      x: dstW / 2,
      y: 0,
      width: dstW / 2,
      height: dstH,
    };
  }

  const pipW = dstW * scale;
  const pipH = dstH * scale;

  switch (position) {
    case 'top-right':
      return { x: dstW - pipW - padding, y: padding, width: pipW, height: pipH };
    case 'top-left':
      return { x: padding, y: padding, width: pipW, height: pipH };
    case 'bottom-right':
      return { x: dstW - pipW - padding, y: dstH - pipH - padding, width: pipW, height: pipH };
    case 'bottom-left':
      return { x: padding, y: dstH - pipH - padding, width: pipW, height: pipH };
    default:
      return null;
  }
}

/**
 * Calculates wipe boundary and offset for transition
 * @param crossfader -1.0 (Deck A 100%) to +1.0 (Deck B 100%)
 * @returns normalized blend ratio for Deck B: 0.0 to 1.0
 */
export function crossfaderToBlendRatio(crossfader: number): number {
  const clamped = Math.max(-1, Math.min(1, crossfader));
  return (clamped + 1) / 2;
}
