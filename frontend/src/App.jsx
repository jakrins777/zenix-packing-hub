/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import PackingStation from './pages/PackingStation';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';

function App() {
  // ==========================================
  // 1. STATE & REFS
  // ==========================================
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('zenix_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [currentTab, setCurrentTab] = useState('packing');
  const [adminSubTab, setAdminSubTab] = useState('items');

  // State สำหรับหน้า Packing
  const [barcode, setBarcode] = useState('');
  const [qty, setQty] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const barcodeInputRef = useRef(null);

  // State สำหรับข้อมูล Master และ Dashboard
  const [items, setItems] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]); // 🌟 เพิ่ม State พนักงาน
  
  const [timeFilter, setTimeFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');

  // State สำหรับฟอร์มในหน้า Admin
  const [itemForm, setItemForm] = useState({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', requireDesiccant: false });
  const [editingItemId, setEditingItemId] = useState(null);
  
  const [boxForm, setBoxForm] = useState({ pckId: '', description: '', maxCapacity: '' });
  const [editingBoxId, setEditingBoxId] = useState(null);

  // 🌟 เพิ่ม State ฟอร์มพนักงาน
  const [userForm, setUserForm] = useState({ username: '', password: '', firstName: '', role: 'operator' });
  const [editingUserId, setEditingUserId] = useState(null);

  // ==========================================
  // 2. DATA FETCHING
  // ==========================================
  const fetchAdminData = useCallback(async () => {
    try {
      const resItems = await fetch('/api/items');
      const dataItems = await resItems.json();
      if (dataItems.success) setItems(dataItems.data);
      
      const resBoxes = await fetch('/api/boxes');
      const dataBoxes = await resBoxes.json();
      if (dataBoxes.success) setBoxes(dataBoxes.data);

      // 🌟 ดึงข้อมูลพนักงาน
      const resUsers = await fetch('/api/users');
      const dataUsers = await resUsers.json();
      if (dataUsers.success) setUsers(dataUsers.data);
    } catch (err) { console.error('โหลด Master Data ไม่สำเร็จ', err); }
  }, []);

  const fetchLogsData = useCallback(async () => {
    try {
      const resLogs = await fetch('/api/logs');
      const dataLogs = await resLogs.json();
      if (dataLogs.success) setLogs(dataLogs.data);
    } catch (err) { console.error('โหลดข้อมูล Logs ไม่สำเร็จ', err); }
  }, []);

  useEffect(() => {
    // 🌟 เติม .toLowerCase() เพื่อให้ตัว A ใหญ่ หรือเล็ก ก็ผ่านหมด
    if (currentUser?.role?.toLowerCase() === 'admin') {
      if (currentTab === 'admin') fetchAdminData();
      if (currentTab === 'dashboard') fetchLogsData();
    }
  }, [currentTab, currentUser, fetchAdminData, fetchLogsData]);
  // ==========================================
  // 3. CALCULATIONS & DERIVED STATE
  // ==========================================
  const calculatedTotalWeight = result && qty ? (Number(qty) * (result.itemWeight || 0)).toFixed(3) : 0;
  const maxCap = result?.defaultBox?.maxCapacity || 1; 
  const calculatedBoxesUsed = result && qty && result.defaultBox ? (Number(qty) / maxCap).toFixed(2) : 0;
  const calculatedDesiccant = (result && qty && result.requireDesiccant) ? Math.ceil(Number(calculatedBoxesUsed)) : 0;

  const filteredLogs = logs.filter(log => {
    const logDate = new Date(log.packedAt);
    const today = new Date();
    if (timeFilter === 'today') return logDate.toDateString() === today.toDateString();
    else if (timeFilter === 'month') return logDate.getMonth() === today.getMonth() && logDate.getFullYear() === today.getFullYear();
    else if (timeFilter === 'year') return logDate.getFullYear() === today.getFullYear();
    else if (timeFilter === 'custom' && customDate) return logDate.toDateString() === new Date(customDate).toDateString();
    return true; 
  });

  // ==========================================
  // 4. CORE FEATURES
  // ==========================================
  const playSound = (type) => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    if (type === 'success') {
      oscillator.type = 'sine'; 
      oscillator.frequency.setValueAtTime(2500, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); 
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); 
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.1); 
    } else if (type === 'error') {
      oscillator.type = 'square'; 
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); 
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    }
  };

  const handleScan = async (e) => {
    if (e.key === 'Enter' && barcode.trim() !== '') {
      setLoading(true); setError(''); setResult(null); setSaveMessage('');
      try {
        const response = await fetch(`/api/items/${barcode}`);
        const data = await response.json();
        if (data.success) { 
          setResult(data.data); setQty(1); playSound('success'); 
        } else { 
          setError('❌ ไม่พบรหัสสินค้านี้ในระบบ'); playSound('error'); 
        }
      } catch (err) { setError('❌ ขัดข้อง: เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); playSound('error'); } 
      finally { setLoading(false); }
    }
  };

  const handleSavePack = async () => {
    if (!result || !qty || qty <= 0) return;
    setLoading(true);
    try {
      const payload = { userId: currentUser.id, itemId: result.itemId, packQty: Number(qty), boxUsed: Number(calculatedBoxesUsed), totalWeight: Number(calculatedTotalWeight) };
      const response = await fetch('/api/pack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (data.success) {
        setSaveMessage('✅ บันทึกประวัติการแพ็คสำเร็จ!'); playSound('success'); 
        setTimeout(() => { setBarcode(''); setQty(''); setResult(null); setSaveMessage(''); barcodeInputRef.current?.focus(); }, 1000); 
      } else { setError('❌ บันทึกไม่สำเร็จ: ' + data.message); playSound('error'); }
    } catch (err) { setError('❌ ขัดข้อง: ไม่สามารถบันทึกข้อมูลได้'); playSound('error'); } 
    finally { setLoading(false); }
  };

  const handleDeleteLog = async (id) => {
    if (!confirm('🚨 ยืนยันที่จะลบประวัติการแพ็คนี้ใช่หรือไม่?\n(ยอดรวมใน Dashboard จะถูกหักออกทันที)')) return;
    try {
      const res = await fetch(`/api/logs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchLogsData(); 
      else alert(data.message);
    } catch (err) { alert('ลบไม่สำเร็จ ระบบขัดข้อง'); }
  };

  // ==========================================
  // 5. ADMIN FEATURES
  // ==========================================
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const url = editingItemId ? `/api/items/${editingItemId}` : '/api/items';
    const method = editingItemId ? 'PUT' : 'POST';
    const payload = { ...itemForm, itemName: itemForm.itemName.trim() === '' ? itemForm.itemId : itemForm.itemName };
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json(); alert(data.message);
      if (data.success) { setItemForm({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', requireDesiccant: false }); setEditingItemId(null); fetchAdminData(); }
    } catch (err) { alert('เกิดข้อผิดพลาดในการบันทึกสินค้า'); }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('ยืนยันที่จะลบสินค้านี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      const data = await res.json(); alert(data.message);
      if (data.success) fetchAdminData();
    } catch (err) { alert('ลบไม่สำเร็จ'); }
  };

  const handleBoxSubmit = async (e) => {
    e.preventDefault();
    const url = editingBoxId ? `/api/boxes/${editingBoxId}` : '/api/boxes';
    const method = editingBoxId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(boxForm) });
      const data = await res.json(); alert(data.message);
      if (data.success) { setBoxForm({ pckId: '', description: '', maxCapacity: '' }); setEditingBoxId(null); fetchAdminData(); }
    } catch (err) { alert('เกิดข้อผิดพลาดในการบันทึกกล่อง'); }
  };

  const handleBoxDelete = async (id) => {
    if (!confirm('ยืนยันที่จะลบกล่องนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/boxes/${id}`, { method: 'DELETE' });
      const data = await res.json(); alert(data.message);
      if (data.success) fetchAdminData();
    } catch (err) { alert('ลบไม่สำเร็จ'); }
  };

  // 🌟 ฟังก์ชันจัดการพนักงาน
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    const url = editingUserId ? `/api/users/${editingUserId}` : '/api/users';
    const method = editingUserId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm) });
      const data = await res.json(); alert(data.message);
      if (data.success) { setUserForm({ username: '', password: '', firstName: '', role: 'operator' }); setEditingUserId(null); fetchAdminData(); }
    } catch (err) { alert('เกิดข้อผิดพลาดในการบันทึกพนักงาน'); }
  };

  const handleUserDelete = async (id) => {
    if (!confirm('ยืนยันที่จะระงับ/ลบพนักงานคนนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json(); alert(data.message);
      if (data.success) fetchAdminData();
    } catch (err) { alert('ลบไม่สำเร็จ'); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await fetch('/api/items/upload', { method: 'POST', body: formData });
      const data = await res.json(); alert(data.message);
      if (data.success) fetchAdminData();
    } catch (err) { alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์'); }
    e.target.value = null; 
  };

  const handleBoxFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await fetch('/api/boxes/upload', { method: 'POST', body: formData });
      const data = await res.json(); alert(data.message);
      if (data.success) fetchAdminData();
    } catch (err) { alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์กล่อง'); }
    e.target.value = null; 
  };

  // ==========================================
  // 6. UI RENDER
  // ==========================================
  if (!currentUser) return <Login onLogin={setCurrentUser} />;

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Navbar user={currentUser} onLogout={() => { setCurrentUser(null); localStorage.removeItem('zenix_user'); }} currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        
        {/* --- หน้าสแกนแพ็คสินค้า --- */}
        {currentTab === 'packing' && (
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="bg-indigo-700 text-white p-6 text-center shadow-inner">
              <h1 className="text-3xl font-black tracking-wide">🚀 สแกนแพ็คสินค้า</h1>
            </div>
            <div className="p-6 md:p-8">
              <div className="mb-6">
                <label className="block text-lg font-bold text-indigo-900 mb-2">1️⃣ สแกนรหัสสินค้า (Item ID)</label>
                <input ref={barcodeInputRef} type="text" autoFocus value={barcode} onChange={(e) => setBarcode(e.target.value.toUpperCase())} onKeyDown={handleScan} placeholder="สแกนบาร์โค้ดที่นี่ แล้วกด Enter..." className="w-full text-xl p-4 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all shadow-sm"/>
              </div>

              {loading && !result && <p className="text-indigo-500 animate-pulse text-center mb-4 font-bold">กำลังค้นหาข้อมูล...</p>}
              {error && <p className="text-red-700 font-bold bg-red-50 border border-red-200 p-4 rounded-xl text-center mb-4">{error}</p>}
              {saveMessage && <p className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center mb-4 text-xl animate-bounce">{saveMessage}</p>}

              {result && (
                <div className="bg-slate-50 border-2 border-indigo-100 rounded-2xl p-6 shadow-sm">
                  
                  <div className="flex flex-col md:flex-row justify-between items-center border-b-2 border-indigo-100 pb-4 mb-5">
                    <h2 className="text-2xl font-black text-indigo-900">📦 {result.itemName}</h2>
                    <div className="mt-4 md:mt-0 flex items-center bg-white border-2 border-indigo-200 rounded-xl p-2 px-4 shadow-sm">
                      <label className="font-bold text-indigo-800 mr-4">ระบุจำนวนที่แพ็ค:</label>
                      <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="w-24 text-2xl font-black text-indigo-600 text-center focus:outline-none bg-transparent"/>
                      <span className="ml-2 font-bold text-gray-400">ชิ้น</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">🏢 Supplier</p>
                      <p className="font-black text-lg text-indigo-900 truncate" title={result.supplier}>{result.supplier || '-'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">น้ำหนัก / ชิ้น</p>
                      <p className="font-black text-lg text-gray-700">{result.itemWeight} kg</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">กล่องที่ใช้</p>
                      <p className="font-black text-lg text-indigo-600">{result.defaultBox?.pckId || '-'}</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-200">
                      <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">⚖️ น้ำหนักรวม</p>
                      <p className="font-black text-xl text-emerald-600">{calculatedTotalWeight} <span className="text-sm font-bold">kg</span></p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl shadow-sm border border-amber-200 col-span-2">
                      <p className="text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">📦 จำนวนกล่อง</p>
                      <p className="font-black text-2xl text-amber-600">{calculatedBoxesUsed} <span className="text-base font-bold">ใบ</span></p>
                    </div>
                    <div className="bg-sky-50 p-4 rounded-xl shadow-sm border border-sky-200 col-span-2">
                      <p className="text-sky-700 text-xs font-bold uppercase tracking-wider mb-1">💧 ซองกันชื้นที่ต้องใส่</p>
                      {result.requireDesiccant ? (
                        <p className="font-black text-2xl text-sky-600">{calculatedDesiccant} <span className="text-base font-bold">ซอง</span></p>
                      ) : (
                        <p className="font-black text-lg text-slate-400 mt-1">❌ ไม่ต้องใส่</p>
                      )}
                    </div>
                  </div>

                  <button onClick={handleSavePack} disabled={loading || !qty || qty <= 0} className={`w-full py-4 text-xl font-black text-white rounded-xl transition-all shadow-lg ${(loading || !qty || qty <= 0) ? 'bg-gray-300 cursor-not-allowed text-gray-500 shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/30 active:scale-95'}`}>
                    {loading ? 'กำลังบันทึกข้อมูล...' : '💾 บันทึกประวัติการแพ็ค'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- หน้า Dashboard --- */}
        {currentTab === 'dashboard' && currentUser?.role?.toLowerCase() === 'admin' && (
          <div className="bg-white rounded-xl shadow-lg p-6 print:shadow-none print:p-0">
            <div className="flex flex-col md:flex-row justify-between items-center border-b-2 border-gray-200 pb-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-800">📊 รายงานสรุปยอดการแพ็ค</h2>
              <div className="flex flex-wrap gap-2 mt-4 md:mt-0 print:hidden">
                <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="p-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 focus:outline-none focus:border-blue-500">
                  <option value="today">📅 สรุปยอดวันนี้</option><option value="month">📆 สรุปยอดเดือนนี้</option><option value="year">🗓️ สรุปยอดปีนี้</option><option value="custom">🔍 เลือกวันที่เอง</option><option value="all">♾️ สรุปยอดตลอดเวลา</option>
                </select>
                {timeFilter === 'custom' && <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="p-2 border-2 border-blue-400 rounded-lg font-semibold text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"/>}
                <button onClick={() => window.print()} className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-lg font-bold flex items-center transition-colors shadow-md">🖨️ พิมพ์รายงาน</button>
              </div>
            </div>

            <div className="hidden print:block mb-4 text-gray-600">
              <p><strong>รายงานประจำ:</strong> {timeFilter === 'today' ? 'วันนี้' : timeFilter === 'month' ? 'เดือนนี้' : timeFilter === 'year' ? 'ปีนี้' : (timeFilter === 'custom' && customDate) ? `วันที่ ${new Date(customDate).toLocaleDateString('th-TH')}` : 'ตลอดเวลา'}</p>
              <p><strong>พิมพ์เมื่อ:</strong> {new Date().toLocaleString('th-TH')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm print:border-2 h-full flex flex-col justify-between">
                <p className="text-blue-600 font-semibold mb-1 uppercase tracking-wider text-sm">การแพ็คทั้งหมด</p>
                <p className="text-3xl font-black text-blue-800 mt-auto">{filteredLogs.length} <span className="text-lg font-medium">ครั้ง</span></p>
              </div>
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl shadow-sm print:border-2 h-full flex flex-col justify-between">
                <p className="text-green-600 font-semibold mb-1 uppercase tracking-wider text-sm">สินค้ารวมที่แพ็ค</p>
                <p className="text-3xl font-black text-green-800 mt-auto">{filteredLogs.reduce((sum, log) => sum + log.packQty, 0)} <span className="text-lg font-medium">ชิ้น</span></p>
              </div>
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl shadow-sm print:border-2 h-full flex flex-col">
                <p className="text-orange-600 font-semibold mb-3 uppercase tracking-wider text-sm">กล่องที่ถูกใช้ไป (แยกประเภท)</p>
                <div className="flex-1 space-y-2 overflow-y-auto max-h-32 mb-3 pr-2 custom-scrollbar">
                  {Object.entries(filteredLogs.reduce((acc, log) => { const boxId = log.item?.defaultPckId || 'ไม่ระบุกล่อง'; acc[boxId] = (acc[boxId] || 0) + log.boxUsed; return acc; }, {})).map(([boxId, count]) => (
                    <div key={boxId} className="flex justify-between items-center text-sm border-b border-orange-200 pb-1"><span className="font-medium text-orange-800">📦 {boxId}</span><span className="font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">{count.toFixed(2)} ใบ</span></div>
                  ))}
                  {filteredLogs.length === 0 && <p className="text-sm text-orange-400 text-center">ไม่มีข้อมูล</p>}
                </div>
                <div className="flex justify-between items-end pt-3 border-t-2 border-orange-300 mt-auto">
                  <span className="text-orange-800 font-bold text-sm mb-1">รวมทุกประเภท:</span>
                  <p className="text-3xl font-black text-orange-800">{filteredLogs.reduce((sum, log) => sum + log.boxUsed, 0).toFixed(2)} <span className="text-lg font-medium">ใบ</span></p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr><th className="py-3 px-4 text-left font-bold text-gray-700">เวลาที่แพ็ค</th><th className="py-3 px-4 text-left font-bold text-gray-700">ผู้ทำรายการ</th><th className="py-3 px-4 text-left font-bold text-gray-700">สินค้า</th><th className="py-3 px-4 text-center font-bold text-gray-700">จำนวน (ชิ้น)</th><th className="py-3 px-4 text-center font-bold text-gray-700">กล่องที่ใช้</th><th className="py-3 px-4 text-right font-bold text-gray-700">น้ำหนักรวม (kg)</th><th className="py-3 px-4 text-center font-bold text-gray-700 print:hidden">จัดการ</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLogs.length === 0 ? (
                    <tr><td colSpan="7" className="py-8 text-center text-gray-500 font-medium bg-gray-50">ไม่พบประวัติในช่วงเวลานี้</td></tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.logId} className="hover:bg-blue-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{new Date(log.packedAt).toLocaleString('th-TH')}</td>
                        <td className="py-3 px-4"><span className="font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded-md text-sm">{log.user?.firstName || 'Unknown'}</span></td>
                        <td className="py-3 px-4"><span className="font-bold text-blue-700 text-lg">{log.itemId}</span><p className="text-xs text-gray-500">{log.item?.itemName}</p></td>
                        <td className="py-3 px-4 text-center font-black text-gray-800 text-lg">{log.packQty}</td>
                        <td className="py-3 px-4 text-center text-orange-600 font-bold">{log.boxUsed.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-green-700 font-black">{log.totalWeight.toFixed(3)}</td>
                        <td className="py-3 px-4 text-center print:hidden">
                          <button onClick={() => handleDeleteLog(log.logId)} className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1 rounded-lg text-sm font-bold transition-colors shadow-sm">🗑️ ลบ</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- หน้าจัดการแอดมิน --- */}
       {currentTab === 'admin' && currentUser?.role?.toLowerCase() === 'admin' && (
          <AdminPanel 
            currentUser={currentUser} adminSubTab={adminSubTab} setAdminSubTab={setAdminSubTab}
            items={items} boxes={boxes} users={users} 
            itemForm={itemForm} setItemForm={setItemForm}
            boxForm={boxForm} setBoxForm={setBoxForm}
            userForm={userForm} setUserForm={setUserForm}
            handleItemSubmit={handleItemSubmit} handleBoxSubmit={handleBoxSubmit} handleUserSubmit={handleUserSubmit}
            handleDeleteItem={handleDeleteItem} handleBoxDelete={handleBoxDelete} handleUserDelete={handleUserDelete}
            editingItemId={editingItemId} setEditingItemId={setEditingItemId} 
            editingBoxId={editingBoxId} setEditingBoxId={setEditingBoxId}
            editingUserId={editingUserId} setEditingUserId={setEditingUserId}
            handleFileUpload={handleFileUpload} handleBoxFileUpload={handleBoxFileUpload}
          />
        )}
        
      </div>
    </div>
  );
}

export default App;