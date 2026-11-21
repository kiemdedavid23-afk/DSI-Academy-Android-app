/** Détail d'une vente : montants et statut. Aucune donnée technique (D17). */

import React from 'react';
import {Modal, Pressable, View} from 'react-native';
import {Text, sellerColors} from '@shared/designsystem';

export type SellerOrderSheetProps = {
  visible: boolean;
  title: string;
  rows: Array<{label: string; value: string}>;
  closeLabel: string;
  onClose: () => void;
};

export function SellerOrderSheet({visible, title, rows, closeLabel, onClose}: SellerOrderSheetProps) {
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
            gap: 12,
            padding: 16,
          }}>
          <Text variant="subtitle" accessibilityRole="header" numberOfLines={2} style={{color: sellerColors.ink}}>
            {title}
          </Text>
          {rows.map(r => (
            <View key={r.label} style={{flexDirection: 'row', gap: 12, justifyContent: 'space-between'}}>
              <Text variant="bodySmall" style={{color: sellerColors.inkMuted}}>
                {r.label}
              </Text>
              <Text variant="bodyStrong" style={{color: sellerColors.ink, flexShrink: 1, textAlign: 'right'}}>
                {r.value}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
