export type LanguageCode =
  | 'en'
  | 'ur'
  | 'ar'
  | 'fr'
  | 'es'
  | 'de'
  | 'it'
  | 'pt'
  | 'tr'
  | 'zh-CN'
  | 'zh-TW'
  | 'ja'
  | 'ko'
  | 'hi'
  | 'bn'
  | 'ru'
  | 'nl'
  | 'id'
  | 'ms'
  | 'fa';

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  flag: string;
  locale: string;
  fontFamily?: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    dir: 'ltr',
    flag: '🇬🇧',
    locale: 'en-US',
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    dir: 'rtl',
    flag: '🇵🇰',
    locale: 'ur-PK',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    dir: 'rtl',
    flag: '🇸🇦',
    locale: 'ar-SA',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    dir: 'ltr',
    flag: '🇫🇷',
    locale: 'fr-FR',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    dir: 'ltr',
    flag: '🇪🇸',
    locale: 'es-ES',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    dir: 'ltr',
    flag: '🇩🇪',
    locale: 'de-DE',
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    dir: 'ltr',
    flag: '🇮🇹',
    locale: 'it-IT',
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    dir: 'ltr',
    flag: '🇧🇷',
    locale: 'pt-BR',
  },
  {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    dir: 'ltr',
    flag: '🇹🇷',
    locale: 'tr-TR',
  },
  {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    dir: 'ltr',
    flag: '🇨🇳',
    locale: 'zh-CN',
  },
  {
    code: 'zh-TW',
    name: 'Chinese (Traditional)',
    nativeName: '繁體中文',
    dir: 'ltr',
    flag: '🇹🇼',
    locale: 'zh-TW',
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    dir: 'ltr',
    flag: '🇯🇵',
    locale: 'ja-JP',
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    dir: 'ltr',
    flag: '🇰🇷',
    locale: 'ko-KR',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    dir: 'ltr',
    flag: '🇮🇳',
    locale: 'hi-IN',
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    dir: 'ltr',
    flag: '🇧🇩',
    locale: 'bn-BD',
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    dir: 'ltr',
    flag: '🇷🇺',
    locale: 'ru-RU',
  },
  {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    dir: 'ltr',
    flag: '🇳🇱',
    locale: 'nl-NL',
  },
  {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    dir: 'ltr',
    flag: '🇮🇩',
    locale: 'id-ID',
  },
  {
    code: 'ms',
    name: 'Malay',
    nativeName: 'Bahasa Melayu',
    dir: 'ltr',
    flag: '🇲🇾',
    locale: 'ms-MY',
  },
  {
    code: 'fa',
    name: 'Persian (Farsi)',
    nativeName: 'فارسی',
    dir: 'rtl',
    flag: '🇮🇷',
    locale: 'fa-IR',
  },
];

export const RTL_LANGUAGES: LanguageCode[] = ['ur', 'ar', 'fa'];

export function isRtlLanguage(code: string): boolean {
  return RTL_LANGUAGES.includes(code as LanguageCode);
}
