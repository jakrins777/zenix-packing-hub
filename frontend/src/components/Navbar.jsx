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
    <nav className="bg-white text-gray-800 shadow-sm border-b border-gray-200 print:hidden" >
      {/* 🌟 1. ขยายกล่องให้กว้างขึ้น (max-w-[1400px]) และใช้ flex-wrap เพื่อให้เมนูปัดตกบรรทัดใหม่อัตโนมัติเวลาจอแคบ */}
      <div className="max-w-[1400px] w-full mx-auto px-4 md:px-6 py-3 md:py-4 flex flex-wrap lg:flex-nowrap justify-between items-center gap-y-4 gap-x-4 print:hidden" >

        {/* ฝั่งซ้าย: โลโก้ */}
        <div className="flex items-center space-x-2 md:space-x-3 shrink-0 order-1">
          <img
            src="/zenix_pace.png"
            alt="Zenix Logo"
            className="h-12 md:h-16 lg:h-[70px] w-auto object-contain"
          />
          {/* ซ่อนคำว่า ZENIX ในจอมือถือ/แท็บเล็ต เพื่อประหยัดพื้นที่ (เพราะในรูปโลโก้มีคำนี้อยู่แล้ว) */}
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-gray-800 mt-1 sm:mt-0">
            <span className="text-[#0066CC]">PCA</span>
          </h1>
        </div>

        {/* ตรงกลาง: เมนู (🌟 สั่ง order-3 คือถ้าจอแคบ จะโดนปัดลงมาอยู่บรรทัดที่ 2 เต็มพื้นที่พอดี) */}
        <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3 w-full lg:w-auto order-3 lg:order-2 print:hidden" >
          <button
            onClick={() => setCurrentTab('packing')}
            className={`px-3 md:px-4 py-2 rounded-lg font-bold transition-all text-sm md:text-base ${currentTab === 'packing' ? 'bg-[#0066CC] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
          >
            🚀 สแกนแพ็ค
          </button>

          <button
            onClick={() => setCurrentTab('inventory')}
            className={`px-3 md:px-4 py-2 rounded-lg font-bold transition-all text-sm md:text-base ${currentTab === 'inventory' ? 'bg-[#0066CC] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
          >
            📦 เช็คสต็อกกล่อง
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className={`px-3 md:px-4 py-2 rounded-lg font-bold transition-all text-sm md:text-base ${currentTab === 'dashboard' ? 'bg-[#0066CC] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
              >
                📊 Dashboard
              </button>

              <button
                onClick={() => setCurrentTab('admin')}
                className={`px-3 md:px-4 py-2 rounded-lg font-bold transition-all text-sm md:text-base ${currentTab === 'admin' ? 'bg-[#0066CC] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
              >
                ⚙️ แอดมิน
              </button>
            </>
          )}
        </div>

        {/* ฝั่งขวา: เปลี่ยนภาษา & โปรไฟล์พนักงาน */}
        <div className="flex items-center space-x-2 md:space-x-3 shrink-0 order-2 lg:order-3 print:hidden">
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'th' ? 'en' : 'th')}
            className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-gray-50 hover:bg-gray-200 border border-gray-200 text-[#0066CC] font-black transition-colors shadow-sm shrink-0 text-sm md:text-base"
            title="เปลี่ยนภาษา (Change Language)"
          >
            {i18n.language === 'th' ? 'TH' : 'EN'}
          </button>

          <div className="flex items-center space-x-2 md:space-x-4 bg-gray-50 px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-gray-200" >
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-[10px] md:text-xs text-[#0066CC] font-bold uppercase leading-tight">{user?.role}</span>
              <span className="text-xs md:text-sm font-black text-gray-800 leading-tight">{user?.firstName}</span>
            </div>
            <div className="w-px h-6 md:h-8 bg-gray-300 hidden sm:block"></div>
            <button
              onClick={onLogout}
              className="text-red-500 hover:text-red-600 font-bold text-xs md:text-sm transition-colors flex items-center shrink-0 py-1"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>

      </div>
    </nav>
  );
}