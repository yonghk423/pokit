import { Image, type ImageRef } from 'expo-image';

export const SURFACE_TEXTURE_SOURCES = {
  pigment: require('../../../../assets/color-textures/grain-overlay.webp'),
  paper: require('../../../../assets/color-textures/clean-paper.webp'),
} as const;

export type SurfaceTextureKind = keyof typeof SURFACE_TEXTURE_SOURCES;
const decoded = new Map<SurfaceTextureKind, ImageRef>();
let preparation: Promise<void> | undefined;

export function getPreparedSurfaceTexture(kind: SurfaceTextureKind): ImageRef | number {
  return decoded.get(kind) ?? SURFACE_TEXTURE_SOURCES[kind];
}

/** Retain the two decoded originals so every swatch can share them immediately. */
export function prepareSurfaceTextures(): Promise<void> {
  if (preparation) return preparation;
  preparation = Promise.all((Object.keys(SURFACE_TEXTURE_SOURCES) as SurfaceTextureKind[]).map(async (kind) => {
    if (decoded.has(kind)) return;
    try {
      decoded.set(kind, await Image.loadAsync(SURFACE_TEXTURE_SOURCES[kind]));
    } catch {
      // Keep the local-file fallback available; a failed warmup must not block startup.
    }
  })).then(() => {
    if (decoded.size < Object.keys(SURFACE_TEXTURE_SOURCES).length) preparation = undefined;
  });
  return preparation;
}
