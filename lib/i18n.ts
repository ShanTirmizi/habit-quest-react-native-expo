/**
 * i18n Setup — Internationalization for HabitQuest
 *
 * Uses i18next + react-i18next + expo-localization.
 * English is the default. Simplified Chinese (zh) is supported.
 *
 * Usage in components:
 *   const { t } = useTranslation('namespace');
 *   <Text>{t('key')}</Text>
 *   <Text>{t('key', { count: 5 })}</Text>
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

// English namespaces
import enCommon from '@/locales/en/common.json';
import enDashboard from '@/locales/en/dashboard.json';
import enHabits from '@/locales/en/habits.json';
import enChronicles from '@/locales/en/chronicles.json';
import enQuests from '@/locales/en/quests.json';
import enMedicines from '@/locales/en/medicines.json';
import enInsights from '@/locales/en/insights.json';
import enCompanion from '@/locales/en/companion.json';
import enSettings from '@/locales/en/settings.json';
import enOnboarding from '@/locales/en/onboarding.json';
import enGoals from '@/locales/en/goals.json';
import enGamification from '@/locales/en/gamification.json';
import enAuth from '@/locales/en/auth.json';
import enHabitBrowser from '@/locales/en/habit-browser.json';
import enOracle from '@/locales/en/oracle.json';
import enUnderworld from '@/locales/en/underworld.json';
import enHabitDetail from '@/locales/en/habit-detail.json';

// Chinese namespaces
import zhCommon from '@/locales/zh/common.json';
import zhDashboard from '@/locales/zh/dashboard.json';
import zhHabits from '@/locales/zh/habits.json';
import zhChronicles from '@/locales/zh/chronicles.json';
import zhQuests from '@/locales/zh/quests.json';
import zhMedicines from '@/locales/zh/medicines.json';
import zhInsights from '@/locales/zh/insights.json';
import zhCompanion from '@/locales/zh/companion.json';
import zhSettings from '@/locales/zh/settings.json';
import zhOnboarding from '@/locales/zh/onboarding.json';
import zhGoals from '@/locales/zh/goals.json';
import zhGamification from '@/locales/zh/gamification.json';
import zhAuth from '@/locales/zh/auth.json';
import zhHabitBrowser from '@/locales/zh/habit-browser.json';
import zhOracle from '@/locales/zh/oracle.json';
import zhUnderworld from '@/locales/zh/underworld.json';
import zhHabitDetail from '@/locales/zh/habit-detail.json';

export const SUPPORTED_LOCALES = ['en', 'zh'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_DISPLAY_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  zh: '简体中文',
};

const NAMESPACES = [
  'common', 'dashboard', 'habits', 'chronicles', 'quests',
  'medicines', 'insights', 'companion', 'settings', 'onboarding',
  'goals', 'gamification', 'auth', 'habit-browser', 'oracle', 'underworld', 'habit-detail',
] as const;

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: {
      common: enCommon,
      dashboard: enDashboard,
      habits: enHabits,
      chronicles: enChronicles,
      quests: enQuests,
      medicines: enMedicines,
      insights: enInsights,
      companion: enCompanion,
      settings: enSettings,
      onboarding: enOnboarding,
      goals: enGoals,
      gamification: enGamification,
      auth: enAuth,
      'habit-browser': enHabitBrowser,
      oracle: enOracle,
      underworld: enUnderworld,
      'habit-detail': enHabitDetail,
    },
    zh: {
      common: zhCommon,
      dashboard: zhDashboard,
      habits: zhHabits,
      chronicles: zhChronicles,
      quests: zhQuests,
      medicines: zhMedicines,
      insights: zhInsights,
      companion: zhCompanion,
      settings: zhSettings,
      onboarding: zhOnboarding,
      goals: zhGoals,
      gamification: zhGamification,
      auth: zhAuth,
      'habit-browser': zhHabitBrowser,
      oracle: zhOracle,
      underworld: zhUnderworld,
      'habit-detail': zhHabitDetail,
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: [...NAMESPACES],
  interpolation: {
    escapeValue: false, // React Native doesn't need escaping
  },
});

/**
 * Detect the best initial locale from the device.
 * Returns 'zh' if any device locale starts with 'zh', else 'en'.
 */
export function detectDeviceLocale(): SupportedLocale {
  try {
    const deviceLocales = getLocales();
    for (const loc of deviceLocales) {
      if (loc.languageCode === 'zh') return 'zh';
    }
  } catch {
    // getLocales can throw in some environments
  }
  return 'en';
}

export default i18n;
