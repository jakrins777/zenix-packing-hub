import { useState } from 'react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 🌟 ฟังก์ชันจัดการตอนกดปุ่ม
  const handleLoginClick = async (e) => {
    e.preventDefault(); // ป้องกันหน้ารีเฟรช
    
    // ดักเช็คตรงนี้เลยว่ากรอกครบไหม ถ้าไม่ครบให้โชว์ Error สีแดง
    if (!username.trim() || !password.trim()) {
      setError('⚠️ กรุณากรอกรหัสพนักงานและรหัสผ่านให้ครบถ้วน');
      return;
    }

    setError('');
    setIsLoading(true);
    console.log("👉 กำลังพยายามล็อกอินด้วย:", username); // พิมพ์บอกใน Console

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      
      // ดักกรณี Backend ตาย หรือหา API ไม่เจอ
      if (!response.ok && response.status === 404) {
        throw new Error("หา API ฝั่ง Backend ไม่เจอ (404)");
      }

      const data = await response.json();
      console.log("📦 ข้อมูลที่ได้จาก Backend:", data); // 💡 ให้สังเกตบรรทัดนี้ใน Console
      
      if (data.success) {
        // 🌟 ดักจับข้อมูลผู้ใช้ให้ครอบคลุม ไม่ว่าหลังบ้านจะตั้งชื่อตัวแปรว่าอะไร
        const userData = data.user || data.data || data; 
        
        // ถ้าล็อกอินผ่านแต่ไม่มีก้อนข้อมูล User ส่งมาเลย ให้แจ้งเตือน
        if (!userData || Object.keys(userData).length === 0) {
          setError('❌ ล็อกอินสำเร็จ แต่ระบบหลังบ้านไม่ได้ส่งข้อมูลโปรไฟล์มาให้');
          setIsLoading(false);
          return;
        }

        localStorage.setItem('zenix_user', JSON.stringify(userData));
        onLogin(userData);
      } else {
        setError(data.message || '❌ รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      console.error("🚨 ระบบล็อกอินขัดข้อง:", err);
      setError(`❌ ขัดข้อง: ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (${err.message})`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 p-4 font-sans relative overflow-hidden">
      
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden relative z-10 transform transition-all hover:scale-[1.01]">
        
        <div className="bg-indigo-50/50 p-8 text-center border-b border-indigo-100 flex flex-col items-center justify-center">
          <img 
            src="/logo.png" 
            alt="Zenix Logo" 
            className="h-16 w-auto object-contain mb-4 drop-shadow-md"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block'; 
            }}
          />
          <span className="text-5xl mb-4 hidden drop-shadow-md">📦</span>
          <h1 className="text-3xl font-black text-indigo-950 tracking-tight">ZENIX<span className="text-indigo-600">HUB</span></h1>
          <p className="text-indigo-600/80 mt-2 font-bold text-sm tracking-wide uppercase">Packing & Logistics System</p>
        </div>

        <div className="p-8">
          <form className="space-y-6">
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold border border-red-200 flex items-center shadow-sm">
                <span className="mr-2">⚠️</span> {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">รหัสพนักงาน</label>
                <input 
                  type="text" 
                  autoFocus
                  value={username} 
                  onChange={(e) => setUsername(e.target.value.toUpperCase())} 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-gray-800 font-medium"
                  placeholder="เช่น D-88888"
                  onKeyDown={(e) => e.key === 'Enter' && handleLoginClick(e)}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">รหัสผ่าน</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-gray-800"
                  placeholder="••••••••"
                  onKeyDown={(e) => e.key === 'Enter' && handleLoginClick(e)}
                />
              </div>
            </div>

            {/* 🌟 เปลี่ยนมาใช้ onClick โดยตรงเพื่อความชัวร์ 100% */}
            <button 
              type="button" 
              onClick={handleLoginClick}
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  เข้าสู่ระบบ
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </>
              )}
            </button>
            
          </form>
        </div>
        
        <div className="bg-gray-50 py-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium">© 2026 Zenix Aerospace. All rights reserved.</p>
        </div>

      </div>
    </div>
  );
}