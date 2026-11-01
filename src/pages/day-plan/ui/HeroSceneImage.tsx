import { Image, type ImageProps } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Image as NativeImage, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';

// Scenes 11–50 have 24px sidebars baked into their 768px-wide exports.
// Cover fills the file's bounds, so cards also need to zoom past those bars.
const paddedCardSources = new Set(
  Object.entries(COMIC_SCENE_THUMBNAILS)
    // The corrected climbing export is already full bleed.
    .filter(([id]) => id !== 'p3-16-indoor-climbing' && /^p[34]-(?:1[1-9]|[2-4]\d|50)-/.test(id))
    .map(([, source]) => source),
);
const PADDED_CARD_SCALE = 768 / 718; // One extra pixel per side clears WebP edge blending.
// Expand native bounds from the top instead of scaling around a view's center.
// This avoids depending on native transformOrigin handling for head clearance.
const paddedCardFrame = {
  left: `${(1 - PADDED_CARD_SCALE) * 50}%` as `${number}%`,
  right: `${(1 - PADDED_CARD_SCALE) * 50}%` as `${number}%`,
  top: 0,
  bottom: undefined,
  height: `${PADDED_CARD_SCALE * 100}%` as `${number}%`,
};

type Props = {
  fitToCard?: boolean;
  fillPortrait?: boolean;
  onReady?: () => void; transitionDuration?: number;
  showSkeletonOnMount?: boolean;
  source: ImageProps['source']; fallbackSource?: ImageProps['source']; imageKey: string;
  style: StyleProp<ViewStyle>; priority?: ImageProps['priority']; contentFit?: ImageProps['contentFit']; contentPosition?: ImageProps['contentPosition']; backgroundColor?: string;
};
// Use a new native cache namespace: React imageKey/recyclingKey do not change
// SDWebImage's URI-based cache. Keep all scene views on the same full-size decode,
// including thumbnails that can be loaded concurrently with the detail image.
function fullResolutionSource(source: ImageProps['source']): ImageProps['source'] {
  if (Array.isArray(source)) return source.map(item => fullResolutionSource(item)) as ImageProps['source'];
  const resolved = typeof source === 'number' ? NativeImage.resolveAssetSource(source)
    : typeof source === 'string' ? { uri: source } : source;
  if (!resolved || !('uri' in resolved) || !resolved.uri) return source;
  return { ...resolved, cacheKey: `comic-full-v1:${resolved.uri}` };
}

/** Artwork already shown this session sits in the memory cache, so remounts skip the skeleton. */
const shownImageKeys = new Set<string>();
type ImageSize = { width: number; height: number };
// File identity survives remounts and freshly allocated { uri } props. Thumbnails
// and card faces share this metadata before painting their first visible frame.
const knownImageSizes = new Map<string, ImageSize>();
function imageIdentity(source: ImageProps['source']): string | null {
  if (Array.isArray(source)) return source.map(imageIdentity).join('|') || null;
  if (typeof source === 'number') return `asset:${source}`;
  if (typeof source === 'string') return source;
  return source && 'uri' in source ? source.uri ?? null : null;
}
function imageSize(source: ImageProps['source']): ImageSize | null {
  if (!source || typeof source !== 'object' || Array.isArray(source) || !('width' in source) || !('height' in source)) return null;
  return typeof source.width === 'number' && typeof source.height === 'number' && source.width > 0 && source.height > 0
    ? { width: source.width, height: source.height } : null;
}

