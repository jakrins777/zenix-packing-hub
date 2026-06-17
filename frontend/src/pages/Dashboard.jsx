/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import PrintLabelButton from '../components/PrintLabelButton';
import toast from 'react-hot-toast';

export default function Dashboard({ logs, reports, handleDeleteLog, handleDeleteReportLog }) {
  const [timeFilter, setTimeFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');

  const filteredLogs = logs.filter(log => {
    const logDate = new Date(log.packedAt);
    const today = new Date();
    if (timeFilter === 'today') return logDate.toDateString() === today.toDateString();
    if (timeFilter === 'month') return logDate.getMonth() === today.getMonth() && logDate.getFullYear() === today.getFullYear();
    if (timeFilter === 'year') return logDate.getFullYear() === today.getFullYear();
    if (timeFilter === 'custom' && customDate) return logDate.toDateString() === new Date(customDate).toDateString();
    return true; 
  });

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      toast.error('ไม่มีข้อมูลในช่วงเวลาที่เลือกให้ Export ครับ'); 
      return;
    }
    const exportData = filteredLogs.map((log, index) => ({
      'ลำดับ': index + 1,
      'วัน-เวลาที่แพ็ค': new Date(log.packedAt).toLocaleString('th-TH'),
      'ผู้ทำรายการ': log.user?.firstName || 'ไม่ระบุ',
      'รหัสสินค้า': log.itemId,
      'ชื่อสินค้า': log.item?.itemName || '-',
      'ลูกค้า (Supplier)': log.item?.supplier || '-',
      'จำนวนแพ็ค (ชิ้น)': log.packQty,
      'กล่องที่เบิก (ใบ)': log.boxUsed,
      'น้ำหนักรวม (kg)': log.totalWeight
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Packing History");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Zenix_PackingReport_${dateStr}.xlsx`);
    toast.success('ดาวน์โหลดไฟล์ Excel สำเร็จ!'); 
  };

return (
    <div className="space-y-8 animate-fade-in-up text-white">
      <div className="bg-[#1C2541] rounded-xl shadow-lg p-6 border border-white/10 print:shadow-none print:border-none print:p-0 print:text-black">
        <div className="flex flex-col md:flex-row justify-between items-center border-b-2 border-white/10 pb-4 mb-6 print:border-gray-300">
          <h2 className="text-2xl font-bold text-white print:text-black">📊 รายงานสรุปยอดการแพ็ค</h2>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0 print:hidden">
            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="p-2 border border-white/10 rounded-lg font-semibold text-white focus:outline-none focus:border-[#00B4D8] bg-[#0B132B]">
              <option value="today" className="bg-[#1C2541]">📅 สรุปยอดวันนี้</option>
              <option value="month" className="bg-[#1C2541]">📆 สรุปยอดเดือนนี้</option>
              <option value="year" className="bg-[#1C2541]">🗓️ สรุปยอดปีนี้</option>
              <option value="custom" className="bg-[#1C2541]">🔍 เลือกวันที่เอง</option>
              <option value="all" className="bg-[#1C2541]">♾️ สรุปยอดตลอดเวลา</option>
            </select>
            {timeFilter === 'custom' && <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="p-2 border border-[#00B4D8] rounded-lg font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#00B4D8] bg-[#0B132B]"/>}
            <button onClick={() => window.print()} className="bg-[#0B132B] hover:bg-black text-[#94A3B8] hover:text-white border border-white/10 px-4 py-2 rounded-lg font-bold flex items-center transition-colors shadow-md">🖨️ พิมพ์รายงาน</button>
            <button onClick={handleExportExcel} className="bg-[#00B4D8] hover:bg-[#0096B4] text-white px-4 py-2 rounded-lg font-bold flex items-center transition-colors shadow-md gap-2"><span>📊</span> Export Excel</button>
          </div>
        </div>

        {/* STATS BLOCKS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#0B132B] border border-white/10 p-4 rounded-xl shadow-sm h-full flex flex-col justify-between print:border-gray-300">
            <p className="text-[#94A3B8] print:text-gray-600 font-semibold mb-1 uppercase tracking-wider text-sm">การแพ็คทั้งหมด</p>
            <p className="text-3xl font-black text-[#00B4D8] print:text-black mt-auto">{filteredLogs.length} <span className="text-lg font-medium text-white print:text-gray-700">ครั้ง</span></p>
          </div>
          <div className="bg-[#0B132B] border border-white/10 p-4 rounded-xl shadow-sm h-full flex flex-col justify-between print:border-gray-300">
            <p className="text-[#94A3B8] print:text-gray-600 font-semibold mb-1 uppercase tracking-wider text-sm">สินค้ารวมที่แพ็ค</p>
            <p className="text-3xl font-black text-[#00B4D8] print:text-black mt-auto">{filteredLogs.reduce((sum, log) => sum + log.packQty, 0)} <span className="text-lg font-medium text-white print:text-gray-700">ชิ้น</span></p>
          </div>
          <div className="bg-[#0B132B] border border-white/10 p-4 rounded-xl shadow-sm h-full flex flex-col print:border-gray-300">
            <p className="text-[#94A3B8] print:text-gray-600 font-semibold mb-3 uppercase tracking-wider text-sm">กล่องที่ถูกใช้ไป (แยกประเภท)</p>
            <div className="flex-1 space-y-2 overflow-y-auto max-h-32 mb-3 pr-2 custom-scrollbar">
              {Object.entries(filteredLogs.reduce((acc, log) => { const boxId = log.item?.defaultPckId || 'ไม่ระบุกล่อง'; acc[boxId] = (acc[boxId] || 0) + log.boxUsed; return acc; }, {})).map(([boxId, count]) => (
                <div key={boxId} className="flex justify-between items-center text-sm border-b border-white/5 print:border-gray-200 pb-1">
                  <span className="font-medium text-white print:text-gray-800">📦 {boxId}</span>
                  <span className="font-bold text-[#00B4D8] print:text-black bg-[#00B4D8]/20 print:bg-transparent px-2 py-0.5 rounded">{count.toFixed(2)} ใบ</span>
                </div>
              ))}
              {filteredLogs.length === 0 && <p className="text-sm text-[#94A3B8] text-center">ไม่มีข้อมูล</p>}
            </div>
            <div className="flex justify-between items-end pt-3 border-t-2 border-white/10 print:border-gray-300 mt-auto">
              <span className="text-[#94A3B8] print:text-gray-700 font-bold text-sm mb-1">รวมทุกประเภท:</span>
              <p className="text-3xl font-black text-white print:text-black">{filteredLogs.reduce((sum, log) => sum + log.boxUsed, 0).toFixed(2)} <span className="text-lg font-medium text-[#94A3B8] print:text-gray-600">ใบ</span></p>
            </div>
          </div>
        </div>

        {/* TABLE INDIVIDUAL LOGS */}
        <div className="overflow-x-auto rounded-lg border border-white/10 print:border-gray-400 shadow-sm">
          <table className="min-w-full bg-[#1C2541] print:bg-white">
            <thead className="bg-[#0B132B]/80 print:bg-gray-200 border-b border-white/10 print:border-gray-400">
              <tr>
                <th className="py-3 px-4 text-left font-bold text-[#94A3B8] print:text-black">เวลาที่แพ็ค</th>
                <th className="py-3 px-4 text-left font-bold text-[#94A3B8] print:text-black">ผู้ทำรายการ</th>
                <th className="py-3 px-4 text-left font-bold text-[#94A3B8] print:text-black">สินค้า</th>
                <th className="py-3 px-4 text-center font-bold text-[#94A3B8] print:text-black">จำนวน (ชิ้น)</th>
                <th className="py-3 px-4 text-center font-bold text-[#94A3B8] print:text-black">กล่องที่ใช้</th>
                <th className="py-3 px-4 text-right font-bold text-[#94A3B8] print:text-black">น้ำหนักรวม (kg)</th>
                <th className="py-3 px-4 text-center font-bold text-[#94A3B8] print:hidden">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 print:divide-gray-300">
              {filteredLogs.length === 0 ? (
                <tr><td colSpan="7" className="py-8 text-center text-[#94A3B8] font-medium bg-[#1C2541] print:bg-white">ไม่พบประวัติในช่วงเวลานี้</td></tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.logId} className="hover:bg-white/5 print:hover:bg-transparent transition-colors">
                    <td className="py-3 px-4 text-sm text-white print:text-black whitespace-nowrap">{new Date(log.packedAt).toLocaleString('th-TH')}</td>
                    <td className="py-3 px-4"><span className="font-bold text-[#00B4D8] print:text-black bg-[#00B4D8]/20 print:bg-transparent print:border print:border-gray-300 px-2 py-1 rounded-md text-sm">{log.user?.firstName || 'Unknown'}</span></td>
                    <td className="py-3 px-4"><span className="font-bold text-[#00B4D8] print:text-black text-lg">{log.itemId}</span><p className="text-xs text-[#94A3B8] print:text-gray-600">{log.item?.itemName}</p></td>
                    <td className="py-3 px-4 text-center font-black text-white print:text-black text-lg">{log.packQty}</td>
                    <td className="py-3 px-4 text-center text-emerald-400 print:text-black font-bold">{log.boxUsed.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-emerald-400 print:text-black font-black">{log.totalWeight.toFixed(3)}</td>
                    <td className="py-3 px-4 text-center print:hidden">
                      <div className="flex justify-center items-center gap-2">
                        <PrintLabelButton data={{ itemId: log.itemId, itemName: log.item?.itemName, qty: log.packQty, boxType: log.item?.defaultPckId, operator: log.user?.firstName }} />
                        <button onClick={() => handleDeleteLog(log.logId)} className="bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-white px-3 py-1 rounded-lg text-sm font-bold transition-colors shadow-sm">🗑️ ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONSOLIDATION REPORTS */}
      <div className="bg-[#1C2541] rounded-xl shadow-lg p-6 border border-white/10 print:hidden">
        <div className="border-b-2 border-white/10 pb-3 mb-4">
          <h3 className="text-xl font-black text-white flex items-center gap-2"><span>📋</span> ประวัติการบันทึกรายงานแผนการเบิกกล่องรวม (Bulk Calculation Reports)</h3>
        </div>
        <div className="overflow-x-auto rounded-lg border border-white/10 shadow-sm">
          <table className="min-w-full bg-[#1C2541]">
            <thead className="bg-[#0B132B]/80 text-[#94A3B8]">
              <tr>
                <th className="py-3 px-4 text-center font-bold">ID แผน</th>
                <th className="py-3 px-4 text-left font-bold">ผู้ทำรายการ</th>
                <th className="py-3 px-4 text-center font-bold">จำนวนประเภทสินค้า</th>
                <th className="py-3 px-4 text-center font-bold">จำนวนกล่องที่ต้องเบิกทั้งหมด</th>
                <th className="py-3 px-4 text-center font-bold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reports.length === 0 ? (
                <tr><td colSpan="5" className="py-8 text-center text-[#94A3B8] font-medium bg-[#1C2541]">ยังไม่มีการบันทึกรายงานแผนการเบิกกล่องรวม</td></tr>
              ) : (
                reports.map(rep => (
                  <tr key={rep.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-center font-mono font-bold text-[#00B4D8]">#{rep.id}</td>
                    <td className="py-3 px-4"><span className="font-bold text-[#00B4D8] bg-[#00B4D8]/20 px-2 py-1 rounded-md text-sm">{rep.operator}</span></td>
                    <td className="py-3 px-4 text-center font-bold text-white">{rep.totalOrders} รายการ</td>
                    <td className="py-3 px-4 text-center font-black text-emerald-400 text-lg">{rep.totalBoxes} ใบ</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleDeleteReportLog(rep.id)} className="bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors shadow-sm">🗑️ ลบรายงานสรุป</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}