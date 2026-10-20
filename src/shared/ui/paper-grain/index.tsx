import { SurfaceTexture } from '../surface-texture';

/** Fine, even paper fibers without the broad stains of the pigment texture. */
export function PaperGrain({ opacity = 0.32 }: { opacity?: number }) {
  return <SurfaceTexture kind="paper" opacity={opacity} />;
}
