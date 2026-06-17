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
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden" >

        {/* ฝั่งซ้าย: โลโก้ */}
        <div className="flex items-center space-x-3">
          <img
            src="/zenix_pace.png"
            alt="Zenix Logo"
            className="h-16 md:h-20 w-auto object-contain"
          />
          <h1 className="text-2xl font-black tracking-wider text-gray-800">ZENIX<span className="text-[#0066CC]">PACKINGHUB</span></h1>
        </div>

        {/* ตรงกลาง: เมนู */}
        <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4 print:hidden" >
          <button
            onClick={() => setCurrentTab('packing')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${currentTab === 'packing' ? 'bg-[#0066CC] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
          >
            🚀 สแกนแพ็ค
          </button>

          <button
            onClick={() => setCurrentTab('inventory')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${currentTab === 'inventory' ? 'bg-[#0066CC] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
          >
            📦 เช็คสต็อกกล่อง
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${currentTab === 'dashboard' ? 'bg-[#0066CC] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
              >
                📊 Dashboard
              </button>

              <button
                onClick={() => setCurrentTab('admin')}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${currentTab === 'admin' ? 'bg-[#0066CC] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
              >
                ⚙️ แอดมิน
              </button>
            </>
          )}
        </div>

        {/* ฝั่งขวา: เปลี่ยนภาษา & โปรไฟล์พนักงาน */}
        <div className="flex items-center space-x-3 print:hidden">

          {/* 🌟 ปุ่มเปลี่ยนภาษากลับมาแล้วครับ! */}
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'th' ? 'en' : 'th')}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-200 border border-gray-200 text-[#0066CC] font-black transition-colors shadow-sm"
            title="เปลี่ยนภาษา (Change Language)"
          >
            {i18n.language === 'th' ? 'EN' : 'TH'}
          </button>

          <div className="flex items-center space-x-4 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200" >
            <div className="flex flex-col text-right">
              <span className="text-xs text-[#0066CC] font-bold uppercase">{user?.role}</span>
              <span className="text-sm font-black text-gray-800">{user?.firstName}</span>
            </div>
            <div className="w-px h-8 bg-gray-300"></div>
            <button
              onClick={onLogout}
              className="text-red-500 hover:text-red-600 font-bold text-sm transition-colors flex items-center space-x-1"
            >
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>

      </div>
    </nav>
  );
}