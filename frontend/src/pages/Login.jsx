import { useState } from 'react';

export default function Login({ onLogin }) {
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm)
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('zenix_user', JSON.stringify(data.data));
      onLogin(data.data);
    } else { setError(data.message); }
  };

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-4xl font-black text-blue-600 text-center mb-8">ZENIX</h1>
        {error && <p className="text-red-600 font-bold text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Username" className="w-full p-3 border rounded" onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-3 border rounded" onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded font-bold">เข้าสู่ระบบ</button>
        </form>
      </div>
    </div>
  );
}