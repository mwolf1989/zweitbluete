// Picks the app language from the phone's preferred language. Imported first
// in index.ts so that every text is resolved in the right language.
import { I18nManager, Platform, Settings } from 'react-native';

import { setLanguage } from './i18n';

function preferredLanguageTag(): string {
  if (Platform.OS === 'ios') {
    const languages: unknown = Settings.get('AppleLanguages');
    return Array.isArray(languages) && typeof languages[0] === 'string' ? languages[0] : '';
  }
  return I18nManager.getConstants().localeIdentifier ?? '';
}

setLanguage(preferredLanguageTag().toLowerCase().startsWith('de') ? 'de' : 'en');
