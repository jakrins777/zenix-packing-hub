import { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function AdminPanel({ 
  currentUser, adminSubTab, setAdminSubTab, items, boxes, users, refreshAdminData
}) {
  // ==========================================
  // 🌟 INTERNAL STATES FOR FORMS
  // ==========================================
  const [itemForm, setItemForm] = useState({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', requireDesiccant: false });
  const [editingItemId, setEditingItemId] = useState(null);
  
  const [boxForm, setBoxForm] = useState({ pckId: '', description: '', maxCapacity: '', currentStock: 0, minStockLevel: 0 });
  const [editingBoxId, setEditingBoxId] = useState(null);

  const [userForm, setUserForm] = useState({ username: '', passwordHash: '', firstName: '', role: 'operator' });
  const [editingUserId, setEditingUserId] = useState(null);

  // ตาราง Filter และจัดหน้า
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('id_asc');
  const [boxSearchTerm, setBoxSearchTerm] = useState('');
  const [boxSortBy, setBoxSortBy] = useState('id_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; 
  const [filterCustomer, setFilterCustomer] = useState('All');
  const [selectedItemsFiles, setSelectedItemsFiles] = useState(null);
  const [selectedBoxesFiles, setSelectedBoxesFiles] = useState(null);

  // ==========================================
  // 🌟 INTERNAL SUBMIT & DELETE HANDLERS
  // ==========================================
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...itemForm, itemName: itemForm.itemName.trim() === '' ? itemForm.itemId : itemForm.itemName };
    const toastId = toast.loading('กำลังบันทึกสินค้า...');
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
        toast.success('บันทึกสินค้าเรียบร้อย', { id: toastId });
        setItemForm({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', requireDesiccant: false }); 
        setEditingItemId(null); 
        if (refreshAdminData) refreshAdminData(); 
      } else { 
        toast.error('บันทึกไม่สำเร็จ: ' + error.message, { id: toastId }); 
      }
    } catch (err) { toast.error('เกิดข้อผิดพลาดในการบันทึกสินค้า', { id: toastId }); }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('ยืนยันที่จะลบสินค้านี้ใช่หรือไม่?')) return;
    const toastId = toast.loading('กำลังลบสินค้า...');
    try {
      const { error } = await supabase.from('items').delete().eq('itemId', id);
      if (!error) { 
        toast.success('ลบสินค้าสำเร็จ', { id: toastId });
        if (refreshAdminData) refreshAdminData(); 
      } else { toast.error('ลบไม่สำเร็จ: ' + error.message, { id: toastId }); }
    } catch (err) { toast.error('ลบไม่สำเร็จ ระบบขัดข้อง', { id: toastId }); }
  };

  const handleBoxSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('กำลังบันทึกกล่อง...');
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
        toast.success('บันทึกกล่องเรียบร้อย', { id: toastId });
        setBoxForm({ pckId: '', description: '', maxCapacity: '', currentStock: 0, minStockLevel: 0 }); 
        setEditingBoxId(null); 
        if (refreshAdminData) refreshAdminData(); 
      } else { toast.error('บันทึกไม่สำเร็จ: ' + error.message, { id: toastId }); }
    } catch (err) { toast.error('เกิดข้อผิดพลาดในการบันทึกกล่อง', { id: toastId }); }
  };

  const handleBoxDelete = async (id) => {
    if (!confirm('ยืนยันที่จะลบกล่องนี้ใช่หรือไม่?')) return;
    const toastId = toast.loading('กำลังลบกล่อง...');
    try {
      const { error } = await supabase.from('boxes').delete().eq('pckId', id);
      if (!error) { 
        toast.success('ลบกล่องสำเร็จ', { id: toastId });
        if (refreshAdminData) refreshAdminData(); 
      } else { toast.error('ลบไม่สำเร็จ: ' + error.message, { id: toastId }); }
    } catch (err) { toast.error('ลบไม่สำเร็จ ระบบขัดข้อง', { id: toastId }); }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!editingUserId && (!userForm.passwordHash || userForm.passwordHash.trim() === '')) {
      toast.error('❌ กรุณากรอกรหัสผ่านสำหรับพนักงานใหม่');
      return;
    }
    const payload = {
      username: userForm.username,
      passwordHash: userForm.passwordHash || '',  
      firstName: userForm.firstName, 
      role: userForm.role
    };
    const toastId = toast.loading('กำลังบันทึกข้อมูลพนักงาน...');
    try {
      let res;
      if (editingUserId) {
        res = await fetch(`/api/users/${editingUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      const data = await res.json();
      if (data.success) {
        toast.success(data.message, { id: toastId });
        setEditingUserId(null);
        setUserForm({ username: '', passwordHash: '', firstName: '', role: 'operator' }); 
        if (refreshAdminData) refreshAdminData(); 
      } else { toast.error('บันทึกไม่สำเร็จ: ' + data.message, { id: toastId }); }
    } catch (err) { toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อกับ Backend!', { id: toastId }); }
  };

  const handleUserDelete = async (id) => {
    if (!confirm('ยืนยันที่จะระงับ/ลบพนักงานคนนี้ใช่หรือไม่?')) return;
    const toastId = toast.loading('กำลังลบข้อมูลพนักงาน...');
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (!error) { 
        toast.success('ลบพนักงานสำเร็จ', { id: toastId });
        if (refreshAdminData) refreshAdminData(); 
      } else { toast.error('ลบไม่สำเร็จ: ' + error.message, { id: toastId }); }
    } catch (err) { toast.error('ลบไม่สำเร็จ ระบบขัดข้อง', { id: toastId }); }
  };

  // Excel Bulk Uploads
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const formData = new FormData(); 
    for (let i = 0; i < files.length; i++) { formData.append('files', files[i]); }
    const toastId = toast.loading('กำลังนำเข้าข้อมูลสินค้า...');
    try {
      const res = await fetch('/api/items/upload', { method: 'POST', body: formData });
      const data = await res.json(); 
      if (data.success) {
        toast.success(data.message, { id: toastId });
        if (refreshAdminData) refreshAdminData();
      } else { toast.error(data.message, { id: toastId }); }
    } catch (err) { toast.error('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อ Backend ได้', { id: toastId }); }
    e.target.value = null; 
  };

  const handleBoxFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const formData = new FormData(); 
    for (let i = 0; i < files.length; i++) { formData.append('files', files[i]); }
    const toastId = toast.loading('กำลังนำเข้าข้อมูลกล่อง...');
    try {
      const res = await fetch('/api/boxes/upload', { method: 'POST', body: formData });
      const data = await res.json(); 
      if (data.success) {
        toast.success(data.message, { id: toastId });
        if (refreshAdminData) refreshAdminData();
      } else { toast.error(data.message, { id: toastId }); }
    } catch (err) { toast.error('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อ Backend ได้', { id: toastId }); }
    e.target.value = null; 
  };

  // ==========================================
  // 🌟 DATA FILTERING & PROCESSING (เพิ่มการเช็ค Safe-guard)
  // ==========================================
  const processedItems = (items || [])
    .filter(item => {
      // 🌟 ดักจับความปลอดภัย: ถ้าไอเทมไม่มีจริง หรือไม่มีรหัสสินค้า ให้ปัดตกไปเลยเพื่อไม่ให้แอปแครช
      if (!item || !item.itemId) return false;
      
      const term = searchTerm.toLowerCase();
      return (
        (item.itemId || '').toLowerCase().includes(term) ||
        (item.itemName || '').toLowerCase().includes(term) ||
        (item.supplier || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (!a || !b) return 0;
      if (sortBy === 'id_asc') return (a.itemId || '').localeCompare(b.itemId || '');
      if (sortBy === 'id_desc') return (b.itemId || '').localeCompare(a.itemId || '');
      if (sortBy === 'name_asc') return (a.itemName || '').localeCompare(b.itemName || '');
      if (sortBy === 'name_desc') return (b.itemName || '').localeCompare(a.itemName || '');
      if (sortBy === 'supplier_asc') return (a.supplier || '').localeCompare(b.supplier || '');
      if (sortBy === 'supplier_desc') return (b.supplier || '').localeCompare(a.supplier || '');
      return 0;
    });

  const processedBoxes = (boxes || [])
    .filter(box => {
      // 🌟 ดักจับความปลอดภัยของฝั่งตารางกล่อง
      if (!box || !box.pckId) return false;
      
      const term = boxSearchTerm.toLowerCase();
      return (
        (box.pckId || '').toLowerCase().includes(term) ||
        (box.description || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (!a || !b) return 0;
      if (boxSortBy === 'id_asc') return (a.pckId || '').localeCompare(b.pckId || '');
      if (boxSortBy === 'id_desc') return (b.pckId || '').localeCompare(a.pckId || '');
      if (boxSortBy === 'desc_asc') return (a.description || '').localeCompare(b.description || '');
      if (boxSortBy === 'desc_desc') return (b.description || '').localeCompare(a.description || '');
      if (boxSortBy === 'cap_desc') return Number(a.maxCapacity || 0) - Number(b.maxCapacity || 0);
      if (boxSortBy === 'cap_asc') return Number(b.maxCapacity || 0) - Number(a.maxCapacity || 0);
      return 0;
    });

  const boxMap = Object.fromEntries((boxes || []).filter(b => b && b.pckId).map(box => [box.pckId, box]));
  const uniqueCustomers = ['All', ...new Set((items || []).filter(i => i && i.supplier).map(item => item.supplier || '-'))];

  const filteredByCustomer = processedItems.filter(item => {
    if (!item) return false;
    if (filterCustomer === 'All') return true;
    return (item.supplier || '-') === filterCustomer;
  });

  const totalPages = Math.ceil(filteredByCustomer.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredByCustomer.slice(indexOfFirstItem, indexOfLastItem);

  const handleFilterChange = (e) => {
    setFilterCustomer(e.target.value);
    setCurrentPage(1); 
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      
      {/* แท็บสลับหน้าหลัก */}
      <div className="flex space-x-6 border-b-2 border-gray-200 pb-4 mb-6">
        <button onClick={() => setAdminSubTab('items')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'items' ? 'text-indigo-600 border-b-4 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>🏷️ มาสเตอร์สินค้า</button>
        <button onClick={() => setAdminSubTab('boxes')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'boxes' ? 'text-indigo-600 border-b-4 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>📦 มาสเตอร์กล่อง</button>
        <button onClick={() => setAdminSubTab('users')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'users' ? 'text-indigo-600 border-b-4 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>👤 จัดการพนักงาน</button>
      </div>

      {/* ========================================== */}
      {/* 🏷️ แท็บที่ 1: หน้าจัดการมาสเตอร์สินค้า */}
      {/* ========================================== */}
      {adminSubTab === 'items' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6 h-fit">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">{editingItemId ? '✏️ แก้ไขข้อมูลสินค้า' : '➕ เพิ่มสินค้าใหม่'}</h3>
              <form onSubmit={handleItemSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">รหัสสินค้า *</label>
                  <input 
                    type="text" required disabled={!!editingItemId} value={itemForm.itemId || ''} 
                    onChange={(e) => setItemForm(prev => ({ ...prev, itemId: String(e.target.value).toUpperCase() }))} 
                    className="w-full p-2 border rounded bg-white text-gray-900 outline-none" 
                  />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า (ไม่บังคับ)</label><input type="text" value={itemForm.itemName || ''} onChange={(e) => setItemForm({...itemForm, itemName: e.target.value})} className="w-full p-2 border rounded bg-white text-gray-900" placeholder="เว้นว่างได้" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Customer</label><input type="text" value={itemForm.supplier || ''} onChange={(e) => setItemForm({...itemForm, supplier: e.target.value})} className="w-full p-2 border rounded bg-white text-gray-900" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">น้ำหนัก (kg) *</label><input type="number" step="0.001" required value={itemForm.itemWeight || ''} onChange={(e) => setItemForm({...itemForm, itemWeight: e.target.value})} className="w-full p-2 border rounded bg-white text-gray-900" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">กล่องมาตรฐาน</label>
                  <select 
                    value={itemForm.defaultPckId || ''} 
                    onChange={(e) => setItemForm({...itemForm, defaultPckId: e.target.value})} 
                    className="w-full p-2 border rounded bg-white text-gray-900 outline-none"
                  >
                    <option value="" className="bg-white text-gray-900">-- เลือกกล่อง --</option>
                    {(boxes || []).filter(b => b && b.pckId).map(b => <option key={b.pckId} value={b.pckId} className="bg-white text-gray-900">{b.pckId}</option>)}
                  </select>
                </div>
                <div className="pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer bg-blue-50 p-3 rounded border border-blue-100 hover:bg-blue-100 transition-colors">
                    <input type="checkbox" checked={itemForm.requireDesiccant || false} onChange={(e) => setItemForm({...itemForm, requireDesiccant: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded" />
                    <span className="text-sm font-bold text-indigo-800">💧 สินค้านี้ต้องใส่ซองกันชื้น</span>
                  </label>
                </div>
                <div className="flex space-x-2 pt-2">
                  <button type="submit" className="flex-1 bg-green-600 text-white font-bold p-2 rounded hover:bg-green-700">💾 บันทึก</button>
                  {editingItemId && <button type="button" onClick={() => { setEditingItemId(null); setItemForm({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', requireDesiccant: false }); }} className="bg-gray-400 text-white font-bold p-2 rounded">ยกเลิก</button>}
                </div>
              </form>
            </div>

            {!editingItemId && (
              <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                <h3 className="text-lg font-bold text-purple-800 mb-2">📁 นำเข้าสินค้าด้วย Excel / CSV</h3>
                <p className="text-xs text-purple-600 mb-4">รองรับไฟล์ Export จาก <strong>Infor CSI</strong> คอลัมน์ที่ระบบอ่าน: <br/><span className="font-mono bg-purple-100 px-1 rounded">Item</span>, <span className="font-mono bg-purple-100 px-1 rounded ml-1">Description</span>, <span className="font-mono bg-purple-100 px-1 rounded ml-1">Unit Weight</span></p>
                <div className="space-y-3">
                  <input type="file" id="items-file-input" accept=".xlsx, .xls, .csv" multiple onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer" />
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-between items-center bg-gray-50 p-4 mb-4 rounded-xl border border-gray-200 gap-4">
              <div className="w-full md:w-1/3 flex items-center bg-white border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 shadow-sm">
                <span className="text-gray-400 mr-2">🔍</span>
                <input type="text" placeholder="ค้นหารหัส หรือ ชื่อ..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full outline-none text-sm text-gray-900 bg-white" />
                {searchTerm && <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="text-gray-400 hover:text-red-500 font-bold ml-2">✕</button>}
              </div>
              <div className="w-full md:w-2/3 flex flex-wrap md:flex-nowrap items-center justify-end gap-3">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <label className="font-bold text-gray-700 text-sm whitespace-nowrap">ลูกค้า:</label>
                  <select value={filterCustomer} onChange={handleFilterChange} className="p-2 w-full md:w-36 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm bg-white text-gray-900">
                    {uniqueCustomers.map((cust, idx) => <option key={idx} value={cust}>{cust === 'All' ? '📦 ทั้งหมด' : cust}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <label className="font-bold text-gray-700 text-sm whitespace-nowrap">เรียงตาม:</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-2 w-full md:w-36 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm bg-white text-gray-900">
                    <option value="id_asc">รหัส (A-Z)</option><option value="id_desc">รหัส (Z-A)</option><option value="name_asc">ชื่อ (A-Z)</option><option value="name_desc">ชื่อ (Z-A)</option><option value="supplier_asc">ลูกค้า (A-Z)</option><option value="supplier_desc">ลูกค้า (Z-A)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 flex-1">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr><th className="py-3 px-4 border-b text-left text-gray-700">รหัสสินค้า</th><th className="py-3 px-4 border-b text-left text-gray-700">ชื่อสินค้า</th><th className="py-3 px-4 border-b text-left text-gray-700">Customer</th><th className="py-3 px-4 border-b text-left text-gray-700">กล่องมาตรฐาน</th><th className="py-3 px-4 border-b text-center text-gray-700">กันชื้น</th><th className="py-3 px-4 border-b text-center text-gray-700">จัดการ</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentItems.length > 0 ? (
                    currentItems.map(item => (
                      <tr key={item?.itemId} className="hover:bg-white/10 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">{item?.itemId}</td>
                        <td className="py-3 px-4 text-sm text-gray-300">{item?.itemName}</td>
                        <td className="py-3 px-4 text-gray-400 font-medium text-sm">{item?.supplier || '-'}</td>
                        <td className="py-3 px-4 text-sm text-gray-300">
                          <div className="font-medium text-gray-400">{item?.defaultPckId || '-'}</div>
                          {item?.defaultPckId && boxMap[item.defaultPckId]?.description && <div className="text-xs text-gray-500">{boxMap[item.defaultPckId].description}</div>}
                        </td>
                        <td className="py-3 px-4 text-center text-lg">{item?.requireDesiccant ? '✅' : '❌'}</td>
                        <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                          <button onClick={() => { setEditingItemId(item.itemId); setItemForm({ itemId: item.itemId, itemName: item.itemName, supplier: item.supplier, itemWeight: item.itemWeight, defaultPckId: item.defaultPckId || '', requireDesiccant: item.requireDesiccant }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 font-bold">แก้ไข</button>
                          <button onClick={() => handleDeleteItem(item.itemId)} className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 font-bold">ลบ</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" className="py-8 text-center text-gray-500">❌ ไม่พบข้อมูลที่ตรงกับเงื่อนไข</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredByCustomer.length > 0 && (
              <div className="flex justify-between items-center mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="text-sm text-gray-600 font-medium">แสดงผล <span className="font-bold text-indigo-600">{indexOfFirstItem + 1}</span> ถึง <span className="font-bold text-indigo-600">{Math.min(indexOfLastItem, filteredByCustomer.length)}</span> จาก <span className="font-bold">{filteredByCustomer.length}</span> รายการ</div>
                <div className="flex gap-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm disabled:opacity-50 font-bold text-sm text-gray-700">⬅️ ก่อนหน้า</button>
                  <div className="px-3 py-1.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-md">{currentPage} / {totalPages}</div>
                  <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm disabled:opacity-50 font-bold text-sm text-gray-700">ถัดไป ➡️</button>
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
             <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-xl font-bold text-gray-800 mb-4">{editingBoxId ? '✏️ แก้ไขข้อมูลกล่อง' : '➕ เพิ่มกล่องใหม่'}</h3>
              <form onSubmit={handleBoxSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">รหัสกล่อง *</label>
                  <input type="text" required disabled={!!editingBoxId} value={boxForm.pckId || ''} onChange={(e) => setBoxForm(prev => ({ ...prev, pckId: String(e.target.value).toUpperCase() }))} className="w-full p-2 border rounded bg-white text-gray-900 outline-none" />
                </div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">คำอธิบาย</label><input type="text" required value={boxForm.description || ''} onChange={(e) => setBoxForm({...boxForm, description: e.target.value})} className="w-full p-2 border rounded bg-white text-gray-900 outline-none" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">จุได้กี่ชิ้น</label><input type="number" required value={boxForm.maxCapacity || ''} onChange={(e) => setBoxForm({...boxForm, maxCapacity: e.target.value})} className="w-full p-2 border rounded bg-white text-gray-900 outline-none" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">สต็อกที่มี (ใบ)</label><input type="number" required value={boxForm.currentStock || 0} onChange={(e) => setBoxForm({...boxForm, currentStock: e.target.value})} className="w-full p-2 border rounded bg-white text-gray-900 outline-none font-bold text-blue-600" /></div>
                </div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">จุดสั่งซื้อ (Min)</label><input type="number" required value={boxForm.minStockLevel || 0} onChange={(e) => setBoxForm({...boxForm, minStockLevel: e.target.value})} className="w-full p-2 border rounded bg-white text-gray-900 outline-none text-red-500 font-bold" /></div>
                <div className="flex space-x-2 pt-2">
                  <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 transition-colors text-white font-bold p-2 rounded shadow">💾 บันทึก</button>
                  {editingBoxId && <button type="button" onClick={() => { setEditingBoxId(null); setBoxForm({ pckId: '', description: '', maxCapacity: '', currentStock: 0, minStockLevel: 0 }); }} className="bg-gray-400 hover:bg-gray-500 text-white font-bold p-2 rounded">ยกเลิก</button>}
                </div>
              </form>
            </div>
            {!editingBoxId && (
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                <h3 className="text-lg font-bold text-blue-800 mb-2">📁 นำเข้ากล่องด้วย Excel / CSV</h3>
                <p className="text-xs text-blue-600 mb-4">คอลัมน์ที่ระบบอ่าน: <br/><span className="font-mono bg-blue-100 px-1 rounded">Item</span>, <span className="font-mono bg-blue-100 px-1 rounded ml-1">Description</span>, <span className="font-mono bg-blue-100 px-1 rounded ml-1">จำนวนกล่อง</span>, <span className="font-mono bg-blue-100 px-1 rounded ml-1">จุดสั่งซื้อ</span></p>
                <div className="space-y-3">
                  <input type="file" id="boxes-file-input" accept=".xlsx, .xls, .csv" multiple onChange={handleBoxFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-between items-center bg-gray-50 p-4 mb-4 rounded-xl border border-gray-200 gap-4">
              <div className="w-full md:w-1/2 flex items-center bg-white border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 shadow-sm">
                <span className="text-gray-400 mr-2">🔍</span>
                <input type="text" placeholder="ค้นหารหัสกล่อง หรือ คำอธิบาย..." value={boxSearchTerm} onChange={(e) => setBoxSearchTerm(e.target.value)} className="w-full outline-none text-sm text-gray-900 bg-white" />
                {boxSearchTerm && <button onClick={() => setBoxSearchTerm('')} className="text-gray-400 hover:text-red-500 font-bold ml-2">✕</button>}
              </div>
              <div className="w-full md:w-auto flex items-center gap-2">
                <label className="font-bold text-gray-700 text-sm whitespace-nowrap">เรียงตาม:</label>
                <select value={boxSortBy} onChange={(e) => setBoxSortBy(e.target.value)} className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium shadow-sm bg-white text-gray-900">
                  <option value="id_asc">รหัสกล่อง (A-Z)</option><option value="id_desc">รหัสกล่อง (Z-A)</option><option value="desc_asc">คำอธิบาย (A-Z)</option><option value="desc_desc">คำอธิบาย (Z-A)</option><option value="cap_desc">ความจุ (มาก-น้อย)</option><option value="cap_asc">ความจุ (น้อย-มาก)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 flex-1 shadow-sm">
              <table className="min-w-full bg-white">
                <thead className="bg-indigo-900 text-white">
                  <tr><th className="py-3 px-4 text-left font-bold border-b border-indigo-800">รหัสกล่อง</th><th className="py-3 px-4 text-left font-bold border-b border-indigo-800">คำอธิบาย</th><th className="py-3 px-4 text-center font-bold border-b border-indigo-800">ความจุ</th><th className="py-3 px-4 text-center font-bold border-b border-indigo-800">สต็อกคงเหลือ</th><th className="py-3 px-4 text-center font-bold border-b border-indigo-800">จัดการ</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {processedBoxes.length > 0 ? (
                    processedBoxes.map(box => {
                      const isLowStock = box?.currentStock <= box?.minStockLevel;
                      return (
                        <tr key={box?.pckId} className="hover:bg-white/10 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-400">{box?.pckId}</td>
                          <td className="py-3 px-4 text-gray-300 text-sm">{box?.description || '-'}</td>
                          <td className="py-3 px-4 text-center font-medium text-gray-300">{box?.maxCapacity}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-black text-lg ${isLowStock ? 'text-red-500' : 'text-green-600'}`}>{box?.currentStock || 0}</span>
                            {isLowStock && <p className="text-xs text-red-500 font-bold animate-pulse">! ถึงจุดสั่งซื้อ ({box?.minStockLevel})</p>}
                          </td>
                          <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                            <button onClick={() => { setEditingBoxId(box.pckId); setBoxForm({ pckId: box.pckId, description: box.description, maxCapacity: box.maxCapacity, currentStock: box.currentStock || 0, minStockLevel: box.minStockLevel || 0 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 font-bold">แก้ไข</button>
                            <button onClick={() => handleBoxDelete(box.pckId)} className="text-sm bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200 font-bold">ลบ</button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr><td colSpan="5" className="py-8 text-center text-gray-500">❌ ไม่พบกล่องที่ค้นหา</td></tr>
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
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-xl font-bold text-gray-800 mb-4">{editingUserId ? '✏️ แก้ไขข้อมูลพนักงาน' : '➕ เพิ่มพนักงานใหม่'}</h3>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">รหัสพนักงาน (Username) *</label>
                  <input type="text" required disabled={!!editingUserId} value={userForm.username || ''} onChange={(e) => setUserForm(prev => ({ ...prev, username: String(e.target.value).toUpperCase() }))} className="w-full p-2 border rounded bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="เช่น D-88888" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{editingUserId ? 'ตั้งรหัสผ่านใหม่ (ปล่อยว่างถ้าใช้รหัสเดิม)' : 'รหัสผ่าน *'}</label>
                  <input type="password" required={!editingUserId} value={userForm.passwordHash || ''} onChange={(e) => setUserForm({...userForm, passwordHash: e.target.value})} className="w-full p-2 border rounded bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="******" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล / ชื่อเล่น *</label>
                  <input type="text" required value={userForm.firstName || ''} onChange={(e) => setUserForm({...userForm, firstName: e.target.value})} className="w-full p-2 border rounded bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="สมชาย ใจดี" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ระดับสิทธิ์ (Role)</label>
                  <select value={userForm.role || 'operator'} onChange={(e) => setUserForm({...userForm, role: e.target.value})} className="w-full p-2 border rounded font-bold bg-white text-gray-900 outline-none">
                    <option value="operator" className="bg-white text-gray-900">Operator (พนักงานสแกนแพ็ค)</option>
                    <option value="admin" className="bg-white text-gray-900">Admin (ผู้ดูแลระบบ)</option>
                  </select>
                </div>
                <div className="flex space-x-2 pt-4">
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-lg shadow-md transition-colors">💾 บันทึกข้อมูล</button>
                  {editingUserId && <button type="button" onClick={() => { setEditingUserId(null); setUserForm({ username: '', passwordHash: '', firstName: '', role: 'operator' }); }} className="bg-gray-400 hover:bg-gray-500 text-white font-bold p-3 rounded-lg transition-colors">ยกเลิก</button>}
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 overflow-x-auto">
            <table className="min-w-full bg-white border rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-indigo-900 text-white">
                <tr><th className="py-4 px-4 text-left font-bold">รหัสพนักงาน</th><th className="py-4 px-4 text-left font-bold">ชื่อ-นามสกุล</th><th className="py-4 px-4 text-center font-bold">สิทธิ์การใช้งาน</th><th className="py-4 px-4 text-center font-bold">จัดการ</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users && users.length > 0 ? (
                  users.filter(u => u && u.username).map(u => (
                    <tr key={u?.id} className="hover:bg-white/10 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">{u?.username}</td>
                      <td className="py-3 px-4 text-gray-300 font-medium text-sm">{u?.firstName}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${u?.role?.toLowerCase() === 'admin' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{u?.role}</span>
                      </td>
                      <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                        <button onClick={() => { setEditingUserId(u.id); setUserForm({ username: u.username, passwordHash: '', firstName: u.firstName, role: u.role?.toLowerCase() }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 font-bold">💡 แก้ไข</button>
                        {currentUser.id !== u.id && <button onClick={() => handleUserDelete(u.id)} className="text-sm bg-red-100 text-red-700 px-3 py-1.5 rounded-md hover:bg-red-200 font-bold">ลบ</button>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="py-8 text-center text-gray-500">ไม่มีข้อมูลพนักงาน</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}