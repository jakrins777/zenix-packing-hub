/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient'; 
import Navbar from './components/Navbar';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import PackingPlanner from './pages/PackingPlanner';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import toast, { Toaster } from 'react-hot-toast'; 
import { useTranslation } from 'react-i18next'; // 🌟 Import เครื่องมือแปลภาษา

function App() {
  const { t } = useTranslation(); // 🌟 เรียกใช้งาน Hook แปลภาษา

  // ==========================================
  // 1. GLOBAL STATES
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

  // Master Data States
  const [items, setItems] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [reports, setReports] = useState([]); 
  const [users, setUsers] = useState([]); 

  // ==========================================
  // 2. GLOBAL DATA FETCHING
  // ==========================================
  const fetchAdminData = useCallback(async () => {
    try {
      const { data: dataItems } = await supabase.from('items').select('*');
      if (dataItems) setItems(dataItems);
      
      const { data: dataBoxes } = await supabase.from('boxes').select('*');
      if (dataBoxes) setBoxes(dataBoxes);

      const { data: dataUsers } = await supabase.from('users').select('*');
      if (dataUsers) setUsers(dataUsers);
    } catch (err) { 
      toast.error(t('app.err_load_master')); 
    }
  }, [t]);

  const fetchLogsData = useCallback(async () => {
    try {
      const { data: dataLogs, error } = await supabase
        .from('packing_logs') 
        .select('*, user:users(*), item:items(*)')
        .order('packedAt', { ascending: false });
        
      if (error) throw error;
      if (dataLogs) setLogs(dataLogs);
    } catch (err) { 
      toast.error(t('app.err_load_logs')); 
    }
  }, [t]);

  const fetchReportsData = useCallback(async () => {
    try {
      const { data: dataReports, error } = await supabase
        .from('Report').select('*').order('id', { ascending: false });
      if (error) throw error;
      if (dataReports) setReports(dataReports);
    } catch (err) {
      toast.error(t('app.err_load_reports'));
    }
  }, [t]);

  useEffect(() => {
    if (currentUser) {
      fetchAdminData();
      fetchLogsData();
      fetchReportsData();
    }
  }, [currentUser, currentTab, fetchAdminData, fetchLogsData, fetchReportsData]);

  // ==========================================
  // 3. GLOBAL HANDLERS (LOG DELETION)
  // ==========================================
  const handleDeleteLog = async (id) => {
    if (!confirm(t('app.confirm_delete_log'))) return;
    const toastId = toast.loading(t('app.deleting_log')); 
    try {
      const logToDelete = logs.find(l => l.logId === id);
      const { error } = await supabase.from('packing_logs').delete().eq('logId', id); 
      
      if (!error) { 
        if (logToDelete && logToDelete.item?.defaultPckId) {
           const boxToUpdate = boxes.find(b => b.pckId === logToDelete.item.defaultPckId);
           if (boxToUpdate) {
              const newStock = boxToUpdate.currentStock + logToDelete.boxUsed;
              await supabase.from('boxes').update({ currentStock: newStock }).eq('pckId', boxToUpdate.pckId);
              fetchAdminData();
           }
        }
        toast.success(t('app.del_log_success'), { id: toastId }); 
        fetchLogsData(); 
      } else {
        toast.error(t('app.del_err_msg') + error.message, { id: toastId }); 
      }
    } catch (err) { 
      toast.error(t('app.del_err_sys'), { id: toastId }); 
    }
  };

  const handleDeleteReportLog = async (id) => {
    if (!confirm(t('app.confirm_delete_report'))) return;
    const toastId = toast.loading(t('app.deleting_report')); 
    try {
      const { error } = await supabase.from('Report').delete().eq('id', id); 
      if (!error) {
        toast.success(t('app.del_report_success'), { id: toastId });
        fetchReportsData(); 
      } else {
        toast.error(t('app.del_err_msg') + error.message, { id: toastId });
      }
    } catch (err) {
      toast.error(t('app.del_err_sys'), { id: toastId });
    }
  };

  // ==========================================
  // 4. UI RENDER
  // ==========================================
  if (!currentUser) return (
    <>
      <Toaster position="top-right" />
      <Login onLogin={setCurrentUser} />
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Toaster position="top-right" toastOptions={{ style: { fontWeight: 'bold', borderRadius: '10px' } }} />

      <Navbar 
        user={currentUser} 
        onLogout={() => { setCurrentUser(null); localStorage.removeItem('zenix_user'); toast.success(t('app.logout_success')); }} 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
      />

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {currentTab === 'packing' && (
          <PackingPlanner 
            items={items} boxes={boxes} currentUser={currentUser}
            fetchReportsData={fetchReportsData} fetchLogsData={fetchLogsData} fetchAdminData={fetchAdminData}
          />
        )}

        {currentTab === 'dashboard' && currentUser?.role?.toLowerCase() === 'admin' && (
          <Dashboard 
            logs={logs} reports={reports} 
            handleDeleteLog={handleDeleteLog} handleDeleteReportLog={handleDeleteReportLog}
          />
        )}

        {/* 🌟 ปรับส่ง Props หน้า Admin ให้คลีนขึ้น ไม่รุงรัง */}
        {currentTab === 'admin' && currentUser?.role?.toLowerCase() === 'admin' && (
          <AdminPanel 
            currentUser={currentUser} 
            adminSubTab={adminSubTab} 
            setAdminSubTab={setAdminSubTab}
            items={items} 
            boxes={boxes} 
            users={users} 
            refreshAdminData={fetchAdminData}
          />
        )}

        {currentTab === 'inventory' && <Inventory boxes={boxes} />}
      </div> 
    </div> 
  );
}

export default App;