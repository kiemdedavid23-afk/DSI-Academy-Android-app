/**
 * Écran de test du design system (TEMPORAIRE, retiré à l'étape 2).
 * Sert à comparer l'app au site sur la première APK (DESIGN-TOKENS §13).
 * Exception documentée : les libellés de test sont en dur ici, et seulement ici.
 * Aucune couleur, taille ou rayon en dur : tout vient du thème.
 */

import React, {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Switch, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  ICON_NAMES,
  LoadingState,
  Skeleton,
  Text,
  TextField,
  themePreferences,
  typography,
  useTheme,
  useThemePreferences,
  type ColorTokens,
  type Theme,
  type TypographyVariant,
} from '@shared/designsystem';

function makeStyles(theme: Theme) {
  const {colors, spacing, radii} = theme;
  return StyleSheet.create({
    screen: {flex: 1, backgroundColor: colors.bgApp},
    content: {padding: spacing.xl, gap: spacing.xxl},
    section: {gap: spacing.md},
    row: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    swatchRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    swatch: {
      width: 28,
      height: 28,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: theme.touch.min,
    },
    iconCell: {
      width: 64,
      alignItems: 'center',
      gap: spacing.xs,
    },
  });
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.section}>
      <Text variant="heading">{title}</Text>
      {children}
    </View>
  );
}

const SAMPLE_TEXT: Record<TypographyVariant, string> = {
  bigNumber: '12 500',
  display: '2 000 FCFA',
  title: 'Titre d’écran',
  greeting: 'Bonjour Amina',
  heading: 'Sous-titre',
  subtitle: 'Intertitre',
  body: 'Texte courant de la plateforme.',
  bodyStrong: 'Texte courant en gras.',
  bodyMedium: 'Texte moyen 15.',
  bodySmall: 'Texte secondaire 14.',
  bodySmallStrong: 'Texte secondaire en gras.',
  button: 'Libellé de bouton',
  field: 'Valeur de champ',
  label: 'Libellé de champ',
  caption: 'Légende 12.',
  captionStrong: 'Légende en gras.',
  micro: 'Micro 11',
  overline: 'SURTITRE 10',
  mono: 'CODE-1234',
};

export function ThemeGalleryScreen() {
  const theme = useTheme();
  const prefs = useThemePreferences();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [pressed, setPressed] = useState(0);

  const colorEntries = Object.entries(theme.colors) as [keyof ColorTokens, string][];
  const variants = Object.keys(typography) as TypographyVariant[];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="title">Galerie du thème (test)</Text>
        <Text variant="bodySmall" color="secondary">
          Mode : {theme.mode} · animations réduites : {theme.reduceMotion ? 'oui' : 'non'}
        </Text>

        <Section title="Préférences">
          <View style={styles.row}>
            <Button
              label="Système"
              variant={prefs.theme === 'system' ? 'primary' : 'secondary'}
              onPress={() => themePreferences.setTheme('system')}
            />
            <Button
              label="Clair"
              variant={prefs.theme === 'light' ? 'primary' : 'secondary'}
              onPress={() => themePreferences.setTheme('light')}
            />
            <Button
              label="Sombre"
              variant={prefs.theme === 'dark' ? 'primary' : 'secondary'}
              onPress={() => themePreferences.setTheme('dark')}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text variant="body">Réduire les animations</Text>
            <Switch
              value={prefs.reduceMotion}
              onValueChange={value => themePreferences.setReduceMotion(value)}
              accessibilityLabel="Réduire les animations"
            />
          </View>
        </Section>

        <Section title="Typographie">
          {variants.map(variant => (
            <View key={variant}>
              <Text variant="caption" color="muted">
                {variant} · {typography[variant].family} {typography[variant].size}/
                {typography[variant].weight}
              </Text>
              <Text variant={variant}>{SAMPLE_TEXT[variant]}</Text>
            </View>
          ))}
          <Text variant="subtitle" italic>
            Fraunces italique 18
          </Text>
        </Section>

        <Section title="Boutons">
          <View style={styles.row}>
            <Button label="Principal" onPress={() => setPressed(n => n + 1)} />
            <Button label="Secondaire" variant="secondary" onPress={() => setPressed(n => n + 1)} />
            <Button label="Discret" variant="ghost" onPress={() => setPressed(n => n + 1)} />
          </View>
          <View style={styles.row}>
            <Button label="Désactivé" disabled />
            <Button label="Chargement" loading />
          </View>
          <Text variant="caption" color="muted">
            Appuis : {pressed}
          </Text>
        </Section>

        <Section title="Cartes">
          <Card>
            <Text variant="bodyStrong">Carte par défaut</Text>
            <Text variant="bodySmall" color="secondary">
              Surface, bordure fine, élévation du thème.
            </Text>
          </Card>
          <Card variant="accent">
            <Text variant="bodyStrong">Carte accent (or)</Text>
            <Text variant="bodySmall" color="secondary">
              Élément actif ou favori.
            </Text>
          </Card>
          <Card variant="glass">
            <Text variant="bodyStrong">Carte verre</Text>
            <Text variant="bodySmall" color="secondary">
              Sans flou dans ce lot.
            </Text>
          </Card>
        </Section>

        <Section title="Champs">
          <TextField
            label="Nom"
            value={name}
            onChangeText={setName}
            placeholder="Votre nom"
            helper="Texte d’aide sous le champ."
          />
          <TextField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secure
            showPasswordLabel="Afficher le mot de passe"
            hidePasswordLabel="Masquer le mot de passe"
          />
          <TextField
            label="Champ en erreur"
            value="abc"
            onChangeText={() => {}}
            error="Valeur invalide."
          />
          <TextField label="Champ désactivé" value="Lecture seule" onChangeText={() => {}} disabled />
        </Section>

        <Section title="Squelettes">
          <Skeleton width="60%" />
          <Skeleton width="90%" height={14} />
          <View style={styles.row}>
            <Skeleton variant="circle" width={44} />
            <Skeleton variant="pill" width={90} />
            <Skeleton variant="block" width={120} height={60} />
          </View>
          <LoadingState accessibilityLabel="Chargement" />
        </Section>

        <Section title="États">
          <Card>
            <EmptyState
              message="Rien à afficher pour le moment."
              actionLabel="Action"
              onAction={() => setPressed(n => n + 1)}
            />
          </Card>
          <Card>
            <ErrorState
              message="Impossible de charger. Vérifie ta connexion."
              retryLabel="Réessayer"
              onRetry={() => setPressed(n => n + 1)}
            />
          </Card>
        </Section>

        <Section title="Icônes">
          <View style={styles.row}>
            {ICON_NAMES.map(iconName => (
              <View key={iconName} style={styles.iconCell}>
                <Icon name={iconName} size={24} />
                <Text variant="micro" color="muted" numberOfLines={1}>
                  {iconName.replace('Icon', '')}
                </Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Palette">
          {colorEntries.map(([key, value]) => (
            <View key={key} style={styles.swatchRow}>
              <View style={[styles.swatch, {backgroundColor: value}]} />
              <View>
                <Text variant="bodySmallStrong">{key}</Text>
                <Text variant="mono" color="muted">
                  {value}
                </Text>
              </View>
            </View>
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
