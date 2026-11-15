import { Image, type ImageProps } from 'expo-image';

/** Decode to the rendered view and use the app's bounded Expo caches. */
export function DiaryItemImage(props: ImageProps) {
  return <Image cachePolicy="memory-disk" transition={0} useAppleWebpCodec={false}
    allowDownscaling contentFit="contain" {...props} />;
}
