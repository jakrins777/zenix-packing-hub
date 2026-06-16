import React from 'react';
import { useTranslation } from 'react-i18next'; // 🌟 Import เครื่องมือแปลภาษา

export default function Navbar({ user, onLogout, currentTab, setCurrentTab }) {
  const { t, i18n } = useTranslation(); // 🌟 เรียกใช้งาน Hook แปลภาษา
  // ดักเช็คสิทธิ์แอดมินตรงนี้ที่เดียว (ตัวใหญ่-ตัวเล็กผ่านหมด)
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  // ฟังก์ชันสลับภาษา
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav className="bg-indigo-900 text-white shadow-lg print:hidden" >
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden" >
        
        {/* 🌟 โลโก้แบบรูปภาพ */}
        <div className="flex items-center space-x-3">
          <img 
            src="/logo-zenix.png" 
            alt="Zenix Logo" 
            className="h-10 w-auto object-contain" 
          />
          <h1 className="text-2xl font-black tracking-wider text-white">ZENIX<span className="text-indigo-400">PACKINGHUB</span></h1>
        </div>

        {/* ปุ่มเมนูต่างๆ */}
        <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4 print:hidden" >
          <button 
            onClick={() => setCurrentTab('packing')} 
            className={`px-4 py-2 rounded-lg font-bold transition-all ${currentTab === 'packing' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:bg-indigo-800 hover:text-indigo-100'}`}
          >
            🚀 {t('navbar.scan_pack')}
          </button>

          {/* 📦 ปุ่มเช็คสต็อกกล่อง */}
          <button 
            onClick={() => setCurrentTab('inventory')} 
            className={`px-4 py-2 rounded-lg font-bold transition-all ${currentTab === 'inventory' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:bg-indigo-800 hover:text-indigo-100'}`}
          >
            📦 {t('navbar.check_stock')}
          </button>

          {/* ถ้าเป็นแอดมิน ถึงจะโชว์ 2 ปุ่มนี้ */}
          {isAdmin && (
            <>
              <button 
                onClick={() => setCurrentTab('dashboard')} 
                className={`px-4 py-2 rounded-lg font-bold transition-all ${currentTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:bg-indigo-800 hover:text-indigo-100'}`}
              >
                📊 {t('navbar.dashboard')}
              </button>
              
              <button 
                onClick={() => setCurrentTab('admin')} 
                className={`px-4 py-2 rounded-lg font-bold transition-all ${currentTab === 'admin' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:bg-indigo-800 hover:text-indigo-100'}`}
              >
                ⚙️ {t('navbar.admin')}
              </button>
            </>
          )}
        </div>

        {/* 🌐 ส่วนเลือกภาษา + โปรไฟล์พนักงาน และปุ่มออกจากระบบ */}
        <div className="flex flex-wrap items-center justify-center gap-4 print:hidden">
          
          {/* Dropdown เปลี่ยนภาษาแบบเท่ๆ ในแถบเนฟบาร์ */}
          <div className="relative">
            <select 
              value={i18n.language} 
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-indigo-950 text-white border border-indigo-700 rounded-lg px-2 py-1.5 text-xs font-bold outline-none cursor-pointer hover:bg-indigo-900 transition-colors focus:ring-1 focus:ring-indigo-500"
            >
              <option value="th">🇹🇭 TH</option>
              <option value="en">🇺🇸 EN</option>
            </select>
          </div>

          <div className="flex items-center space-x-4 bg-indigo-950 px-4 py-2 rounded-xl border border-indigo-800" >
            <div className="flex flex-col text-right">
              <span className="text-xs text-indigo-400 font-bold uppercase">{user?.role}</span>
              <span className="text-sm font-black text-white">{user?.firstName}</span>
            </div>
            <div className="w-px h-8 bg-indigo-800"></div>
            <button 
              onClick={onLogout} 
              className="text-red-400 hover:text-red-300 font-bold text-sm transition-colors flex items-center space-x-1"
            >
              <span>{t('navbar.logout')}</span>
            </button>
          </div>

        </div>

      </div>
    </nav>
  );
}