/** Feuille d'actions du menu ⋮ d'un produit. */

import React from 'react';
import {Modal, Pressable, View} from 'react-native';
import {Text, sellerColors} from '@shared/designsystem';

export type SellerActionSheetProps = {
  visible: boolean;
  title: string;
  actions: Array<{id: string; label: string; danger?: boolean}>;
  onSelect: (id: string) => void;
  onClose: () => void;
  closeLabel: string;
};

export function SellerActionSheet({
  visible,
  title,
  actions,
  onSelect,
  onClose,
  closeLabel,
}: SellerActionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityLabel={closeLabel}
        style={{backgroundColor: sellerColors.ink + '66', flex: 1, justifyContent: 'flex-end'}}>
        <View
          style={{
            backgroundColor: sellerColors.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            gap: 4,
            padding: 16,
          }}>
          <Text variant="subtitle" numberOfLines={1} style={{color: sellerColors.ink, paddingBottom: 8}}>
            {title}
          </Text>
          {actions.map(a => (
            <Pressable
              key={a.id}
              onPress={() => onSelect(a.id)}
              accessibilityRole="button"
              style={{justifyContent: 'center', minHeight: 48}}>
              <Text
                variant="bodyStrong"
                style={{color: a.danger ? sellerColors.negativeText : sellerColors.ink}}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
