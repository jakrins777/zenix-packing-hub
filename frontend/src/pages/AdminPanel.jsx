/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import BoxCodenameUpdater from './BoxCodenameUpdater';

export default function AdminPanel({ currentUser, adminSubTab, setAdminSubTab, items, boxes, users, refreshAdminData }) {
  const [itemForm, setItemForm] = useState({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', stdPackQty: 1 });
  const [editingItemId, setEditingItemId] = useState(null);

  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [bulkForm, setBulkForm] = useState({ defaultPckId: '', supplier: '' });
  

  const [boxForm, setBoxForm] = useState({ pckId: '', codename: '', description: '', maxCapacity: '', currentStock: 0 });
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
  const [filterBoxStatus, setFilterBoxStatus] = useState('All');

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...itemForm, itemName: itemForm.itemName.trim() === '' ? itemForm.itemId : itemForm.itemName, updatedAt: new Date().toISOString() };
    const toastId = toast.loading('กำลังบันทึกสินค้า...');
    try {
      let error;
      if (editingItemId) { const { error: updateError } = await supabase.from('items').update(payload).eq('itemId', editingItemId); error = updateError; } 
      else { const { error: insertError } = await supabase.from('items').insert([payload]); error = insertError; }
      if (!error) { 
        toast.success('บันทึกสินค้าเรียบร้อย', { id: toastId }); 
        setItemForm({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '',  stdPackQty: 1 }); 
        setEditingItemId(null); 
        if (refreshAdminData) refreshAdminData(); 
      } 
      else { if (error.code === '23505' || error.message.includes('duplicate key')) { toast.error('❌ บันทึกไม่ได้: รหัสสินค้านี้มีอยู่แล้ว', { id: toastId }); } else { toast.error('บันทึกไม่สำเร็จ: ' + error.message, { id: toastId }); } }
    } catch (err) { toast.error('เกิดข้อผิดพลาดในการบันทึกสินค้า', { id: toastId }); }
  };

  const handleSelectItem = (id) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllCurrentPage = () => {
    const currentPageIds = currentItems.map(item => item.itemId || item.itemid).filter(Boolean);
    const allSelected = currentPageIds.every(id => selectedItemIds.includes(id));
    
    if (allSelected) {
      setSelectedItemIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedItemIds(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const handleBulkUpdateSubmit = async (e) => {
    e.preventDefault();
    if (selectedItemIds.length === 0) return;

    const payload = {};
    if (bulkForm.supplier.trim() !== '') payload.supplier = bulkForm.supplier.trim();
    if (bulkForm.defaultPckId !== '') payload.defaultPckId = bulkForm.defaultPckId;

    if (Object.keys(payload).length === 0) {
      toast.error('⚠️ กรุณาเลือกคอลัมน์และข้อมูลที่ต้องการแก้ไขก่อนกดบันทึก');
      return;
    }

    const toastId = toast.loading(`กำลังอัปเดตสินค้าจำนวน ${selectedItemIds.length} รายการ...`);
    payload.updatedAt = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('items')
        .update(payload)
        .in('itemId', selectedItemIds);

      if (!error) {
        toast.success(`🎉 อัปเดตข้อมูลสินค้า ${selectedItemIds.length} รายการสำเร็จ!`, { id: toastId });
        setSelectedItemIds([]); 
        setBulkForm({ defaultPckId: '', supplier: '' }); 
        if (refreshAdminData) refreshAdminData();
      } else {
        toast.error('อัปเดตไม่สำเร็จ: ' + error.message, { id: toastId });
      }
    } catch (err) {
      toast.error('ระบบขัดข้องในการบันทึกข้อมูลแบบกลุ่ม', { id: toastId });
    }
  };

  const handleBulkDeleteSubmit = async () => {
    if (selectedItemIds.length === 0) return;
    if (!confirm(`🚨 คุณยืนยันที่จะลบสินค้าที่เลือกทั้งหมดจำนวน ${selectedItemIds.length} รายการใช่หรือไม่? (ไม่สามารถกู้คืนได้)`)) return;

    const toastId = toast.loading(`กำลังลบสินค้า ${selectedItemIds.length} รายการ...`);
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .in('itemId', selectedItemIds);

      if (!error) {
        toast.success('ลบข้อมูลสินค้าชุดดังกล่าวเรียบร้อย', { id: toastId });
        setSelectedItemIds([]);
        if (refreshAdminData) refreshAdminData();
      } else {
        toast.error('ลบไม่สำเร็จ: ' + error.message, { id: toastId });
      }
    } catch (err) {
      toast.error('ระบบขัดข้อง', { id: toastId });
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('ยืนยันที่จะลบสินค้านี้ใช่หรือไม่?')) return;
    const toastId = toast.loading('กำลังลบสินค้า...');
    try { const { error } = await supabase.from('items').delete().eq('itemId', id); if (!error) { toast.success('ลบสินค้าสำเร็จ', { id: toastId }); if (refreshAdminData) refreshAdminData(); } else { toast.error('ลบไม่สำเร็จ: ' + error.message, { id: toastId }); } } catch (err) { toast.error('ลบไม่สำเร็จ ระบบขัดข้อง', { id: toastId }); }
  };

  const handleBoxSubmit = async (e) => {
    e.preventDefault();
    
    // 🌟 Cleaned: ส่งเฉพาะฟิลด์ที่มีอยู่จริงในฐานข้อมูล ป้องกัน Error Schema Cache
    const payload = { 
      pckId: boxForm.pckId,
      codename: boxForm.codename,
      description: boxForm.description,
      maxCapacity: boxForm.maxCapacity,
      currentStock: boxForm.currentStock,
      updatedAt: new Date().toISOString() 
    };

    const toastId = toast.loading('กำลังบันทึกกล่อง...');
    try {
      let error;
      if (editingBoxId) { const { error: updateError } = await supabase.from('boxes').update(payload).eq('pckId', editingBoxId); error = updateError; } 
      else { const { error: insertError } = await supabase.from('boxes').insert([payload]); error = insertError; }
      if (!error) { 
        toast.success('บันทึกกล่องเรียบร้อย', { id: toastId }); 
        setBoxForm({ pckId: '', codename: '', description: '', maxCapacity: '', currentStock: 0 }); 
        setEditingBoxId(null); 
        if (refreshAdminData) refreshAdminData(); 
      } 
      else { if (error.code === '23505' || error.message.includes('duplicate key')) { toast.error('❌ บันทึกไม่ได้: รหัสกล่องนี้มีอยู่แล้ว', { id: toastId }); } else { toast.error('บันทึกไม่สำเร็จ: ' + error.message, { id: toastId }); } }
    } catch (err) { toast.error('เกิดข้อผิดพลาดในการบันทึกกล่อง', { id: toastId }); }
  };

  const handleBoxDelete = async (id) => {
    if (!confirm('ยืนยันที่จะลบกล่องนี้ใช่หรือไม่?')) return;
    const toastId = toast.loading('กำลังลบกล่อง...');
    try { const { error } = await supabase.from('boxes').delete().eq('pckId', id); if (!error) { toast.success('ลบกล่องสำเร็จ', { id: toastId }); if (refreshAdminData) refreshAdminData(); } else { toast.error('ลบไม่สำเร็จ: ' + error.message, { id: toastId }); } } catch (err) { toast.error('ลบไม่สำเร็จ ระบบขัดข้อง', { id: toastId }); }
  };

  const handleExportItems = () => {
    const headers = ["itemId", "itemName", "Customer", "itemWeight", "defaultPckId", "stdPackQty"];
    const csvRows = [
      headers.join(','), 
      ...(items || []).map(item => [
        item.itemId || '',
        `"${(item.itemName || '').replace(/"/g, '""')}"`, 
        `"${(item.supplier || '').replace(/"/g, '""')}"`,
        item.itemWeight || 0,
        item.defaultPckId || '',
        item.stdPackQty || 1
      ].join(','))
    ];
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Template_Items_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('ดาวน์โหลด Template สินค้าสำเร็จ');
  };

  const handleExportBoxes = () => {
    // 🌟 Cleaned: ถอดฟิลด์ minStockLevel และ isConsignment ออกจาก Template Export
    const headers = ["pckId", "codename", "description", "maxCapacity", "currentStock"];
    const csvRows = [
      headers.join(','), 
      ...(boxes || []).map(box => [
        box.pckId || '',
        `"${(box.codename || '').replace(/"/g, '""')}"`,
        `"${(box.description || '').replace(/"/g, '""')}"`,
        box.maxCapacity || 1,
        box.currentStock || 0
      ].join(','))
    ];
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Template_Boxes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('ดาวน์โหลด Template กล่องสำเร็จ');
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
    const id = item.itemId || item.itemid; 
    const name = item.itemName || item.itemname; 
    const sup = item.supplier;
    if (!id) return false; 
    
    const rawSearchTerm = String(searchTerm || '').toLowerCase().trim();
    if (!rawSearchTerm) return true;

    const searchWords = rawSearchTerm.split(/[\s,]+/).filter(Boolean);

    return searchWords.some(word => 
      String(id || '').toLowerCase().includes(word) || 
      String(name || '').toLowerCase().includes(word) || 
      String(sup || '').toLowerCase().includes(word)
    );
  }).sort((a, b) => { 
    if (!a || !b) return 0; 
    const idA = String(a.itemId || a.itemid || ''); 
    const idB = String(b.itemId || b.itemid || ''); 
    const nameA = String(a.itemName || a.itemname || ''); 
    const nameB = String(b.itemName || b.itemname || '');
    if (sortBy === 'id_asc') return idA.localeCompare(idB); 
    if (sortBy === 'id_desc') return idB.localeCompare(idA); 
    if (sortBy === 'name_asc') return nameA.localeCompare(nameB); 
    if (sortBy === 'name_desc') return nameB.localeCompare(nameA); 
    return 0; 
  });

  const processedBoxes = (boxes || []).filter(box => { 
    const id = box.pckId || box.pckid; if (!id) return false; 
    const term = boxSearchTerm.toLowerCase(); 
    return ((id || '').toLowerCase().includes(term) || (box.description || '').toLowerCase().includes(term) || (box.codename || '').toLowerCase().includes(term)); 
  }).sort((a, b) => { 
    if (!a || !b) return 0; const idA = String(a.pckId || a.pckid || ''); const idB = String(b.pckId || b.pckid || ''); if (boxSortBy === 'id_asc') return idA.localeCompare(idB, undefined, {numeric: true}); if (boxSortBy === 'id_desc') return idB.localeCompare(idA, undefined, {numeric: true}); return 0; 
  });

  const uniqueCustomers = ['All', ...new Set((items || []).map(item => item.supplier || '-').filter(sup => sup !== '-'))];
  
  const filteredData = processedItems.filter(item => { 
    if (!item) return false; 
    const matchCustomer = filterCustomer === 'All' ? true : (item.supplier || '-') === filterCustomer;
    let matchBoxStatus = true;
    if (filterBoxStatus === 'NoBox') {
      matchBoxStatus = !item.defaultPckId || String(item.defaultPckId).trim() === '';
    } else if (filterBoxStatus === 'HasBox') {
      matchBoxStatus = !!item.defaultPckId && String(item.defaultPckId).trim() !== '';
    }
    return matchCustomer && matchBoxStatus; 
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  
return (
    <div className="bg-transparent rounded-xl p-2 md:p-6 ">
      <div className="flex space-x-6 border-b-2 border-white/10 pb-4 mb-6 print:hidden">
        <button onClick={() => setAdminSubTab('items')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'items' ? 'text-[#00B4D8] border-b-4 border-[#00B4D8]' : 'text-[#94A3B8] hover:text-white'}`}>🏷️ มาสเตอร์สินค้า</button>
        <button onClick={() => setAdminSubTab('boxes')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'boxes' ? 'text-[#00B4D8] border-b-4 border-[#00B4D8]' : 'text-[#94A3B8] hover:text-white'}`}>📦 มาสเตอร์กล่อง</button>
        <button onClick={() => setAdminSubTab('users')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'users' ? 'text-[#00B4D8] border-b-4 border-[#00B4D8]' : 'text-[#94A3B8] hover:text-white'}`}>👤 จัดการพนักงาน</button>
      </div>

      {/* ========================================== */}
      {/* 🏷️ แท็บที่ 1: หน้าจัดการมาสเตอร์สินค้า */}
      {/* ========================================== */}
      {adminSubTab === 'items' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="space-y-6 h-fit">
            <div className="bg-[#1C2541] p-6 rounded-xl border border-white/10 shadow-sm text-white">
              <h3 className="text-xl font-bold mb-4">{editingItemId ? '✏️ แก้ไขข้อมูลสินค้า' : '➕ เพิ่มสินค้าใหม่'}</h3>
              <form onSubmit={handleItemSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">รหัสสินค้า *</label><input type="text" required disabled={!!editingItemId} value={itemForm.itemId || ''} onChange={(e) => setItemForm(prev => ({ ...prev, itemId: String(e.target.value).toUpperCase() }))} className="w-full p-2 border border-white/10 rounded bg-[#0B132B] text-white outline-none" /></div>
                <div><label className="block text-sm font-medium mb-1">ชื่อสินค้า (ไม่บังคับ)</label><input type="text" value={itemForm.itemName || ''} onChange={(e) => setItemForm({...itemForm, itemName: e.target.value})} className="w-full p-2 border border-white/10 rounded bg-[#0B132B] text-white" /></div>
                <div><label className="block text-sm font-medium mb-1">Customer</label><input type="text" value={itemForm.supplier || ''} onChange={(e) => setItemForm({...itemForm, supplier: e.target.value})} className="w-full p-2 border border-white/10 rounded bg-[#0B132B] text-white" /></div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">น้ำหนัก (kg) *</label><input type="number" step="0.001" required value={itemForm.itemWeight || ''} onChange={(e) => setItemForm({...itemForm, itemWeight: e.target.value})} className="w-full p-2 border border-white/10 rounded bg-[#0B132B] text-white" /></div>
                  <div><label className="block text-sm font-medium mb-1 text-[#00B4D8]">จำนวนจุ/กล่อง *</label><input type="number" required min="1" value={itemForm.stdPackQty || ''} onChange={(e) => setItemForm({...itemForm, stdPackQty: parseInt(e.target.value) || 1})} className="w-full p-2 border border-white/10 rounded bg-[#0B132B] text-white" /></div>
                </div>
                
               <div>
                  <label className="block text-sm font-medium mb-1">กล่องมาตรฐาน</label>
                  <select value={itemForm.defaultPckId || ''} onChange={(e) => setItemForm({...itemForm, defaultPckId: e.target.value})} className="w-full p-2 border border-white/10 rounded bg-[#0B132B] text-white outline-none">
                    <option value="" className="bg-[#1C2541] text-white">-- เลือกกล่อง --</option>
                    {[...(boxes || [])]
                      .sort((a, b) => String(a.pckId || a.pckid || '').localeCompare(String(b.pckId || b.pckid || ''), undefined, {numeric: true}))
                      .map(b => { 
                        const id = b.pckId || b.pckid; 
                        return id ? <option key={id} value={id} className="bg-[#1C2541] text-white">{id} {b.codename ? `(${b.codename})` : ''}</option> : null; 
                    })}
                  </select>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button type="submit" className="flex-1 bg-green-600 text-white font-bold p-2 rounded hover:bg-green-500">💾 บันทึก</button>
                  {editingItemId && <button type="button" onClick={() => { setEditingItemId(null); setItemForm({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '',  stdPackQty: 1 }); }} className="bg-[#94A3B8]/20 text-white font-bold p-2 rounded hover:bg-[#94A3B8]/40">ยกเลิก</button>}
                </div>
              </form>
            </div>

            {!editingItemId && (
              <div className="bg-purple-900/30 p-6 rounded-xl border border-purple-500/30">
                <h3 className="text-lg font-bold text-purple-300 mb-2">📁 นำเข้าสินค้าด้วย Excel / CSV</h3>
                <div className="space-y-3">
                  <input type="file" id="items-file-input" accept=".xlsx, .xls, .csv" multiple onChange={handleFileUpload} className="block w-full text-sm text-[#94A3B8] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer" />
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col h-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-[#1C2541] p-4 mb-4 rounded-xl border border-white/10 shadow-sm">
              <div className="lg:col-span-4 w-full flex items-center bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-[#00B4D8]">
                <span className="text-[#94A3B8] mr-2">🔍</span>
               <input type="text" placeholder="ก๊อปปี้รหัสจาก Excel มาวางตรงนี้ได้เลย..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full outline-none text-sm text-white bg-transparent" />
                {searchTerm && <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="text-[#94A3B8] hover:text-red-400 font-bold ml-2">✕</button>}
              </div>

              <div className="lg:col-span-8 flex flex-wrap items-center justify-start lg:justify-end gap-3 text-white w-full">
                <div className="flex items-center gap-2">
                  <label className="font-bold text-sm whitespace-nowrap">ลูกค้า:</label>
                  <select value={filterCustomer} onChange={(e) => { setFilterCustomer(e.target.value); setCurrentPage(1); }} className="p-2 w-auto min-w-[120px] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#00B4D8] outline-none text-sm font-medium bg-[#0B132B] text-white">
                    {uniqueCustomers.map((cust, idx) => (
                      <option key={idx} value={cust} className="bg-[#1C2541] text-white">{cust === 'All' ? '📦 ทั้งหมด' : cust}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="font-bold text-sm whitespace-nowrap">กล่อง:</label>
                  <select value={filterBoxStatus} onChange={(e) => { setFilterBoxStatus(e.target.value); setCurrentPage(1); }} className="p-2 w-auto min-w-[120px] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#00B4D8] outline-none text-sm font-medium bg-[#0B132B] text-white">
                    <option value="All" className="bg-[#1C2541] text-white">📦 ทั้งหมด</option>
                    <option value="NoBox" className="bg-[#1C2541] text-white">❌ ยังไม่มีกล่อง</option>
                    <option value="HasBox" className="bg-[#1C2541] text-white">✅ มีกล่องแล้ว</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="font-bold text-sm whitespace-nowrap">เรียงตาม:</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-2 w-auto min-w-[120px] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#00B4D8] outline-none text-sm font-medium bg-[#0B132B] text-white">
                    <option value="id_asc" className="bg-[#1C2541] text-white">รหัส (A-Z)</option>
                    <option value="id_desc" className="bg-[#1C2541] text-white">รหัส (Z-A)</option>
                    <option value="name_asc" className="bg-[#1C2541] text-white">ชื่อ (A-Z)</option>
                    <option value="name_desc" className="bg-[#1C2541] text-white">ชื่อ (Z-A)</option>
                  </select>
                </div>

                <button onClick={handleExportItems} className="bg-purple-900/40 hover:bg-purple-600 text-purple-200 font-bold py-2 px-4 rounded-lg border border-purple-500/50 transition-all flex items-center gap-2 whitespace-nowrap shadow-sm">
                  📥 โหลด Template (CSV)
                </button>
              </div>
            </div>

            {selectedItemIds.length > 0 && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 mb-4 text-white shadow-md transition-all animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">เลือกอยู่ <span className="text-xl font-black text-amber-400">{selectedItemIds.length}</span> รายการ</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">* เลือกใส่เฉพาะข้อมูลฟิลด์ที่ต้องการเปลี่ยนพร้อมกัน</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <input type="text" placeholder="เปลี่ยนชื่อลูกค้ากลุ่ม..." value={bulkForm.supplier} onChange={(e) => setBulkForm({...bulkForm, supplier: e.target.value})} className="p-1.5 border border-white/10 rounded bg-[#0B132B] text-xs text-white outline-none w-36" />
                    
                   <select value={bulkForm.defaultPckId} onChange={(e) => setBulkForm({...bulkForm, defaultPckId: e.target.value})} className="p-1.5 border border-white/10 rounded bg-[#0B132B] text-xs text-white outline-none w-auto max-w-[250px]">
                      <option value="" className="bg-[#1C2541] text-white">-- เปลี่ยนกล่องกลุ่ม --</option>
                      {[...(boxes || [])]
                        .sort((a, b) => String(a.pckId || a.pckid || '').localeCompare(String(b.pckId || b.pckid || ''), undefined, {numeric: true}))
                        .map(b => {
                          const id = b.pckId || b.pckid;
                          return id ? <option key={id} value={id} className="bg-[#1C2541] text-white">{id} {b.codename ? `(${b.codename})` : ''}</option> : null;
                      })}
                    </select>

                    <div className="flex gap-2">
                      <button onClick={handleBulkUpdateSubmit} className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2 px-3 rounded shadow transition-colors">💾 ปรับปรุงที่เลือก</button>
                      <button onClick={handleBulkDeleteSubmit} className="bg-red-900/60 hover:bg-red-600 text-red-200 font-bold text-xs py-2 px-3 rounded shadow transition-colors">🗑️ ลบที่เลือก</button>
                      <button onClick={() => setSelectedItemIds([])} className="bg-[#0B132B] hover:bg-white/10 text-white text-xs py-2 px-2 rounded">✕ ยกเลิก</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-white/10 flex-1 shadow-sm">
              <table className="min-w-full bg-[#1C2541]">
                <thead className="bg-[#0B132B]/80 border-b border-white/10">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-[#00B4D8] rounded cursor-pointer" 
                        checked={currentItems.length > 0 && currentItems.map(item => item.itemId || item.itemid).every(id => selectedItemIds.includes(id))}
                        onChange={handleSelectAllCurrentPage}
                      />
                    </th>
                    <th className="py-3 px-4 text-left text-[#94A3B8] font-bold">รหัสสินค้า</th>
                    <th className="py-3 px-4 text-left text-[#94A3B8] font-bold">ชื่อสินค้า</th>
                    <th className="py-3 px-4 text-left text-[#94A3B8] font-bold">Customer</th>
                    <th className="py-3 px-4 text-left text-[#94A3B8] font-bold">กล่องมาตรฐาน</th>
                    <th className="py-3 px-4 text-center text-[#94A3B8] font-bold">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentItems.length > 0 ? (
                    currentItems.map(item => {
                      const id = item.itemId || item.itemid;
                      const name = item.itemName || item.itemname;
                      const isChecked = selectedItemIds.includes(id);
                      return (
                        <tr key={id} className={`transition-colors ${isChecked ? 'bg-[#00B4D8]/20 hover:bg-[#00B4D8]/30' : 'hover:bg-white/5'}`}>
                          
                          <td className="py-3 px-3 text-center">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 accent-[#00B4D8] rounded cursor-pointer"
                              checked={isChecked}
                              onChange={() => handleSelectItem(id)}
                            />
                          </td>

                          <td className="py-3 px-4 font-mono font-black text-[#00B4D8]">{id}</td>
                          <td className="py-3 px-4 text-sm font-bold text-white">{name}</td>
                          <td className="py-3 px-4 text-[#94A3B8] font-medium text-sm">{item.supplier || '-'}</td>
                          <td className="py-3 px-4 text-sm">
                            <div className="font-bold text-white bg-white/10 px-2 py-1 rounded-md inline-block shadow-sm mr-2">{item.defaultPckId || '-'}</div>
                            <span className="text-xs text-[#00B4D8] font-bold bg-[#00B4D8]/20 px-2 py-1 rounded">จุ {item.stdPackQty || 1}</span>
                          </td>
                          <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                            <button onClick={() => { setEditingItemId(id); setItemForm({ itemId: id, itemName: name, supplier: item.supplier, itemWeight: item.itemWeight, defaultPckId: item.defaultPckId || '' ,stdPackQty: item.stdPackQty || 1 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-[#00B4D8]/20 text-[#00B4D8] px-3 py-1.5 rounded-md hover:bg-[#00B4D8]/40 font-bold">แก้ไข</button>
                            <button onClick={() => handleDeleteItem(id)} className="text-sm bg-red-500/20 text-red-400 px-3 py-1.5 rounded-md hover:bg-red-500/40 font-bold">ลบ</button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr><td colSpan="6" className="py-8 text-center text-[#94A3B8] font-bold">❌ ไม่พบข้อมูลที่ตรงกับเงื่อนไข</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredData.length > 0 && (
              <div className="flex justify-between items-center mt-4 bg-[#1C2541] p-4 rounded-xl border border-white/10 shadow-sm text-white">
                <div className="text-sm font-medium">แสดงผล <span className="font-bold text-[#00B4D8]">{indexOfFirstItem + 1}</span> ถึง <span className="font-bold text-[#00B4D8]">{Math.min(indexOfLastItem, filteredData.length)}</span> จาก <span className="font-bold">{filteredData.length}</span> รายการ</div>
                <div className="flex gap-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-3 py-1.5 bg-[#0B132B] border border-white/10 rounded-md shadow-sm disabled:opacity-50 font-bold text-sm hover:bg-white/10">⬅️ ก่อนหน้า</button>
                  <div className="px-3 py-1.5 text-sm font-bold bg-[#0B132B] border border-white/10 rounded-md shadow-sm">{currentPage} / {totalPages}</div>
                  <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="px-3 py-1.5 bg-[#0B132B] border border-white/10 rounded-md shadow-sm disabled:opacity-50 font-bold text-sm hover:bg-white/10">ถัดไป ➡️</button>
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
        <div className="flex flex-col space-y-8 print:hidden">
          
          <BoxCodenameUpdater 
            boxes={boxes} 
            fetchAdminData={refreshAdminData} 
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
            
            <div className="space-y-6 h-fit print:hidden">
               <div className="bg-[#1C2541] p-6 rounded-xl border border-white/10 shadow-sm text-white">
                <h3 className="text-xl font-bold mb-4">{editingBoxId ? '✏️ แก้ไขข้อมูลกล่อง' : '➕ เพิ่มกล่องใหม่'}</h3>
                <form onSubmit={handleBoxSubmit} className="space-y-4">
                  <div><label className="block text-sm font-bold mb-1">รหัสกล่อง *</label><input type="text" required disabled={!!editingBoxId} value={boxForm.pckId || ''} onChange={(e) => setBoxForm(prev => ({ ...prev, pckId: String(e.target.value).toUpperCase() }))} className="w-full p-2 border border-white/10 rounded bg-[#0B132B] outline-none text-white" /></div>
                  
                  <div>
                    <label className="block text-sm font-bold mb-1 text-[#00B4D8]">ชื่อเรียกหน้างาน (Codename)</label>
                    <input 
                      type="text" 
                      value={boxForm.codename || ''} 
                      onChange={(e) => setBoxForm({...boxForm, codename: e.target.value})} 
                      className="w-full p-2 border border-white/10 rounded bg-[#0B132B] outline-none text-white focus:border-[#00B4D8] focus:ring-1 focus:ring-[#00B4D8]" 
                      placeholder="เช่น D2P ใหญ่" 
                    />
                  </div>

                  <div><label className="block text-sm font-bold mb-1">คำอธิบาย / ขนาด</label><input type="text" required value={boxForm.description || ''} onChange={(e) => setBoxForm({...boxForm, description: e.target.value})} className="w-full p-2 border border-white/10 rounded bg-[#0B132B] outline-none text-white" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold mb-1">จุได้กี่ชิ้น</label><input type="number" required value={boxForm.maxCapacity || ''} onChange={(e) => setBoxForm({...boxForm, maxCapacity: e.target.value})} className="w-full p-2 border border-white/10 rounded bg-[#0B132B] outline-none text-white" /></div>
                    <div><label className="block text-sm font-bold mb-1">สต็อกที่มี (ใบ)</label><input type="number" required value={boxForm.currentStock || 0} onChange={(e) => setBoxForm({...boxForm, currentStock: e.target.value})} className="w-full p-2 border border-white/10 rounded outline-none font-bold bg-[#0B132B] text-[#00B4D8]" /></div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button type="submit" className="flex-1 bg-green-600 hover:bg-green-500 transition-colors text-white font-bold p-2 rounded shadow">💾 บันทึก</button>
                    {editingBoxId && <button type="button" onClick={() => { setEditingBoxId(null); setBoxForm({ pckId: '', codename: '', description: '', maxCapacity: '', currentStock: 0 }); }} className="bg-[#94A3B8]/20 hover:bg-[#94A3B8]/40 text-white font-bold p-2 rounded">ยกเลิก</button>}
                  </div>
                </form>
              </div>

              {!editingBoxId && (
                <div className="bg-emerald-900/30 p-6 rounded-xl border border-emerald-500/30">
                  <h3 className="text-lg font-bold text-emerald-300 mb-2">📥 นำเข้า/อัปเดตสต็อกด้วย Excel</h3>
                  <div className="space-y-3">
                    <input type="file" accept=".xlsx, .xls, .csv" multiple onChange={handleBoxFileUpload} className="block w-full text-sm text-[#94A3B8] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer" />
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 flex flex-col h-full print:block print:h-auto print:w-full">
              
              <style type="text/css" media="print">
                {`
                  @page { size: A4 portrait; margin: 10mm; }
                  html, body, #root { height: auto !important; min-height: auto !important; overflow: visible !important; background: white !important; }
                  .flex-1, .h-full, .min-h-screen { flex: none !important; height: auto !important; min-height: auto !important; }
                  table { width: 100% !important; font-size: 13px !important; border-collapse: collapse !important; }
                  th, td { padding: 6px 8px !important; border-bottom: 1px solid #ddd !important; }
                  thead { display: table-header-group !important; }
                  tr { page-break-inside: avoid !important; page-break-after: auto !important; }
                `}
              </style>

              <div className="hidden print:block mb-8 text-center text-black pt-4">
                <h1 className="text-3xl font-black mb-2">รายงานสต็อกกล่องบรรจุภัณฑ์ (Box Inventory)</h1>
                <p className="text-gray-600 font-medium">วันที่อัปเดตข้อมูล: {new Date().toLocaleDateString('th-TH')} เวลา {new Date().toLocaleTimeString('th-TH')}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-[#1C2541] p-4 mb-4 rounded-xl border border-white/10 shadow-sm print:hidden">
                <div className="lg:col-span-5 w-full flex items-center bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-[#00B4D8] shadow-sm">
                  <span className="text-[#94A3B8] mr-2">🔍</span>
                  <input type="text" placeholder="ค้นหารหัสกล่อง หรือ คำอธิบาย..." value={boxSearchTerm} onChange={(e) => setBoxSearchTerm(e.target.value)} className="w-full outline-none text-sm text-white bg-transparent" />
                  {boxSearchTerm && <button onClick={() => setBoxSearchTerm('')} className="text-[#94A3B8] hover:text-red-400 font-bold ml-2">✕</button>}
                </div>

                <div className="lg:col-span-7 flex flex-wrap items-center justify-start lg:justify-end gap-3 w-full text-white">
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-sm whitespace-nowrap">เรียงตาม:</label>
                    <select value={boxSortBy} onChange={(e) => setBoxSortBy(e.target.value)} className="p-2 w-auto min-w-[140px] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#00B4D8] outline-none text-sm font-medium bg-[#0B132B] text-white">
                      <option value="id_asc" className="bg-[#1C2541] text-white">รหัสกล่อง (A-Z)</option>
                      <option value="id_desc" className="bg-[#1C2541] text-white">รหัสกล่อง (Z-A)</option>
                      <option value="desc_asc" className="bg-[#1C2541] text-white">คำอธิบาย (A-Z)</option>
                      <option value="desc_desc" className="bg-[#1C2541] text-white">คำอธิบาย (Z-A)</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button onClick={() => window.print()} className="bg-[#00B4D8] hover:bg-[#0096B4] text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all flex items-center gap-2 whitespace-nowrap">
                      🖨️ พิมพ์สต็อก
                    </button>
                    <button onClick={handleExportBoxes} className="bg-emerald-900/40 hover:bg-emerald-600 text-emerald-200 font-bold py-2 px-4 rounded-lg border border-emerald-500/50 transition-all flex items-center gap-2 whitespace-nowrap shadow-sm">
                      📥 โหลด Template (CSV)
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-white/10 flex-1 shadow-sm print:overflow-visible print:border-gray-400 print:shadow-none print:block">
                <table className="min-w-full bg-[#1C2541] print:bg-white print:text-black">
                  <thead className="bg-[#0B132B]/80 border-b border-white/10 print:bg-gray-200 print:border-gray-400">
                    <tr>
                      <th className="py-3 px-4 text-left text-[#94A3B8] print:text-black font-bold border-r border-transparent print:border-gray-300">รหัสกล่อง</th>
                      <th className="py-3 px-4 text-left text-[#94A3B8] print:text-black font-bold border-r border-transparent print:border-gray-300">คำอธิบาย / ขนาด</th>
                      <th className="py-3 px-4 text-center text-[#94A3B8] print:text-black font-bold border-r border-transparent print:border-gray-300">สต็อกคงเหลือ</th>
                      <th className="py-3 px-4 text-center text-[#94A3B8] print:hidden font-bold">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-gray-300">
                    {processedBoxes.length > 0 ? (
                      processedBoxes.map(box => {
                        const id = box?.pckId || box?.pckid;
                        return (
                          <tr key={id} className="hover:bg-white/5 print:hover:bg-transparent transition-colors print:break-inside-avoid">
                            <td className="py-3 px-4 font-mono font-black text-[#00B4D8] print:text-black border-r border-transparent print:border-gray-300">{id}</td>
                            <td className="py-3 px-4 text-white print:text-black font-medium text-sm border-r border-transparent print:border-gray-300">
                              {box?.description || '-'}
                              {box?.codename && <div className="text-xs text-[#00B4D8] font-bold mt-1">🏷️ ชื่อเรียก: {box.codename}</div>}
                            </td>
                            <td className="py-3 px-4 text-center border-r border-transparent print:border-gray-300">
                              <span className="font-black text-lg text-[#00B4D8] print:text-black">{box?.currentStock || 0}</span>
                              <p className="text-xs text-[#94A3B8] print:text-gray-500 font-bold mt-0.5">🔄 กล่องบรรจุภัณฑ์</p>
                            </td>
                            <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap print:hidden">
                              <button onClick={() => { setEditingBoxId(id); setBoxForm({ pckId: id, codename: box.codename || '', description: box.description, maxCapacity: box.maxCapacity, currentStock: box.currentStock || 0 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-[#00B4D8]/20 text-[#00B4D8] px-3 py-1.5 rounded-md hover:bg-[#00B4D8]/40 font-bold shadow-sm">แก้ไข</button>
                              <button onClick={() => handleBoxDelete(id)} className="text-sm bg-red-500/20 text-red-400 px-3 py-1.5 rounded-md hover:bg-red-500/40 font-bold shadow-sm">ลบ</button>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr><td colSpan="4" className="py-8 text-center text-[#94A3B8] font-bold">❌ ไม่พบกล่องที่ค้นหา</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
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
            <div className="bg-[#1C2541] p-6 rounded-xl border border-white/10 shadow-sm text-white">
              <h3 className="text-xl font-bold mb-4">{editingUserId ? '✏️ แก้ไขข้อมูลพนักงาน' : '➕ เพิ่มพนักงานใหม่'}</h3>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">รหัสพนักงาน (Username) *</label><input type="text" required disabled={!!editingUserId} value={userForm.username || ''} onChange={(e) => setUserForm(prev => ({ ...prev, username: String(e.target.value).toUpperCase() }))} className="w-full p-2 border border-white/10 rounded bg-[#0B132B] outline-none text-white" /></div>
                <div><label className="block text-sm font-medium mb-1">{editingUserId ? 'ตั้งรหัสผ่านใหม่ (ปล่อยว่างถ้าใช้รหัสเดิม)' : 'รหัสผ่าน *'}</label><input type="password" required={!editingUserId} value={userForm.passwordHash || ''} onChange={(e) => setUserForm({...userForm, passwordHash: e.target.value})} className="w-full p-2 border border-white/10 rounded bg-[#0B132B] outline-none text-white" /></div>
                <div><label className="block text-sm font-medium mb-1">ชื่อ-นามสกุล / ชื่อเล่น *</label><input type="text" required value={userForm.firstName || ''} onChange={(e) => setUserForm({...userForm, firstName: e.target.value})} className="w-full p-2 border border-white/10 rounded bg-[#0B132B] outline-none text-white" /></div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">ระดับสิทธิ์ (Role)</label>
                  <select value={userForm.role || 'operator'} onChange={(e) => setUserForm({...userForm, role: e.target.value})} className="w-full p-2 border border-white/10 rounded font-bold bg-[#0B132B] outline-none text-white">
                    <option value="operator" className="bg-[#1C2541] text-white">Operator (พนักงานสแกนแพ็ค)</option>
                    <option value="admin" className="bg-[#1C2541] text-white">Admin (ผู้ดูแลระบบ)</option>
                  </select>
                </div>

                <div className="flex space-x-2 pt-4"><button type="submit" className="flex-1 bg-[#00B4D8] hover:bg-[#0096B4] text-white font-bold p-3 rounded-lg shadow-md transition-colors">💾 บันทึกข้อมูล</button>{editingUserId && <button type="button" onClick={() => { setEditingUserId(null); setUserForm({ username: '', passwordHash: '', firstName: '', role: 'operator' }); }} className="bg-[#94A3B8]/20 hover:bg-[#94A3B8]/40 text-white font-bold p-3 rounded-lg transition-colors">ยกเลิก</button>}</div>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2 overflow-x-auto">
            <table className="min-w-full bg-[#1C2541] border border-white/10 rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-[#0B132B]/80 text-[#94A3B8]">
                <tr><th className="py-4 px-4 text-left font-bold">รหัสพนักงาน</th><th className="py-4 px-4 text-left font-bold">ชื่อ-นามสกุล</th><th className="py-4 px-4 text-center font-bold">สิทธิ์การใช้งาน</th><th className="py-4 px-4 text-center font-bold">จัดการ</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users && users.length > 0 ? (
                  users.filter(u => u && u.username).map(u => (
                    <tr key={u?.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-mono font-black text-[#00B4D8]">{u?.username}</td>
                      <td className="py-3 px-4 text-white font-bold text-sm">{u?.firstName}</td>
                      <td className="py-3 px-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-black uppercase shadow-sm ${u?.role?.toLowerCase() === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{u?.role}</span></td>
                      <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap"><button onClick={() => { setEditingUserId(u.id); setUserForm({ username: u.username, passwordHash: '', firstName: u.firstName, role: u.role?.toLowerCase() }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-[#00B4D8]/20 text-[#00B4D8] px-3 py-1.5 rounded-md hover:bg-[#00B4D8]/40 font-bold shadow-sm">💡 แก้ไข</button>{currentUser.id !== u.id && <button onClick={() => handleUserDelete(u.id)} className="text-sm bg-red-500/20 text-red-400 px-3 py-1.5 rounded-md hover:bg-red-500/40 font-bold shadow-sm">ลบ</button>}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="py-8 text-center text-[#94A3B8] font-bold">ไม่มีข้อมูลพนักงาน</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}