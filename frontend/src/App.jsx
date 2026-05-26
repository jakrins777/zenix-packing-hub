import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import PackingStation from './pages/PackingStation';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('zenix_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [currentTab, setCurrentTab] = useState('packing');
  const [adminSubTab, setAdminSubTab] = useState('items');

  const [barcode, setBarcode] = useState('');
  const [qty, setQty] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const [items, setItems] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [logs, setLogs] = useState([]);

  const [itemForm, setItemForm] = useState({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', requireDesiccant: false });
  const [editingItemId, setEditingItemId] = useState(null);

  const [boxForm, setBoxForm] = useState({ pckId: '', description: '', maxCapacity: '', boxWeight: '', desiccantQty: '' });
  const [editingBoxId, setEditingBoxId] = useState(null);

  const [timeFilter, setTimeFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      if (currentTab === 'admin') fetchAdminData();
      if (currentTab === 'dashboard') fetchLogsData();
    }
  }, [currentTab, currentUser]);

  const fetchAdminData = async () => {
    try {
      const resItems = await fetch('/api/items');
      const dataItems = await resItems.json();
      if (dataItems.success) setItems(dataItems.data);
      const resBoxes = await fetch('/api/boxes');
      const dataBoxes = await resBoxes.json();
      if (dataBoxes.success) setBoxes(dataBoxes.data);
    } catch (err) { console.error('โหลด Master Data ไม่สำเร็จ', err); }
  };

  const fetchLogsData = async () => {
    try {
      const resLogs = await fetch('/api/logs');
      const dataLogs = await resLogs.json();
      if (dataLogs.success) setLogs(dataLogs.data);
    } catch (err) { console.error('โหลดข้อมูล Logs ไม่สำเร็จ', err); }
  };

  const handleDeleteLog = async (id) => {
    if (!confirm('🚨 ยืนยันที่จะลบประวัติการแพ็คนี้ใช่หรือไม่?\n(ยอดรวมใน Dashboard จะถูกหักออกทันที)')) return;
    try {
      const res = await fetch(`/api/logs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchLogsData(); // รีเฟรชยอดใหม่ทันที
      } else {
        alert(data.message);
      }
    } catch (err) { alert('ลบไม่สำเร็จ ระบบขัดข้อง'); }
  };

  const handleScan = async (e) => {
    if (e.key === 'Enter' && barcode.trim() !== '') {
      setLoading(true); setError(''); setResult(null); setSaveMessage('');
      try {
        const response = await fetch(`/api/items/${barcode}`);
        const data = await response.json();
        if (data.success) { setResult(data.data); setQty(1); } 
        else { setError('❌ ไม่พบรหัสสินค้านี้ในระบบ'); }
      } catch (err) { setError('❌ ขัดข้อง: เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); } 
      finally { setLoading(false); }
    }
  };

  const handleSavePack = async () => {
    if (!result || !qty || qty <= 0) return;
    setLoading(true);
    try {
      const payload = {
        userId: currentUser.id,
        itemId: result.itemId,
        packQty: Number(qty),
        boxUsed: Number(calculatedBoxesUsed),
        totalWeight: Number(calculatedTotalWeight)
      };
      const response = await fetch('/api/pack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (data.success) {
        setSaveMessage('✅ บันทึกประวัติการแพ็คสำเร็จ!');
        setTimeout(() => { setBarcode(''); setQty(''); setResult(null); setSaveMessage(''); }, 2000);
      } else { setError('❌ บันทึกไม่สำเร็จ: ' + data.message); }
    } catch (err) { setError('❌ ขัดข้อง: ไม่สามารถบันทึกข้อมูลได้'); } 
    finally { setLoading(false); }
  };

  const calculatedTotalWeight = result && qty ? (Number(qty) * (result.itemWeight || 0)).toFixed(3) : 0;
  
  // ดักเอาไว้ว่าถ้าไม่มีกล่อง (หรือความจุเป็น 0) ให้ถือเป็น 1 ชิ้น/กล่อง ไปก่อนเพื่อไม่ให้ error หารด้วยศูนย์
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

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const url = editingItemId ? `/api/items/${editingItemId}` : '/api/items';
    const method = editingItemId ? 'PUT' : 'POST';
    
    // 🌟 ถ้ายืนยันแล้วแต่ไม่ได้กรอกชื่อสินค้า ให้เอารหัสสินค้ามาใส่แทน เพื่อกัน Database พัง
    const payload = {
      ...itemForm,
      itemName: itemForm.itemName.trim() === '' ? itemForm.itemId : itemForm.itemName
    };

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json(); alert(data.message);
      if (data.success) {
        setItemForm({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', requireDesiccant: false });
        setEditingItemId(null); fetchAdminData();
      }
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
      if (data.success) {
        setBoxForm({ pckId: '', description: '', maxCapacity: '', boxWeight: '', desiccantQty: '' });
        setEditingBoxId(null); fetchAdminData();
      }
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/items/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        fetchAdminData();
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    }
    
    e.target.value = null; 
  };

  const handleBoxFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/boxes/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) fetchAdminData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์กล่อง');
    }
    
    e.target.value = null; 
  };

  // ==========================================
  // 🖥️ UI - Render 
  // ==========================================
  if (!currentUser) return <Login onLogin={setCurrentUser} />;

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Navbar 
        user={currentUser} 
        onLogout={() => { setCurrentUser(null); localStorage.removeItem('zenix_user'); }} 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
      />

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        
        {/* --- 1. หน้าสแกนแพ็คสินค้า --- */}
        {currentTab === 'packing' && (
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-blue-600 text-white p-6 text-center">
              <h1 className="text-3xl font-bold">🚀 สแกนแพ็คสินค้า</h1>
            </div>
            <div className="p-6 md:p-8">
              <div className="mb-6">
                <label className="block text-lg font-semibold text-gray-700 mb-2">1️⃣ สแกนรหัสสินค้า (Item ID)</label>
                <input type="text" autoFocus value={barcode} onChange={(e) => setBarcode(e.target.value.toUpperCase())} onKeyDown={handleScan} placeholder="สแกนบาร์โค้ดที่นี่ แล้วกด Enter..." className="w-full text-xl p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"/>
              </div>

              {loading && !result && <p className="text-gray-500 animate-pulse text-center mb-4">กำลังค้นหาข้อมูล...</p>}
              {error && <p className="text-red-600 font-bold bg-red-100 p-4 rounded-lg text-center mb-4">{error}</p>}
              {saveMessage && <p className="text-green-700 font-bold bg-green-100 p-4 rounded-lg text-center mb-4 text-xl animate-bounce">{saveMessage}</p>}

              {result && (
                <div className="bg-gray-50 border-2 border-blue-100 rounded-xl p-6">
                  
                  {/* ชื่อสินค้า และ ช่องใส่จำนวน */}
                  <div className="flex flex-col md:flex-row justify-between items-center border-b-2 border-gray-200 pb-4 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">📦 {result.itemName}</h2>
                    <div className="mt-4 md:mt-0 flex items-center bg-white border-2 border-blue-300 rounded-lg p-2 px-4 shadow-sm">
                      <label className="font-semibold text-gray-700 mr-4">ระบุจำนวนที่แพ็ค:</label>
                      <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="w-24 text-2xl font-bold text-blue-600 text-center focus:outline-none bg-transparent"/>
                      <span className="ml-2 text-gray-500">ชิ้น</span>
                    </div>
                  </div>
                  
                  {/* 🌟 Grid ข้อมูลแบบจัดเต็มกลับมาแล้ว! 🌟 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">น้ำหนัก / ชิ้น</p>
                      <p className="font-semibold text-lg">{result.itemWeight} kg</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">กล่องที่ใช้</p>
                      <p className="font-semibold text-lg text-blue-700">{result.defaultBox?.pckId || '-'}</p>
                    </div>
                    <div className="bg-green-100 p-4 rounded-lg shadow-sm border border-green-200 col-span-2">
                      <p className="text-green-800 text-xs uppercase tracking-wider mb-1">⚖️ น้ำหนักรวม</p>
                      <p className="font-bold text-2xl text-green-700">{calculatedTotalWeight} <span className="text-base">kg</span></p>
                    </div>
                    <div className="bg-orange-100 p-4 rounded-lg shadow-sm border border-orange-200 col-span-2">
                      <p className="text-orange-800 text-xs uppercase tracking-wider mb-1">📦 จำนวนกล่อง</p>
                      <p className="font-bold text-2xl text-orange-700">{calculatedBoxesUsed} <span className="text-base">ใบ</span></p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200 col-span-2">
                      <p className="text-blue-800 text-xs uppercase tracking-wider mb-1">💧 ซองกันชื้นที่ต้องใส่</p>
                      {result.requireDesiccant ? (
                        <p className="font-bold text-2xl text-blue-700">{calculatedDesiccant} <span className="text-base">ซอง</span></p>
                      ) : (
                        <p className="font-bold text-lg text-gray-500 mt-1">❌ ไม่ต้องใส่</p>
                      )}
                    </div>
                  </div>

                  <button onClick={handleSavePack} disabled={loading || !qty || qty <= 0} className={`w-full py-4 text-xl font-bold text-white rounded-lg transition-all shadow-md ${(loading || !qty || qty <= 0) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-95'}`}>
                    {loading ? 'กำลังบันทึกข้อมูล...' : '💾 บันทึกประวัติการแพ็ค'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- 2. หน้า Dashboard รายงาน (สีสันจัดเต็ม + แยกประเภทกล่อง + มีปุ่มลบ) --- */}
        {currentTab === 'dashboard' && currentUser.role === 'admin' && (
          <div className="bg-white rounded-xl shadow-lg p-6 print:shadow-none print:p-0">
            
            <div className="flex flex-col md:flex-row justify-between items-center border-b-2 border-gray-200 pb-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-800">📊 รายงานสรุปยอดการแพ็ค</h2>
              
              <div className="flex flex-wrap gap-2 mt-4 md:mt-0 print:hidden">
                <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="p-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 focus:outline-none focus:border-blue-500">
                  <option value="today">📅 สรุปยอดวันนี้</option>
                  <option value="month">📆 สรุปยอดเดือนนี้</option>
                  <option value="year">🗓️ สรุปยอดปีนี้</option>
                  <option value="custom">🔍 เลือกวันที่เอง</option>
                  <option value="all">♾️ สรุปยอดตลอดเวลา</option>
                </select>
                {timeFilter === 'custom' && (
                  <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="p-2 border-2 border-blue-400 rounded-lg font-semibold text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                )}
                <button onClick={() => window.print()} className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-lg font-bold flex items-center transition-colors shadow-md">
                  🖨️ พิมพ์รายงาน
                </button>
              </div>
            </div>

            <div className="hidden print:block mb-4 text-gray-600">
              <p><strong>รายงานประจำ:</strong> {timeFilter === 'today' ? 'วันนี้' : timeFilter === 'month' ? 'เดือนนี้' : timeFilter === 'year' ? 'ปีนี้' : (timeFilter === 'custom' && customDate) ? `วันที่ ${new Date(customDate).toLocaleDateString('th-TH')}` : 'ตลอดเวลา'}</p>
              <p><strong>พิมพ์เมื่อ:</strong> {new Date().toLocaleString('th-TH')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* กล่องที่ 1: การแพ็คทั้งหมด */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm print:border-2 h-full flex flex-col justify-between">
                <p className="text-blue-600 font-semibold mb-1 uppercase tracking-wider text-sm">การแพ็คทั้งหมด</p>
                <p className="text-3xl font-black text-blue-800 mt-auto">{filteredLogs.length} <span className="text-lg font-medium">ครั้ง</span></p>
              </div>
              
              {/* กล่องที่ 2: สินค้ารวมที่แพ็ค */}
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl shadow-sm print:border-2 h-full flex flex-col justify-between">
                <p className="text-green-600 font-semibold mb-1 uppercase tracking-wider text-sm">สินค้ารวมที่แพ็ค</p>
                <p className="text-3xl font-black text-green-800 mt-auto">{filteredLogs.reduce((sum, log) => sum + log.packQty, 0)} <span className="text-lg font-medium">ชิ้น</span></p>
              </div>
              
              {/* 🌟 กล่องที่ 3: แยกประเภทกล่องที่ถูกใช้ไป (แก้ใหม่) */}
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl shadow-sm print:border-2 h-full flex flex-col">
                <p className="text-orange-600 font-semibold mb-3 uppercase tracking-wider text-sm">กล่องที่ถูกใช้ไป (แยกประเภท)</p>
                
                {/* ลิสต์แยกตามประเภทกล่อง */}
                <div className="flex-1 space-y-2 overflow-y-auto max-h-32 mb-3 pr-2 custom-scrollbar">
                  {Object.entries(
                    filteredLogs.reduce((acc, log) => {
                      const boxId = log.item?.defaultPckId || 'ไม่ระบุกล่อง';
                      acc[boxId] = (acc[boxId] || 0) + log.boxUsed;
                      return acc;
                    }, {})
                  ).map(([boxId, count]) => (
                    <div key={boxId} className="flex justify-between items-center text-sm border-b border-orange-200 pb-1">
                      <span className="font-medium text-orange-800">📦 {boxId}</span>
                      <span className="font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">{count.toFixed(2)} ใบ</span>
                    </div>
                  ))}
                  {filteredLogs.length === 0 && <p className="text-sm text-orange-400 text-center">ไม่มีข้อมูล</p>}
                </div>
                
                {/* ยอดรวมกล่องทั้งหมด */}
                <div className="flex justify-between items-end pt-3 border-t-2 border-orange-300 mt-auto">
                  <span className="text-orange-800 font-bold text-sm mb-1">รวมทุกประเภท:</span>
                  <p className="text-3xl font-black text-orange-800">
                    {filteredLogs.reduce((sum, log) => sum + log.boxUsed, 0).toFixed(2)} <span className="text-lg font-medium">ใบ</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4 text-left font-bold text-gray-700">เวลาที่แพ็ค</th>
                    <th className="py-3 px-4 text-left font-bold text-gray-700">ผู้ทำรายการ</th>
                    <th className="py-3 px-4 text-left font-bold text-gray-700">สินค้า</th>
                    <th className="py-3 px-4 text-center font-bold text-gray-700">จำนวน (ชิ้น)</th>
                    <th className="py-3 px-4 text-center font-bold text-gray-700">กล่องที่ใช้</th>
                    <th className="py-3 px-4 text-right font-bold text-gray-700">น้ำหนักรวม (kg)</th>
                    <th className="py-3 px-4 text-center font-bold text-gray-700 print:hidden">จัดการ</th>
                  </tr>
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
                          <button onClick={() => handleDeleteLog(log.logId)} className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1 rounded-lg text-sm font-bold transition-colors shadow-sm" title="ลบประวัตินี้">🗑️ ลบ</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {currentTab === 'admin' && currentUser.role === 'admin' && (
          <AdminPanel 
            currentUser={currentUser} adminSubTab={adminSubTab} setAdminSubTab={setAdminSubTab}
            items={items} boxes={boxes} itemForm={itemForm} setItemForm={setItemForm}
            boxForm={boxForm} setBoxForm={setBoxForm} handleItemSubmit={handleItemSubmit}
            handleBoxSubmit={handleBoxSubmit} handleDeleteItem={handleDeleteItem} handleBoxDelete={handleBoxDelete}
            editingItemId={editingItemId} setEditingItemId={setEditingItemId} editingBoxId={editingBoxId} setEditingBoxId={setEditingBoxId}
            handleFileUpload={handleFileUpload} handleBoxFileUpload={handleBoxFileUpload}
          />
        )}
        
      </div>
    </div>
  );
}

export default App;