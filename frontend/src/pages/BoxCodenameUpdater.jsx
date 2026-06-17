import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function BoxCodenameUpdater({ boxes, fetchAdminData }) {
  const [bulkText, setBulkText] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePreview = () => {
    if (!bulkText.trim()) return toast.error('กรุณาวางข้อมูลก่อนครับ');

    const rows = bulkText.split('\n').filter(r => r.trim());
    const parsedData = [];

    rows.forEach((row, index) => {
      const parts = row.includes('\t') ? row.split('\t') : row.split(/ +/);
      if (parts.length < 2) return; 

      const pckId = parts[0].trim();
      const codename = parts.slice(1).join(' ').trim(); 

      const existingBox = boxes.find(b => b.pckId === pckId);

      parsedData.push({
        id: index,
        pckId: pckId,
        codename: codename,
        oldCodename: existingBox ? existingBox.codename : '-',
        status: existingBox ? 'READY' : 'NOT_FOUND',
      });
    });

    if (parsedData.length === 0) {
      toast.error('รูปแบบข้อมูลไม่ถูกต้อง (ต้องมี รหัสกล่อง และ ชื่อกล่อง)');
      return;
    }

    setPreviewData(parsedData);
    toast.success('วิเคราะห์ข้อมูลเสร็จสิ้น ตรวจสอบความถูกต้องด้านล่างได้เลยครับ');
  };

  const handleConfirmUpdate = async () => {
    const validData = previewData.filter(d => d.status === 'READY');
    if (validData.length === 0) return toast.error('ไม่มีข้อมูลที่ถูกต้องให้บันทึกครับ');

    setIsUpdating(true);
    const toastId = toast.loading(`กำลังอัปเดตชื่อกล่อง ${validData.length} รายการ...`);

    try {
      await Promise.all(
        validData.map(async (item) => {
          const { error } = await supabase
            .from('boxes')
            .update({ codename: item.codename })
            .eq('pckId', item.pckId);
          if (error) throw error;
        })
      );

      toast.success(`อัปเดต Codename สำเร็จ ${validData.length} กล่อง!`, { id: toastId });
      
      setBulkText('');
      setPreviewData([]);
      if (fetchAdminData) fetchAdminData(); 

    } catch (error) {
      toast.error('เกิดข้อผิดพลาด: ' + error.message, { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

return (
    <div className="bg-[#1C2541] p-6 rounded-2xl shadow-xl border border-white/10 mb-8 text-white print:hidden">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🏷️</span>
        <div>
          <h2 className="text-xl font-bold text-white">ระบบอัปเดตชื่อกล่องรวดเดียว (Bulk Update Codename)</h2>
          <p className="text-sm text-[#94A3B8]">ก๊อปปี้ 2 คอลัมน์จาก Excel (คอลัมน์ 1: รหัส PCK | คอลัมน์ 2: ชื่อ Codename) มาวางได้เลย</p>
        </div>
      </div>

      <div className="space-y-4">
        <textarea
          rows="5"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          disabled={isUpdating}
          placeholder="PCK0000013    D2P ใหญ่&#10;PCK0000036    กล่อง GKN MC165"
          className="w-full p-4 border border-white/10 rounded-xl focus:border-[#00B4D8] focus:ring-1 focus:ring-[#00B4D8] outline-none font-mono text-sm bg-[#0B132B] text-white placeholder-[#94A3B8] transition-all"
        ></textarea>

        <div className="flex gap-4">
          <button 
            onClick={handlePreview} 
            disabled={isUpdating || !bulkText.trim()}
            className="flex-1 bg-[#00B4D8] hover:bg-[#0096B4] text-white font-bold py-3 rounded-xl transition-colors shadow-md disabled:bg-[#94A3B8]/20 disabled:text-[#94A3B8]"
          >
            🔍 กดเพื่อตรวจสอบข้อมูลก่อนอัปเดต
          </button>
          <button 
            onClick={() => { setBulkText(''); setPreviewData([]); }} 
            disabled={isUpdating}
            className="bg-[#94A3B8]/20 hover:bg-[#94A3B8]/40 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm"
          >
            ล้าง
          </button>
        </div>
      </div>

      {previewData.length > 0 && (
        <div className="mt-8 animate-fade-in-up border-t border-white/10 pt-6">
          <h3 className="font-bold text-white mb-3 flex justify-between items-end">
            <span>📋 ตารางตรวจสอบความถูกต้อง ({previewData.length} รายการ)</span>
            {previewData.some(d => d.status === 'NOT_FOUND') && (
              <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded">⚠️ มีบางรหัสไม่พบในระบบ (จะถูกข้ามการอัปเดต)</span>
            )}
          </h3>
          
          <div className="overflow-x-auto border border-white/10 rounded-xl shadow-inner">
            <table className="min-w-full text-left text-sm bg-[#1C2541]">
              <thead className="bg-[#0B132B]/80 border-b border-white/10">
                <tr>
                  <th className="p-3 font-bold text-[#94A3B8]">รหัสกล่อง (PCK ID)</th>
                  <th className="p-3 font-bold text-[#94A3B8]">ชื่อเดิมในระบบ</th>
                  <th className="p-3 font-bold text-[#00B4D8]">➡️ ชื่อใหม่ที่ต้องการเปลี่ยน</th>
                  <th className="p-3 font-bold text-center text-[#94A3B8]">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {previewData.map((item) => (
                  <tr key={item.id} className={item.status === 'NOT_FOUND' ? 'bg-red-900/20' : 'hover:bg-white/5 transition-colors'}>
                    <td className="p-3 font-mono font-bold text-white">{item.pckId}</td>
                    <td className="p-3 text-[#94A3B8]">{item.oldCodename || <span className="italic text-[#94A3B8]/70">ว่างเปล่า</span>}</td>
                    <td className="p-3 font-black text-[#00B4D8]">{item.codename}</td>
                    <td className="p-3 text-center">
                      {item.status === 'READY' 
                        ? <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-bold border border-emerald-500/30">✅ พร้อมอัปเดต</span>
                        : <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold border border-red-500/30">❌ ไม่พบรหัสนี้</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button 
            onClick={handleConfirmUpdate}
            disabled={isUpdating || previewData.filter(d => d.status === 'READY').length === 0}
            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg transition-colors text-lg disabled:bg-[#94A3B8]/20 disabled:text-[#94A3B8] flex justify-center items-center gap-2"
          >
            {isUpdating ? '⏳ กำลังอัปเดตฐานข้อมูล...' : '💾 ยืนยันการอัปเดตชื่อกล่องทั้งหมด'}
          </button>
        </div>
      )}
    </div>
  );
}