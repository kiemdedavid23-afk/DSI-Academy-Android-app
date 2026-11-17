/**
 * Barre Précédent / Suivant des lecteurs, visible seulement quand le contenu
 * est un module de la formation ouverte. Précharge aussi le module suivant
 * quand c'est un livre PDF (cache de 24 h).
 */

import React, {useEffect, useMemo, useSyncExternalStore} from 'react';
import {Pressable, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {prefetchNextModule} from '@core/media/prefetch';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {neighbors, type ProgramModule} from '../logic/formationTree';
import {docReaderStore} from '../store/docReaderStore';
import {formationStore} from '../store/formationStore';
import {pdfReaderStore} from '../store/pdfReaderStore';
import {playerStore} from '../store/playerStore';
import {textReaderStore} from '../store/textReaderStore';

export const PREFETCH_DELAY_MS = 4000;

/** Ferme proprement le lecteur en cours (progression enregistrée) avant d'ouvrir le module voisin. */
export async function closeActiveReaders(): Promise<void> {
  await Promise.all([
    textReaderStore.close(),
    pdfReaderStore.close(),
    docReaderStore.close(),
    playerStore.close(),
  ]);
}

type Props = {contentId: number; onGo: (module: ProgramModule) => void};

export function ModuleNav({contentId, onGo}: Props) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const insets = useSafeAreaInsets();
  const st = useSyncExternalStore(formationStore.subscribe, formationStore.getState);
  const {prev, next} = useMemo(() => neighbors(st.items, contentId), [st.items, contentId]);

  useEffect(() => {
    if (!next || next.type !== 'book') {
      return undefined;
    }
    const timer = setTimeout(() => void prefetchNextModule(next.contentId), PREFETCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [next]);

  if (!prev && !next) {
    return null;
  }

  const go = (m: ProgramModule) => {
    void closeActiveReaders().then(() => onGo(m));
  };

  const button = (m: ProgramModule | null, label: string, testID: string) =>
    m ? (
      <Pressable
        onPress={() => go(m)}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${m.title}`}
        style={{
          flex: 1,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.borderLight,
          backgroundColor: colors.bgSurface,
        }}
        testID={testID}>
        <Text variant="bodySmallStrong">{label}</Text>
        <Text variant="bodySmall" color="muted" numberOfLines={1}>
          {m.title}
        </Text>
      </Pressable>
    ) : (
      <View style={{flex: 1}} />
    );

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm + insets.bottom,
        backgroundColor: colors.bgApp,
      }}
      testID="module-nav">
      {button(prev, t('app.formation.previous'), 'module-prev')}
      {button(next, t('app.formation.next'), 'module-next')}
    </View>
  );
}
