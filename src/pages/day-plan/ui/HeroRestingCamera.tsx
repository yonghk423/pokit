import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

/** Contact and cast shadows anchor the camera to the fabric rather than a button tile. */
export function HeroRestingCamera({ dark = false }: { dark?: boolean }) {
  return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
    <Svg width="128%" height="142%" viewBox="0 0 190 148" style={{ position: 'absolute', left: -20, top: -18 }}>
      <Defs>
        <RadialGradient id="duvet-camera-cast" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#242720" stopOpacity={dark ? 0.48 : 0.25} />
          <Stop offset="0.48" stopColor="#34372E" stopOpacity={dark ? 0.3 : 0.16} />
          <Stop offset="1" stopColor="#34372E" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="duvet-camera-contact" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#20251E" stopOpacity={0.48} />
          <Stop offset="0.6" stopColor="#30352B" stopOpacity={0.27} />
          <Stop offset="1" stopColor="#30352B" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="duvet-camera-fabric-light" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#FFFFF8" stopOpacity={dark ? 0.04 : 0.42} />
          <Stop offset="1" stopColor="#FFFFF8" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={82} cy={77} rx={82} ry={40} fill="url(#duvet-camera-fabric-light)" />
      <Ellipse cx={105} cy={92} rx={81} ry={42} fill="url(#duvet-camera-cast)" />
      <Ellipse cx={96} cy={102} rx={69} ry={19} fill="url(#duvet-camera-contact)" />
    </Svg>
    <Image testID="hero-duvet-camera-image" source={require('../../../../assets/control-illustrations/photo-camera-save.png')} contentFit="contain" cachePolicy="memory-disk" transition={0} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} />
  </View>;
}
