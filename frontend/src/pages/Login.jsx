import { useState } from 'react';
import { useTranslation } from 'react-i18next'; 

export default function Login({ onLogin }) {
  const { t } = useTranslation(); 
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  //ฟังก์ชันจัดการตอนกดปุ่มเข้าสู่ระบบ
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // แก้ไขตรงนี้: ดึง URL ของ Backend มาจาก Environment Variable
      // (ถ้ารันในเครื่องแล้วไม่มี .env มันจะวิ่งไปที่ http://localhost:5000 เป็นค่า Default)
      const apiUrl = import.meta.env.VITE_NODE_API_URL || 'https://zenix-packing-hub.onrender.com';

      const res = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.toUpperCase().trim(),
          password: password
        })
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('zenix_user', JSON.stringify(data.user));
        localStorage.setItem('zenix_token', data.token);
        window.location.href = '/';
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(t('login.error_server'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
      <div className="bg-white border border-gray-200 p-8 md:p-10 rounded-2xl shadow-xl w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          {/* ส่วนโลโก้ที่แก้ไขใหม่ */}
          <div className="mx-auto mb-4 w-20 h-20 flex items-center justify-center transition-transform hover:scale-105 duration-300">
            <img
              src="/wpca-logo.svg"
              alt="WPCA Logo"
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>

          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Zenix WPC</h2>
          <p className="text-gray-500 font-medium mt-1">Warehouse Packaging Calculation</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-600 p-4 rounded-md mb-6 font-bold text-sm flex items-center gap-2">
            <span>🚨</span> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{t('login.username_label')}</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-800 focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC] outline-none transition-all font-mono placeholder-gray-400"
              placeholder={t('login.username_placeholder')}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{t('login.password_label')}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-800 focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC] outline-none transition-all placeholder-gray-400"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-bold py-3.5 px-4 rounded-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 ${loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'bg-[#0066CC] hover:bg-[#0052a3] text-white shadow-md'}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-[#0066CC]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{t('login.loading_text')}</span>
              </>
            ) : (
              <>
                <span></span> {t('login.submit_btn')}
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-400 font-medium">
          &copy; {new Date().getFullYear()} Zenix Aerospace. All rights reserved.
        </div>
      </div>
    </div>
  );
}