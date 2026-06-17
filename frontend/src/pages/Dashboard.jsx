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
    <div className="space-y-8 animate-fade-in-up">
      <div className="bg-white rounded-xl shadow-lg p-6 print:shadow-none print:p-0">
        <div className="flex flex-col md:flex-row justify-between items-center border-b-2 border-gray-200 pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{t('dashboard.title')}</h2>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0 print:hidden">
            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="p-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 focus:outline-none focus:border-blue-500 bg-white">
              <option value="today">{t('filter.today')}</option>
              <option value="month">{t('filter.month')}</option>
              <option value="year">{t('filter.year')}</option>
              <option value="custom">{t('filter.custom')}</option>
              <option value="all">{t('filter.all')}</option>
            </select>
            {timeFilter === 'custom' && <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="p-2 border-2 border-blue-400 rounded-lg font-semibold text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>}
            <button onClick={() => window.print()} className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-lg font-bold flex items-center transition-colors shadow-md">{t('dashboard.print_report')}</button>
            <button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center transition-colors shadow-md gap-2"><span>📊</span> {t('dashboard.export_excel')}</button>
          </div>
        </div>

        {/* STATS BLOCKS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm h-full flex flex-col justify-between">
            <p className="text-blue-600 font-semibold mb-1 uppercase tracking-wider text-sm">{t('dashboard.total_packs')}</p>
            <p className="text-3xl font-black text-blue-800 mt-auto">{filteredLogs.length} <span className="text-lg font-medium">{t('dashboard.unit_times')}</span></p>
          </div>
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl shadow-sm h-full flex flex-col justify-between">
            <p className="text-green-600 font-semibold mb-1 uppercase tracking-wider text-sm">{t('dashboard.total_items')}</p>
            <p className="text-3xl font-black text-green-800 mt-auto">{filteredLogs.reduce((sum, log) => sum + log.packQty, 0)} <span className="text-lg font-medium">{t('dashboard.unit_pieces')}</span></p>
          </div>
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl shadow-sm h-full flex flex-col">
            <p className="text-orange-600 font-semibold mb-3 uppercase tracking-wider text-sm">{t('dashboard.boxes_used_by_type')}</p>
            <div className="flex-1 space-y-2 overflow-y-auto max-h-32 mb-3 pr-2 custom-scrollbar">
              {Object.entries(filteredLogs.reduce((acc, log) => { const boxId = log.item?.defaultPckId || t('dashboard.unspecified_box'); acc[boxId] = (acc[boxId] || 0) + log.boxUsed; return acc; }, {})).map(([boxId, count]) => (
                <div key={boxId} className="flex justify-between items-center text-sm border-b border-orange-200 pb-1"><span className="font-medium text-orange-800">📦 {boxId}</span><span className="font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">{count.toFixed(2)} {t('dashboard.unit_boxes')}</span></div>
              ))}
              {filteredLogs.length === 0 && <p className="text-sm text-orange-400 text-center">{t('dashboard.no_data')}</p>}
            </div>
            <div className="flex justify-between items-end pt-3 border-t-2 border-orange-300 mt-auto">
              <span className="text-orange-800 font-bold text-sm mb-1">{t('dashboard.total_all_types')}</span>
              <p className="text-3xl font-black text-orange-800">{filteredLogs.reduce((sum, log) => sum + log.boxUsed, 0).toFixed(2)} <span className="text-lg font-medium">{t('dashboard.unit_boxes')}</span></p>
            </div>
          </div>
        </div>

        {/* TABLE INDIVIDUAL LOGS */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr><th className="py-3 px-4 text-left font-bold text-gray-700">{t('table.packed_time')}</th><th className="py-3 px-4 text-left font-bold text-gray-700">{t('table.operator')}</th><th className="py-3 px-4 text-left font-bold text-gray-700">{t('table.item')}</th><th className="py-3 px-4 text-center font-bold text-gray-700">{t('table.qty_pieces')}</th><th className="py-3 px-4 text-center font-bold text-gray-700">{t('table.box_used')}</th><th className="py-3 px-4 text-right font-bold text-gray-700">{t('table.total_weight_kg')}</th><th className="py-3 px-4 text-center font-bold text-gray-700 print:hidden">{t('table.action')}</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5 print:divide-gray-300">
              {filteredLogs.length === 0 ? (
                <tr><td colSpan="7" className="py-8 text-center text-gray-500 font-medium bg-gray-50">{t('table.no_history_period')}</td></tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.logId} className="hover:bg-blue-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{new Date(log.packedAt).toLocaleString('th-TH')}</td>
                    <td className="py-3 px-4"><span className="font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded-md text-sm">{log.user?.firstName || t('common.unknown')}</span></td>
                    <td className="py-3 px-4"><span className="font-bold text-blue-700 text-lg">{log.itemId}</span><p className="text-xs text-gray-500">{log.item?.itemName}</p></td>
                    <td className="py-3 px-4 text-center font-black text-gray-800 text-lg">{log.packQty}</td>
                    <td className="py-3 px-4 text-center text-orange-600 font-bold">{log.boxUsed.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-green-700 font-black">{log.totalWeight.toFixed(3)}</td>
                    <td className="py-3 px-4 text-center print:hidden">
                      <div className="flex justify-center items-center gap-2">
                        <PrintLabelButton data={{ itemId: log.itemId, itemName: log.item?.itemName, qty: log.packQty, boxType: log.item?.defaultPckId, operator: log.user?.firstName }} />
                        <button onClick={() => handleDeleteLog(log.logId)} className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1 rounded-lg text-sm font-bold transition-colors shadow-sm">🗑️ {t('common.delete')}</button>
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
      <div className="bg-white rounded-xl shadow-lg p-6 print:hidden">
        <div className="border-b-2 border-gray-200 pb-3 mb-4">
          <h3 className="text-xl font-black text-indigo-950 flex items-center gap-2"><span>📋</span> {t('report.title')}</h3>
        </div>
        <div className="overflow-x-auto rounded-lg border border-white/10 shadow-sm">
          <table className="min-w-full bg-[#1C2541]">
            <thead className="bg-[#0B132B]/80 text-[#94A3B8]">
              <tr>
                <th className="py-3 px-4 text-center font-bold">{t('report.plan_id')}</th>
                <th className="py-3 px-4 text-left font-bold">{t('report.operator')}</th>
                <th className="py-3 px-4 text-center font-bold">{t('report.total_item_types')}</th>
                <th className="py-3 px-4 text-center font-bold">{t('report.total_boxes_needed')}</th>
                <th className="py-3 px-4 text-center font-bold">{t('table.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reports.length === 0 ? (
                <tr><td colSpan="5" className="py-8 text-center text-gray-500 font-medium bg-gray-50">{t('report.no_reports')}</td></tr>
              ) : (
                reports.map(rep => (
                  <tr key={rep.id} className="hover:bg-indigo-50/50 transition-colors">
                    <td className="py-3 px-4 text-center font-mono font-bold text-gray-700">#{rep.id}</td>
                    <td className="py-3 px-4"><span className="font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded-md text-sm">{rep.operator}</span></td>
                    <td className="py-3 px-4 text-center font-bold text-gray-800">{rep.totalOrders} {t('report.unit_items')}</td>
                    <td className="py-3 px-4 text-center font-black text-green-600 text-lg">{rep.totalBoxes} {t('dashboard.unit_boxes')}</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleDeleteReportLog(rep.id)} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors shadow-sm">{t('report.delete_report')}</button>
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