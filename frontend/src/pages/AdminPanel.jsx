/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function AdminPanel({ currentUser, adminSubTab, setAdminSubTab, items, boxes, users, refreshAdminData }) {
  const [itemForm, setItemForm] = useState({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', requireDesiccant: false });
  const [editingItemId, setEditingItemId] = useState(null);
  
  const [boxForm, setBoxForm] = useState({ pckId: '', description: '', maxCapacity: '', currentStock: 0, minStockLevel: 0, isConsignment: false });
  const [editingBoxId, setEditingBoxId] = useState(null);

  const [userForm, setUserForm] = useState({ username: '', passwordHash: '', firstName: '', role: 'operator' });
  const [editingUserId, setEditingUserId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('id_asc');
  const [boxSearchTerm, setBoxSearchTerm] = useState('');
  const [boxSortBy, setBoxSortBy] = useState('id_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; 
  const [filterCustomer, setFilterCustomer] = useState('All');

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...itemForm, itemName: itemForm.itemName.trim() === '' ? itemForm.itemId : itemForm.itemName, updatedAt: new Date().toISOString() };
    const toastId = toast.loading('กำลังบันทึกสินค้า...');
    try {
      let error;
      if (editingItemId) { const { error: updateError } = await supabase.from('items').update(payload).eq('itemId', editingItemId); error = updateError; } 
      else { const { error: insertError } = await supabase.from('items').insert([payload]); error = insertError; }
      if (!error) { toast.success('บันทึกสินค้าเรียบร้อย', { id: toastId }); setItemForm({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', requireDesiccant: false }); setEditingItemId(null); if (refreshAdminData) refreshAdminData(); } 
      else { if (error.code === '23505' || error.message.includes('duplicate key')) { toast.error('❌ บันทึกไม่ได้: รหัสสินค้านี้มีอยู่แล้ว', { id: toastId }); } else { toast.error('บันทึกไม่สำเร็จ: ' + error.message, { id: toastId }); } }
    } catch (err) { toast.error('เกิดข้อผิดพลาดในการบันทึกสินค้า', { id: toastId }); }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('ยืนยันที่จะลบสินค้านี้ใช่หรือไม่?')) return;
    const toastId = toast.loading('กำลังลบสินค้า...');
    try { const { error } = await supabase.from('items').delete().eq('itemId', id); if (!error) { toast.success('ลบสินค้าสำเร็จ', { id: toastId }); if (refreshAdminData) refreshAdminData(); } else { toast.error('ลบไม่สำเร็จ: ' + error.message, { id: toastId }); } } catch (err) { toast.error('ลบไม่สำเร็จ ระบบขัดข้อง', { id: toastId }); }
  };

  const handleBoxSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...boxForm, updatedAt: new Date().toISOString() };
    const toastId = toast.loading('กำลังบันทึกกล่อง...');
    try {
      let error;
      if (editingBoxId) { const { error: updateError } = await supabase.from('boxes').update(payload).eq('pckId', editingBoxId); error = updateError; } 
      else { const { error: insertError } = await supabase.from('boxes').insert([payload]); error = insertError; }
      if (!error) { toast.success('บันทึกกล่องเรียบร้อย', { id: toastId }); setBoxForm({ pckId: '', description: '', maxCapacity: '', currentStock: 0, minStockLevel: 0, isConsignment: false }); setEditingBoxId(null); if (refreshAdminData) refreshAdminData(); } 
      else { if (error.code === '23505' || error.message.includes('duplicate key')) { toast.error('❌ บันทึกไม่ได้: รหัสกล่องนี้มีอยู่แล้ว', { id: toastId }); } else { toast.error('บันทึกไม่สำเร็จ: ' + error.message, { id: toastId }); } }
    } catch (err) { toast.error('เกิดข้อผิดพลาดในการบันทึกกล่อง', { id: toastId }); }
  };

  const handleBoxDelete = async (id) => {
    if (!confirm('ยืนยันที่จะลบกล่องนี้ใช่หรือไม่?')) return;
    const toastId = toast.loading('กำลังลบกล่อง...');
    try { const { error } = await supabase.from('boxes').delete().eq('pckId', id); if (!error) { toast.success('ลบกล่องสำเร็จ', { id: toastId }); if (refreshAdminData) refreshAdminData(); } else { toast.error('ลบไม่สำเร็จ: ' + error.message, { id: toastId }); } } catch (err) { toast.error('ลบไม่สำเร็จ ระบบขัดข้อง', { id: toastId }); }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!editingUserId && (!userForm.passwordHash || userForm.passwordHash.trim() === '')) { toast.error('❌ กรุณากรอกรหัสผ่านสำหรับพนักงานใหม่'); return; }
    const payload = { username: userForm.username, passwordHash: userForm.passwordHash || '', firstName: userForm.firstName, role: userForm.role, updatedAt: new Date().toISOString() };
    const toastId = toast.loading('กำลังบันทึกข้อมูลพนักงาน...');
    try {
      let res;
      if (editingUserId) { res = await fetch(`/api/users/${editingUserId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } 
      else { res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
      const data = await res.json();
      if (data.success) { toast.success(data.message, { id: toastId }); setEditingUserId(null); setUserForm({ username: '', passwordHash: '', firstName: '', role: 'operator' }); if (refreshAdminData) refreshAdminData(); } else { toast.error('บันทึกไม่สำเร็จ: ' + data.message, { id: toastId }); }
    } catch (err) { toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อกับ Backend!', { id: toastId }); }
  };

  const handleUserDelete = async (id) => {
    if (!confirm('ยืนยันที่จะระงับ/ลบพนักงานคนนี้ใช่หรือไม่?')) return;
    const toastId = toast.loading('กำลังลบข้อมูลพนักงาน...');
    try { const { error } = await supabase.from('users').delete().eq('id', id); if (!error) { toast.success('ลบพนักงานสำเร็จ', { id: toastId }); if (refreshAdminData) refreshAdminData(); } else { toast.error('ลบไม่สำเร็จ: ' + error.message, { id: toastId }); } } catch (err) { toast.error('ลบไม่สำเร็จ ระบบขัดข้อง', { id: toastId }); }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files; if (!files || files.length === 0) return; const formData = new FormData(); for (let i = 0; i < files.length; i++) { formData.append('files', files[i]); } const toastId = toast.loading('กำลังนำเข้าข้อมูลสินค้า...');
    try { const res = await fetch('/api/items/upload', { method: 'POST', body: formData }); const data = await res.json(); if (data.success) { toast.success(data.message, { id: toastId }); if (refreshAdminData) refreshAdminData(); } else { toast.error(data.message, { id: toastId }); } } catch (err) { toast.error('เกิดข้อผิดพลาด', { id: toastId }); } e.target.value = null; 
  };

  const handleBoxFileUpload = async (e) => {
    const files = e.target.files; if (!files || files.length === 0) return; const formData = new FormData(); for (let i = 0; i < files.length; i++) { formData.append('files', files[i]); } const toastId = toast.loading('กำลังนำเข้าข้อมูลกล่อง...');
    try { const res = await fetch('/api/boxes/upload', { method: 'POST', body: formData }); const data = await res.json(); if (data.success) { toast.success(data.message, { id: toastId }); if (refreshAdminData) refreshAdminData(); } else { toast.error(data.message, { id: toastId }); } } catch (err) { toast.error('เกิดข้อผิดพลาด', { id: toastId }); } e.target.value = null; 
  };

  const processedItems = (items || []).filter(item => { 
    const id = item.itemId || item.itemid; const name = item.itemName || item.itemname; const sup = item.supplier;
    if (!id) return false; const term = searchTerm.toLowerCase(); return ((id || '').toLowerCase().includes(term) || (name || '').toLowerCase().includes(term) || (sup || '').toLowerCase().includes(term)); 
  }).sort((a, b) => { 
    if (!a || !b) return 0; const idA = a.itemId || a.itemid || ''; const idB = b.itemId || b.itemid || ''; const nameA = a.itemName || a.itemname || ''; const nameB = b.itemName || b.itemname || '';
    if (sortBy === 'id_asc') return idA.localeCompare(idB); if (sortBy === 'id_desc') return idB.localeCompare(idA); if (sortBy === 'name_asc') return nameA.localeCompare(nameB); if (sortBy === 'name_desc') return nameB.localeCompare(nameA); return 0; 
  });

  const processedBoxes = (boxes || []).filter(box => { 
    const id = box.pckId || box.pckid; if (!id) return false; const term = boxSearchTerm.toLowerCase(); return ((id || '').toLowerCase().includes(term) || (box.description || '').toLowerCase().includes(term)); 
  }).sort((a, b) => { 
    if (!a || !b) return 0; const idA = a.pckId || a.pckid || ''; const idB = b.pckId || b.pckid || ''; if (boxSortBy === 'id_asc') return idA.localeCompare(idB); if (boxSortBy === 'id_desc') return idB.localeCompare(idA); return 0; 
  });

  const uniqueCustomers = ['All', ...new Set((items || []).map(item => item.supplier || '-').filter(sup => sup !== '-'))];
  const filteredByCustomer = processedItems.filter(item => { if (!item) return false; if (filterCustomer === 'All') return true; return (item.supplier || '-') === filterCustomer; });
  const totalPages = Math.ceil(filteredByCustomer.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredByCustomer.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="bg-transparent rounded-xl p-2 md:p-6">
      <div className="flex space-x-6 border-b-2 border-slate-700/50 pb-4 mb-6">
        <button onClick={() => setAdminSubTab('items')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'items' ? 'text-blue-400 border-b-4 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>🏷️ มาสเตอร์สินค้า</button>
        <button onClick={() => setAdminSubTab('boxes')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'boxes' ? 'text-blue-400 border-b-4 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>📦 มาสเตอร์กล่อง</button>
        <button onClick={() => setAdminSubTab('users')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'users' ? 'text-blue-400 border-b-4 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>👤 จัดการพนักงาน</button>
      </div>

      {/* ========================================== */}
      {/* 🏷️ แท็บที่ 1: หน้าจัดการมาสเตอร์สินค้า */}
      {/* ========================================== */}
      {adminSubTab === 'items' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="space-y-6 h-fit">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm text-slate-200">
              <h3 className="text-xl font-bold mb-4">{editingItemId ? '✏️ แก้ไขข้อมูลสินค้า' : '➕ เพิ่มสินค้าใหม่'}</h3>
              <form onSubmit={handleItemSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">รหัสสินค้า *</label><input type="text" required disabled={!!editingItemId} value={itemForm.itemId || ''} onChange={(e) => setItemForm(prev => ({ ...prev, itemId: String(e.target.value).toUpperCase() }))} className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white outline-none" /></div>
                <div><label className="block text-sm font-medium mb-1">ชื่อสินค้า (ไม่บังคับ)</label><input type="text" value={itemForm.itemName || ''} onChange={(e) => setItemForm({...itemForm, itemName: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white" /></div>
                <div><label className="block text-sm font-medium mb-1">Customer</label><input type="text" value={itemForm.supplier || ''} onChange={(e) => setItemForm({...itemForm, supplier: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white" /></div>
                <div><label className="block text-sm font-medium mb-1">น้ำหนัก (kg) *</label><input type="number" step="0.001" required value={itemForm.itemWeight || ''} onChange={(e) => setItemForm({...itemForm, itemWeight: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white" /></div>
                
                {/* 🌟 1. แก้บัคพื้นหลัง Dropdown: กล่องมาตรฐาน */}
               <div>
                  <label className="block text-sm font-medium mb-1">กล่องมาตรฐาน</label>
                  <select value={itemForm.defaultPckId || ''} onChange={(e) => setItemForm({...itemForm, defaultPckId: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white outline-none">
                    <option value="" className="bg-slate-800 text-white">-- เลือกกล่อง --</option>
                    {/* 👇 ก๊อปปี้ทับส่วนนี้: เพิ่มคำสั่ง .sort() ก่อน .map() */}
                    {[...(boxes || [])]
                      .sort((a, b) => (a.pckId || a.pckid || '').localeCompare(b.pckId || b.pckid || ''))
                      .map(b => { 
                        const id = b.pckId || b.pckid; 
                        return id ? <option key={id} value={id} className="bg-slate-800 text-white">{id}</option> : null; 
                    })}
                  </select>
                </div>

                <div className="pt-2"><label className="flex items-center space-x-2 cursor-pointer bg-slate-700/50 p-3 rounded border border-slate-600 hover:bg-slate-700 transition-colors"><input type="checkbox" checked={itemForm.requireDesiccant || false} onChange={(e) => setItemForm({...itemForm, requireDesiccant: e.target.checked})} className="w-5 h-5 text-blue-500 rounded" /><span className="text-sm font-bold text-blue-300">💧 สินค้านี้ต้องใส่ซองกันชื้น</span></label></div>
                <div className="flex space-x-2 pt-2"><button type="submit" className="flex-1 bg-green-600 text-white font-bold p-2 rounded hover:bg-green-500">💾 บันทึก</button>{editingItemId && <button type="button" onClick={() => { setEditingItemId(null); setItemForm({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', requireDesiccant: false }); }} className="bg-slate-600 text-white font-bold p-2 rounded hover:bg-slate-500">ยกเลิก</button>}</div>
              </form>
            </div>

            {!editingItemId && (
              <div className="bg-purple-900/30 p-6 rounded-xl border border-purple-500/30">
                <h3 className="text-lg font-bold text-purple-300 mb-2">📁 นำเข้าสินค้าด้วย Excel / CSV</h3>
                <div className="space-y-3">
                  <input type="file" id="items-file-input" accept=".xlsx, .xls, .csv" multiple onChange={handleFileUpload} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer" />
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-800 p-4 mb-4 rounded-xl border border-slate-700 gap-4 shadow-sm">
              <div className="w-full md:w-1/3 flex items-center bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                <span className="text-slate-400 mr-2">🔍</span>
                <input type="text" placeholder="ค้นหารหัส หรือ ชื่อ..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full outline-none text-sm text-white bg-transparent" />
                {searchTerm && <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="text-slate-400 hover:text-red-400 font-bold ml-2">✕</button>}
              </div>
              <div className="w-full md:w-2/3 flex flex-wrap md:flex-nowrap items-center justify-end gap-3 text-slate-200">
                
                {/* 🌟 2. แก้บัคพื้นหลัง Dropdown: ลูกค้า */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <label className="font-bold text-sm whitespace-nowrap">ลูกค้า:</label>
                  <select value={filterCustomer} onChange={(e) => { setFilterCustomer(e.target.value); setCurrentPage(1); }} className="p-2 w-full md:w-36 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium bg-slate-700 text-white">
                    {uniqueCustomers.map((cust, idx) => (
                      <option key={idx} value={cust} className="bg-slate-800 text-white">{cust === 'All' ? '📦 ทั้งหมด' : cust}</option>
                    ))}
                  </select>
                </div>

                {/* 🌟 3. แก้บัคพื้นหลัง Dropdown: เรียงตาม (สินค้า) */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <label className="font-bold text-sm whitespace-nowrap">เรียงตาม:</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-2 w-full md:w-36 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium bg-slate-700 text-white">
                    <option value="id_asc" className="bg-slate-800 text-white">รหัส (A-Z)</option>
                    <option value="id_desc" className="bg-slate-800 text-white">รหัส (Z-A)</option>
                    <option value="name_asc" className="bg-slate-800 text-white">ชื่อ (A-Z)</option>
                    <option value="name_desc" className="bg-slate-800 text-white">ชื่อ (Z-A)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-700 flex-1 shadow-sm">
              <table className="min-w-full bg-slate-800">
                <thead className="bg-slate-900/50 border-b border-slate-700">
                  <tr><th className="py-3 px-4 text-left text-slate-300 font-bold">รหัสสินค้า</th><th className="py-3 px-4 text-left text-slate-300 font-bold">ชื่อสินค้า</th><th className="py-3 px-4 text-left text-slate-300 font-bold">Customer</th><th className="py-3 px-4 text-left text-slate-300 font-bold">กล่องมาตรฐาน</th><th className="py-3 px-4 text-center text-slate-300 font-bold">กันชื้น</th><th className="py-3 px-4 text-center text-slate-300 font-bold">จัดการ</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {currentItems.length > 0 ? (
                    currentItems.map(item => {
                      const id = item.itemId || item.itemid;
                      const name = item.itemName || item.itemname;
                      return (
                        <tr key={id} className="hover:bg-white/10 transition-colors">
                          <td className="py-3 px-4 font-mono font-black text-blue-400">{id}</td>
                          <td className="py-3 px-4 text-sm font-bold text-gray-200">{name}</td>
                          <td className="py-3 px-4 text-gray-400 font-medium text-sm">{item.supplier || '-'}</td>
                          <td className="py-3 px-4 text-sm"><div className="font-bold text-gray-200 bg-white/10 px-2 py-1 rounded-md inline-block shadow-sm">{item.defaultPckId || '-'}</div></td>
                          <td className="py-3 px-4 text-center text-lg">{item.requireDesiccant ? '✅' : '❌'}</td>
                          <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                            <button onClick={() => { setEditingItemId(id); setItemForm({ itemId: id, itemName: name, supplier: item.supplier, itemWeight: item.itemWeight, defaultPckId: item.defaultPckId || '', requireDesiccant: item.requireDesiccant }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-md hover:bg-blue-500/40 font-bold">แก้ไข</button>
                            <button onClick={() => handleDeleteItem(id)} className="text-sm bg-red-500/20 text-red-400 px-3 py-1.5 rounded-md hover:bg-red-500/40 font-bold">ลบ</button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr><td colSpan="6" className="py-8 text-center text-slate-400 font-bold">❌ ไม่พบข้อมูลที่ตรงกับเงื่อนไข</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredByCustomer.length > 0 && (
              <div className="flex justify-between items-center mt-4 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm text-slate-300">
                <div className="text-sm font-medium">แสดงผล <span className="font-bold text-blue-400">{indexOfFirstItem + 1}</span> ถึง <span className="font-bold text-blue-400">{Math.min(indexOfLastItem, filteredByCustomer.length)}</span> จาก <span className="font-bold">{filteredByCustomer.length}</span> รายการ</div>
                <div className="flex gap-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm disabled:opacity-50 font-bold text-sm hover:bg-slate-600">⬅️ ก่อนหน้า</button>
                  <div className="px-3 py-1.5 text-sm font-bold bg-slate-700 border border-slate-600 rounded-md shadow-sm">{currentPage} / {totalPages}</div>
                  <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm disabled:opacity-50 font-bold text-sm hover:bg-slate-600">ถัดไป ➡️</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 📦 แท็บที่ 2: หน้าจัดการมาสเตอร์กล่อง */}
      {/* ========================================== */}
      {adminSubTab === 'boxes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6 h-fit">
             <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm text-slate-200">
              <h3 className="text-xl font-bold mb-4">{editingBoxId ? '✏️ แก้ไขข้อมูลกล่อง' : '➕ เพิ่มกล่องใหม่'}</h3>
              <form onSubmit={handleBoxSubmit} className="space-y-4">
                <div className="col-span-2">
                  <label className="flex items-center space-x-2 cursor-pointer bg-blue-900/30 p-3 rounded-lg border border-blue-500/30 hover:bg-blue-900/50 transition-colors">
                    <input type="checkbox" checked={boxForm.isConsignment || false} onChange={(e) => { const isChecked = e.target.checked; setBoxForm({...boxForm, isConsignment: isChecked, minStockLevel: isChecked ? 0 : boxForm.minStockLevel}); }} className="w-5 h-5 text-blue-500 rounded" />
                    <span className="text-sm font-black text-blue-300">🔄 กล่อง Consignment (ต้องใช้ตามโควต้า)</span>
                  </label>
                </div>
                <div><label className="block text-sm font-bold mb-1">รหัสกล่อง *</label><input type="text" required disabled={!!editingBoxId} value={boxForm.pckId || ''} onChange={(e) => setBoxForm(prev => ({ ...prev, pckId: String(e.target.value).toUpperCase() }))} className="w-full p-2 border border-slate-600 rounded bg-slate-700 outline-none" /></div>
                <div><label className="block text-sm font-bold mb-1">คำอธิบาย</label><input type="text" required value={boxForm.description || ''} onChange={(e) => setBoxForm({...boxForm, description: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 outline-none" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold mb-1">จุได้กี่ชิ้น</label><input type="number" required value={boxForm.maxCapacity || ''} onChange={(e) => setBoxForm({...boxForm, maxCapacity: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 outline-none" /></div>
                  <div><label className="block text-sm font-bold mb-1">สต็อกที่มี (ใบ)</label><input type="number" required value={boxForm.currentStock || 0} onChange={(e) => setBoxForm({...boxForm, currentStock: e.target.value})} className="w-full p-2 border border-slate-600 rounded outline-none font-bold bg-slate-700 text-blue-400" /></div>
                </div>
                {!boxForm.isConsignment && (
                  <div><label className="block text-sm font-bold mb-1">จุดสั่งซื้อ (Min)</label><input type="number" required value={boxForm.minStockLevel || 0} onChange={(e) => setBoxForm({...boxForm, minStockLevel: e.target.value})} className="w-full p-2 border border-slate-600 rounded outline-none font-bold bg-slate-700 text-red-400" /></div>
                )}
                <div className="flex space-x-2 pt-2">
                  <button type="submit" className="flex-1 bg-green-600 hover:bg-green-500 transition-colors text-white font-bold p-2 rounded shadow">💾 บันทึก</button>
                  {editingBoxId && <button type="button" onClick={() => { setEditingBoxId(null); setBoxForm({ pckId: '', description: '', maxCapacity: '', currentStock: 0, minStockLevel: 0, isConsignment: false }); }} className="bg-slate-600 hover:bg-slate-500 text-white font-bold p-2 rounded">ยกเลิก</button>}
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-800 p-4 mb-4 rounded-xl border border-slate-700 gap-4 shadow-sm">
              <div className="w-full md:w-1/2 flex items-center bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 shadow-sm">
                <span className="text-slate-400 mr-2">🔍</span>
                <input type="text" placeholder="ค้นหารหัสกล่อง หรือ คำอธิบาย..." value={boxSearchTerm} onChange={(e) => setBoxSearchTerm(e.target.value)} className="w-full outline-none text-sm text-white bg-transparent" />
                {boxSearchTerm && <button onClick={() => setBoxSearchTerm('')} className="text-slate-400 hover:text-red-400 font-bold ml-2">✕</button>}
              </div>

              {/* 🌟 4. แก้บัคพื้นหลัง Dropdown: เรียงตาม (กล่อง) */}
              <div className="flex items-center gap-2 w-full md:w-auto text-slate-200">
                <label className="font-bold text-sm whitespace-nowrap">เรียงตาม:</label>
                <select value={boxSortBy} onChange={(e) => setBoxSortBy(e.target.value)} className="p-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium bg-slate-700 text-white">
                  <option value="id_asc" className="bg-slate-800 text-white">รหัสกล่อง (A-Z)</option>
                  <option value="id_desc" className="bg-slate-800 text-white">รหัสกล่อง (Z-A)</option>
                  <option value="desc_asc" className="bg-slate-800 text-white">คำอธิบาย (A-Z)</option>
                  <option value="desc_desc" className="bg-slate-800 text-white">คำอธิบาย (Z-A)</option>
                </select>
              </div>

            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-700 flex-1 shadow-sm">
              <table className="min-w-full bg-slate-800">
                <thead className="bg-slate-900/50 border-b border-slate-700">
                  <tr><th className="py-3 px-4 text-left text-slate-300 font-bold">รหัสกล่อง</th><th className="py-3 px-4 text-left text-slate-300 font-bold">คำอธิบาย</th><th className="py-3 px-4 text-center text-slate-300 font-bold">สต็อกคงเหลือ</th><th className="py-3 px-4 text-center text-slate-300 font-bold">จัดการ</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {processedBoxes.length > 0 ? (
                    processedBoxes.map(box => {
                      const id = box?.pckId || box?.pckid;
                      const isLowStock = !box.isConsignment && box?.currentStock <= box?.minStockLevel;
                      return (
                        <tr key={id} className="hover:bg-white/10 transition-colors">
                          <td className="py-3 px-4 font-mono font-black text-blue-400">{id}</td>
                          <td className="py-3 px-4 text-gray-200 font-medium text-sm">{box?.description || '-'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-black text-lg ${isLowStock ? 'text-red-400' : 'text-green-400'}`}>{box?.currentStock || 0}</span>
                            {isLowStock ? ( <p className="text-xs text-red-400 font-bold animate-pulse">! ถึงจุดสั่งซื้อ ({box?.minStockLevel})</p> ) : box?.isConsignment ? ( <p className="text-xs text-blue-400 font-bold mt-1">🔄 โควต้า Consignment</p> ) : null}
                          </td>
                          <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                            <button onClick={() => { setEditingBoxId(id); setBoxForm({ pckId: id, description: box.description, maxCapacity: box.maxCapacity, currentStock: box.currentStock || 0, minStockLevel: box.minStockLevel || 0, isConsignment: box.isConsignment || false }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-md hover:bg-blue-500/40 font-bold shadow-sm">แก้ไข</button>
                            <button onClick={() => handleBoxDelete(id)} className="text-sm bg-red-500/20 text-red-400 px-3 py-1.5 rounded-md hover:bg-red-500/40 font-bold shadow-sm">ลบ</button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr><td colSpan="4" className="py-8 text-center text-slate-400 font-bold">❌ ไม่พบกล่องที่ค้นหา</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 👤 แท็บที่ 3: หน้าจัดการพนักงาน */}
      {/* ========================================== */}
      {adminSubTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6 h-fit">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm text-slate-200">
              <h3 className="text-xl font-bold mb-4">{editingUserId ? '✏️ แก้ไขข้อมูลพนักงาน' : '➕ เพิ่มพนักงานใหม่'}</h3>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">รหัสพนักงาน (Username) *</label><input type="text" required disabled={!!editingUserId} value={userForm.username || ''} onChange={(e) => setUserForm(prev => ({ ...prev, username: String(e.target.value).toUpperCase() }))} className="w-full p-2 border border-slate-600 rounded bg-slate-700 outline-none text-white" /></div>
                <div><label className="block text-sm font-medium mb-1">{editingUserId ? 'ตั้งรหัสผ่านใหม่ (ปล่อยว่างถ้าใช้รหัสเดิม)' : 'รหัสผ่าน *'}</label><input type="password" required={!editingUserId} value={userForm.passwordHash || ''} onChange={(e) => setUserForm({...userForm, passwordHash: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 outline-none text-white" /></div>
                <div><label className="block text-sm font-medium mb-1">ชื่อ-นามสกุล / ชื่อเล่น *</label><input type="text" required value={userForm.firstName || ''} onChange={(e) => setUserForm({...userForm, firstName: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 outline-none text-white" /></div>
                
                {/* 🌟 5. แก้บัคพื้นหลัง Dropdown: เลือกสิทธิ์พนักงาน */}
                <div>
                  <label className="block text-sm font-medium mb-1">ระดับสิทธิ์ (Role)</label>
                  <select value={userForm.role || 'operator'} onChange={(e) => setUserForm({...userForm, role: e.target.value})} className="w-full p-2 border border-slate-600 rounded font-bold bg-slate-700 outline-none text-white">
                    <option value="operator" className="bg-slate-800 text-white">Operator (พนักงานสแกนแพ็ค)</option>
                    <option value="admin" className="bg-slate-800 text-white">Admin (ผู้ดูแลระบบ)</option>
                  </select>
                </div>

                <div className="flex space-x-2 pt-4"><button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold p-3 rounded-lg shadow-md transition-colors">💾 บันทึกข้อมูล</button>{editingUserId && <button type="button" onClick={() => { setEditingUserId(null); setUserForm({ username: '', passwordHash: '', firstName: '', role: 'operator' }); }} className="bg-slate-600 hover:bg-slate-500 text-white font-bold p-3 rounded-lg transition-colors">ยกเลิก</button>}</div>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2 overflow-x-auto">
            <table className="min-w-full bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-slate-900/50 text-slate-300">
                <tr><th className="py-4 px-4 text-left font-bold">รหัสพนักงาน</th><th className="py-4 px-4 text-left font-bold">ชื่อ-นามสกุล</th><th className="py-4 px-4 text-center font-bold">สิทธิ์การใช้งาน</th><th className="py-4 px-4 text-center font-bold">จัดการ</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {users && users.length > 0 ? (
                  users.filter(u => u && u.username).map(u => (
                    <tr key={u?.id} className="hover:bg-white/10 transition-colors">
                      <td className="py-3 px-4 font-mono font-black text-blue-400">{u?.username}</td>
                      <td className="py-3 px-4 text-gray-200 font-bold text-sm">{u?.firstName}</td>
                      <td className="py-3 px-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-black uppercase shadow-sm ${u?.role?.toLowerCase() === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{u?.role}</span></td>
                      <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap"><button onClick={() => { setEditingUserId(u.id); setUserForm({ username: u.username, passwordHash: '', firstName: u.firstName, role: u.role?.toLowerCase() }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-md hover:bg-blue-500/40 font-bold shadow-sm">💡 แก้ไข</button>{currentUser.id !== u.id && <button onClick={() => handleUserDelete(u.id)} className="text-sm bg-red-500/20 text-red-400 px-3 py-1.5 rounded-md hover:bg-red-500/40 font-bold shadow-sm">ลบ</button>}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="py-8 text-center text-slate-400 font-bold">ไม่มีข้อมูลพนักงาน</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}