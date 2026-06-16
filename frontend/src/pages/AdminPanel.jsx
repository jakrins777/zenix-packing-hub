/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import BoxCodenameUpdater from './BoxCodenameUpdater';
import { useTranslation } from 'react-i18next'; // 🌟 เพิ่ม Import แปลภาษา

export default function AdminPanel({ currentUser, adminSubTab, setAdminSubTab, items, boxes, users, refreshAdminData }) {
  const { t } = useTranslation(); // 🌟 เรียกใช้งาน Hook แปลภาษา

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
    const toastId = toast.loading(t('toast.saving_item'));
    try {
      let error;
      if (editingItemId) { const { error: updateError } = await supabase.from('items').update(payload).eq('itemId', editingItemId); error = updateError; } 
      else { const { error: insertError } = await supabase.from('items').insert([payload]); error = insertError; }
      if (!error) { 
        toast.success(t('toast.save_item_success'), { id: toastId }); 
        setItemForm({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '',  stdPackQty: 1 }); 
        setEditingItemId(null); 
        if (refreshAdminData) refreshAdminData(); 
      } 
      else { if (error.code === '23505' || error.message.includes('duplicate key')) { toast.error(t('toast.save_item_duplicate'), { id: toastId }); } else { toast.error(t('toast.save_error') + error.message, { id: toastId }); } }
    } catch (err) { toast.error(t('toast.save_item_error'), { id: toastId }); }
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
      toast.error(t('toast.bulk_missing_fields'));
      return;
    }

    const toastId = toast.loading(t('toast.bulk_updating', { count: selectedItemIds.length }));
    payload.updatedAt = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('items')
        .update(payload)
        .in('itemId', selectedItemIds);

      if (!error) {
        toast.success(t('toast.bulk_update_success', { count: selectedItemIds.length }), { id: toastId });
        setSelectedItemIds([]); 
        setBulkForm({ defaultPckId: '', supplier: '' }); 
        if (refreshAdminData) refreshAdminData();
      } else {
        toast.error(t('toast.save_error') + error.message, { id: toastId });
      }
    } catch (err) {
      toast.error(t('toast.bulk_update_error'), { id: toastId });
    }
  };

  const handleBulkDeleteSubmit = async () => {
    if (selectedItemIds.length === 0) return;
    if (!confirm(t('confirm.bulk_delete', { count: selectedItemIds.length }))) return;

    const toastId = toast.loading(t('toast.bulk_deleting', { count: selectedItemIds.length }));
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .in('itemId', selectedItemIds);

      if (!error) {
        toast.success(t('toast.bulk_delete_success'), { id: toastId });
        setSelectedItemIds([]);
        if (refreshAdminData) refreshAdminData();
      } else {
        toast.error(t('toast.delete_error_msg') + error.message, { id: toastId });
      }
    } catch (err) {
      toast.error(t('toast.system_error'), { id: toastId });
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm(t('confirm.delete_item'))) return;
    const toastId = toast.loading(t('toast.deleting_item'));
    try { const { error } = await supabase.from('items').delete().eq('itemId', id); if (!error) { toast.success(t('toast.delete_success'), { id: toastId }); if (refreshAdminData) refreshAdminData(); } else { toast.error(t('toast.delete_error_msg') + error.message, { id: toastId }); } } catch (err) { toast.error(t('toast.delete_error'), { id: toastId }); }
  };

  const handleBoxSubmit = async (e) => {
    e.preventDefault();
    const payload = { 
      pckId: boxForm.pckId,
      codename: boxForm.codename,
      description: boxForm.description,
      maxCapacity: boxForm.maxCapacity,
      currentStock: boxForm.currentStock,
      updatedAt: new Date().toISOString() 
    };

    const toastId = toast.loading(t('toast.saving_box'));
    try {
      let error;
      if (editingBoxId) { const { error: updateError } = await supabase.from('boxes').update(payload).eq('pckId', editingBoxId); error = updateError; } 
      else { const { error: insertError } = await supabase.from('boxes').insert([payload]); error = insertError; }
      if (!error) { 
        toast.success(t('toast.save_box_success'), { id: toastId }); 
        setBoxForm({ pckId: '', codename: '', description: '', maxCapacity: '', currentStock: 0 }); 
        setEditingBoxId(null); 
        if (refreshAdminData) refreshAdminData(); 
      } 
      else { if (error.code === '23505' || error.message.includes('duplicate key')) { toast.error(t('toast.save_box_duplicate'), { id: toastId }); } else { toast.error(t('toast.save_error') + error.message, { id: toastId }); } }
    } catch (err) { toast.error(t('toast.save_box_error'), { id: toastId }); }
  };

  const handleBoxDelete = async (id) => {
    if (!confirm(t('confirm.delete_box'))) return;
    const toastId = toast.loading(t('toast.deleting_box'));
    try { const { error } = await supabase.from('boxes').delete().eq('pckId', id); if (!error) { toast.success(t('toast.delete_box_success'), { id: toastId }); if (refreshAdminData) refreshAdminData(); } else { toast.error(t('toast.delete_error_msg') + error.message, { id: toastId }); } } catch (err) { toast.error(t('toast.delete_error'), { id: toastId }); }
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
    toast.success(t('toast.export_item_success'));
  };

  const handleExportBoxes = () => {
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
    toast.success(t('toast.export_box_success'));
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!editingUserId && (!userForm.passwordHash || userForm.passwordHash.trim() === '')) { toast.error(t('toast.missing_password')); return; }
    const payload = { username: userForm.username, passwordHash: userForm.passwordHash || '', firstName: userForm.firstName, role: userForm.role, updatedAt: new Date().toISOString() };
    const toastId = toast.loading(t('toast.saving_user'));
    try {
      let res;
      if (editingUserId) { res = await fetch(`/api/users/${editingUserId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } 
      else { res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
      const data = await res.json();
      if (data.success) { toast.success(data.message, { id: toastId }); setEditingUserId(null); setUserForm({ username: '', passwordHash: '', firstName: '', role: 'operator' }); if (refreshAdminData) refreshAdminData(); } else { toast.error(t('toast.save_error') + data.message, { id: toastId }); }
    } catch (err) { toast.error(t('toast.save_user_error'), { id: toastId }); }
  };

  const handleUserDelete = async (id) => {
    if (!confirm(t('confirm.delete_user'))) return;
    const toastId = toast.loading(t('toast.deleting_user'));
    try { const { error } = await supabase.from('users').delete().eq('id', id); if (!error) { toast.success(t('toast.delete_user_success'), { id: toastId }); if (refreshAdminData) refreshAdminData(); } else { toast.error(t('toast.delete_error_msg') + error.message, { id: toastId }); } } catch (err) { toast.error(t('toast.delete_error'), { id: toastId }); }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files; if (!files || files.length === 0) return; const formData = new FormData(); for (let i = 0; i < files.length; i++) { formData.append('files', files[i]); } const toastId = toast.loading(t('toast.importing_item'));
    try { const res = await fetch('/api/items/upload', { method: 'POST', body: formData }); const data = await res.json(); if (data.success) { toast.success(data.message, { id: toastId }); if (refreshAdminData) refreshAdminData(); } else { toast.error(data.message, { id: toastId }); } } catch (err) { toast.error(t('toast.import_error'), { id: toastId }); } e.target.value = null; 
  };

  const handleBoxFileUpload = async (e) => {
    const files = e.target.files; if (!files || files.length === 0) return; const formData = new FormData(); for (let i = 0; i < files.length; i++) { formData.append('files', files[i]); } const toastId = toast.loading(t('toast.importing_box'));
    try { const res = await fetch('/api/boxes/upload', { method: 'POST', body: formData }); const data = await res.json(); if (data.success) { toast.success(data.message, { id: toastId }); if (refreshAdminData) refreshAdminData(); } else { toast.error(data.message, { id: toastId }); } } catch (err) { toast.error(t('toast.import_error'), { id: toastId }); } e.target.value = null; 
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
      <div className="flex space-x-6 border-b-2 border-slate-700/50 pb-4 mb-6 print:hidden">
        <button onClick={() => setAdminSubTab('items')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'items' ? 'text-blue-400 border-b-4 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>{t('tabs.items')}</button>
        <button onClick={() => setAdminSubTab('boxes')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'boxes' ? 'text-blue-400 border-b-4 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>{t('tabs.boxes')}</button>
        <button onClick={() => setAdminSubTab('users')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'users' ? 'text-blue-400 border-b-4 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>{t('tabs.users')}</button>
      </div>

      {/* ========================================== */}
      {/* 🏷️ แท็บที่ 1: หน้าจัดการมาสเตอร์สินค้า */}
      {/* ========================================== */}
      {adminSubTab === 'items' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="space-y-6 h-fit">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm text-slate-200">
              <h3 className="text-xl font-bold mb-4">{editingItemId ? t('item.edit_title') : t('item.add_title')}</h3>
              <form onSubmit={handleItemSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">{t('item.id')}</label><input type="text" required disabled={!!editingItemId} value={itemForm.itemId || ''} onChange={(e) => setItemForm(prev => ({ ...prev, itemId: String(e.target.value).toUpperCase() }))} className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white outline-none" /></div>
                <div><label className="block text-sm font-medium mb-1">{t('item.name')}</label><input type="text" value={itemForm.itemName || ''} onChange={(e) => setItemForm({...itemForm, itemName: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white" /></div>
                <div><label className="block text-sm font-medium mb-1">{t('item.customer')}</label><input type="text" value={itemForm.supplier || ''} onChange={(e) => setItemForm({...itemForm, supplier: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white" /></div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">{t('item.weight')}</label><input type="number" step="0.001" required value={itemForm.itemWeight || ''} onChange={(e) => setItemForm({...itemForm, itemWeight: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white" /></div>
                  <div><label className="block text-sm font-medium mb-1 text-blue-300">{t('item.qty_per_box')}</label><input type="number" required min="1" value={itemForm.stdPackQty || ''} onChange={(e) => setItemForm({...itemForm, stdPackQty: parseInt(e.target.value) || 1})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white" /></div>
                </div>
                
               <div>
                  <label className="block text-sm font-medium mb-1">{t('item.default_box')}</label>
                  <select value={itemForm.defaultPckId || ''} onChange={(e) => setItemForm({...itemForm, defaultPckId: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white outline-none">
                    <option value="" className="bg-slate-800 text-white">{t('item.select_box')}</option>
                    {[...(boxes || [])]
                      .sort((a, b) => String(a.pckId || a.pckid || '').localeCompare(String(b.pckId || b.pckid || ''), undefined, {numeric: true}))
                      .map(b => { 
                        const id = b.pckId || b.pckid; 
                        return id ? <option key={id} value={id} className="bg-slate-800 text-white">{id} {b.codename ? `(${b.codename})` : ''}</option> : null; 
                    })}
                  </select>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button type="submit" className="flex-1 bg-green-600 text-white font-bold p-2 rounded hover:bg-green-500">{t('common.save')}</button>
                  {editingItemId && <button type="button" onClick={() => { setEditingItemId(null); setItemForm({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '',  stdPackQty: 1 }); }} className="bg-slate-600 text-white font-bold p-2 rounded hover:bg-slate-500">{t('common.cancel')}</button>}
                </div>
              </form>
            </div>

            {!editingItemId && (
              <div className="bg-purple-900/30 p-6 rounded-xl border border-purple-500/30">
                <h3 className="text-lg font-bold text-purple-300 mb-2">{t('item.import_excel')}</h3>
                <div className="space-y-3">
                  <input type="file" id="items-file-input" accept=".xlsx, .xls, .csv" multiple onChange={handleFileUpload} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer" />
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col h-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-800 p-4 mb-4 rounded-xl border border-slate-700 shadow-sm">
              <div className="lg:col-span-4 w-full flex items-center bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                <span className="text-slate-400 mr-2">🔍</span>
               <input type="text" placeholder={t('item.search_placeholder')} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full outline-none text-sm text-white bg-transparent" />
                {searchTerm && <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="text-slate-400 hover:text-red-400 font-bold ml-2">✕</button>}
              </div>

              <div className="lg:col-span-8 flex flex-wrap items-center justify-start lg:justify-end gap-3 text-slate-200 w-full">
                <div className="flex items-center gap-2">
                  <label className="font-bold text-sm whitespace-nowrap">{t('item.filter_customer')}</label>
                  <select value={filterCustomer} onChange={(e) => { setFilterCustomer(e.target.value); setCurrentPage(1); }} className="p-2 w-auto min-w-[120px] border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium bg-slate-700 text-white">
                    {uniqueCustomers.map((cust, idx) => (
                      <option key={idx} value={cust} className="bg-slate-800 text-white">{cust === 'All' ? t('item.filter_all') : cust}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="font-bold text-sm whitespace-nowrap">{t('item.filter_box')}</label>
                  <select value={filterBoxStatus} onChange={(e) => { setFilterBoxStatus(e.target.value); setCurrentPage(1); }} className="p-2 w-auto min-w-[120px] border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium bg-slate-700 text-white">
                    <option value="All" className="bg-slate-800 text-white">{t('item.filter_all')}</option>
                    <option value="NoBox" className="bg-slate-800 text-white">{t('item.filter_no_box')}</option>
                    <option value="HasBox" className="bg-slate-800 text-white">{t('item.filter_has_box')}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="font-bold text-sm whitespace-nowrap">{t('common.sort_by')}</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-2 w-auto min-w-[120px] border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium bg-slate-700 text-white">
                    <option value="id_asc" className="bg-slate-800 text-white">{t('sort.id_asc')}</option>
                    <option value="id_desc" className="bg-slate-800 text-white">{t('sort.id_desc')}</option>
                    <option value="name_asc" className="bg-slate-800 text-white">{t('sort.name_asc')}</option>
                    <option value="name_desc" className="bg-slate-800 text-white">{t('sort.name_desc')}</option>
                  </select>
                </div>

                <button onClick={handleExportItems} className="bg-purple-900/40 hover:bg-purple-600 text-purple-200 font-bold py-2 px-4 rounded-lg border border-purple-500/50 transition-all flex items-center gap-2 whitespace-nowrap shadow-sm">
                  {t('common.download_template')}
                </button>
              </div>
            </div>

            {selectedItemIds.length > 0 && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 mb-4 text-slate-200 shadow-md transition-all animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{t('bulk.selected')} <span className="text-xl font-black text-amber-400">{selectedItemIds.length}</span> {t('bulk.items')}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t('bulk.hint')}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <input type="text" placeholder={t('bulk.change_customer')} value={bulkForm.supplier} onChange={(e) => setBulkForm({...bulkForm, supplier: e.target.value})} className="p-1.5 border border-slate-600 rounded bg-slate-700 text-xs text-white outline-none w-36" />
                    
                   <select value={bulkForm.defaultPckId} onChange={(e) => setBulkForm({...bulkForm, defaultPckId: e.target.value})} className="p-1.5 border border-slate-600 rounded bg-slate-700 text-xs text-white outline-none w-auto max-w-[250px]">
                      <option value="" className="bg-slate-800 text-white">{t('bulk.change_box')}</option>
                      {[...(boxes || [])]
                        .sort((a, b) => String(a.pckId || a.pckid || '').localeCompare(String(b.pckId || b.pckid || ''), undefined, {numeric: true}))
                        .map(b => {
                          const id = b.pckId || b.pckid;
                          return id ? <option key={id} value={id} className="bg-slate-800 text-white">{id} {b.codename ? `(${b.codename})` : ''}</option> : null;
                      })}
                    </select>

                    <div className="flex gap-2">
                      <button onClick={handleBulkUpdateSubmit} className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2 px-3 rounded shadow transition-colors">{t('bulk.update_btn')}</button>
                      <button onClick={handleBulkDeleteSubmit} className="bg-red-900/60 hover:bg-red-600 text-red-200 font-bold text-xs py-2 px-3 rounded shadow transition-colors">{t('bulk.delete_btn')}</button>
                      <button onClick={() => setSelectedItemIds([])} className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs py-2 px-2 rounded">{t('bulk.cancel_btn')}</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-slate-700 flex-1 shadow-sm">
              <table className="min-w-full bg-slate-800">
                <thead className="bg-slate-900/50 border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-blue-500 rounded cursor-pointer" 
                        checked={currentItems.length > 0 && currentItems.map(item => item.itemId || item.itemid).every(id => selectedItemIds.includes(id))}
                        onChange={handleSelectAllCurrentPage}
                      />
                    </th>
                    <th className="py-3 px-4 text-left text-slate-300 font-bold">{t('table.item_id')}</th>
                    <th className="py-3 px-4 text-left text-slate-300 font-bold">{t('table.item_name')}</th>
                    <th className="py-3 px-4 text-left text-slate-300 font-bold">{t('table.customer')}</th>
                    <th className="py-3 px-4 text-left text-slate-300 font-bold">{t('table.std_box')}</th>
                    <th className="py-3 px-4 text-center text-slate-300 font-bold">{t('table.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {currentItems.length > 0 ? (
                    currentItems.map(item => {
                      const id = item.itemId || item.itemid;
                      const name = item.itemName || item.itemname;
                      const isChecked = selectedItemIds.includes(id);
                      return (
                        <tr key={id} className={`transition-colors ${isChecked ? 'bg-blue-950/30 hover:bg-blue-950/40' : 'hover:bg-white/10'}`}>
                          
                          <td className="py-3 px-3 text-center">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 text-blue-500 rounded cursor-pointer"
                              checked={isChecked}
                              onChange={() => handleSelectItem(id)}
                            />
                          </td>

                          <td className="py-3 px-4 font-mono font-black text-blue-400">{id}</td>
                          <td className="py-3 px-4 text-sm font-bold text-gray-200">{name}</td>
                          <td className="py-3 px-4 text-gray-400 font-medium text-sm">{item.supplier || '-'}</td>
                          <td className="py-3 px-4 text-sm">
                            <div className="font-bold text-gray-200 bg-white/10 px-2 py-1 rounded-md inline-block shadow-sm mr-2">{item.defaultPckId || '-'}</div>
                            <span className="text-xs text-blue-300 font-bold bg-blue-900/50 px-2 py-1 rounded">{t('common.capacity')} {item.stdPackQty || 1}</span>
                          </td>
                          <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                            <button onClick={() => { setEditingItemId(id); setItemForm({ itemId: id, itemName: name, supplier: item.supplier, itemWeight: item.itemWeight, defaultPckId: item.defaultPckId || '' ,stdPackQty: item.stdPackQty || 1 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-md hover:bg-blue-500/40 font-bold">{t('common.edit')}</button>
                            <button onClick={() => handleDeleteItem(id)} className="text-sm bg-red-500/20 text-red-400 px-3 py-1.5 rounded-md hover:bg-red-500/40 font-bold">{t('common.delete')}</button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr><td colSpan="6" className="py-8 text-center text-slate-400 font-bold">{t('table.no_data')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredData.length > 0 && (
              <div className="flex justify-between items-center mt-4 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm text-slate-300">
                <div className="text-sm font-medium">{t('pagination.showing')} <span className="font-bold text-blue-400">{indexOfFirstItem + 1}</span> {t('pagination.to')} <span className="font-bold text-blue-400">{Math.min(indexOfLastItem, filteredData.length)}</span> {t('pagination.from')} <span className="font-bold">{filteredData.length}</span> {t('pagination.items')}</div>
                <div className="flex gap-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm disabled:opacity-50 font-bold text-sm hover:bg-slate-600">{t('pagination.prev')}</button>
                  <div className="px-3 py-1.5 text-sm font-bold bg-slate-700 border border-slate-600 rounded-md shadow-sm">{currentPage} / {totalPages}</div>
                  <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm disabled:opacity-50 font-bold text-sm hover:bg-slate-600">{t('pagination.next')}</button>
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
               <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm text-slate-200">
                <h3 className="text-xl font-bold mb-4">{editingBoxId ? t('box.edit_title') : t('box.add_title')}</h3>
                <form onSubmit={handleBoxSubmit} className="space-y-4">
                  <div><label className="block text-sm font-bold mb-1">{t('box.id')}</label><input type="text" required disabled={!!editingBoxId} value={boxForm.pckId || ''} onChange={(e) => setBoxForm(prev => ({ ...prev, pckId: String(e.target.value).toUpperCase() }))} className="w-full p-2 border border-slate-600 rounded bg-slate-700 outline-none text-white" /></div>
                  
                  <div>
                    <label className="block text-sm font-bold mb-1 text-indigo-300">{t('box.codename')}</label>
                    <input 
                      type="text" 
                      value={boxForm.codename || ''} 
                      onChange={(e) => setBoxForm({...boxForm, codename: e.target.value})} 
                      className="w-full p-2 border border-slate-600 rounded bg-slate-700 outline-none text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                      placeholder={t('box.codename_placeholder')} 
                    />
                  </div>

                  <div><label className="block text-sm font-bold mb-1">{t('box.desc')}</label><input type="text" required value={boxForm.description || ''} onChange={(e) => setBoxForm({...boxForm, description: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 outline-none text-white" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold mb-1">{t('box.capacity')}</label><input type="number" required value={boxForm.maxCapacity || ''} onChange={(e) => setBoxForm({...boxForm, maxCapacity: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 outline-none text-white" /></div>
                    <div><label className="block text-sm font-bold mb-1">{t('box.stock')}</label><input type="number" required value={boxForm.currentStock || 0} onChange={(e) => setBoxForm({...boxForm, currentStock: e.target.value})} className="w-full p-2 border border-slate-600 rounded outline-none font-bold bg-slate-700 text-blue-400" /></div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button type="submit" className="flex-1 bg-green-600 hover:bg-green-500 transition-colors text-white font-bold p-2 rounded shadow">{t('common.save')}</button>
                    {editingBoxId && <button type="button" onClick={() => { setEditingBoxId(null); setBoxForm({ pckId: '', codename: '', description: '', maxCapacity: '', currentStock: 0 }); }} className="bg-slate-600 hover:bg-slate-500 text-white font-bold p-2 rounded">{t('common.cancel')}</button>}
                  </div>
                </form>
              </div>

              {!editingBoxId && (
                <div className="bg-emerald-900/30 p-6 rounded-xl border border-emerald-500/30">
                  <h3 className="text-lg font-bold text-emerald-300 mb-2">{t('box.import_excel')}</h3>
                  <div className="space-y-3">
                    <input type="file" accept=".xlsx, .xls, .csv" multiple onChange={handleBoxFileUpload} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer" />
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
                <h1 className="text-3xl font-black mb-2">{t('box.report_title')}</h1>
                <p className="text-gray-600 font-medium">{t('box.report_date')} {new Date().toLocaleDateString('th-TH')} {t('box.report_time')} {new Date().toLocaleTimeString('th-TH')}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-800 p-4 mb-4 rounded-xl border border-slate-700 shadow-sm print:hidden">
                <div className="lg:col-span-5 w-full flex items-center bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 shadow-sm">
                  <span className="text-slate-400 mr-2">🔍</span>
                  <input type="text" placeholder={t('box.search_placeholder')} value={boxSearchTerm} onChange={(e) => setBoxSearchTerm(e.target.value)} className="w-full outline-none text-sm text-white bg-transparent" />
                  {boxSearchTerm && <button onClick={() => setBoxSearchTerm('')} className="text-slate-400 hover:text-red-400 font-bold ml-2">✕</button>}
                </div>

                <div className="lg:col-span-7 flex flex-wrap items-center justify-start lg:justify-end gap-3 w-full text-slate-200">
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-sm whitespace-nowrap">{t('common.sort_by')}</label>
                    <select value={boxSortBy} onChange={(e) => setBoxSortBy(e.target.value)} className="p-2 w-auto min-w-[140px] border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium bg-slate-700 text-white">
                      <option value="id_asc" className="bg-slate-800 text-white">{t('sort.box_id_asc')}</option>
                      <option value="id_desc" className="bg-slate-800 text-white">{t('sort.box_id_desc')}</option>
                      <option value="desc_asc" className="bg-slate-800 text-white">{t('sort.desc_asc')}</option>
                      <option value="desc_desc" className="bg-slate-800 text-white">{t('sort.desc_desc')}</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all flex items-center gap-2 whitespace-nowrap">
                      {t('box.print_stock')}
                    </button>
                    <button onClick={handleExportBoxes} className="bg-emerald-900/40 hover:bg-emerald-600 text-emerald-200 font-bold py-2 px-4 rounded-lg border border-emerald-500/50 transition-all flex items-center gap-2 whitespace-nowrap shadow-sm">
                      {t('common.download_template')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-700 flex-1 shadow-sm print:overflow-visible print:border-gray-400 print:shadow-none print:block">
                <table className="min-w-full bg-slate-800 print:bg-white print:text-black">
                  <thead className="bg-slate-900/50 border-b border-slate-700 print:bg-gray-200 print:border-gray-400">
                    <tr>
                      <th className="py-3 px-4 text-left text-slate-300 print:text-black font-bold border-r border-transparent print:border-gray-300">{t('table.box_id')}</th>
                      <th className="py-3 px-4 text-left text-slate-300 print:text-black font-bold border-r border-transparent print:border-gray-300">{t('table.box_desc')}</th>
                      <th className="py-3 px-4 text-center text-slate-300 print:text-black font-bold border-r border-transparent print:border-gray-300">{t('table.box_stock')}</th>
                      <th className="py-3 px-4 text-center text-slate-300 print:hidden font-bold">{t('table.action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 print:divide-gray-300">
                    {processedBoxes.length > 0 ? (
                      processedBoxes.map(box => {
                        const id = box?.pckId || box?.pckid;
                        return (
                          <tr key={id} className="hover:bg-white/10 print:hover:bg-transparent transition-colors print:break-inside-avoid">
                            <td className="py-3 px-4 font-mono font-black text-blue-400 print:text-black border-r border-transparent print:border-gray-300">{id}</td>
                            <td className="py-3 px-4 text-gray-200 print:text-black font-medium text-sm border-r border-transparent print:border-gray-300">
                              {box?.description || '-'}
                              {box?.codename && <div className="text-xs text-indigo-300 font-bold mt-1">{t('box.codename_label')} {box.codename}</div>}
                            </td>
                            <td className="py-3 px-4 text-center border-r border-transparent print:border-gray-300">
                              <span className="font-black text-lg text-blue-400 print:text-black">{box?.currentStock || 0}</span>
                              <p className="text-xs text-slate-400 print:text-gray-500 font-bold mt-0.5">{t('box.packaging')}</p>
                            </td>
                            <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap print:hidden">
                              <button onClick={() => { setEditingBoxId(id); setBoxForm({ pckId: id, codename: box.codename || '', description: box.description, maxCapacity: box.maxCapacity, currentStock: box.currentStock || 0 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-md hover:bg-blue-500/40 font-bold shadow-sm">{t('common.edit')}</button>
                              <button onClick={() => handleBoxDelete(id)} className="text-sm bg-red-500/20 text-red-400 px-3 py-1.5 rounded-md hover:bg-red-500/40 font-bold shadow-sm">{t('common.delete')}</button>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr><td colSpan="4" className="py-8 text-center text-slate-400 font-bold">{t('table.no_box_data')}</td></tr>
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
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm text-slate-200">
              <h3 className="text-xl font-bold mb-4">{editingUserId ? t('user.edit_title') : t('user.add_title')}</h3>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">{t('user.username')}</label><input type="text" required disabled={!!editingUserId} value={userForm.username || ''} onChange={(e) => setUserForm(prev => ({ ...prev, username: String(e.target.value).toUpperCase() }))} className="w-full p-2 border border-slate-600 rounded bg-slate-700 outline-none text-white" /></div>
                <div><label className="block text-sm font-medium mb-1">{editingUserId ? t('user.new_password') : t('user.password')}</label><input type="password" required={!editingUserId} value={userForm.passwordHash || ''} onChange={(e) => setUserForm({...userForm, passwordHash: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 outline-none text-white" /></div>
                <div><label className="block text-sm font-medium mb-1">{t('user.fullname')}</label><input type="text" required value={userForm.firstName || ''} onChange={(e) => setUserForm({...userForm, firstName: e.target.value})} className="w-full p-2 border border-slate-600 rounded bg-slate-700 outline-none text-white" /></div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('user.role')}</label>
                  <select value={userForm.role || 'operator'} onChange={(e) => setUserForm({...userForm, role: e.target.value})} className="w-full p-2 border border-slate-600 rounded font-bold bg-slate-700 outline-none text-white">
                    <option value="operator" className="bg-slate-800 text-white">{t('user.role_operator')}</option>
                    <option value="admin" className="bg-slate-800 text-white">{t('user.role_admin')}</option>
                  </select>
                </div>

                <div className="flex space-x-2 pt-4"><button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold p-3 rounded-lg shadow-md transition-colors">{t('common.save_data')}</button>{editingUserId && <button type="button" onClick={() => { setEditingUserId(null); setUserForm({ username: '', passwordHash: '', firstName: '', role: 'operator' }); }} className="bg-slate-600 hover:bg-slate-500 text-white font-bold p-3 rounded-lg transition-colors">{t('common.cancel')}</button>}</div>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2 overflow-x-auto">
            <table className="min-w-full bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-slate-900/50 text-slate-300">
                <tr><th className="py-4 px-4 text-left font-bold">{t('table.username')}</th><th className="py-4 px-4 text-left font-bold">{t('table.fullname')}</th><th className="py-4 px-4 text-center font-bold">{t('table.role')}</th><th className="py-4 px-4 text-center font-bold">{t('table.action')}</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {users && users.length > 0 ? (
                  users.filter(u => u && u.username).map(u => (
                    <tr key={u?.id} className="hover:bg-white/10 transition-colors">
                      <td className="py-3 px-4 font-mono font-black text-blue-400">{u?.username}</td>
                      <td className="py-3 px-4 text-gray-200 font-bold text-sm">{u?.firstName}</td>
                      <td className="py-3 px-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-black uppercase shadow-sm ${u?.role?.toLowerCase() === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{u?.role}</span></td>
                      <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap"><button onClick={() => { setEditingUserId(u.id); setUserForm({ username: u.username, passwordHash: '', firstName: u.firstName, role: u.role?.toLowerCase() }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-md hover:bg-blue-500/40 font-bold shadow-sm">{t('common.edit_light')}</button>{currentUser.id !== u.id && <button onClick={() => handleUserDelete(u.id)} className="text-sm bg-red-500/20 text-red-400 px-3 py-1.5 rounded-md hover:bg-red-500/40 font-bold shadow-sm">{t('common.delete')}</button>}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="py-8 text-center text-slate-400 font-bold">{t('table.no_user_data')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}