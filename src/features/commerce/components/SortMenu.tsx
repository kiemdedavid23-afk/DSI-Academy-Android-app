/** Menu de tri : bouton « Trier par [critère ▾] », liste de choix dans une fenêtre. */

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
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t('mp.explore.sortLabel')} ${label(value)}`}
        testID="commerce-sort"
        style={{
          alignItems: 'center',
          borderColor: colors.borderLight,
          borderRadius: radii.pill,
          borderWidth: 1,
          flexDirection: 'row',
          gap: spacing.xs,
          minHeight: 40,
          paddingHorizontal: spacing.md,
        }}>
        <Text variant="bodySmall" color="secondary">
          {t('mp.explore.sortLabel')}
        </Text>
        <Text variant="bodySmallStrong">{label(value)}</Text>
        <Icon name="ChevronDownIcon" size={18} color={colors.textSecondary} />
      </Pressable>
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          accessibilityLabel={t('common.close')}
          style={{flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end'}}>
          <View
            style={{
              backgroundColor: colors.bgSurface,
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
              gap: spacing.xs,
              padding: spacing.lg,
            }}>
            {SORT_KEYS.map(key => (
              <Pressable
                key={key}
                onPress={() => {
                  onChange(key);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{selected: key === value}}
                testID={`commerce-sort-${key}`}
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  minHeight: 48,
                }}>
                <Text variant="body" color={key === value ? 'gold' : 'primary'}>
                  {label(key)}
                </Text>
                {key === value ? <Icon name="CheckIcon" size={20} color={colors.goldPrestige} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
