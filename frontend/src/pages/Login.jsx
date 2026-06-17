import { useState } from 'react';

export default function Login({ onLogin }) {
  // 🌟 ประกาศ State สำหรับเก็บค่าต่างๆ ในหน้า Login ให้ครบถ้วน
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 🌟 ฟังก์ชันจัดการตอนกดปุ่มเข้าสู่ระบบ
  const handleLogin = async (e) => {
    e.preventDefault(); // ป้องกันหน้าเว็บรีเฟรช
    setError('');       // ล้างข้อความ Error เก่าทิ้ง
    setLoading(true);   // เปิดโหมด Loading (เพื่อให้ปุ่มหมุนๆ หรือกดซ้ำไม่ได้)

    try {
      // 🌟 ยิง API ไปหา Backend ที่เราเขียนไว้ ปลอดภัย 100%
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.toUpperCase().trim(), // แปลงเป็นพิมพ์ใหญ่เสมอ
          password: password 
        })
      });

      const data = await res.json();

      if (data.success) {
        // ถ้าสำเร็จ ให้เซฟข้อมูลลงเครื่อง และเปลี่ยนหน้า
        localStorage.setItem('zenix_user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        // ถ้าผิดพลาด (เช่น รหัสผิด) ให้โชว์ข้อความแจ้งเตือน
        setError(data.message);
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ (โปรดตรวจสอบ Backend)');
      console.error(err);
    } finally {
      setLoading(false); // ปิดโหมด Loading
    }
  };

return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B132B] font-sans">
      <div className="bg-[#1C2541] border border-white/10 p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-up">
        
        <div className="text-center mb-8">
          <div className="bg-[#0B132B] text-[#00B4D8] border border-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <span className="text-3xl">📦</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">Zenix WMS</h2>
          <p className="text-[#94A3B8] font-medium mt-1">Warehouse Management System</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border-l-4 border-red-500 text-red-400 p-4 rounded-md mb-6 font-bold text-sm flex items-center gap-2">
            <span>🚨</span> {error}
          </div>
        )}

        {/* 🌟 ฟอร์มล็อกอิน */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-[#94A3B8] mb-2">{t('login.username_label')}</label>
            <input 
              type="text" 
              required 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="w-full px-4 py-3 border border-white/10 rounded-xl bg-[#0B132B] text-white focus:ring-1 focus:ring-[#00B4D8] focus:border-[#00B4D8] outline-none transition-all font-mono placeholder-[#94A3B8]/40" 
              placeholder={t('login.username_placeholder')}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#94A3B8] mb-2">{t('login.password_label')}</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-4 py-3 border border-white/10 rounded-xl bg-[#0B132B] text-white focus:ring-1 focus:ring-[#00B4D8] focus:border-[#00B4D8] outline-none transition-all placeholder-[#94A3B8]/40" 
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full font-bold py-3.5 px-4 rounded-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 ${loading ? 'bg-[#94A3B8]/20 text-[#94A3B8] cursor-not-allowed shadow-none' : 'bg-[#00B4D8] hover:bg-[#0096B4] text-white shadow-[0_0_15px_rgba(0,180,216,0.3)]'}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-[#00B4D8]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{t('login.loading_text')}</span>
              </>
            ) : (
              <>
                <span>🚀</span> {t('login.submit_btn')}
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-[#94A3B8] font-medium">
          &copy; {new Date().getFullYear()} Zenix Aerospace. All rights reserved.
        </div>
      </div>
    </div>
  );
}