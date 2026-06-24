/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '../utils/axiosConfig'; // 🌟 ดึง API ที่มี Interceptor แปะ Token มาใช้
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import BoxCodenameUpdater from './BoxCodenameUpdater';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react'; // 🌟 ไอคอนสำหรับปุ่มค้นหา Template

export default function AdminPanel({ currentUser, adminSubTab, setAdminSubTab, items, boxes, users, refreshAdminData }) {
  const { t } = useTranslation();

  // ================= State Management =================
  const [itemForm, setItemForm] = useState({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', stdPackQty: 1, boxesPerUnit: 1 });
  const [editingItemId, setEditingItemId] = useState(null);

  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [bulkForm, setBulkForm] = useState({ defaultPckId: '', supplier: '' });

  const [boxForm, setBoxForm] = useState({ pckId: '', codename: '', description: '', maxCapacity: '', currentStock: 0, boundPalletId: null });
  const [editingBoxId, setEditingBoxId] = useState(null);

  const [palletsList, setPalletsList] = useState([]);

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

  const NODE_API_URL = import.meta.env.VITE_NODE_API_URL || 'https://zenix-packing-hub.onrender.com';

  // ================= Hooks =================
  useEffect(() => {
    const fetchPalletsForDropdown = async () => {
      try {
        // 🌟 เปลี่ยนมาดึงตรงจาก Supabase เพื่อเลี่ยงปัญหา 403 จากหลังบ้าน
        const { data, error } = await supabase.from('Pallet').select('*');
        if (error) throw error;
        if (data) {
          setPalletsList(data);
        }
      } catch (error) {
        console.error('ดึงข้อมูลพาเลทไม่สำเร็จ:', error);
      }
    };
    fetchPalletsForDropdown();
  }, []);

  // ================= Handlers =================

  // 🌟 ฟังก์ชันโหลด Template จากรหัส Item (ERP Simulation)
  const handleLoadItemTemplate = async () => {
    if (!itemForm.itemId || itemForm.itemId.trim() === '') {
      toast.error('กรุณากรอกรหัส Item ก่อนกดค้นหา');
      return;
    }

    const toastId = toast.loading('กำลังค้นหาข้อมูลสินค้า...');
    const searchId = itemForm.itemId.trim().toUpperCase();

    try {
      const existingItem = (items || []).find(i => String(i.itemId || i.itemid).toUpperCase() === searchId);

      if (existingItem) {
        toast.success(`พบข้อมูล ${searchId} ในระบบ กำลังเข้าโหมดแก้ไข`, { id: toastId });
        setEditingItemId(existingItem.itemId || existingItem.itemid);
        setItemForm({
          itemId: existingItem.itemId || existingItem.itemid,
          itemName: existingItem.itemName || existingItem.itemname || '',
          supplier: existingItem.supplier || '',
          itemWeight: existingItem.itemWeight || '',
          defaultPckId: existingItem.defaultPckId || '',
          stdPackQty: existingItem.stdPackQty || 1,
          boxesPerUnit: existingItem.boxesPerUnit || 1
        });
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 600));

      if (searchId === 'PART-A01' || searchId === 'D57240261201') {
        toast.success('โหลด Template สินค้าจากระบบส่วนกลางสำเร็จ!', { id: toastId });
        setItemForm(prev => ({
          ...prev,
          itemName: 'Aerospace Aluminum Profile (Small Bracket)',
          supplier: 'AeroSpace Co.',
          itemWeight: 0.28,
          defaultPckId: 'AERO-001',
          stdPackQty: 20,
          boxesPerUnit: 1
        }));
      } else {
        toast.error('ไม่พบข้อมูลสินค้านี้ในระบบ Master Data', { id: toastId });
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล', { id: toastId });
    }
  };

  
 
  // 🌟 ฟังก์ชันสำหรับเซ็ตระบบ Import สต๊อกสินค้าจากไฟล์ Excel ERP (FIFO)
  // 🌟 ฟังก์ชันสำหรับเซ็ตระบบ Import สต๊อกสินค้าจากไฟล์ Excel ERP (FIFO)
  const handleImportStocksExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const toastId = toast.loading('กำลังอ่านไฟล์ Excel สต๊อกสินค้าจาก ERP...');
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;

        // 🌟 ท่าไม้ตายปราบ Vite: เช็กว่าไลบรารีมันซ่อนอยู่ใน .default หรือไม่!
        const sheetJS = XLSX.default ? XLSX.default : XLSX;

        const wb = sheetJS.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // ใช้ sheetJS ตัวใหม่ที่เช็กแล้วมาดึง utils
        const rawData = sheetJS.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
          toast.error('ไม่พบข้อมูลในไฟล์ Excel กรุณาตรวจสอบอีกครั้ง', { id: toastId });
          return;
        }

        const payload = rawData.map((row) => {
          const itemCode = row['Item'] || row['itemId'];
          const lotNo = row['Lot'] || row['lotNo'];
          const qtyOnHa = Number(row['Qty On Ha'] || row['qtyOnHand'] || 0);
          const reserved = Number(row['Reserved'] || 0);
          const assigned = Number(row['Assigned'] || 0);

          const actualQtyOnHand = Math.max(0, qtyOnHa - reserved - assigned);
          let receiveDate = row['dcoCreate'] || row['receiveDate'] || new Date().toISOString();

          return {
            itemId: itemCode ? String(itemCode).trim().toUpperCase() : null,
            lotNo: lotNo ? String(lotNo).trim() : 'UNKNOWN-LOT',
            qtyOnHand: actualQtyOnHand,
            receiveDate: receiveDate
          };
        }).filter(stock => stock.itemId && stock.qtyOnHand > 0);

        if (payload.length === 0) {
          toast.error('❌ ไม่พบรายการสินค้าที่มีสต๊อกพร้อมส่ง (ยอดหลังหักจองต้อง > 0)', { id: toastId });
          return;
        }

        toast.loading(`กำลังจัดคิวสต๊อก ${payload.length} รายการลง Database...`, { id: toastId });

        const { error } = await supabase
          .from('item_stocks')
          .insert(payload);

        if (error) throw error;

        toast.success(`🎉 นำเข้าข้อมูลสต๊อก FIFO สำเร็จ ${payload.length} รายการ`, { id: toastId });

      } catch (err) {
        console.error("🔥 Import สต๊อกพัง:", err);
        toast.error('Import ล้มเหลว: ' + err.message, { id: toastId });
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = null;
  };
  
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...itemForm,
      itemName: (itemForm.itemName || '').trim() === '' ? itemForm.itemId : itemForm.itemName,
      boxesPerUnit: itemForm.boxesPerUnit ? Number(itemForm.boxesPerUnit) : 1,
      updatedAt: new Date().toISOString()
    };

    const toastId = toast.loading(t('toast.saving_item'));
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
        toast.success(t('toast.save_item_success'), { id: toastId });
        setItemForm({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', stdPackQty: 1, boxesPerUnit: 1 });
        setEditingItemId(null);
        if (refreshAdminData) refreshAdminData();
      } else {
        if (error.code === '23505' || error.message.includes('duplicate key')) {
          toast.error(t('toast.save_item_duplicate'), { id: toastId });
        } else {
          toast.error(t('toast.save_error') + error.message, { id: toastId });
        }
      }
    } catch (err) {
      toast.error(t('toast.save_item_error'), { id: toastId });
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItemIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
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
      const { error } = await supabase.from('items').update(payload).in('itemId', selectedItemIds);
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
      const { error } = await supabase.from('items').delete().in('itemId', selectedItemIds);
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
    try {
      const { error } = await supabase.from('items').delete().eq('itemId', id);
      if (!error) { toast.success(t('toast.delete_success'), { id: toastId }); if (refreshAdminData) refreshAdminData(); }
      else { toast.error(t('toast.delete_error_msg') + error.message, { id: toastId }); }
    } catch (err) { toast.error(t('toast.delete_error'), { id: toastId }); }
  };

  const handleBoxSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      pckId: boxForm.pckId,
      codename: boxForm.codename,
      description: boxForm.description,
      maxCapacity: boxForm.maxCapacity,
      currentStock: boxForm.currentStock,
      boundPalletId: boxForm.boundPalletId,
      updatedAt: new Date().toISOString()
    };

    const toastId = toast.loading(t('toast.saving_box'));
    try {
      let error;
      if (editingBoxId) {
        const { error: updateError } = await supabase.from('boxes').update(payload).eq('pckId', editingBoxId); error = updateError;
      } else {
        const { error: insertError } = await supabase.from('boxes').insert([payload]); error = insertError;
      }
      if (!error) {
        toast.success(t('toast.save_box_success'), { id: toastId });
        setBoxForm({ pckId: '', codename: '', description: '', maxCapacity: '', currentStock: 0, boundPalletId: null });
        setEditingBoxId(null);
        if (refreshAdminData) refreshAdminData();
      } else {
        if (error.code === '23505' || error.message.includes('duplicate key')) { toast.error(t('toast.save_box_duplicate'), { id: toastId }); }
        else { toast.error(t('toast.save_error') + error.message, { id: toastId }); }
      }
    } catch (err) { toast.error(t('toast.save_box_error'), { id: toastId }); }
  };

  const handleBoxDelete = async (id) => {
    if (!confirm(t('confirm.delete_box'))) return;
    const toastId = toast.loading(t('toast.deleting_box'));
    try {
      const { error } = await supabase.from('boxes').delete().eq('pckId', id);
      if (!error) { toast.success(t('toast.delete_box_success'), { id: toastId }); if (refreshAdminData) refreshAdminData(); }
      else { toast.error(t('toast.delete_error_msg') + error.message, { id: toastId }); }
    } catch (err) { toast.error(t('toast.delete_error'), { id: toastId }); }
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
    const csvContent = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Template_Items_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(t('toast.export_item_success'));
  };

  const handleExportSelectedItems = () => {
    if (selectedItemIds.length === 0) {
      toast.error('กรุณาเลือกรายการที่ต้องการดาวน์โหลด');
      return;
    }

    const selectedData = (items || []).filter(item =>
      selectedItemIds.includes(item.itemId || item.itemid)
    );

    const headers = ["itemId", "itemName", "Customer", "itemWeight", "defaultPckId", "stdPackQty"];
    const csvRows = [
      headers.join(','),
      ...selectedData.map(item => [
        item.itemId || '',
        `"${(item.itemName || '').replace(/"/g, '""')}"`,
        `"${(item.supplier || '').replace(/"/g, '""')}"`,
        item.itemWeight || 0,
        item.defaultPckId || '',
        item.stdPackQty || 1
      ].join(','))
    ];

    const csvContent = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Selected_Items_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`ดาวน์โหลด ${selectedData.length} รายการสำเร็จ!`);
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
      if (data.success) { toast.success(data.message, { id: toastId }); setEditingUserId(null); setUserForm({ username: '', passwordHash: '', firstName: '', role: 'operator' }); if (refreshAdminData) refreshAdminData(); }
      else { toast.error(t('toast.save_error') + data.message, { id: toastId }); }
    } catch (err) { toast.error(t('toast.save_user_error'), { id: toastId }); }
  };

  const handleUserDelete = async (id) => {
    if (!confirm(t('confirm.delete_user'))) return;
    const toastId = toast.loading(t('toast.deleting_user'));
    try { const { error } = await supabase.from('users').delete().eq('id', id); if (!error) { toast.success(t('toast.delete_user_success'), { id: toastId }); if (refreshAdminData) refreshAdminData(); } else { toast.error(t('toast.delete_error_msg') + error.message, { id: toastId }); } } catch (err) { toast.error(t('toast.delete_error'), { id: toastId }); }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) { formData.append('files', files[i]); }
    const toastId = toast.loading(t('toast.importing_item'));
    try {
      const res = await api.post(`${NODE_API_URL}/api/items/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('zenix_token')}`
        }
      });
      const data = res.data;
      if (data.success) {
        toast.success(data.message, { id: toastId });
        if (refreshAdminData) refreshAdminData();
      } else {
        toast.error(data.message, { id: toastId });
      }
    } catch (err) {
      console.error("🔥 สาเหตุที่พัง:", err);
      toast.error('พังเพราะ: ' + (err.response?.data?.message || err.message), { id: toastId });
    }
    e.target.value = null;
  };

  const handleBoxFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) { formData.append('files', files[i]); }
    const toastId = toast.loading(t('toast.importing_box'));
    try {
      const res = await api.post(`${NODE_API_URL}/api/boxes/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('zenix_token')}`
        }
      });
      const data = res.data;
      if (data.success) {
        toast.success(data.message, { id: toastId });
        if (refreshAdminData) refreshAdminData();
      } else {
        toast.error(data.message, { id: toastId });
      }
    } catch (err) {
      console.error("🔥 สาเหตุที่พัง:", err);
      toast.error('พังเพราะ: ' + (err.response?.data?.message || err.message), { id: toastId });
    }
    e.target.value = null;
  };

  // ================= Filters & Sorting =================
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
    if (!a || !b) return 0; const idA = String(a.pckId || a.pckid || ''); const idB = String(b.pckId || b.pckid || ''); if (boxSortBy === 'id_asc') return idA.localeCompare(idB, undefined, { numeric: true }); if (boxSortBy === 'id_desc') return idB.localeCompare(idA, undefined, { numeric: true }); return 0;
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

  // ================= Render =================
  return (
    <div className="bg-transparent rounded-xl p-2 md:p-6 ">
      {/* Menu Tabs */}
      <div className="flex space-x-6 border-b-2 border-gray-200 pb-4 mb-6 print:hidden">
        <button onClick={() => setAdminSubTab('items')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'items' ? 'text-[#0066CC] border-b-4 border-[#0066CC]' : 'text-gray-500 hover:text-[#0066CC]'}`}>{t('tabs.items')}</button>
        <button onClick={() => setAdminSubTab('boxes')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'boxes' ? 'text-[#0066CC] border-b-4 border-[#0066CC]' : 'text-gray-500 hover:text-[#0066CC]'}`}>{t('tabs.boxes')}</button>
        <button onClick={() => setAdminSubTab('users')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'users' ? 'text-[#0066CC] border-b-4 border-[#0066CC]' : 'text-gray-500 hover:text-[#0066CC]'}`}>{t('tabs.users')}</button>
      </div>

      {/* ========================================== */}
      {/* Tab 1: Item Master */}
      {/* ========================================== */}
      {adminSubTab === 'items' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6 h-fit">

            {/* Add/Edit Form */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg text-gray-800">
              <h3 className="text-xl font-black text-[#0066CC] mb-4">{editingItemId ? t('item.edit_title') : t('item.add_title')}</h3>
              <form onSubmit={handleItemSubmit} className="space-y-4">

                {/* 🌟 ช่อง Item ID แบบมีปุ่มค้นหา */}
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">
                    {t('item.id')} <span className="text-xs text-[#0066CC] font-normal ml-1">(พิมพ์รหัสแล้วกดค้นหา)</span>
                  </label>
                  <div className="relative">
                    <input type="text" required disabled={!!editingItemId} value={itemForm.itemId || ''} onChange={(e) => setItemForm(prev => ({ ...prev, itemId: String(e.target.value).toUpperCase() }))} className="w-full p-3 pr-12 border border-gray-300 rounded-lg bg-white text-gray-800 outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] transition-all disabled:bg-gray-100" />
                    {!editingItemId && (
                      <button type="button" onClick={handleLoadItemTemplate} className="absolute right-2 top-2 p-1.5 bg-blue-50 text-[#0066CC] hover:bg-[#0066CC] hover:text-white rounded-md transition-colors" title="โหลดข้อมูลเทมเพลต">
                        <Search size={20} />
                      </button>
                    )}
                  </div>
                </div>

                <div><label className="block text-sm font-bold text-gray-600 mb-1">{t('item.name')}</label><input type="text" value={itemForm.itemName || ''} onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] transition-all" /></div>
                <div><label className="block text-sm font-bold text-gray-600 mb-1">{t('item.customer')}</label><input type="text" value={itemForm.supplier || ''} onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] transition-all" /></div>

                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-sm font-bold text-gray-600 mb-1">{t('item.weight')}</label><input type="number" step="0.001" required value={itemForm.itemWeight || ''} onChange={(e) => setItemForm({ ...itemForm, itemWeight: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] transition-all" /></div>
                  <div><label className="block text-sm font-bold text-[#0066CC] mb-1">{t('item.qty_per_box')}</label><input type="number" required min="1" value={itemForm.stdPackQty || ''} onChange={(e) => setItemForm({ ...itemForm, stdPackQty: parseInt(e.target.value) || 1 })} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] transition-all" /></div>
                  <div><label className="block text-sm font-bold text-amber-600 mb-1">กล่อง/ชิ้น</label><input type="number" required min="1" value={itemForm.boxesPerUnit || 1} onChange={(e) => setItemForm({ ...itemForm, boxesPerUnit: parseInt(e.target.value) || 1 })} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all" /></div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">{t('item.default_box')}</label>
                  <select value={itemForm.defaultPckId || ''} onChange={(e) => setItemForm({ ...itemForm, defaultPckId: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] transition-all">
                    <option value="" className="text-gray-500">{t('item.select_box')}</option>
                    {[...(boxes || [])]
                      .sort((a, b) => String(a.pckId || a.pckid || '').localeCompare(String(b.pckId || b.pckid || ''), undefined, { numeric: true }))
                      .map(b => {
                        const id = b.pckId || b.pckid;
                        return id ? <option key={id} value={id} className="text-gray-800">{id} {b.codename ? `(${b.codename})` : ''}</option> : null;
                      })}
                  </select>
                </div>

                <div className="flex space-x-2 pt-4">
                  <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all">{t('common.save')}</button>
                  {editingItemId && <button type="button" onClick={() => { setEditingItemId(null); setItemForm({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', stdPackQty: 1, boxesPerUnit: 1 }); }} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg transition-all">{t('common.cancel')}</button>}
                </div>
              </form>
            </div>

            {/* 🌟 โซนนำเข้าข้อมูลผ่านไฟล์ Excel (ซ่อนไว้ตอนกำลังกดแก้ไขสินค้า) */}
            {!editingItemId && (
              <div className="space-y-4">

                {/* 1. กล่อง Import ข้อมูลสินค้าหลัก (Master Data) */}
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
                  <h3 className="text-sm font-black text-[#0066CC] mb-3 flex items-center gap-2">
                    <span>📑</span> นำเข้าข้อมูลสินค้าใหม่ (Master Data)
                  </h3>
                  <input
                    type="file"
                    id="items-file-input"
                    accept=".xlsx, .xls, .csv"
                    multiple
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#0066CC] file:text-white hover:file:bg-[#0052a3] cursor-pointer transition-all"
                  />
                </div>

                {/* 2. กล่อง Import สต๊อกประจำวัน (FIFO) */}
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm">
                  <h3 className="text-sm font-black text-amber-700 mb-3 flex items-center gap-2">
                    <span>📦</span> อัปเดตสต๊อกสินค้าจาก ERP (รายวัน)
                  </h3>
                  <label className="cursor-pointer w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm">
                    <span>📥</span> อัปโหลดไฟล์ Excel สต๊อก (FIFO)
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleImportStocksExcel}
                      className="hidden"
                    />
                  </label>
                  <div className="text-[10px] text-amber-600/80 text-center mt-2 font-medium">
                    *ระบบจะคำนวณหักยอด Reserved/Assigned อัตโนมัติ
                  </div>
                </div>

              </div>
            )}

          </div>

          <div className="lg:col-span-2 w-full min-w-0 flex flex-col h-full">

            {/* Search & Filter */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white p-5 mb-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="lg:col-span-4 w-full flex items-center bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 focus-within:border-[#0066CC] focus-within:ring-1 focus-within:ring-[#0066CC] transition-all">
                <input type="text" placeholder={t('item.search_placeholder')} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full outline-none text-sm text-gray-800 bg-transparent placeholder-gray-400" />
                {searchTerm && <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="text-gray-400 hover:text-red-500 font-bold ml-2">X</button>}
              </div>

              <div className="lg:col-span-8 flex flex-wrap items-center justify-start lg:justify-end gap-3 text-gray-700 w-full">
                <div className="flex items-center gap-2">
                  <label className="font-bold text-sm whitespace-nowrap">{t('item.filter_customer')}</label>
                  <select value={filterCustomer} onChange={(e) => { setFilterCustomer(e.target.value); setCurrentPage(1); }} className="p-2.5 w-auto min-w-[120px] border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC] outline-none text-sm font-medium bg-white text-gray-800">
                    {uniqueCustomers.map((cust, idx) => (
                      <option key={idx} value={cust}>{cust === 'All' ? t('item.filter_all') : cust}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="font-bold text-sm whitespace-nowrap">{t('item.filter_box')}</label>
                  <select value={filterBoxStatus} onChange={(e) => { setFilterBoxStatus(e.target.value); setCurrentPage(1); }} className="p-2.5 w-auto min-w-[120px] border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC] outline-none text-sm font-medium bg-white text-gray-800">
                    <option value="All">{t('item.filter_all')}</option>
                    <option value="NoBox">{t('item.filter_no_box')}</option>
                    <option value="HasBox">{t('item.filter_has_box')}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="font-bold text-sm whitespace-nowrap">{t('common.sort_by')}</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-2.5 w-auto min-w-[120px] border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC] outline-none text-sm font-medium bg-white text-gray-800">
                    <option value="id_asc">{t('sort.id_asc')}</option>
                    <option value="id_desc">{t('sort.id_desc')}</option>
                    <option value="name_asc">{t('sort.name_asc')}</option>
                    <option value="name_desc">{t('sort.name_desc')}</option>
                  </select>
                </div>

                <button onClick={handleExportItems} className="bg-white hover:bg-gray-50 text-[#0066CC] font-bold py-2.5 px-4 rounded-lg border border-[#0066CC] transition-all flex items-center gap-2 whitespace-nowrap shadow-sm">
                  {t('common.download_template')}
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedItemIds.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-gray-800 shadow-sm transition-all animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-amber-900">{t('bulk.selected')} <span className="text-xl font-black text-amber-600">{selectedItemIds.length}</span> {t('bulk.items')}</p>
                    <p className="text-xs text-amber-700/70 mt-0.5">{t('bulk.hint')}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <input type="text" placeholder={t('bulk.change_customer')} value={bulkForm.supplier} onChange={(e) => setBulkForm({ ...bulkForm, supplier: e.target.value })} className="p-2 border border-amber-300 rounded-lg bg-white text-sm text-gray-800 outline-none w-40 focus:ring-1 focus:ring-amber-500 focus:border-amber-500" />
                    <select value={bulkForm.defaultPckId} onChange={(e) => setBulkForm({ ...bulkForm, defaultPckId: e.target.value })} className="p-2 border border-amber-300 rounded-lg bg-white text-sm text-gray-800 outline-none w-auto max-w-[250px] focus:ring-1 focus:ring-amber-500 focus:border-amber-500">
                      <option value="">{t('bulk.change_box')}</option>
                      {[...(boxes || [])]
                        .sort((a, b) => String(a.pckId || a.pckid || '').localeCompare(String(b.pckId || b.pckid || ''), undefined, { numeric: true }))
                        .map(b => {
                          const id = b.pckId || b.pckid;
                          return id ? <option key={id} value={id}>{id} {b.codename ? `(${b.codename})` : ''}</option> : null;
                        })}
                    </select>

                    <div className="flex gap-2">
                      <button onClick={handleBulkUpdateSubmit} className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm py-2 px-4 rounded-lg shadow-sm transition-colors">{t('bulk.update_btn')}</button>
                      <button onClick={handleBulkDeleteSubmit} className="bg-red-100 hover:bg-red-500 text-red-600 hover:text-white font-bold text-sm py-2 px-4 rounded-lg shadow-sm transition-colors">{t('bulk.delete_btn')}</button>
                      <button onClick={handleExportSelectedItems} className="bg-blue-100 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-sm py-2 px-4 rounded-lg shadow-sm transition-colors">
                        📥 โหลดที่เลือก (CSV)
                      </button>

                      <button onClick={() => setSelectedItemIds([])} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-bold py-2 px-3 rounded-lg">X {t('bulk.cancel_btn')}</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="w-full overflow-x-auto rounded-xl border border-gray-200 flex-1 shadow-sm bg-white custom-scrollbar">
              <table className="w-full min-w-[1000px] divide-y divide-gray-200">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="py-4 px-4 text-center w-12"><input type="checkbox" className="w-4 h-4 accent-[#0066CC] rounded cursor-pointer" checked={currentItems.length > 0 && currentItems.map(item => item.itemId || item.itemid).every(id => selectedItemIds.includes(id))} onChange={handleSelectAllCurrentPage} /></th>
                    <th className="py-4 px-4 text-left text-gray-600 font-bold uppercase tracking-wider text-sm whitespace-nowrap">{t('table.item_id')}</th>
                    <th className="py-4 px-4 text-left text-gray-600 font-bold uppercase tracking-wider text-sm whitespace-nowrap">{t('table.item_name')}</th>
                    <th className="py-4 px-4 text-left text-gray-600 font-bold uppercase tracking-wider text-sm whitespace-nowrap">{t('table.customer')}</th>
                    <th className="py-4 px-4 text-left text-gray-600 font-bold uppercase tracking-wider text-sm whitespace-nowrap">{t('table.std_box')}</th>
                    <th className="py-4 px-4 text-center text-gray-600 font-bold uppercase tracking-wider text-sm whitespace-nowrap w-40">{t('table.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentItems.length > 0 ? (
                    currentItems.map(item => {
                      const id = item.itemId || item.itemid;
                      const name = item.itemName || item.itemname;
                      const isChecked = selectedItemIds.includes(id);
                      return (
                        <tr key={id} className={`transition-colors ${isChecked ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                          <td className="py-3 px-4 text-center"><input type="checkbox" className="w-4 h-4 accent-[#0066CC] rounded cursor-pointer" checked={isChecked} onChange={() => handleSelectItem(id)} /></td>
                          <td className="py-3 px-4 font-mono font-black text-[#0066CC] whitespace-nowrap">{id}</td>
                          <td className="py-3 px-4 text-sm font-bold text-gray-800">{name}</td>
                          <td className="py-3 px-4 text-gray-500 font-medium text-sm whitespace-nowrap">{item.supplier || '-'}</td>
                          <td className="py-3 px-4 text-sm whitespace-nowrap">
                            <div className="font-bold text-gray-800 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-md inline-block mr-2">{item.defaultPckId || '-'}</div>
                            <span className="text-xs text-[#0066CC] font-bold bg-blue-50 border border-blue-100 px-2 py-1 rounded mr-2">{t('common.capacity')} {item.stdPackQty || 1}</span>
                            {(item.boxesPerUnit && item.boxesPerUnit > 1) && <span className="text-xs text-amber-600 font-bold bg-amber-50 border border-amber-200 px-2 py-1 rounded">📦 แยก {item.boxesPerUnit} กล่อง</span>}
                          </td>
                          <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                            <button onClick={() => { setEditingItemId(id); setItemForm({ itemId: id, itemName: name, supplier: item.supplier, itemWeight: item.itemWeight, defaultPckId: item.defaultPckId || '', stdPackQty: item.stdPackQty || 1, boxesPerUnit: item.boxesPerUnit || 1 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-50 text-[#0066CC] hover:bg-[#0066CC] hover:text-white border border-blue-100 px-3 py-1.5 rounded-lg font-bold transition-colors">{t('common.edit_light')}</button>
                            <button onClick={() => handleDeleteItem(id)} className="text-sm bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-100 px-3 py-1.5 rounded-lg font-bold transition-colors">{t('common.delete')}</button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr><td colSpan="6" className="py-8 text-center text-gray-400 font-bold">{t('table.no_data')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredData.length > 0 && (
              <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-gray-600">
                <div className="text-sm font-medium">{t('pagination.showing')} <span className="font-bold text-[#0066CC]">{indexOfFirstItem + 1}</span> {t('pagination.to')} <span className="font-bold text-[#0066CC]">{Math.min(indexOfLastItem, filteredData.length)}</span> {t('pagination.from')} <span className="font-bold text-gray-800">{filteredData.length}</span> {t('pagination.items')}</div>
                <div className="flex gap-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm disabled:opacity-50 font-bold text-sm hover:bg-gray-50 transition-colors">{t('pagination.prev')}</button>
                  <div className="px-4 py-2 text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg">{currentPage} / {totalPages}</div>
                  <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm disabled:opacity-50 font-bold text-sm hover:bg-gray-50 transition-colors">{t('pagination.next')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* Tab 2: Box Master */}
      {/* ========================================== */}
      {adminSubTab === 'boxes' && (
        <div className="flex flex-col space-y-8 print:hidden">

          <BoxCodenameUpdater boxes={boxes} fetchAdminData={refreshAdminData} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">

            {/* Box Add/Edit Form */}
            <div className="space-y-6 h-fit print:hidden">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg text-gray-800">
                <h3 className="text-xl font-black text-[#0066CC] mb-4">{editingBoxId ? t('box.edit_title') : t('box.add_title')}</h3>
                <form onSubmit={handleBoxSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">{t('box.id')}</label>
                    <input type="text" required disabled={!!editingBoxId} value={boxForm.pckId || ''} onChange={(e) => setBoxForm(prev => ({ ...prev, pckId: String(e.target.value).toUpperCase() }))} className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] text-gray-800 disabled:bg-gray-100 disabled:text-gray-400" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1 text-[#0066CC]">{t('box.codename')}</label>
                    <input type="text" value={boxForm.codename || ''} onChange={(e) => setBoxForm({ ...boxForm, codename: e.target.value })} className="w-full p-3 border border-blue-200 rounded-lg bg-blue-50 outline-none text-gray-800 focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] placeholder-gray-400" placeholder={t('box.codename_placeholder')} />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">{t('box.desc')}</label>
                    <input type="text" required value={boxForm.description || ''} onChange={(e) => setBoxForm({ ...boxForm, description: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] text-gray-800" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">{t('box.capacity')}</label>
                      <input type="number" required value={boxForm.maxCapacity || ''} onChange={(e) => setBoxForm({ ...boxForm, maxCapacity: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] text-gray-800" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#0066CC] mb-1">{t('box.stock')}</label>
                      <input type="number" required value={boxForm.currentStock || 0} onChange={(e) => setBoxForm({ ...boxForm, currentStock: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] font-bold bg-white text-[#0066CC]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-amber-600 mb-1">🪵 ผูกกับพาเลท (Pallet Binding)</label>
                    <select
                      value={boxForm.boundPalletId || ''}
                      onChange={(e) => setBoxForm({ ...boxForm, boundPalletId: e.target.value || null })}
                      className="w-full p-3 border border-amber-200 rounded-lg bg-amber-50 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-gray-800 font-medium"
                    >
                      <option value="">-- ไม่ผูกพาเลท (ให้ระบบสุ่มหาให้อัตโนมัติ) --</option>
                      {palletsList?.map(p => (
                        <option key={p.palletId} value={p.palletId}>{p.palletId} ({p.description})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 transition-colors text-white font-bold py-3 px-4 rounded-lg shadow-sm">{t('common.save')}</button>
                    {editingBoxId && <button type="button" onClick={() => { setEditingBoxId(null); setBoxForm({ pckId: '', codename: '', description: '', maxCapacity: '', currentStock: 0, boundPalletId: null }); }} className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors">{t('common.cancel')}</button>}
                  </div>
                </form>
              </div>

              {!editingBoxId && (
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm">
                  <h3 className="text-lg font-black text-[#0066CC] mb-3 flex items-center gap-2">{t('box.import_excel')}</h3>
                  <div className="space-y-3">
                    <input type="file" accept=".xlsx, .xls, .csv" multiple onChange={handleBoxFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#0066CC] file:text-white hover:file:bg-[#0052a3] cursor-pointer transition-all" />
                  </div>
                </div>
              )}
            </div>

            {/* Box Table */}
            <div className="lg:col-span-2 flex flex-col h-full print:block print:h-auto print:w-full">
              <div className="hidden print:block mb-8 text-center text-black pt-4">
                <h1 className="text-3xl font-black mb-2">{t('box.report_title')}</h1>
                <p className="text-gray-600 font-medium">{t('box.report_date')} {new Date().toLocaleDateString('th-TH')} {t('box.report_time')} {new Date().toLocaleTimeString('th-TH')}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white p-5 mb-6 rounded-2xl border border-gray-200 shadow-sm print:hidden">
                <div className="lg:col-span-5 w-full flex items-center bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 focus-within:border-[#0066CC] focus-within:ring-1 focus-within:ring-[#0066CC] transition-all">
                  <input type="text" placeholder={t('box.search_placeholder')} value={boxSearchTerm} onChange={(e) => setBoxSearchTerm(e.target.value)} className="w-full outline-none text-sm text-gray-800 bg-transparent placeholder-gray-400" />
                  {boxSearchTerm && <button onClick={() => setBoxSearchTerm('')} className="text-gray-400 hover:text-red-500 font-bold ml-2">X</button>}
                </div>

                <div className="lg:col-span-7 flex flex-wrap items-center justify-start lg:justify-end gap-3 w-full text-gray-700">
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-sm whitespace-nowrap">{t('common.sort_by')}</label>
                    <select value={boxSortBy} onChange={(e) => setBoxSortBy(e.target.value)} className="p-2.5 w-auto min-w-[140px] border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC] outline-none text-sm font-medium bg-white text-gray-800">
                      <option value="id_asc">{t('sort.id_asc')}</option>
                      <option value="id_desc">{t('sort.id_desc')}</option>
                      <option value="desc_asc">{t('sort.desc_asc')}</option>
                      <option value="desc_desc">{t('sort.desc_desc')}</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => window.print()} className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 font-bold py-2.5 px-4 rounded-lg shadow-sm transition-all flex items-center gap-2 whitespace-nowrap">
                      {t('box.print_stock')}
                    </button>
                    <button onClick={handleExportBoxes} className="bg-white hover:bg-blue-50 text-[#0066CC] font-bold py-2.5 px-4 rounded-lg border border-[#0066CC] transition-all flex items-center gap-2 whitespace-nowrap shadow-sm">
                      {t('common.download_template')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 flex-1 shadow-sm bg-white print:overflow-visible print:border-gray-400 print:shadow-none print:block">
                <table className="min-w-full print:bg-white print:text-black">
                  <thead className="bg-gray-50 border-b border-gray-200 print:bg-gray-200 print:border-gray-400">
                    <tr>
                      <th className="py-4 px-4 text-left text-gray-600 print:text-black font-bold uppercase tracking-wider text-sm border-r border-transparent print:border-gray-300">{t('table.box_id')}</th>
                      <th className="py-4 px-4 text-left text-gray-600 print:text-black font-bold uppercase tracking-wider text-sm border-r border-transparent print:border-gray-300">{t('table.box_desc')}</th>
                      <th className="py-4 px-4 text-center text-gray-600 print:text-black font-bold uppercase tracking-wider text-sm border-r border-transparent print:border-gray-300">{t('table.box_stock')}</th>
                      <th className="py-4 px-4 text-center text-gray-600 print:hidden font-bold uppercase tracking-wider text-sm">{t('table.action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                    {processedBoxes.length > 0 ? (
                      processedBoxes.map(box => {
                        const id = box?.pckId || box?.pckid;
                        return (
                          <tr key={id} className="hover:bg-gray-50 print:hover:bg-transparent transition-colors print:break-inside-avoid">
                            <td className="py-3 px-4 font-mono font-black text-[#0066CC] print:text-black border-r border-transparent print:border-gray-300">{id}</td>
                            <td className="py-3 px-4 text-gray-800 print:text-black font-medium text-sm border-r border-transparent print:border-gray-300">
                              {box?.description || '-'}
                              <div className="mt-1 flex flex-wrap gap-2">
                                {box?.codename && <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded font-bold">{t('box.codename_label')} {box.codename}</span>}
                                {box?.boundPalletId && <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded font-bold">🪵 พาเลท: {box.boundPalletId}</span>}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center border-r border-transparent print:border-gray-300">
                              <span className="font-black text-2xl text-[#0066CC] print:text-black">{box?.currentStock || 0}</span>
                            </td>
                            <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap print:hidden">
                              <button onClick={() => { setEditingBoxId(id); setBoxForm({ pckId: id, codename: box.codename || '', description: box.description, maxCapacity: box.maxCapacity, currentStock: box.currentStock || 0, boundPalletId: box.boundPalletId || null }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-50 text-[#0066CC] hover:bg-[#0066CC] hover:text-white border border-blue-100 px-3 py-1.5 rounded-lg font-bold transition-colors">{t('common.edit')}</button>
                              <button onClick={() => handleBoxDelete(id)} className="text-sm bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-100 px-3 py-1.5 rounded-lg font-bold transition-colors">{t('common.delete')}</button>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr><td colSpan="4" className="py-8 text-center text-gray-400 font-bold">{t('table.no_box_data')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* Tab 3: User Management */}
      {/* ========================================== */}
      {adminSubTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6 h-fit">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg text-gray-800">
              <h3 className="text-xl font-black text-[#0066CC] mb-4">{editingUserId ? t('user.edit_title') : t('user.add_title')}</h3>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div><label className="block text-sm font-bold text-gray-600 mb-1">{t('user.username')}</label><input type="text" required disabled={!!editingUserId} value={userForm.username || ''} onChange={(e) => setUserForm(prev => ({ ...prev, username: String(e.target.value).toUpperCase() }))} className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] text-gray-800 disabled:bg-gray-100" /></div>
                <div><label className="block text-sm font-bold text-gray-600 mb-1">{editingUserId ? t('user.new_password') : t('user.password')}</label><input type="password" required={!editingUserId} value={userForm.passwordHash || ''} onChange={(e) => setUserForm({ ...userForm, passwordHash: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] text-gray-800" /></div>
                <div><label className="block text-sm font-bold text-gray-600 mb-1">{t('user.fullname')}</label><input type="text" required value={userForm.firstName || ''} onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] text-gray-800" /></div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">{t('user.role')}</label>
                  <select value={userForm.role || 'operator'} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg font-bold bg-white outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] text-gray-800">
                    <option value="operator">{t('user.role_operator')}</option>
                    <option value="admin">{t('user.role_admin')}</option>
                  </select>
                </div>

                <div className="flex space-x-2 pt-4">
                  <button type="submit" className="flex-1 bg-[#0066CC] hover:bg-[#0052a3] text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors">{t('common.save')}</button>
                  {editingUserId && <button type="button" onClick={() => { setEditingUserId(null); setUserForm({ username: '', passwordHash: '', firstName: '', role: 'operator' }); }} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors">{t('common.cancel')}</button>}
                </div>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2 overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow-sm">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <tr>
                  <th className="py-4 px-4 text-left font-bold uppercase tracking-wider text-sm">{t('table.username')}</th>
                  <th className="py-4 px-4 text-left font-bold uppercase tracking-wider text-sm">{t('table.fullname')}</th>
                  <th className="py-4 px-4 text-center font-bold uppercase tracking-wider text-sm">{t('table.role')}</th>
                  <th className="py-4 px-4 text-center font-bold uppercase tracking-wider text-sm">{t('table.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users && users.length > 0 ? (
                  users.filter(u => u && u.username).map(u => (
                    <tr key={u?.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-black text-[#0066CC]">{u?.username}</td>
                      <td className="py-3 px-4 text-gray-800 font-bold text-sm">{u?.firstName}</td>
                      <td className="py-3 px-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${u?.role?.toLowerCase() === 'admin' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>{u?.role}</span></td>
                      <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                        <button onClick={() => { setEditingUserId(u.id); setUserForm({ username: u.username, passwordHash: '', firstName: u.firstName, role: u.role?.toLowerCase() }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-50 text-[#0066CC] hover:bg-[#0066CC] hover:text-white border border-blue-100 px-3 py-1.5 rounded-lg font-bold transition-colors">{t('common.edit')}</button>
                        {currentUser.id !== u.id && <button onClick={() => handleUserDelete(u.id)} className="text-sm bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-100 px-3 py-1.5 rounded-lg font-bold transition-colors">{t('common.delete')}</button>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="py-8 text-center text-gray-400 font-bold">{t('table.no_user_data')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}