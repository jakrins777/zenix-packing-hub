export default function Navbar({ user, onLogout, currentTab, setCurrentTab }) {
  // 🌟 ดักเช็คสิทธิ์แอดมินตรงนี้ที่เดียว (ตัวใหญ่-ตัวเล็กผ่านหมด)
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  return (
    <nav className="bg-indigo-900 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* โลโก้ */}
        <div className="flex items-center space-x-2">
          <span className="text-2xl">📦</span>
          <h1 className="text-2xl font-black tracking-wider text-white">ZENIX<span className="text-indigo-400">HUB</span></h1>
        </div>

        {/* ปุ่มเมนูต่างๆ */}
        <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4">
          <button 
            onClick={() => setCurrentTab('packing')} 
            className={`px-4 py-2 rounded-lg font-bold transition-all ${currentTab === 'packing' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`}
          >
            🚀 สแกนแพ็ค
          </button>

          {/* 🌟 ถ้าเป็นแอดมิน ถึงจะโชว์ 2 ปุ่มนี้ */}
          {isAdmin && (
            <>
              <button 
                onClick={() => setCurrentTab('dashboard')} 
                className={`px-4 py-2 rounded-lg font-bold transition-all ${currentTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`}
              >
                📊 Dashboard
              </button>
              
              <button 
                onClick={() => setCurrentTab('admin')} 
                className={`px-4 py-2 rounded-lg font-bold transition-all ${currentTab === 'admin' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`}
              >
                ⚙️ แอดมิน
              </button>
            </>
          )}
        </div>

        {/* โปรไฟล์พนักงาน และปุ่มออก */}
        <div className="flex items-center space-x-4 bg-indigo-950 px-4 py-2 rounded-xl border border-indigo-800">
          <div className="flex flex-col text-right">
            <span className="text-xs text-indigo-400 font-bold uppercase">{user?.role}</span>
            <span className="text-sm font-black text-white">{user?.firstName}</span>
          </div>
          <div className="w-px h-8 bg-indigo-800"></div>
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