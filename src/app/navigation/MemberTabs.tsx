/**
 * 5 grandes maisons : Communauté, Academy, Espace membre, Boutique, Marketplace.
 * Entrée active = style pilule. Lancement → Espace membre > Accueil.
 */

import React from 'react';
import {View, Pressable, StyleSheet, Platform} from 'react-native';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import {Text, Icon, useTheme, type IconName} from '@shared/designsystem';
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

type HouseTab = {
  name: keyof MemberTabParamList;
  shortKey: string;
  fullKey: string;
  icon: IconName;
};

const HOUSES: HouseTab[] = [
  {
    name: 'Community',
    shortKey: 'houses.short.community',
    fullKey: 'houses.community',
    icon: 'UserIcon',
  },
  {
    name: 'Academy',
    shortKey: 'houses.short.academy',
    fullKey: 'houses.academy',
    icon: 'HomeIcon',
  },
  {
    name: 'MemberSpace',
    shortKey: 'houses.short.memberSpace',
    fullKey: 'houses.memberSpace',
    icon: 'DsiIcon',
  },
  {
    name: 'Shop',
    shortKey: 'houses.short.shop',
    fullKey: 'houses.shop',
    icon: 'PaymentsIcon',
  },
  {
    name: 'Marketplace',
    shortKey: 'houses.short.marketplace',
    fullKey: 'houses.marketplace',
    icon: 'ReferralIcon',
  },
];

function MemberTabBar({state, navigation}: BottomTabBarProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderLight,
          paddingBottom: spacing.sm,
          paddingTop: spacing.sm,
          paddingHorizontal: spacing.sm,
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
            style={[
              styles.tab,
              focused && {
                backgroundColor: colors.blueLight,
                borderRadius: radii.md,
              },
            ]}
            testID={`tab-${house.name.toLowerCase()}`}>
            <Icon
              name={house.icon}
              size={22}
              color={focused ? colors.bluePrimary : colors.textSecondary}
            />
            <Text
              variant="caption"
              color={focused ? 'link' : 'secondary'}
              numberOfLines={1}
              style={{marginTop: spacing.xs}}>
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
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      android: {elevation: 8},
      default: {},
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 4,
  },
});
