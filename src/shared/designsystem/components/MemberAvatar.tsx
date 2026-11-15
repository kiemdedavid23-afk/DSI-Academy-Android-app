/**
 * Avatar membre — fidélité site (MemberAvatar.css) : sm 44, md 64, lg 84.
 * Dégradé 135° #d4af37 → #8a7343, bordure 2 px crème 40 %, initiales #0f172a / 800.
 * Sans photo, les initiales s'affichent.
 */

import React, {useState} from 'react';
import {Image, StyleSheet, View} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {Text} from './Text';
import {useTheme} from '../theme/ThemeProvider';

export type MemberAvatarSize = 'sm' | 'md' | 'lg';

const SIZES: Record<MemberAvatarSize, {box: number; font: number}> = {
  sm: {box: 44, font: 14.4},
  md: {box: 64, font: 22.4},
  lg: {box: 84, font: 28.8},
};

export type MemberAvatarProps = {
  initials: string;
  size?: MemberAvatarSize;
  src?: string | null;
  onImageError?: () => void;
};

export function MemberAvatar({
  initials,
  size = 'md',
  src = null,
  onImageError,
}: MemberAvatarProps) {
  const {colors} = useTheme();
  const [failed, setFailed] = useState(false);
  const {box, font} = SIZES[size];
  const showImage = Boolean(src) && !failed;

  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: box / 2,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.memberCardAvatarBorder,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="avGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#D4AF37" />
            <Stop offset="100%" stopColor="#8A7343" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#avGrad)" />
      </Svg>
      {showImage ? (
        <Image
          source={{uri: src as string}}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => {
            setFailed(true);
            onImageError?.();
          }}
        />
      ) : (
        <Text style={{color: '#0F172A', fontSize: font, fontWeight: '800'}}>
          {initials}
        </Text>
      )}
    </View>
  );
}
