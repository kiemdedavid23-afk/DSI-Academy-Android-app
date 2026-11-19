/**
 * Tri : « Trier par [critère ▾] » comme le site (champ à fond blanc), puis une liste
 * centrée avec un bouton radio à droite de chaque choix.
 */

import React, {useState} from 'react';
import {Modal, Pressable, View} from 'react-native';
import {Icon, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {SORT_KEYS, type SortKey} from '../logic/explore';

export type SortMenuProps = {
  value: SortKey;
  onChange: (key: SortKey) => void;
};

export function SortMenu({value, onChange}: SortMenuProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const [open, setOpen] = useState(false);
  const label = (key: SortKey) => t(`commerce.shell.sort.${key}`);

  return (
    <>
      <View style={{alignItems: 'center', flexDirection: 'row', gap: spacing.sm}}>
        <Text variant="bodySmall" color="secondary">
          {t('mp.explore.sortLabel')}
        </Text>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${t('mp.explore.sortLabel')} ${label(value)}`}
          testID="commerce-sort"
          style={{
            alignItems: 'center',
            backgroundColor: colors.bgSurface,
            borderRadius: radii.md,
            flexDirection: 'row',
            gap: spacing.md,
            justifyContent: 'space-between',
            minHeight: 44,
            paddingHorizontal: spacing.md,
          }}>
          <Text variant="bodySmall">{label(value)}</Text>
          <Icon name="ChevronDownIcon" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          accessibilityLabel={t('common.close')}
          style={{
            backgroundColor: colors.overlay,
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: spacing.xl,
          }}>
          <View
            style={{
              backgroundColor: colors.bgSurface,
              borderRadius: radii.lg,
              overflow: 'hidden',
            }}>
            {SORT_KEYS.map((key, i) => {
              const on = key === value;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{checked: on}}
                  testID={`commerce-sort-${key}`}
                  style={{
                    alignItems: 'center',
                    borderTopColor: colors.borderLight,
                    borderTopWidth: i === 0 ? 0 : 1,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    minHeight: 56,
                    paddingHorizontal: spacing.lg,
                  }}>
                  <Text variant="bodyStrong" color="primary">
                    {label(key)}
                  </Text>
                  <View
                    style={{
                      alignItems: 'center',
                      borderColor: on ? colors.blueActive : colors.textSecondary,
                      borderRadius: 11,
                      borderWidth: 2,
                      height: 22,
                      justifyContent: 'center',
                      width: 22,
                    }}>
                    {on ? (
                      <View
                        style={{
                          backgroundColor: colors.blueActive,
                          borderRadius: 5,
                          height: 10,
                          width: 10,
                        }}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