/** A separate load session prevents recycled cells from inheriting a previous image's error. */
export function ComicSceneImage(props: Props) {
  return <ComicImageSession key={props.imageKey} {...props} />;
}
function ComicImageSession({ source, fallbackSource, imageKey, style, priority = 'normal', contentFit = 'contain', contentPosition, backgroundColor = '#F5E8CF', onReady, showSkeletonOnMount = false, transitionDuration = 0, fillPortrait = false, fitToCard = false }: Props) {
  const { t } = useTranslation();
  const [frameSize, setFrameSize] = useState<ImageSize | null>(null);
  const [loadedSize, setLoadedSize] = useState<(ImageSize & { identity: string }) | null>(null);
  const [displayed, setDisplayed] = useState<string | null>(() => !showSkeletonOnMount && shownImageKeys.has(imageKey) ? `${imageKey}:0:0` : null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [reload, setReload] = useState(0);
  const key = `${imageKey}:${reload}:${attempt}`;
  const exhausted = attempt >= 2;
  const activeSource = attempt >= 2 && fallbackSource ? fallbackSource : source;
  const resolvedSource = useMemo(() => fullResolutionSource(activeSource), [activeSource]);
  const identity = imageIdentity(resolvedSource) ?? `session:${imageKey}:${attempt}`;
  const dimensions = imageSize(resolvedSource) ?? (loadedSize?.identity === identity ? loadedSize : knownImageSizes.get(identity));
  const portrait = !!dimensions && typeof dimensions.width === 'number' && typeof dimensions.height === 'number' && dimensions.height > dimensions.width;
  const waitingForSize = fitToCard && (!dimensions || (portrait && !frameSize));
  // Every character follows the same rule: preserve wide/square scenes in full,
  // and fill the card edge-to-edge for portraits.
  const resolvedFit = fitToCard ? (portrait ? 'cover' : 'contain') : contentFit;
  const cropCardPadding = resolvedFit === 'cover' && paddedCardSources.has(activeSource);
  // Native cover/position can still crop the head. Render portraits in bounds
  // with the exact source aspect ratio, pinning their actual pixels at y=0.
  const portraitScale = fitToCard && portrait && dimensions && frameSize
    ? Math.max(frameSize.width / (dimensions.width / (cropCardPadding ? PADDED_CARD_SCALE : 1)), frameSize.height / dimensions.height) : null;
  const portraitFrame = portraitScale && dimensions && frameSize ? {
    top: 0, bottom: undefined, right: undefined,
    left: (frameSize.width - dimensions.width * portraitScale) / 2,
    width: dimensions.width * portraitScale,
    height: dimensions.height * portraitScale,
  } : null;
  useEffect(() => {
    if (failed !== key || exhausted) return;
    const timer = setTimeout(() => setAttempt(value => value + 1), 300 * (attempt + 1));
    return () => clearTimeout(timer);
  }, [failed, key, exhausted, attempt]);
  const retry = () => { shownImageKeys.delete(imageKey); setFailed(null); setDisplayed(null); setAttempt(0); setReload(value => value + 1); };
  return <View style={[{ overflow: 'hidden', backgroundColor }, style]} onLayout={fitToCard ? event => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) setFrameSize(previous => previous?.width === width && previous.height === height ? previous : { width, height });
  } : undefined}>
    {fillPortrait && !fitToCard && portrait ? <Image testID="comic-image-portrait-backdrop" source={resolvedSource} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={24} useAppleWebpCodec={false} cachePolicy="memory" accessible={false} /> : null}
    <Image key={key} source={resolvedSource} recyclingKey={key}
      style={[StyleSheet.absoluteFill, waitingForSize && { opacity: 0 }, portraitFrame ?? (cropCardPadding && paddedCardFrame)]} contentFit={portraitFrame ? 'fill' : resolvedFit} contentPosition={contentPosition ?? (fitToCard && portrait ? 'top' : undefined)}
      useAppleWebpCodec={false} cachePolicy={attempt > 0 || reload > 0 ? 'none' : 'memory-disk'}
      allowDownscaling={false} enforceEarlyResizing={false} priority={priority} transition={transitionDuration}
      onLoad={event => {
        if (event.source.width <= 0 || event.source.height <= 0) return;
        const size = { width: event.source.width, height: event.source.height };
        knownImageSizes.set(identity, size);
        if (fitToCard || fillPortrait) setLoadedSize(previous => previous?.identity === identity && previous.width === size.width && previous.height === size.height ? previous : { identity, ...size });
      }}
      onDisplay={() => { shownImageKeys.add(imageKey); setDisplayed(key); setFailed(null); onReady?.(); }} onError={event => {
        shownImageKeys.delete(imageKey);
        setFailed(key);
        if (__DEV__ && exhausted) console.warn('[ComicSceneImage] Artwork load failed', { imageKey, error: event?.error ?? 'Unknown image error' });
      }} accessible={false} />
    {(displayed !== key || waitingForSize) && !(failed === key && exhausted) ? <View pointerEvents="none" testID="comic-image-skeleton" style={[StyleSheet.absoluteFill, s.skeleton, { backgroundColor }]}>
      <View style={[s.horizon, { backgroundColor: 'rgba(0,0,0,0.06)' }]} /><View style={[s.line, { backgroundColor: 'rgba(0,0,0,0.07)' }]} /><View style={[s.line, { width: '42%', backgroundColor: 'rgba(0,0,0,0.07)' }]} />
    </View> : null}
    {failed === key && exhausted ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.retryImage')} onPress={() => { tapHaptic(); retry(); }} style={[StyleSheet.absoluteFill, s.error, { backgroundColor }]}><ThemedText style={s.errorLabel}>{t('comicDay.retryImage')}</ThemedText></Pressable> : null}
  </View>;
}
const s = StyleSheet.create({
  skeleton: { justifyContent: 'flex-end', padding: '9%', gap: 6 }, horizon: { position: 'absolute', left: '8%', right: '8%', top: '12%', height: '48%', borderRadius: 3 }, line: { width: '70%', height: 5, borderRadius: 3 },
  error: { justifyContent: 'center', alignItems: 'center', padding: 4 }, errorLabel: { color: '#666', fontSize: 11, textAlign: 'center' },
});
