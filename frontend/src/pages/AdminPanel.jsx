export default function AdminPanel({ 
  currentUser, adminSubTab, setAdminSubTab, items, boxes, 
  itemForm, setItemForm, boxForm, setBoxForm, 
  handleItemSubmit, handleBoxSubmit, handleDeleteItem, handleBoxDelete, 
  editingItemId, setEditingItemId, editingBoxId, setEditingBoxId,
  handleFileUpload, handleBoxFileUpload 
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex space-x-4 border-b-2 border-gray-200 pb-4 mb-6">
        <button onClick={() => setAdminSubTab('items')} className={`text-xl font-bold pb-2 ${adminSubTab === 'items' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>🏷️ จัดการมาสเตอร์สินค้า</button>
        <button onClick={() => setAdminSubTab('boxes')} className={`text-xl font-bold pb-2 ${adminSubTab === 'boxes' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>📦 จัดการมาสเตอร์กล่อง</button>
      </div>

      {adminSubTab === 'items' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6 h-fit">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">{editingItemId ? '✏️ แก้ไขข้อมูลสินค้า' : '➕ เพิ่มสินค้าใหม่'}</h3>
              <form onSubmit={handleItemSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">รหัสสินค้า *</label><input type="text" required disabled={!!editingItemId} value={itemForm.itemId} onChange={(e) => setItemForm({...itemForm, itemId: e.target.value.toUpperCase()})} className="w-full p-2 border rounded" /></div>
                
                {/* 🌟 เอา required ออกจากชื่อสินค้า */}
                <div><label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า (ไม่บังคับ)</label><input type="text" value={itemForm.itemName} onChange={(e) => setItemForm({...itemForm, itemName: e.target.value})} className="w-full p-2 border rounded" placeholder="เว้นว่างได้" /></div>
                
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label><input type="text" value={itemForm.supplier} onChange={(e) => setItemForm({...itemForm, supplier: e.target.value})} className="w-full p-2 border rounded" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">น้ำหนัก (kg) *</label><input type="number" step="0.001" required value={itemForm.itemWeight} onChange={(e) => setItemForm({...itemForm, itemWeight: e.target.value})} className="w-full p-2 border rounded" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">กล่องมาตรฐาน</label>
                  <select value={itemForm.defaultPckId} onChange={(e) => setItemForm({...itemForm, defaultPckId: e.target.value})} className="w-full p-2 border rounded">
                    <option value="">-- เลือกกล่อง --</option>
                    {boxes.map(b => <option key={b.pckId} value={b.pckId}>{b.pckId}</option>)}
                  </select>
                </div>
                <div className="pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer bg-blue-50 p-3 rounded border border-blue-100 hover:bg-blue-100 transition-colors">
                    <input type="checkbox" checked={itemForm.requireDesiccant} onChange={(e) => setItemForm({...itemForm, requireDesiccant: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                    <span className="text-sm font-bold text-blue-800">💧 สินค้านี้ต้องใส่ซองกันชื้น</span>
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
                <h3 className="text-lg font-bold text-purple-800 mb-2">📁 นำเข้าสินค้าด้วย Excel</h3>
                <p className="text-xs text-purple-600 mb-4">คอลัมน์ที่บังคับมี: <strong>รหัสสินค้า</strong> (นอกนั้นปล่อยว่างได้)</p>
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer" />
              </div>
            )}
          </div>

          <div className="lg:col-span-2 overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-100"><tr><th className="py-3 px-4 border-b text-left">รหัสสินค้า</th><th className="py-3 px-4 border-b text-left">ชื่อสินค้า</th><th className="py-3 px-4 border-b text-center">กันชื้น</th><th className="py-3 px-4 border-b text-center">จัดการ</th></tr></thead>
              <tbody className="divide-y divide-gray-200">
                {items.map(item => (
                  <tr key={item.itemId} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono font-bold text-gray-700">{item.itemId}</td><td className="py-3 px-4">{item.itemName}</td><td className="py-3 px-4 text-center text-lg">{item.requireDesiccant ? '✅' : '❌'}</td>
                    <td className="py-3 px-4 text-center space-x-2">
                      <button onClick={() => { setEditingItemId(item.itemId); setItemForm({ itemId: item.itemId, itemName: item.itemName, supplier: item.supplier, itemWeight: item.itemWeight, defaultPckId: item.defaultPckId || '', requireDesiccant: item.requireDesiccant }); }} className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">แก้ไข</button>
                      <button onClick={() => handleDeleteItem(item.itemId)} className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded">ลบ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {adminSubTab === 'boxes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6 h-fit">
             <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">{editingBoxId ? '✏️ แก้ไขข้อมูลกล่อง' : '➕ เพิ่มกล่องใหม่'}</h3>
              <form onSubmit={handleBoxSubmit} className="space-y-4">
                <div><label className="block text-sm mb-1">รหัสกล่อง</label><input type="text" required disabled={!!editingBoxId} value={boxForm.pckId} onChange={(e) => setBoxForm({...boxForm, pckId: e.target.value.toUpperCase()})} className="w-full p-2 border rounded" /></div>
                <div><label className="block text-sm mb-1">คำอธิบาย</label><input type="text" required value={boxForm.description} onChange={(e) => setBoxForm({...boxForm, description: e.target.value})} className="w-full p-2 border rounded" /></div>
                <div><label className="block text-sm mb-1">ความจุสูงสุด</label><input type="number" required value={boxForm.maxCapacity} onChange={(e) => setBoxForm({...boxForm, maxCapacity: e.target.value})} className="w-full p-2 border rounded" /></div>
                <div><label className="block text-sm mb-1">น้ำหนัก (kg)</label><input type="number" step="0.001" value={boxForm.boxWeight} onChange={(e) => setBoxForm({...boxForm, boxWeight: e.target.value})} className="w-full p-2 border rounded" /></div>
                {/* ❌ ลบช่องกรอกซองกันชื้นออกไปแล้ว */}
                <div className="flex space-x-2 pt-2">
                  <button type="submit" className="flex-1 bg-green-600 text-white font-bold p-2 rounded">💾 บันทึก</button>
                  {editingBoxId && <button type="button" onClick={() => { setEditingBoxId(null); setBoxForm({ pckId: '', description: '', maxCapacity: '', boxWeight: '', desiccantQty: '' }); }} className="bg-gray-400 text-white font-bold p-2 rounded">ยกเลิก</button>}
                </div>
              </form>
            </div>
            
            {!editingBoxId && (
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                <h3 className="text-lg font-bold text-blue-800 mb-2">📁 นำเข้ากล่องด้วย Excel</h3>
                {/* ❌ อัปเดตข้อความคำแนะนำ ไม่ต้องมีคอลัมน์กันชื้นแล้ว */}
                <p className="text-xs text-blue-600 mb-4">คอลัมน์ที่รองรับ: รหัสกล่อง, คำอธิบาย, ความจุสูงสุด, น้ำหนัก</p>
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleBoxFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
              </div>
            )}
          </div>

          <div className="lg:col-span-2 overflow-x-auto">
            <table className="min-w-full bg-white border">
              {/* ❌ ลบหัวตารางกันชื้นออก */}
              <thead className="bg-gray-100"><tr><th className="py-3 px-4 border-b text-left">รหัสกล่อง</th><th className="py-3 px-4 border-b text-center">ความจุ</th><th className="py-3 px-4 border-b text-center">จัดการ</th></tr></thead>
              <tbody className="divide-y divide-gray-200">
                {boxes.map(box => (
                  <tr key={box.pckId} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{box.pckId}</td>
                    <td className="py-3 px-4 text-center">{box.maxCapacity}</td>
                    {/* ❌ ลบข้อมูลในตารางออก */}
                    <td className="py-3 px-4 text-center space-x-2">
                      <button onClick={() => { setEditingBoxId(box.pckId); setBoxForm({ pckId: box.pckId, description: box.description, maxCapacity: box.maxCapacity, boxWeight: box.boxWeight, desiccantQty: 0 }); }} className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">แก้ไข</button>
                      <button onClick={() => handleBoxDelete(box.pckId)} className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded">ลบ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}