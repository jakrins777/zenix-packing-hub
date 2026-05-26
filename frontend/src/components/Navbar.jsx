export default function Navbar({ user, onLogout, currentTab, setCurrentTab }) {
  return (
    <nav className="bg-gray-900 text-white shadow-md print:hidden">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center px-6 py-4">
        <div className="text-2xl font-bold tracking-wider text-blue-400 mb-4 md:mb-0">🛡️ ZENIX Packing Hub</div>
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
          <div className="flex space-x-2">
            <button onClick={() => setCurrentTab('packing')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentTab === 'packing' ? 'bg-blue-600' : 'text-gray-300'}`}>📦 สแกนแพ็ค</button>
            {user.role === 'admin' && (
              <>
                <button onClick={() => setCurrentTab('dashboard')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentTab === 'dashboard' ? 'bg-blue-600' : 'text-gray-300'}`}>📊 แดชบอร์ด</button>
                <button onClick={() => setCurrentTab('admin')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentTab === 'admin' ? 'bg-blue-600' : 'text-gray-300'}`}>⚙️ แอดมิน</button>
              </>
            )}
          </div>
          <div className="flex items-center space-x-4 border-t-2 md:border-t-0 md:border-l-2 border-gray-700 pt-4 md:pt-0 pl-0 md:pl-6">
            <div className="text-right">
              <p className="font-bold text-sm">{user.firstName}</p>
              <p className="text-xs bg-gray-600 px-2 rounded inline-block">{user.role.toUpperCase()}</p>
            </div>
            <button onClick={onLogout} className="bg-gray-700 hover:bg-red-600 px-3 py-2 rounded text-sm font-bold">ออกระบบ</button>
          </div>
        </div>
      </div>
    </nav>
  );
}