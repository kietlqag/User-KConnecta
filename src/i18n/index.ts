import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi';
import en from './locales/en';
import type { LanguageOption } from '@/features/settings/types/userSettings.types';

export const LANGUAGE_STORAGE_KEY = 'kconnecta-language';

const stored = (typeof localStorage !== 'undefined'
  ? localStorage.getItem(LANGUAGE_STORAGE_KEY)
  : null) as LanguageOption | null;

const initialLanguage: LanguageOption = stored === 'en' ? 'en' : 'vi';

void i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: initialLanguage,
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false,
  },
});

export function applyAppLanguage(language: LanguageOption) {
  if (i18n.language === language) {
    document.documentElement.lang = language;
    return;
  }
  void i18n.changeLanguage(language);
  document.documentElement.lang = language;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

document.documentElement.lang = initialLanguage;

export default i18n;
