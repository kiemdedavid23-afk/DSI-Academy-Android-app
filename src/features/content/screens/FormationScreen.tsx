/** Formation : programme (sections et modules), progression, « Continuer ». */

import React, {useEffect, useMemo, useSyncExternalStore} from 'react';
import {FlatList, Pressable, View} from 'react-native';
import {Button, EmptyState, ErrorState, LoadingState, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {contentErrorKey} from '../logic/errorKey';
import {DONE_PERCENT, modulesOf, summarize, type ProgramItem, type ProgramModule} from '../logic/formationTree';
import {formationStore} from '../store/formationStore';

export type FormationScreenProps = {
  id: number;
  title: string;
  /** Maison de l'œuvre (reprise) ; formations par défaut. */
  house?: string;
  onOpenModule: (module: ProgramModule) => void;
};

const TYPE_KEY = {
  book: 'app.formation.typeBook',
  audio: 'app.formation.typeAudio',
  video: 'app.formation.typeVideo',
} as const;

export function FormationScreen({id, title, house, onOpenModule}: FormationScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const st = useSyncExternalStore(formationStore.subscribe, formationStore.getState);

  useEffect(() => {
    void formationStore.load(id, title, house);
  }, [id, title, house]);

  const sum = useMemo(() => summarize(st.items, st.progress), [st.items, st.progress]);

  if (st.id !== id || st.status === 'loading' || st.status === 'idle') {
    return <LoadingState fill accessibilityLabel={t('content.loading')} />;
  }
  if (st.status === 'error') {
    return (
      <ErrorState
        message={t(contentErrorKey(st.errorKind))}
        retryLabel={t('common.retry')}
        onRetry={() => void formationStore.load(id, title, house)}
        testID="formation-error"
      />
    );
  }
  if (sum.total === 0) {
    return <EmptyState message={t('app.formation.empty')} testID="formation-empty" />;
  }

  const modules = modulesOf(st.items);
  const next = modules.find(m => m.contentId === sum.nextModuleId) ?? null;

  const renderItem = ({item}: {item: ProgramItem}) => {
    const indent = item.depth * spacing.lg;
    if (item.kind === 'section') {
      return (
        <Text variant="subtitle" accessibilityRole="header" style={{marginTop: spacing.lg, marginLeft: indent}}>
          {item.title}
        </Text>
      );
    }
    const pct = st.progress[item.contentId] ?? 0;
    const done = pct >= DONE_PERCENT;
    return (
      <Pressable
        onPress={() => onOpenModule(item)}
        accessibilityRole="button"
        style={{
          marginLeft: indent,
          padding: spacing.md,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.borderLight,
          backgroundColor: colors.bgSurface,
          gap: spacing.xs,
        }}
        testID={`module-${item.contentId}`}>
        <Text variant="bodySmallStrong">{item.title}</Text>
        <Text variant="bodySmall" color="muted">
          {t(TYPE_KEY[item.type])}
          {' · '}
          {done ? t('app.formation.done') : pct > 0 ? t('app.formation.percent', {percent: Math.round(pct)}) : t('app.formation.notStarted')}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{flex: 1, backgroundColor: colors.bgApp}} testID="screen-formation">
      <View style={{padding: spacing.xl, gap: spacing.sm}}>
        <Text variant="heading" accessibilityRole="header">{st.title}</Text>
        <Text variant="bodySmall" color="muted">
          {t('app.formation.progress', {done: sum.done, total: sum.total})}
        </Text>
        {next ? (
          <Button
            label={sum.started ? t('app.formation.continue') : t('app.formation.start')}
            onPress={() => onOpenModule(next)}
            testID="formation-continue"
          />
        ) : (
          <Text variant="bodySmallStrong">{t('app.formation.completed')}</Text>
        )}
      </View>
      <FlatList
        data={st.items}
        keyExtractor={i => i.key}
        renderItem={renderItem}
        contentContainerStyle={{paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.sm}}
        testID="formation-list"
      />
    </View>
  );
}
