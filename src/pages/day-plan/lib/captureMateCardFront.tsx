import type { ReactNode } from 'react';
import { Image, View } from 'react-native';
import type { HeroCardOpen } from '../ui/HeroCardFlip';

/** Snapshot preparation is optional: unavailable native capture must never block details. */
export function captureMateCardFront(node: View, fallbackFront?: (width: number, height: number) => ReactNode): Promise<{ card: HeroCardOpen; uri: string | null } | null> {
  return new Promise(resolve => {
    let settled = false;
    let frame: HeroCardOpen['frame'] | null = null;
    let capturedUri: string | null = null;
    let release: ((uri: string) => void) | null = null;
    const releasePending = () => {
      if (!capturedUri) return;
      const uri = capturedUri;
      capturedUri = null;
      try { release?.(uri); } catch { /* Native capture may be unavailable. */ }
    };
    const finish = (result: { card: HeroCardOpen; uri: string } | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (!result) releasePending();
      resolve(result ?? (frame && fallbackFront ? { uri: null, card: { frame, front: fallbackFront(frame.width, frame.height) } } : null));
    };
    const timeout = setTimeout(() => finish(null), 350);
    try {
      node.measureInWindow((left, top, width, height) => {
        if (settled) return;
        if (width <= 0 || height <= 0) { finish(null); return; }
        frame = { left, top, width, height };
        try {
          // Load only when capturing so importing a planner does not initialize a native module.
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { captureRef, releaseCapture } = require('react-native-view-shot') as typeof import('react-native-view-shot');
          release = releaseCapture;
          void Promise.resolve(captureRef(node, { format: 'png', result: 'tmpfile' })).then(async uri => {
            capturedUri = uri;
            if (settled) { releasePending(); return; }
            try {
              await Image.prefetch(uri);
              if (settled) { releasePending(); return; }
              finish({ uri, card: { frame: { left, top, width, height },
                front: <View style={{ width, height }}>
                  <Image source={{ uri }} resizeMode="stretch" style={{ width, height }} />
                </View> } });
            } catch { finish(null); }
          }).catch(() => finish(null));
        } catch { finish(null); }
      });
    } catch { finish(null); }
  });
}
