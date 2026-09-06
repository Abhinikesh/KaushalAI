import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import hi from './hi.json'

const savedLang = localStorage.getItem('kaushal_lang') || localStorage.getItem('kaushalai_lang') || 'en'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  })

// Persist language choice
i18n.on('languageChanged', (lang) => {
  localStorage.setItem('kaushal_lang', lang)
  localStorage.setItem('kaushalai_lang', lang)
})

export default i18n
