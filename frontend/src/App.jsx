/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient'; 
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
    try {
      const savedUser = localStorage.getItem('zenix_user');
      if (!savedUser || savedUser === 'undefined') return null;
      return JSON.parse(savedUser);
    } catch (error) {
      console.error("🚨 ข้อมูลในเครื่องพัง ทำการเคลียร์ทิ้ง:", error);
      localStorage.removeItem('zenix_user'); 
      return null;
    }
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
  const [users, setUsers] = useState([]); 
  
  const [timeFilter, setTimeFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');

  // State สำหรับฟอร์มในหน้า Admin
  const [itemForm, setItemForm] = useState({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', requireDesiccant: false });
  const [editingItemId, setEditingItemId] = useState(null);
  
  const [boxForm, setBoxForm] = useState({ pckId: '', description: '', maxCapacity: '' });
  const [editingBoxId, setEditingBoxId] = useState(null);

  const [userForm, setUserForm] = useState({ username: '', password: '', firstName: '', role: 'operator' });
  const [editingUserId, setEditingUserId] = useState(null);

  const [bulkText, setBulkText] = useState('');
  const [calcResults, setCalcResults] = useState([]);
  const [boxSummary, setBoxSummary] = useState([]);

  // ==========================================
  // 🌟 ฟังก์ชันคำนวณ Bulk Calculate
  // ==========================================
  const handleBulkCalculate = () => {
    if (!bulkText.trim()) return;

    const rows = bulkText.split('\n').filter(r => r.trim());
    const results = [];
    const summaryMap = {}; 

    rows.forEach((row, index) => {
      const parts = row.trim().split(/[\t ]+/);
      let itemCode = (parts[0] || '').toUpperCase().trim().replace(/[\r\n\s]+/g, '');
      const qty = parseInt(parts[1] || 0, 10);

      if (!itemCode) return;

      const foundItem = items.find(i => i.itemId === itemCode);
      if (!foundItem) {
        results.push({ id: index, itemCode, qty, error: '❌ ไม่พบรหัสสินค้านี้' });
        return;
      }

      const foundBox = boxes.find(b => b.pckId === foundItem.defaultPckId);
      if (!foundBox) {
        results.push({ id: index, itemCode, qty, itemName: foundItem.itemName, customer: foundItem.supplier, error: '⚠️ ยังไม่ผูกกล่อง' });
        return;
      }

      const boxCap = foundBox.maxCapacity || 1;
      results.push({
        id: index, itemCode, itemName: foundItem.itemName, customer: foundItem.supplier, qty, boxType: foundBox.pckId, boxDesc: foundBox.description, boxCap
      });

      if (!summaryMap[foundBox.pckId]) {
        summaryMap[foundBox.pckId] = { boxType: foundBox.pckId, boxDesc: foundBox.description, boxCap: boxCap, totalQty: 0, itemCount: 0 };
      }
      summaryMap[foundBox.pckId].totalQty += qty;
      summaryMap[foundBox.pckId].itemCount += 1;
    });

    const summaryArray = Object.values(summaryMap).map(box => {
      const totalBoxes = Math.ceil(box.totalQty / box.boxCap);
      const remainder = box.totalQty % box.boxCap;
      const spaceLeft = remainder === 0 ? 0 : box.boxCap - remainder; 
      return { ...box, totalBoxes, remainder, spaceLeft };
    });

    setCalcResults(results);
    setBoxSummary(summaryArray); 
  };

  // ==========================================
  // 🌟 2. DATA FETCHING (เปลี่ยนเป็น Supabase)
  // ==========================================
  const fetchAdminData = useCallback(async () => {
    try {
      const { data: dataItems } = await supabase.from('items').select('*');
      if (dataItems) setItems(dataItems);
      
      const { data: dataBoxes } = await supabase.from('boxes').select('*');
      if (dataBoxes) setBoxes(dataBoxes);

      const { data: dataUsers } = await supabase.from('users').select('*');
      if (dataUsers) setUsers(dataUsers);
    } catch (err) { console.error('โหลด Master Data ไม่สำเร็จ', err); }
  }, []);

  const fetchLogsData = useCallback(async () => {
    try {
      // ใช้ Join ดึงข้อมูล user และ item มาพร้อมกัน (สมมติว่า Database มีความสัมพันธ์ Foreign Key ไว้แล้ว)
      const { data: dataLogs, error } = await supabase
        .from('logs')
        .select('*, user:users(*), item:items(*)')
        .order('packedAt', { ascending: false });
        
      if (error) throw error;
      if (dataLogs) setLogs(dataLogs);
    } catch (err) { console.error('โหลดข้อมูล Logs ไม่สำเร็จ', err); }
  }, []);

  const playSound = (type) => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    if (type === 'success') {
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(2500, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); 
      oscillator.start(audioCtx.currentTime); oscillator.stop(audioCtx.currentTime + 0.1); 
    } else if (type === 'error') {
      oscillator.type = 'square'; oscillator.frequency.setValueAtTime(300, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); oscillator.start(audioCtx.currentTime); oscillator.stop(audioCtx.currentTime + 0.3);
    }
  };

  const fetchItemData = useCallback(async (searchCode) => {
    if (!searchCode) return;
    setLoading(true); setError(''); setResult(null); setSaveMessage('');
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*, defaultBox:boxes(*)')
        .eq('itemId', searchCode)
        .single();

      if (data && !error) { 
        setResult(data); setQty(1); playSound('success'); 
      } else { 
        setError('❌ ไม่พบรหัสสินค้านี้ในระบบ'); playSound('error'); 
      }
    } catch (err) { setError('❌ ขัดข้อง: เชื่อมต่อฐานข้อมูลไม่ได้'); playSound('error'); } 
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (currentUser?.role?.toLowerCase() === 'admin') {
      if (currentTab === 'admin') fetchAdminData();
      if (currentTab === 'dashboard') fetchLogsData();
      if (currentTab === 'inventory') fetchAdminData(); // อัปเดตข้อมูลกล่องสำหรับหน้า Inventory
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
  // 4. CORE FEATURES (เปลี่ยนเป็น Supabase)
  // ==========================================
  

 
  useEffect(() => {
    if (!barcode.trim()) { setResult(null); setError(''); return; }
    const delayDebounceFn = setTimeout(() => { fetchItemData(barcode.trim()); }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [barcode]);

  const handleScan = (e) => {
    if (e.key === 'Enter' && barcode.trim() !== '') fetchItemData(barcode.trim());
  };

  const handleSavePack = async () => {
    if (!result || !qty || qty <= 0) return;
    setLoading(true);
    try {
      const payload = { userId: currentUser.id, itemId: result.itemId, packQty: Number(qty), boxUsed: Number(calculatedBoxesUsed), totalWeight: Number(calculatedTotalWeight) };
      
      const { error } = await supabase.from('logs').insert([payload]);

      if (!error) {
        setSaveMessage('✅ บันทึกประวัติการแพ็คสำเร็จ!'); playSound('success'); 
        setTimeout(() => { setBarcode(''); setQty(''); setResult(null); setSaveMessage(''); barcodeInputRef.current?.focus(); }, 1000); 
      } else { setError('❌ บันทึกไม่สำเร็จ: ' + error.message); playSound('error'); }
    } catch (err) { setError('❌ ขัดข้อง: ไม่สามารถบันทึกข้อมูลได้'); playSound('error'); } 
    finally { setLoading(false); }
  };

  const handleDeleteLog = async (id) => {
    if (!confirm('🚨 ยืนยันที่จะลบประวัติการแพ็คนี้ใช่หรือไม่?')) return;
    try {
      const { error } = await supabase.from('logs').delete().eq('logId', id); // เช็คชื่อ Primary Key ของ logs ด้วยนะครับ
      if (!error) fetchLogsData(); 
      else alert('ลบไม่สำเร็จ: ' + error.message);
    } catch (err) { alert('ลบไม่สำเร็จ ระบบขัดข้อง'); }
  };

  const handleSaveReport = async () => {
    const validItems = calcResults.filter(r => !r.error);
    if (validItems.length === 0) return alert('ไม่มีข้อมูลที่ถูกต้องให้บันทึกครับ');
    const totalBoxesUsed = validItems.reduce((sum, item) => sum + item.totalBoxes, 0);

    try {
      const { error } = await supabase.from('reports').insert([{
        operator: currentUser?.firstName || 'ไม่ระบุตัวตน',
        totalOrders: validItems.length,
        totalBoxes: totalBoxesUsed,
        data: validItems
      }]);

      if (!error) {
        alert('💾 บันทึกข้อมูลสรุปเข้า Dashboard เรียบร้อยแล้ว!');
        setCalcResults([]); setBulkText('');
      } else {
        alert('บันทึกไม่สำเร็จ: ' + error.message);
      }
    } catch (error) { alert('❌ ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้'); }
  };

  // ==========================================
  // 🌟 5. ADMIN FEATURES (เปลี่ยนเป็น Supabase)
  // ==========================================
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...itemForm, itemName: itemForm.itemName.trim() === '' ? itemForm.itemId : itemForm.itemName };
    try {
      let error;
      if (editingItemId) {
        const { error: updateError } = await supabase.from('items').update(payload).eq('itemId', editingItemId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('items').insert([payload]);
        error = insertError;
      }
      
      if (!error) { 
        alert('บันทึกสินค้าเรียบร้อย'); 
        setItemForm({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', requireDesiccant: false }); setEditingItemId(null); fetchAdminData(); 
      } else { alert('บันทึกไม่สำเร็จ: ' + error.message); }
    } catch (err) { alert('เกิดข้อผิดพลาดในการบันทึกสินค้า'); }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('ยืนยันที่จะลบสินค้านี้ใช่หรือไม่?')) return;
    try {
      const { error } = await supabase.from('items').delete().eq('itemId', id);
      if (!error) { alert('ลบสำเร็จ'); fetchAdminData(); } else { alert('ลบไม่สำเร็จ: ' + error.message); }
    } catch (err) { alert('ลบไม่สำเร็จ ระบบขัดข้อง'); }
  };

  const handleBoxSubmit = async (e) => {
    e.preventDefault();
    try {
      let error;
      if (editingBoxId) {
        const { error: updateError } = await supabase.from('boxes').update(boxForm).eq('pckId', editingBoxId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('boxes').insert([boxForm]);
        error = insertError;
      }

      if (!error) { 
        alert('บันทึกกล่องเรียบร้อย'); setBoxForm({ pckId: '', description: '', maxCapacity: '' }); setEditingBoxId(null); fetchAdminData(); 
      } else { alert('บันทึกไม่สำเร็จ: ' + error.message); }
    } catch (err) { alert('เกิดข้อผิดพลาดในการบันทึกกล่อง'); }
  };

  const handleBoxDelete = async (id) => {
    if (!confirm('ยืนยันที่จะลบกล่องนี้ใช่หรือไม่?')) return;
    try {
      const { error } = await supabase.from('boxes').delete().eq('pckId', id);
      if (!error) { alert('ลบสำเร็จ'); fetchAdminData(); } else { alert('ลบไม่สำเร็จ: ' + error.message); }
    } catch (err) { alert('ลบไม่สำเร็จ ระบบขัดข้อง'); }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      let error;
      if (editingUserId) {
        const { error: updateError } = await supabase.from('users').update(userForm).eq('id', editingUserId); // ตรวจสอบ Primary Key 'id'
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('users').insert([userForm]);
        error = insertError;
      }

      if (!error) { 
        alert('บันทึกพนักงานเรียบร้อย'); setUserForm({ username: '', password: '', firstName: '', role: 'operator' }); setEditingUserId(null); fetchAdminData(); 
      } else { alert('บันทึกไม่สำเร็จ: ' + error.message); }
    } catch (err) { alert('เกิดข้อผิดพลาดในการบันทึกพนักงาน'); }
  };

  const handleUserDelete = async (id) => {
    if (!confirm('ยืนยันที่จะระงับ/ลบพนักงานคนนี้ใช่หรือไม่?')) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (!error) { alert('ลบสำเร็จ'); fetchAdminData(); } else { alert('ลบไม่สำเร็จ: ' + error.message); }
    } catch (err) { alert('ลบไม่สำเร็จ ระบบขัดข้อง'); }
  };

  // ⚠️ ข้อควรระวัง: การอัปโหลดไฟล์ (Excel) ไม่สามารถยิงตรงเข้า Supabase ง่ายๆ ผมเลยคงรูปแบบ fetch ไปหา Backend ไว้ให้เหมือนเดิมครับ
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await fetch('/api/items/upload', { method: 'POST', body: formData });
      const data = await res.json(); alert(data.message);
      if (data.success) fetchAdminData();
    } catch (err) { alert('เกิดข้อผิดพลาด (ถ้า Backend ปิดอยู่ ฟังก์ชันนี้จะใช้งานไม่ได้ครับ)'); }
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
    } catch (err) { alert('เกิดข้อผิดพลาด (ถ้า Backend ปิดอยู่ ฟังก์ชันนี้จะใช้งานไม่ได้ครับ)'); }
    e.target.value = null; 
  };

  // ==========================================
  // 6. UI RENDER
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
        
        {/* ========================================== */}
        {/* 🚀 หน้าจอหลัก: วางแผนการแพ็ค (Bulk Calculator) */}
        {/* ========================================== */}
        {currentTab === 'packing' && (
          <div className="space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100">
              <h2 className="text-2xl font-black text-indigo-900 mb-2">📋 วางแผนจำนวนกล่องบรรจุภัณฑ์</h2>
              <p className="text-gray-500 mb-6 font-medium">ก๊อปปี้ข้อมูล <span className="text-indigo-600 font-bold">รหัสสินค้า</span> และ <span className="text-indigo-600 font-bold">จำนวน</span> จาก Excel มาวางในช่องด้านล่างได้เลย</p>
              
              <div className="space-y-4">
                <textarea 
                  rows="6"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={"ตัวอย่างรูปแบบการวางจาก Excel:\nITEM001    500\nITEM002    120"}
                  className="w-full p-4 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-mono text-sm bg-gray-50"
                ></textarea>
                
                <div className="flex gap-4">
                  <button 
                    onClick={handleBulkCalculate}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform active:scale-95 text-lg"
                  >
                    🧮 คำนวณจำนวนกล่อง
                  </button>
                  <button 
                    onClick={() => { setBulkText(''); setCalcResults([]); setBoxSummary([]); }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 px-8 rounded-xl transition-all"
                  >
                    ล้างข้อมูล
                  </button>
                </div>
              </div>
            </div>

            {/* 📦 ตารางผลลัพธ์แบบใหม่ */}
            {calcResults.length > 0 && (
              <div className="space-y-6 animate-fade-in-up">
                
                {boxSummary.length > 0 && (
                  <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl shadow-xl overflow-hidden text-white border border-indigo-800">
                    <div className="p-4 bg-black/20 font-black text-lg flex items-center gap-2">
                      <span>📦</span> สรุปการเบิกกล่องรวม (Consolidation Plan)
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {boxSummary.map((sum, idx) => (
                        <div key={idx} className="bg-white/10 rounded-xl p-4 border border-white/20">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-black text-xl text-yellow-300">{sum.boxType}</div>
                              <div className="text-xs text-indigo-200">{sum.boxDesc}</div>
                            </div>
                            <div className="bg-white/20 text-xs px-2 py-1 rounded font-bold">จุ {sum.boxCap} ชิ้น</div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-2 text-center">
                            <div>
                              <div className="text-xs text-indigo-200">ของรวม ({sum.itemCount} รายการ)</div>
                              <div className="font-bold text-lg">{sum.totalQty} ชิ้น</div>
                            </div>
                            <div>
                              <div className="text-xs text-indigo-200">ต้องเบิกกล่อง</div>
                              <div className="font-bold text-lg text-green-400">{sum.totalBoxes} ใบ</div>
                            </div>
                          </div>
                          {sum.spaceLeft > 0 && (
                            <div className="mt-3 bg-red-500/20 text-red-200 text-xs font-bold p-2 rounded-lg text-center border border-red-500/30">
                              กล่องใบสุดท้าย มีพื้นที่ว่างใส่ได้อีก {sum.spaceLeft} ชิ้น
                            </div>
                          )}
                          {sum.spaceLeft === 0 && (
                            <div className="mt-3 bg-green-500/20 text-green-200 text-xs font-bold p-2 rounded-lg text-center border border-green-500/30">
                              แพ็คพอดีกล่องเต็มทุกใบ (ไม่มีที่ว่าง)
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                  <div className="bg-gray-50 p-4 border-b border-gray-100 font-bold flex justify-between items-center text-gray-700">
                    <span>รายละเอียดสินค้าที่ต้องแพ็ค ({calcResults.length} รายการ)</span>
                    <button onClick={handleSaveReport} className="bg-green-500 hover:bg-green-400 text-white text-sm px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-2">
                      <span>💾</span> ยืนยันและบันทึกรายงาน
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-white border-b border-gray-100">
                        <tr>
                          <th className="py-3 px-4 text-left font-bold text-gray-500 text-sm">รหัสสินค้า</th>
                          <th className="py-3 px-4 text-left font-bold text-gray-500 text-sm">ชื่อสินค้า / ลูกค้า</th>
                          <th className="py-3 px-4 text-center font-bold text-gray-500 text-sm">จำนวนที่สั่ง</th>
                          <th className="py-3 px-4 text-center font-bold text-gray-500 text-sm">ชนิดกล่องที่จะถูกจับรวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {calcResults.map((res) => (
                          <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-gray-800">{res.itemCode}</td>
                            {res.error ? (
                              <td colSpan="3" className="py-3 px-4 text-red-500 font-bold bg-red-50">{res.error}</td>
                            ) : (
                              <>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-gray-700">{res.itemName}</div>
                                  <div className="text-xs text-indigo-600 font-bold">{res.customer}</div>
                                </td>
                                <td className="py-3 px-4 text-center font-black text-gray-700">{res.qty}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">{res.boxType}</span>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
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

        {/* ========================================== */}
        {/* 📊 แท็บใหม่: หน้าเช็คสต็อกกล่อง (Inventory) */}
        {/* ========================================== */}
        {currentTab === 'inventory' && (
          <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up">
            
            <div className="flex justify-between items-center mb-6 print:hidden">
              <div>
                <h2 className="text-2xl font-black text-indigo-900">📦 รายงานสต็อกบรรจุภัณฑ์</h2>
                <p className="text-gray-500 font-medium">ระบบตรวจสอบและแจ้งเตือนจุดสั่งซื้อ (Reorder Point)</p>
              </div>
              <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all flex items-center gap-2">
                <span>🖨️</span> พิมพ์รายงานสรุป (Print)
              </button>
            </div>

            <div className="hidden print:block mb-6 text-center">
              <h1 className="text-2xl font-black text-gray-900">รายงานสต็อกกล่องบรรจุภัณฑ์</h1>
              <p className="text-sm text-gray-500">วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full bg-white">
                <thead className="bg-indigo-900 text-white print:bg-gray-200 print:text-black">
                  <tr>
                    <th className="py-3 px-4 text-left font-bold border-b print:border-gray-800">รหัสกล่อง</th>
                    <th className="py-3 px-4 text-left font-bold border-b print:border-gray-800">รายละเอียด</th>
                    <th className="py-3 px-4 text-center font-bold border-b print:border-gray-800">ยอดสต็อกปัจจุบัน</th>
                    <th className="py-3 px-4 text-center font-bold border-b print:border-gray-800">จุดสั่งซื้อ (Min)</th>
                    <th className="py-3 px-4 text-center font-bold border-b print:border-gray-800">สถานะแจ้งเตือน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {boxes.map((box) => {
                    const isLowStock = box.currentStock <= box.minStockLevel;
                    return (
                      <tr key={box.pckId} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono font-bold text-gray-800">{box.pckId}</td>
                        <td className="py-3 px-4 text-gray-600">{box.description}</td>
                        <td className={`py-3 px-4 text-center font-black text-lg ${isLowStock ? 'text-red-600 print:text-black' : 'text-green-600 print:text-black'}`}>
                          {box.currentStock || 0}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-500 font-bold">{box.minStockLevel || 0}</td>
                        <td className="py-3 px-4 text-center font-bold">
                          {isLowStock ? (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs animate-pulse print:border print:border-black print:bg-white print:text-black">
                              🚨 ต้องสั่งซื้อเพิ่ม!
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs print:border print:border-black print:bg-white print:text-black">
                              ✅ สต็อกปกติ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
          </div>
        )}
        
      </div> 
    </div> 
  );
}

export default App;