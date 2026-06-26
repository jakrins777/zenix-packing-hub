/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import api from '../utils/axiosConfig';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
// 🌟 นำเข้าไฟล์ย่อยทั้ง 3 ไฟล์ที่สร้างไว้
import UserManagementTab from './UserManagementTab';
import BoxMasterTab from './BoxMasterTab';
import ItemMasterTab from './ItemMasterTab';

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
        const { data, error } = await supabase.from('Pallet').select('*');
        if (error) throw error;
        if (data) setPalletsList(data);
      } catch (error) {
        console.error('ดึงข้อมูลพาเลทไม่สำเร็จ:', error);
      }
    };
    fetchPalletsForDropdown();
  }, []);

 
  // ================= Handlers =================
  const handleSelectAllPages = () => {
    const allIds = filteredData.map(item => item.itemId || item.itemid);
    setSelectedItemIds(allIds);
    toast.success(`เลือกข้อมูลทั้งหมด ${allIds.length} รายการแล้ว!`);
  };

  const handleClearSelection = () => {
    setSelectedItemIds([]);
  };

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

  const handleImportStocksExcel = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('กำลังนำเข้าสต๊อก...');
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        let rawData = [];

        if (file.name.toLowerCase().endsWith('.csv')) {
          const text = new TextDecoder('utf-16').decode(data);
          rawData = XLSX.utils.sheet_to_json(
            XLSX.read(text, { type: 'string', FS: '\t' }).Sheets[
            XLSX.read(text, { type: 'string', FS: '\t' }).SheetNames[0]
            ],
            { defval: '' }
          );
        } else {
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        }

        if (rawData.length === 0) {
          toast.error('ไฟล์ว่างเปล่าครับ', { id: toastId });
          return;
        }

        const parseNum = (val) => {
          if (val === null || val === undefined || val === '') return 0;
          const cleanStr = String(val).replace(/,/g, '').trim();
          return Number(cleanStr) || 0;
        };

        const payload = rawData.map((row) => {
          const keys = Object.keys(row);
          const getVal = (exactName) => {
            const foundKey = keys.find(k => k.trim() === exactName);
            return foundKey ? row[foundKey] : null;
          };

          const itemCode = getVal('Item');
          const lotNo = getVal('Lot');
          const qtyOnHandRaw = parseNum(getVal('Qty On Hand'));
          const reserved = parseNum(getVal('Reserved'));
          const assigned = parseNum(getVal('Assigned To Be Picked'));
          const rawDate = getVal('dcoCreateDate');

          const actualQty = Math.max(0, qtyOnHandRaw - reserved - assigned);

          let finalReceiveDate = new Date().toISOString();
          if (rawDate) {
            const dateStr = String(rawDate).trim();
            if (dateStr.includes('/')) {
              const parts = dateStr.split('/');
              if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                finalReceiveDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
              }
            } else {
              const parsedDate = new Date(dateStr);
              if (!isNaN(parsedDate.getTime())) {
                finalReceiveDate = parsedDate.toISOString();
              }
            }
          }

          return {
            itemId: itemCode ? String(itemCode).trim().toUpperCase() : null,
            lotNo: lotNo ? String(lotNo).trim() : '-',
            qtyOnHand: actualQty,
            receiveDate: finalReceiveDate
          };
        }).filter(stock => stock.itemId && stock.qtyOnHand > -1);

        if (payload.length === 0) {
          toast.error('ไม่พบข้อมูลสต๊อกที่มียอด > 0 (กด F12 เพื่อดู Log)', { id: toastId });
          return;
        }

        const CHUNK_SIZE = 50;
        let successCount = 0;

        for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
          const chunk = payload.slice(i, i + CHUNK_SIZE);
          const { error } = await supabase
            .from('item_stocks')
            .upsert(chunk, { onConflict: 'itemId, lotNo' });

          if (error) throw error;
          successCount += chunk.length;
        }

        toast.success(`🎉 นำเข้าสต๊อก FIFO สำเร็จ ${payload.length} รายการ`, { id: toastId });

      } catch (err) {
        console.error("🔥 Import สต๊อกพัง:", err);
        toast.error('Import ล้มเหลว: ' + err.message, { id: toastId });
      }
    };

    reader.readAsArrayBuffer(file);
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
      toast.error(t('toast.selected_download'));
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

    toast.success(t('toast.export_success').replace('{{count}}', selectedData.length));
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

  const handleCombineExcelToCSV = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    let combinedData = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        combinedData = [...combinedData, ...jsonData];
      }

      if (combinedData.length === 0) return;

      const newWorksheet = XLSX.utils.json_to_sheet(combinedData);
      const csvOutput = XLSX.utils.sheet_to_csv(newWorksheet);

      const blob = new Blob(["\ufeff" + csvOutput], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = "Combined_Items_Master.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error combining files:', error);
    }
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
    const id = box.pckId || box.pckid;
    if (!id) return false;
    const term = boxSearchTerm.toLowerCase();
    return ((id || '').toLowerCase().includes(term) || (box.description || '').toLowerCase().includes(term) || (box.codename || '').toLowerCase().includes(term));
  }).sort((a, b) => {
    if (!a || !b) return 0;
    const idA = String(a.pckId || a.pckid || '');
    const idB = String(b.pckId || b.pckid || '');
    if (boxSortBy === 'id_asc') return idA.localeCompare(idB, undefined, { numeric: true });
    if (boxSortBy === 'id_desc') return idB.localeCompare(idA, undefined, { numeric: true });
    return 0;
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

  // 🌟 รวม Props สำหรับส่งไปให้ ItemMasterTab
  const itemTabProps = {
    t, itemForm, setItemForm, editingItemId, setEditingItemId, handleItemSubmit, handleLoadItemTemplate,
    boxes, handleFileUpload, handleImportStocksExcel, handleCombineExcelToCSV, searchTerm, setSearchTerm,
    setCurrentPage, filterCustomer, setFilterCustomer, uniqueCustomers, filterBoxStatus, setFilterBoxStatus,
    sortBy, setSortBy, handleExportItems, currentItems, selectedItemIds, filteredData, handleSelectAllPages,
    handleClearSelection, bulkForm, setBulkForm, handleBulkUpdateSubmit, handleBulkDeleteSubmit,
    handleExportSelectedItems, setSelectedItemIds, handleSelectAllCurrentPage, handleSelectItem,
    handleDeleteItem, indexOfFirstItem, indexOfLastItem, currentPage, totalPages
  };

  // 🌟 รวม Props สำหรับส่งไปให้ BoxMasterTab
  const boxTabProps = {
    t, boxes, palletsList, boxForm, setBoxForm, editingBoxId, setEditingBoxId,
    handleBoxSubmit, handleBoxDelete, boxSearchTerm, setBoxSearchTerm, boxSortBy,
    setBoxSortBy, processedBoxes, handleBoxFileUpload, handleExportBoxes, refreshAdminData
  };

  // 🌟 รวม Props สำหรับส่งไปให้ UserManagementTab
  const userTabProps = {
    t, users, userForm, setUserForm, editingUserId, setEditingUserId,
    handleUserSubmit, handleUserDelete, currentUser
  };

  // ================= Render =================
  return (
    <div className="bg-transparent rounded-xl p-2 md:p-6 ">
      {/* Menu Tabs */}
      <div className="flex space-x-6 border-b-2 border-gray-200 pb-4 mb-6 print:hidden">
        <button onClick={() => setAdminSubTab('items')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'items' ? 'text-[#0066CC] border-b-4 border-[#0066CC]' : 'text-gray-500 hover:text-[#0066CC]'}`}>{t('tabs.items')}</button>
        <button onClick={() => setAdminSubTab('boxes')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'boxes' ? 'text-[#0066CC] border-b-4 border-[#0066CC]' : 'text-gray-500 hover:text-[#0066CC]'}`}>{t('tabs.boxes')}</button>
        <button onClick={() => setAdminSubTab('users')} className={`text-lg font-bold pb-2 transition-colors ${adminSubTab === 'users' ? 'text-[#0066CC] border-b-4 border-[#0066CC]' : 'text-gray-500 hover:text-[#0066CC]'}`}>{t('tabs.users')}</button>
      </div>

      {/* 🌟 เรียกใช้ Component ที่แยกไฟล์ไว้ตาม Tab ที่เลือก */}
      {adminSubTab === 'items' && <ItemMasterTab {...itemTabProps} />}
      {adminSubTab === 'boxes' && <BoxMasterTab {...boxTabProps} />}
      {adminSubTab === 'users' && <UserManagementTab {...userTabProps} />}
    </div>
  );
}