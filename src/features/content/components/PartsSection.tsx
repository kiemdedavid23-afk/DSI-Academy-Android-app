/**
 * Section « Parties » de la fiche contenu : carte blanche comme « À propos »,
 * sections en titres, parties en lignes numérotées avec leur avancement.
 * Charge le programme dans formationStore : les lecteurs ouverts d'ici
 * retrouvent ainsi leurs boutons Précédent / Suivant (ModuleNav).
 */

import React, {useEffect, useMemo, useState, useSyncExternalStore} from 'react';
import {Pressable, View} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {DONE_PERCENT, modulesOf, previewItems, type ProgramModule} from '../logic/formationTree';
import {formationStore} from '../store/formationStore';

type Props = {
  id: number;
  title: string;
  /** Maison de l'œuvre, pour la rangée « Reprendre ». */
  house: string;
  onOpenModule: (module: ProgramModule) => void;
};

const TYPE_KEY = {
  book: 'app.formation.typeBook',
  audio: 'app.formation.typeAudio',
  video: 'app.formation.typeVideo',
} as const;

export function PartsSection({id, title, house, onOpenModule}: Props) {
  const {t} = useTranslation();
  const {colors, radii, spacing} = useTheme();
  const st = useSyncExternalStore(formationStore.subscribe, formationStore.getState);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    void formationStore.load(id, title, house);
  }, [id, title, house]);

  const ready = st.id === id && st.status === 'success';
  const total = useMemo(() => modulesOf(st.items).length, [st.items]);
  const rows = useMemo(() => previewItems(st.items, expanded), [st.items, expanded]);

  if (!ready || total === 0) {
    return null;
  }
  const hidden = st.items.length > rows.length;
  let n = 0;

  return (
    <View
      style={{
        backgroundColor: colors.bgSurface,
        borderRadius: radii.lg,
        gap: 11,
        paddingBottom: 21.5,
        paddingHorizontal: 25,
        paddingTop: 23,
      }}
      testID="detail-parts">
      <Text variant="subtitle" accessibilityRole="header">
        {t('content.detail.partsTitle', {count: total})}
      </Text>
      {rows.map(item => {
        const indent = item.depth * spacing.lg;
        if (item.kind === 'section') {
          return (
            <Text
              key={item.key}
              variant="bodySmallStrong"
              color="secondary"
              style={{marginTop: spacing.sm, marginLeft: indent}}>
              {item.title}
            </Text>
          );
        }
        n += 1;
        const pct = st.progress[item.contentId] ?? 0;
        const done = pct >= DONE_PERCENT;
        const state = done
          ? t('app.formation.done')
          : pct > 0
          ? t('app.formation.percent', {percent: Math.round(pct)})
          : t('app.formation.notStarted');
        return (
          <Pressable
            key={item.key}
            onPress={() => onOpenModule(item)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            testID={`detail-part-${item.contentId}`}
            style={{
              alignItems: 'center',
              borderColor: colors.borderLight,
              borderRadius: radii.md,
              borderWidth: 1,
              flexDirection: 'row',
              gap: spacing.md,
              marginLeft: indent,
              padding: spacing.md,
            }}>
            <Text variant="bodySmallStrong" color="muted" style={{minWidth: 22}}>
              {n}
            </Text>
            <View style={{flex: 1, gap: 2}}>
              <Text variant="bodySmallStrong" numberOfLines={2}>
                {item.title}
              </Text>
              <Text variant="bodySmall" color="muted">
                {t(TYPE_KEY[item.type])}
                {' · '}
                {state}
              </Text>
            </View>
          </Pressable>
        );
      })}
      {hidden || expanded ? (
        <Pressable
          onPress={() => setExpanded(v => !v)}
          accessibilityRole="button"
          testID="detail-parts-more"
          style={{alignSelf: 'flex-start'}}>
          <Text variant="bodySmallStrong" color="secondary" style={{textDecorationLine: 'underline'}}>
            {expanded ? t('content.detail.readLess') : t('content.detail.partsMore', {count: total})}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
