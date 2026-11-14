/**
 * Barre du bas — fidélité MemberSpaceLayout.css lignes 329-420 + NavIcons.jsx.
 * Hauteur 72 + safe area, pastille 60×36, icônes 23 / image 32, libellé ~10sp.
 */

import React from 'react';
import {
  View,
  Pressable,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Path, Circle} from 'react-native-svg';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {CommunityStack} from './house-stacks/CommunityStack';
import {AcademyStack} from './house-stacks/AcademyStack';
import {MemberSpaceStack} from './house-stacks/MemberSpaceStack';
import {ShopStack} from './house-stacks/ShopStack';
import {MarketplaceStack} from './house-stacks/MarketplaceStack';

export type MemberTabParamList = {
  Community: undefined;
  Academy: undefined;
  MemberSpace: undefined;
  Shop: undefined;
  Marketplace: undefined;
};

const Tab = createBottomTabNavigator<MemberTabParamList>();
const MEMBER_IMG = require('@assets/images/espace-membre.png');

type HouseTab = {
  name: keyof MemberTabParamList;
  shortKey: string;
  fullKey: string;
  id: 'community' | 'academy' | 'member-space' | 'shop' | 'marketplace';
};

const HOUSES: HouseTab[] = [
  {
    name: 'Community',
    shortKey: 'houses.short.community',
    fullKey: 'houses.community',
    id: 'community',
  },
  {
    name: 'Academy',
    shortKey: 'houses.short.academy',
    fullKey: 'houses.academy',
    id: 'academy',
  },
  {
    name: 'MemberSpace',
    shortKey: 'houses.short.memberSpace',
    fullKey: 'houses.memberSpace',
    id: 'member-space',
  },
  {
    name: 'Shop',
    shortKey: 'houses.short.shop',
    fullKey: 'houses.shop',
    id: 'shop',
  },
  {
    name: 'Marketplace',
    shortKey: 'houses.short.marketplace',
    fullKey: 'houses.marketplace',
    id: 'marketplace',
  },
];

function NavSvg({
  id,
  color,
}: {
  id: HouseTab['id'];
  color: string;
}) {
  const stroke = color;
  const props = {
    width: 23,
    height: 23,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
  };
  if (id === 'community') {
    return (
      <Svg {...props}>
        <Circle cx="9" cy="8" r="3.5" stroke={stroke} strokeWidth={1.8} />
        <Path
          d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <Circle cx="17.2" cy="9" r="2.6" stroke={stroke} strokeWidth={1.8} />
        <Path
          d="M17.2 14.2c2.6.2 4.3 2 4.3 5.3"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  if (id === 'academy') {
    return (
      <Svg {...props}>
        <Path
          d="M12 3.5 3 8.5h18L12 3.5Z"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <Path d="M6 11.5v6M10 11.5v6M14 11.5v6M18 11.5v6" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M3.5 20.5h17" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  }
  if (id === 'shop') {
    return (
      <Svg {...props}>
        <Path
          d="M5 8h14l-1 12H6L5 8Z"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <Path
          d="M9 8V6.5a3 3 0 0 1 6 0V8"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  // marketplace
  return (
    <Svg {...props}>
      <Circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={1.8} />
      <Path d="M3 12h18" stroke={stroke} strokeWidth={1.8} />
      <Path
        d="M12 3c2.6 2.4 4 5.6 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.6-4-9s1.4-6.6 4-9Z"
        stroke={stroke}
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function MemberTabBar({state, navigation}: BottomTabBarProps) {
  const {t} = useTranslation();
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderLight,
          height: 72 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingHorizontal: 2,
        },
      ]}
      accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const house = HOUSES.find(h => h.name === route.name);
        if (!house) {
          return null;
        }
        const label = t(house.shortKey);
        const a11yLabel = t(house.fullKey);
        const activeColor = colors.blueActive;
        const inactiveColor = colors.textSecondary;
        const iconColor = focused ? activeColor : inactiveColor;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{selected: focused}}
            accessibilityLabel={a11yLabel}
            style={styles.tab}
            testID={`tab-${house.name.toLowerCase()}`}
            android_ripple={{color: colors.blueLight}}>
            <View
              style={[
                styles.pill,
                focused && {backgroundColor: colors.blueLight},
              ]}>
              {house.id === 'member-space' ? (
                <Image
                  source={MEMBER_IMG}
                  style={[
                    styles.memberImg,
                    focused && {
                      borderWidth: 2,
                      borderColor: activeColor,
                    },
                  ]}
                />
              ) : (
                <NavSvg id={house.id} color={iconColor} />
              )}
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: focused ? activeColor : inactiveColor,
                  fontWeight: focused ? '600' : '500',
                  fontFamily: focused ? 'Manrope-SemiBold' : 'Manrope-Medium',
                },
              ]}
              numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MemberTabs() {
  return (
    <Tab.Navigator
      initialRouteName="MemberSpace"
      tabBar={props => <MemberTabBar {...props} />}
      screenOptions={{headerShown: false}}>
      <Tab.Screen name="Community" component={CommunityStack} />
      <Tab.Screen name="Academy" component={AcademyStack} />
      <Tab.Screen name="MemberSpace" component={MemberSpaceStack} />
      <Tab.Screen name="Shop" component={ShopStack} />
      <Tab.Screen name="Marketplace" component={MarketplaceStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    ...Platform.select({
      android: {elevation: 8},
      default: {},
    }),
  },
  tab: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
  },
  pill: {
    width: 60,
    height: 36,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  memberImg: {
    width: 32,
    height: 32,
    borderRadius: 9,
  },
  label: {
    maxWidth: '100%',
    paddingHorizontal: 2,
    // site 0.64rem = 10.24 → taille autorisée la plus proche
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: -0.1,
    textAlign: 'center',
  },
});
