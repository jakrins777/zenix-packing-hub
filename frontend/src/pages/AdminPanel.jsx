import { useState } from 'react';

export default function AdminPanel({ 
  currentUser, adminSubTab, setAdminSubTab, items, boxes, users,
  itemForm, setItemForm, boxForm, setBoxForm, userForm, setUserForm,
  handleItemSubmit, handleBoxSubmit, handleUserSubmit, 
  handleDeleteItem, handleBoxDelete, handleUserDelete, 
  editingItemId, setEditingItemId, editingBoxId, setEditingBoxId, editingUserId, setEditingUserId,
  handleFileUpload, handleBoxFileUpload 
}) {

  // 🌟 State สำหรับตัวกรองและการเรียงลำดับ (หน้า Items)
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('id_asc');

  // 🌟 State สำหรับตัวกรองและการเรียงลำดับ (หน้า Boxes)
  const [boxSearchTerm, setBoxSearchTerm] = useState('');
  const [boxSortBy, setBoxSortBy] = useState('id_asc');

  // ฟังก์ชันจัดการข้อมูลสินค้า (Items)
  const processedItems = items
    .filter(item => {
      const term = searchTerm.toLowerCase();
      return (
        (item.itemId || '').toLowerCase().includes(term) ||
        (item.itemName || '').toLowerCase().includes(term) ||
        (item.supplier || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'id_asc') return (a.itemId || '').localeCompare(b.itemId || '');
      if (sortBy === 'id_desc') return (b.itemId || '').localeCompare(a.itemId || '');
      if (sortBy === 'name_asc') return (a.itemName || '').localeCompare(b.itemName || '');
      if (sortBy === 'name_desc') return (b.itemName || '').localeCompare(a.itemName || '');
      // 🌟 เพิ่มเงื่อนไขเรียงตาม Supplier A-Z และ Z-A
      if (sortBy === 'supplier_asc') return (a.supplier || '').localeCompare(b.supplier || '');
      if (sortBy === 'supplier_desc') return (b.supplier || '').localeCompare(a.supplier || '');
      return 0;
    });

  // ฟังก์ชันจัดการข้อมูลกล่อง (Boxes)
  const processedBoxes = boxes
    .filter(box => {
      const term = boxSearchTerm.toLowerCase();
      return (
        (box.pckId || '').toLowerCase().includes(term) ||
        (box.description || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (boxSortBy === 'id_asc') return (a.pckId || '').localeCompare(b.pckId || '');
      if (boxSortBy === 'id_desc') return (b.pckId || '').localeCompare(a.pckId || '');
      if (boxSortBy === 'desc_asc') return (a.description || '').localeCompare(b.description || '');
      if (boxSortBy === 'desc_desc') return (b.description || '').localeCompare(a.description || '');
      if (boxSortBy === 'cap_asc') return Number(a.maxCapacity) - Number(b.maxCapacity);
      if (boxSortBy === 'cap_desc') return Number(b.maxCapacity) - Number(a.maxCapacity);
      return 0;
    });

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
                    onChange={(e) => {
                      const val = e?.target?.value || '';
                      setItemForm(prev => ({ ...prev, itemId: String(val).toUpperCase() }));
                    }} 
                    className="w-full p-2 border rounded" 
                  />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า (ไม่บังคับ)</label><input type="text" value={itemForm.itemName || ''} onChange={(e) => setItemForm({...itemForm, itemName: e.target.value})} className="w-full p-2 border rounded" placeholder="เว้นว่างได้" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label><input type="text" value={itemForm.supplier || ''} onChange={(e) => setItemForm({...itemForm, supplier: e.target.value})} className="w-full p-2 border rounded" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">น้ำหนัก (kg) *</label><input type="number" step="0.001" required value={itemForm.itemWeight || ''} onChange={(e) => setItemForm({...itemForm, itemWeight: e.target.value})} className="w-full p-2 border rounded" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">กล่องมาตรฐาน</label>
                  <select value={itemForm.defaultPckId || ''} onChange={(e) => setItemForm({...itemForm, defaultPckId: e.target.value})} className="w-full p-2 border rounded">
                    <option value="">-- เลือกกล่อง --</option>
                    {boxes.map(b => <option key={b.pckId} value={b.pckId}>{b.pckId}</option>)}
                  </select>
                </div>
                <div className="pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer bg-blue-50 p-3 rounded border border-blue-100 hover:bg-blue-100 transition-colors">
                    <input type="checkbox" checked={itemForm.requireDesiccant || false} onChange={(e) => setItemForm({...itemForm, requireDesiccant: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded" />
                    <span className="text-sm font-bold text-indigo-800">💧 สินค้านี้ต้องใส่ซองกันชื้น</span>
                  </label>
                </div>
                <div className="flex space-x-2 pt-2">
                  <button type="submit" className="flex-1 bg-green-600 text-white font-bold p-2 rounded">💾 บันทึก</button>
                  {editingItemId && <button type="button" onClick={() => { setEditingItemId(null); setItemForm({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', requireDesiccant: false }); }} className="bg-gray-400 text-white font-bold p-2 rounded">ยกเลิก</button>}
                </div>
              </form>
            </div>

            {!editingItemId && (
              <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                <h3 className="text-lg font-bold text-purple-800 mb-2">📁 นำเข้าสินค้าด้วย Excel / CSV</h3>
                <p className="text-xs text-purple-600 mb-4">รองรับไฟล์ Export จาก <strong>Infor CSI</strong> คอลัมน์ที่ระบบอ่าน: <br/><span className="font-mono bg-purple-100 px-1 rounded">Item</span>, <span className="font-mono bg-purple-100 px-1 rounded ml-1">Description</span>, <span className="font-mono bg-purple-100 px-1 rounded ml-1">Unit Weight</span></p>
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer" />
              </div>
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col h-full">
            {/* แถบเครื่องมือ ค้นหา + เรียงลำดับ (Items) */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-gray-50 p-4 mb-4 rounded-xl border border-gray-200 gap-4">
              <div className="w-full md:w-1/2 flex items-center bg-white border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 shadow-sm">
                <span className="text-gray-400 mr-2">🔍</span>
                <input 
                  type="text" 
                  placeholder="ค้นหารหัส, ชื่อสินค้า หรือ Supplier..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full outline-none text-sm"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-red-500 font-bold ml-2">✕</button>
                )}
              </div>
              
              <div className="w-full md:w-auto flex items-center gap-2">
                <label className="font-bold text-gray-700 text-sm whitespace-nowrap">เรียงตาม:</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm bg-white"
                >
                  <option value="id_asc">รหัสสินค้า (A-Z)</option>
                  <option value="id_desc">รหัสสินค้า (Z-A)</option>
                  <option value="name_asc">ชื่อสินค้า (A-Z)</option>
                  <option value="name_desc">ชื่อสินค้า (Z-A)</option>
                  {/* 🌟 เพิ่มตัวเลือกเรียงตาม Supplier */}
                  <option value="supplier_asc">Supplier (A-Z)</option>
                  <option value="supplier_desc">Supplier (Z-A)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 flex-1">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr><th className="py-3 px-4 border-b text-left">รหัสสินค้า</th><th className="py-3 px-4 border-b text-left">ชื่อสินค้า</th><th className="py-3 px-4 border-b text-left">Supplier</th><th className="py-3 px-4 border-b text-center">กันชื้น</th><th className="py-3 px-4 border-b text-center">จัดการ</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {processedItems.length > 0 ? (
                    processedItems.map(item => (
                      <tr key={item.itemId} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono font-bold text-gray-700">{item.itemId}</td><td className="py-3 px-4">{item.itemName}</td><td className="py-3 px-4 text-gray-600 font-medium">{item.supplier || '-'}</td><td className="py-3 px-4 text-center text-lg">{item.requireDesiccant ? '✅' : '❌'}</td>
                        <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                          <button onClick={() => { setEditingItemId(item.itemId); setItemForm({ itemId: item.itemId, itemName: item.itemName, supplier: item.supplier, itemWeight: item.itemWeight, defaultPckId: item.defaultPckId || '', requireDesiccant: item.requireDesiccant }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">แก้ไข</button>
                          <button onClick={() => handleDeleteItem(item.itemId)} className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">ลบ</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" className="py-8 text-center text-gray-500">❌ ไม่พบสินค้าที่ค้นหา</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 📦 แท็บที่ 2: หน้าจัดการมาสเตอร์กล่อง */}
      {/* ========================================== */}
      {adminSubTab === 'boxes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6 h-fit">
             <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">{editingBoxId ? '✏️ แก้ไขข้อมูลกล่อง' : '➕ เพิ่มกล่องใหม่'}</h3>
              <form onSubmit={handleBoxSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">รหัสกล่อง</label>
                  <input 
                    type="text" required disabled={!!editingBoxId} value={boxForm.pckId || ''} 
                    onChange={(e) => {
                      const val = e?.target?.value || '';
                      setBoxForm(prev => ({ ...prev, pckId: String(val).toUpperCase() }));
                    }} 
                    className="w-full p-2 border rounded" 
                  />
                </div>
                <div><label className="block text-sm mb-1">คำอธิบาย</label><input type="text" required value={boxForm.description || ''} onChange={(e) => setBoxForm({...boxForm, description: e.target.value})} className="w-full p-2 border rounded" /></div>
                <div><label className="block text-sm mb-1">ความจุสูงสุด</label><input type="number" required value={boxForm.maxCapacity || ''} onChange={(e) => setBoxForm({...boxForm, maxCapacity: e.target.value})} className="w-full p-2 border rounded" /></div>
                <div className="flex space-x-2 pt-2">
                  <button type="submit" className="flex-1 bg-green-600 text-white font-bold p-2 rounded">💾 บันทึก</button>
                  {editingBoxId && <button type="button" onClick={() => { setEditingBoxId(null); setBoxForm({ pckId: '', description: '', maxCapacity: '' }); }} className="bg-gray-400 text-white font-bold p-2 rounded">ยกเลิก</button>}
                </div>
              </form>
            </div>
            
            {!editingBoxId && (
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                <h3 className="text-lg font-bold text-blue-800 mb-2">📁 นำเข้ากล่องด้วย Excel / CSV</h3>
                <p className="text-xs text-blue-600 mb-4">
                  รองรับไฟล์ Export จาก <strong>Infor CSI</strong> คอลัมน์ที่ระบบอ่าน: <br/>
                  <span className="font-mono bg-blue-100 px-1 rounded">Item</span> (รหัสกล่อง), 
                  <span className="font-mono bg-blue-100 px-1 rounded ml-1">Description</span> (คำอธิบาย)
                </p>
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleBoxFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
              </div>
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col h-full">
            {/* 🌟 แถบเครื่องมือ ค้นหา + เรียงลำดับ (Boxes) */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-gray-50 p-4 mb-4 rounded-xl border border-gray-200 gap-4">
              <div className="w-full md:w-1/2 flex items-center bg-white border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 shadow-sm">
                <span className="text-gray-400 mr-2">🔍</span>
                <input 
                  type="text" 
                  placeholder="ค้นหารหัสกล่อง หรือ คำอธิบาย..." 
                  value={boxSearchTerm}
                  onChange={(e) => setBoxSearchTerm(e.target.value)}
                  className="w-full outline-none text-sm"
                />
                {boxSearchTerm && (
                  <button onClick={() => setBoxSearchTerm('')} className="text-gray-400 hover:text-red-500 font-bold ml-2">✕</button>
                )}
              </div>
              
              <div className="w-full md:w-auto flex items-center gap-2">
                <label className="font-bold text-gray-700 text-sm whitespace-nowrap">เรียงตาม:</label>
                <select 
                  value={boxSortBy} 
                  onChange={(e) => setBoxSortBy(e.target.value)}
                  className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium shadow-sm bg-white"
                >
                  <option value="id_asc">รหัสกล่อง (A-Z)</option>
                  <option value="id_desc">รหัสกล่อง (Z-A)</option>
                  <option value="desc_asc">คำอธิบาย (A-Z)</option>
                  <option value="desc_desc">คำอธิบาย (Z-A)</option>
                  <option value="cap_desc">ความจุ (มาก-น้อย)</option>
                  <option value="cap_asc">ความจุ (น้อย-มาก)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 flex-1">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr><th className="py-3 px-4 border-b text-left">รหัสกล่อง</th><th className="py-3 px-4 border-b text-left">คำอธิบาย</th><th className="py-3 px-4 border-b text-center">ความจุสูงสุด</th><th className="py-3 px-4 border-b text-center">จัดการ</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {processedBoxes.length > 0 ? (
                    processedBoxes.map(box => (
                      <tr key={box.pckId} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{box.pckId}</td><td className="py-3 px-4 text-gray-600">{box.description || '-'}</td><td className="py-3 px-4 text-center">{box.maxCapacity}</td>
                        <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                          <button onClick={() => { setEditingBoxId(box.pckId); setBoxForm({ pckId: box.pckId, description: box.description, maxCapacity: box.maxCapacity }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">แก้ไข</button>
                          <button onClick={() => handleBoxDelete(box.pckId)} className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">ลบ</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="py-8 text-center text-gray-500">❌ ไม่พบกล่องที่ค้นหา</td></tr>
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
                  <input 
                    type="text" required disabled={!!editingUserId} value={userForm.username || ''} 
                    onChange={(e) => {
                      const val = e?.target?.value || '';
                      setUserForm(prev => ({ ...prev, username: String(val).toUpperCase() }));
                    }} 
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                    placeholder="เช่น D-88888" 
                  />
                  {editingUserId && <p className="text-xs text-red-500 mt-1">ไม่อนุญาตให้แก้ Username</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{editingUserId ? 'ตั้งรหัสผ่านใหม่ (ปล่อยว่างถ้าใช้รหัสเดิม)' : 'รหัสผ่าน *'}</label>
                  <input type="password" required={!editingUserId} value={userForm.password || ''} onChange={(e) => setUserForm({...userForm, password: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="******" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล / ชื่อเล่น *</label>
                  <input type="text" required value={userForm.firstName || ''} onChange={(e) => setUserForm({...userForm, firstName: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="สมชาย ใจดี" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ระดับสิทธิ์ (Role)</label>
                  <select value={userForm.role || 'operator'} onChange={(e) => setUserForm({...userForm, role: e.target.value})} className="w-full p-2 border rounded font-bold">
                    <option value="operator">Operator (พนักงานสแกนแพ็ค)</option>
                    <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                  </select>
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-lg shadow-md transition-colors">💾 บันทึกข้อมูล</button>
                  {editingUserId && <button type="button" onClick={() => { setEditingUserId(null); setUserForm({ username: '', password: '', firstName: '', role: 'operator' }); }} className="bg-gray-400 hover:bg-gray-500 text-white font-bold p-3 rounded-lg transition-colors">ยกเลิก</button>}
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 overflow-x-auto">
            <table className="min-w-full bg-white border rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-indigo-900 text-white">
                <tr>
                  <th className="py-4 px-4 text-left font-bold">รหัสพนักงาน</th>
                  <th className="py-4 px-4 text-left font-bold">ชื่อ-นามสกุล</th>
                  <th className="py-4 px-4 text-center font-bold">สิทธิ์การใช้งาน</th>
                  <th className="py-4 px-4 text-center font-bold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users && users.length > 0 ? (
                  users.map(u => (
                    <tr key={u.id} className="hover:bg-indigo-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-700">{u.username}</td>
                      <td className="py-3 px-4 text-gray-800 font-medium">{u.firstName}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${u.role?.toLowerCase() === 'admin' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                        <button onClick={() => { setEditingUserId(u.id); setUserForm({ username: u.username, password: '', firstName: u.firstName, role: u.role?.toLowerCase() }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 font-bold">แก้ไข</button>
                        {currentUser.id !== u.id && (
                          <button onClick={() => handleUserDelete(u.id)} className="text-sm bg-red-100 text-red-700 px-3 py-1.5 rounded-md hover:bg-red-200 font-bold">ลบ</button>
                        )}
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