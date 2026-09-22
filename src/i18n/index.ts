import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';

export const SUPPORTED_LANGUAGES = ['es', 'en', 'fr', 'de'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_STORAGE_KEY = 'agp-language';

function detectDeviceLanguage(): SupportedLanguage {
  const deviceLanguage = Localization.getLocales()[0]?.languageCode;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(deviceLanguage ?? '')
    ? (deviceLanguage as SupportedLanguage)
    : 'es';
}

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    es: { translation: es },
    en: { translation: en },
    fr: { translation: fr },
    de: { translation: de },
  },
  lng: detectDeviceLanguage(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

export async function loadStoredLanguage() {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
    await i18n.changeLanguage(stored);
    return stored as SupportedLanguage;
  }
  return null;
}

export async function setLanguage(language: SupportedLanguage) {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export default i18n;
