/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import PrintLabelButton from '../components/PrintLabelButton';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next'; // 🌟 Import เครื่องมือแปลภาษา

export default function Dashboard({ logs, reports, handleDeleteLog, handleDeleteReportLog }) {
  const { t } = useTranslation(); // 🌟 เรียกใช้งาน Hook
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
      toast.error(t('toast.export_empty')); 
      return;
    }
    const exportData = filteredLogs.map((log, index) => ({
      [t('excel.no')]: index + 1,
      [t('excel.packed_datetime')]: new Date(log.packedAt).toLocaleString('th-TH'),
      [t('excel.operator')]: log.user?.firstName || t('common.unspecified'),
      [t('excel.item_id')]: log.itemId,
      [t('excel.item_name')]: log.item?.itemName || '-',
      [t('excel.supplier')]: log.item?.supplier || '-',
      [t('excel.pack_qty')]: log.packQty,
      [t('excel.box_used')]: log.boxUsed,
      [t('excel.total_weight')]: log.totalWeight
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Packing History");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Zenix_PackingReport_${dateStr}.xlsx`);
    toast.success(t('toast.export_success')); 
  };

  return (
    <div className="space-y-8 animate-fade-in-up text-gray-800">

      {/* 📊 รายงานหลัก */}
      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 print:shadow-none print:border-none print:p-0">
        <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-200 pb-4 mb-6 print:border-gray-300">
          <h2 className="text-2xl font-black text-[#0066CC] print:text-black flex items-center gap-2">
            <span></span> {t('dashboard.title')}
          </h2>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0 print:hidden">
            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="p-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] bg-white">
              <option value="today"> {t('filter.today')}</option>
              <option value="month"> {t('filter.month')}</option>
              <option value="year"> {t('filter.year')}</option>
              <option value="custom"> {t('filter.custom')}</option>
              <option value="all"> {t('filter.all')}</option>
            </select>
            {timeFilter === 'custom' && <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="p-2.5 border border-[#0066CC] rounded-lg font-bold text-[#0066CC] focus:outline-none focus:ring-1 focus:ring-[#0066CC] bg-white" />}
            <button onClick={() => window.print()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-2.5 rounded-lg font-bold flex items-center transition-colors shadow-sm gap-2">{t('dashboard.print_report')}</button>
            <button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-bold flex items-center transition-colors shadow-md gap-2"><span>📊</span> {t('dashboard.export_excel')}</button>
          </div>
        </div>

        {/* STATS BLOCKS - ปรับโทนสีให้เป็นสีฟ้า/เขียว/ส้ม แบบสว่าง */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl shadow-sm h-full flex flex-col justify-between">
            <p className="text-blue-600 font-bold mb-1 uppercase tracking-wider text-sm">{t('dashboard.total_packs')}</p>
            <p className="text-4xl font-black text-[#0066CC] mt-auto">{filteredLogs.length} <span className="text-lg font-bold text-blue-500">{t('dashboard.unit_times')}</span></p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl shadow-sm h-full flex flex-col justify-between">
            <p className="text-emerald-600 font-bold mb-1 uppercase tracking-wider text-sm">{t('dashboard.total_items')}</p>
            <p className="text-4xl font-black text-emerald-700 mt-auto">{filteredLogs.reduce((sum, log) => sum + log.packQty, 0)} <span className="text-lg font-bold text-emerald-500">{t('dashboard.unit_pieces')}</span></p>
          </div>
          <div className="bg-amber-50 border border-amber-100 p-5 rounded-xl shadow-sm h-full flex flex-col">
            <p className="text-amber-600 font-bold mb-3 uppercase tracking-wider text-sm">{t('dashboard.boxes_used_by_type')}</p>
            <div className="flex-1 space-y-2 overflow-y-auto max-h-32 mb-3 pr-2 custom-scrollbar">
              {Object.entries(filteredLogs.reduce((acc, log) => { const boxId = log.item?.defaultPckId || t('dashboard.unspecified_box'); acc[boxId] = (acc[boxId] || 0) + log.boxUsed; return acc; }, {})).map(([boxId, count]) => (
                <div key={boxId} className="flex justify-between items-center text-sm border-b border-amber-200/50 pb-1.5">
                  <span className="font-bold text-amber-900"> {boxId}</span>
                  <span className="font-black text-amber-700">{count.toFixed(2)} {t('dashboard.unit_boxes')}</span>
                </div>
              ))}
              {filteredLogs.length === 0 && <p className="text-sm text-amber-500 text-center">{t('dashboard.no_data')}</p>}
            </div>
            <div className="flex justify-between items-end pt-3 border-t-2 border-amber-200 mt-auto">
              <span className="text-amber-700 font-bold text-sm mb-1 uppercase">{t('dashboard.total_all_types')}</span>
              <p className="text-3xl font-black text-amber-600">{filteredLogs.reduce((sum, log) => sum + log.boxUsed, 0).toFixed(2)} <span className="text-base font-bold text-amber-500">{t('dashboard.unit_boxes')}</span></p>
            </div>
          </div>
        </div>

        {/* TABLE INDIVIDUAL LOGS */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="py-4 px-4 text-left font-bold text-gray-600 uppercase tracking-wider text-sm">{t('table.packed_time')}</th>
                <th className="py-4 px-4 text-left font-bold text-gray-600 uppercase tracking-wider text-sm">{t('table.operator')}</th>
                <th className="py-4 px-4 text-left font-bold text-gray-600 uppercase tracking-wider text-sm">{t('table.item')}</th>
                <th className="py-4 px-4 text-center font-bold text-gray-600 uppercase tracking-wider text-sm">{t('table.qty_pieces')}</th>
                <th className="py-4 px-4 text-center font-bold text-gray-600 uppercase tracking-wider text-sm">{t('table.box_used')}</th>
                <th className="py-4 px-4 text-right font-bold text-gray-600 uppercase tracking-wider text-sm">{t('table.total_weight_kg')}</th>
                <th className="py-4 px-4 text-center font-bold text-gray-600 uppercase tracking-wider text-sm">{t('common.edit_light')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length === 0 ? (
                <tr><td colSpan="7" className="py-8 text-center text-gray-400 font-bold">{t('table.no_data')}</td></tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.logId} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-600 font-medium">{new Date(log.packedAt).toLocaleString('th-TH')}</td>
                    <td className="py-3 px-4"><span className="font-bold text-[#0066CC] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md text-sm">{log.user?.firstName || t('common.unspecified_user')}</span></td>
                    <td className="py-3 px-4"><span className="font-black text-gray-800 text-lg">{log.itemId}</span><p className="text-xs text-gray-500 font-bold mt-0.5">{log.item?.itemName}</p></td>
                    <td className="py-3 px-4 text-center font-black text-[#0066CC] text-xl">{log.packQty}</td>
                    <td className="py-3 px-4 text-center text-amber-600 font-black text-lg">{log.boxUsed.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-black text-lg">{log.totalWeight.toFixed(3)}</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleDeleteLog(log.logId)} className="bg-red-50 text-red-600 border border-red-100 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm">{t('common.delete')}</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📋 ประวัติรายงานแผนการเบิกกล่อง */}
      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h3 className="text-xl font-black text-[#0066CC] flex items-center gap-2"><span>📋</span> {t('report.title')}</h3>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="py-4 px-4 text-center font-bold tracking-wider text-sm">{t('report.plan_id')}</th>
                <th className="py-4 px-4 text-left font-bold tracking-wider text-sm">{t('report.operator')}</th>
                <th className="py-4 px-4 text-center font-bold tracking-wider text-sm">{t('report.total_item_types')}</th>
                <th className="py-4 px-4 text-center font-bold tracking-wider text-sm">{t('report.total_boxes_needed')}</th>
                <th className="py-4 px-4 text-center font-bold tracking-wider text-sm">{t('common.edit_light')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.length === 0 ? (
                <tr><td colSpan="5" className="py-8 text-center text-gray-400 font-bold bg-gray-50">{t('report.no_reports')}</td></tr>
              ) : (
                reports.map(rep => (
                  <tr key={rep.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-3 px-4 text-center font-mono font-black text-[#0066CC] text-lg">#{rep.id}</td>
                    <td className="py-3 px-4"><span className="font-bold text-gray-800 bg-gray-100 border border-gray-200 px-3 py-1 rounded-md text-sm">{rep.operator}</span></td>
                    <td className="py-3 px-4 text-center font-bold text-gray-600">{rep.totalOrders} {t('report.unit_items')}</td>
                    <td className="py-3 px-4 text-center font-black text-emerald-600 text-xl">{rep.totalBoxes} {t('dashboard.unit_boxes')}</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleDeleteReportLog(rep.id)} className="bg-red-50 text-red-600 border border-red-100 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm">{t('report.delete_report')}</button>
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