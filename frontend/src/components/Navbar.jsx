export default function Navbar({ user, onLogout, currentTab, setCurrentTab }) {
  // ดักเช็คสิทธิ์แอดมินตรงนี้ที่เดียว (ตัวใหญ่-ตัวเล็กผ่านหมด)
  const isAdmin = user?.role?.toLowerCase() === 'admin';

 return (
    <nav className="bg-[#0B132B] text-white shadow-lg border-b border-white/10 print:hidden" >
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden" >
        
        {/* 🌟 โลโก้แบบรูปภาพกลับมาแล้วครับ! */}
        <div className="flex items-center space-x-3">
          <img 
            src="/logo-zenix.png" /* 💡 อย่าลืมเช็คชื่อไฟล์รูปให้ตรงกับที่มีในโฟลเดอร์ public ด้วยนะครับ เช่น /logo.png, /logo.jpg */
            alt="Zenix Logo" 
            className="h-10 w-auto object-contain" 
          />
          <h1 className="text-2xl font-black tracking-wider text-white">ZENIX<span className="text-[#00B4D8]">PACKINGHUB</span></h1>
        </div>

        {/* ปุ่มเมนูต่างๆ */}
        <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4 print:hidden" >
          <button 
            onClick={() => setCurrentTab('packing')} 
            className={`px-4 py-2 rounded-lg font-bold transition-all ${currentTab === 'packing' ? 'bg-[#00B4D8] text-white shadow-[0_0_15px_rgba(0,180,216,0.3)]' : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'}`}
          >
            🚀 สแกนแพ็ค
          </button>

          {/* 🌟 เพิ่มปุ่ม "เช็คสต็อกกล่อง" ตรงนี้ (เพื่อให้ทุกคนมองเห็นได้) */}
          <button 
            onClick={() => setCurrentTab('inventory')} 
            className={`px-4 py-2 rounded-lg font-bold transition-all ${currentTab === 'inventory' ? 'bg-[#00B4D8] text-white shadow-[0_0_15px_rgba(0,180,216,0.3)]' : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'}`}
          >
            📦 เช็คสต็อกกล่อง
          </button>

          {/* ถ้าเป็นแอดมิน ถึงจะโชว์ 2 ปุ่มนี้ */}
          {isAdmin && (
            <>
              <button 
                onClick={() => setCurrentTab('dashboard')} 
                className={`px-4 py-2 rounded-lg font-bold transition-all ${currentTab === 'dashboard' ? 'bg-[#00B4D8] text-white shadow-[0_0_15px_rgba(0,180,216,0.3)]' : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'}`}
              >
                📊 Dashboard
              </button>
              
              <button 
                onClick={() => setCurrentTab('admin')} 
                className={`px-4 py-2 rounded-lg font-bold transition-all ${currentTab === 'admin' ? 'bg-[#00B4D8] text-white shadow-[0_0_15px_rgba(0,180,216,0.3)]' : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'}`}
              >
                ⚙️ แอดมิน
              </button>
            </>
          )}
        </div>

        {/* โปรไฟล์พนักงาน และปุ่มออก */}
        <div className="flex items-center space-x-4 bg-[#1C2541] px-4 py-2 rounded-xl border border-white/10 print:hidden" >
          <div className="flex flex-col text-right">
            <span className="text-xs text-[#00B4D8] font-bold uppercase">{user?.role}</span>
            <span className="text-sm font-black text-white">{user?.firstName}</span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <button 
            onClick={onLogout} 
            className="text-red-400 hover:text-red-300 font-bold text-sm transition-colors flex items-center space-x-1"
          >
            <span>ออกจากระบบ</span>
          </button>
        </div>

      </div>
    </nav>
  );
}