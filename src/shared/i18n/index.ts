/**
 * i18n fr/en — mêmes fichiers et comportement que le site.
 * Les écrans n'importent jamais i18next directement : uniquement @shared/i18n.
 */

import i18n from 'i18next';
import {initReactI18next, useTranslation as useI18nextTranslation} from 'react-i18next';
import 'intl-pluralrules';

import fr from './locales/fr.json';
import en from './locales/en.json';
import communityFr from './locales/community.fr.json';
import communityEn from './locales/community.en.json';
import communityProfileFr from './locales/communityProfile.fr.json';
import communityProfileEn from './locales/communityProfile.en.json';
import appFr from './locales/app.fr.json';
import appEn from './locales/app.en.json';

export type AppLanguage = 'fr' | 'en';

const resources = {
  fr: {
    translation: {
      ...fr,
      ...communityProfileFr,
      ...communityFr,
      ...appFr,
    },
  },
  en: {
    translation: {
      ...en,
      ...communityProfileEn,
      ...communityEn,
      ...appEn,
    },
  },
};

let initialized = false;

/**
 * Initialise i18next. À appeler une fois après hydratation des préférences
 * (pour démarrer dans la bonne langue).
 */
export function initI18n(language: AppLanguage = 'fr'): typeof i18n {
  if (initialized) {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
    return i18n;
  }

  void i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });

  initialized = true;
  return i18n;
}

export function changeLanguage(language: AppLanguage): Promise<void> {
  const lng: AppLanguage = language === 'en' ? 'en' : 'fr';
  return i18n.changeLanguage(lng).then(() => undefined);
}

export function getLanguage(): AppLanguage {
  const lng = i18n.language;
  return lng === 'en' ? 'en' : 'fr';
}

/** Hook mince : réexport contrôlé pour que les features n'importent pas react-i18next. */
export function useTranslation() {
  return useI18nextTranslation();
}

export {i18n};
export default i18n;
