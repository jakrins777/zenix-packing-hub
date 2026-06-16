import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// นำเข้าไฟล์พจนานุกรมที่เราสร้างไว้
import thTranslation from './locales/th.json';
import enTranslation from './locales/en.json';

i18n
  .use(LanguageDetector) // ตัวช่วยจำภาษาที่ User เลือกไว้ในเครื่อง
  .use(initReactI18next) // เชื่อมการทำงานกับ React
  .init({
    resources: {
      th: { translation: thTranslation },
      en: { translation: enTranslation }
    },
    fallbackLng: 'th', // ถ้าหาภาษาไม่เจอ ให้กลับมาใช้ภาษาไทยเป็นค่าเริ่มต้น
    interpolation: {
      escapeValue: false // React มีระบบป้องกัน XSS ให้เราแล้ว
    }
  });

export default i18n;