import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next'; // 🌟 Import เครื่องมือแปลภาษา

export default function BoxCodenameUpdater({ boxes, fetchAdminData }) {
  const { t } = useTranslation(); // 🌟 เรียกใช้งาน t function
  const [bulkText, setBulkText] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePreview = () => {
    if (!bulkText.trim()) return toast.error(t('box_updater.error_empty'));

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
      toast.error(t('box_updater.error_format'));
      return;
    }

    setPreviewData(parsedData);
    toast.success(t('box_updater.preview_success'));
  };

  const handleConfirmUpdate = async () => {
    const validData = previewData.filter(d => d.status === 'READY');
    if (validData.length === 0) return toast.error(t('box_updater.error_no_valid_data'));

    setIsUpdating(true);
    const toastId = toast.loading(t('box_updater.updating_toast', { count: validData.length }));

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

      toast.success(t('box_updater.update_success', { count: validData.length }), { id: toastId });
      
      setBulkText('');
      setPreviewData([]);
      if (fetchAdminData) fetchAdminData(); 

    } catch (error) {
      toast.error(t('box_updater.error_general') + error.message, { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 mb-8 text-gray-800 print:hidden">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🏷️</span>
        <div>
          <h2 className="text-xl font-bold text-[#0066CC]">{t('box_updater.title')}</h2>
          <p className="text-sm text-gray-500">{t('box_updater.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-4">
        <textarea
          rows="5"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          disabled={isUpdating}
          placeholder="PCK0000013    D2P ใหญ่&#10;PCK0000036    กล่อง GKN MC165"
          className="w-full p-4 border border-gray-300 rounded-xl focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] outline-none font-mono text-sm bg-white text-gray-800 placeholder-gray-400 shadow-inner transition-all"
        ></textarea>

        <div className="flex gap-4">
          <button
            onClick={handlePreview}
            disabled={isUpdating || !bulkText.trim()}
            className="flex-1 bg-[#0066CC] hover:bg-[#0052a3] text-white font-bold py-3 rounded-xl transition-colors shadow-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:border disabled:border-gray-200"
          >
            {t('box_updater.btn_preview')}
          </button>
          <button
            onClick={() => { setBulkText(''); setPreviewData([]); }}
            disabled={isUpdating}
            className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-600 font-bold py-3 px-6 rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            {t('common.clear')}
          </button>
        </div>
      </div>

      {previewData.length > 0 && (
        <div className="mt-8 animate-fade-in-up border-t border-gray-200 pt-6">
          <h3 className="font-bold text-gray-800 mb-3 flex justify-between items-end">
            <span>{t('box_updater.preview_table_title', { count: previewData.length })}</span>
            {previewData.some(d => d.status === 'NOT_FOUND') && (
              <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded">{t('box_updater.warning_not_found')}</span>
            )}
          </h3>

          <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
            <table className="min-w-full text-left text-sm bg-white">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="p-3 font-bold text-gray-600 uppercase tracking-wider text-xs">{t('box_updater.th_box_id')}</th>
                  <th className="p-3 font-bold text-gray-600 uppercase tracking-wider text-xs">{t('box_updater.th_old_name')}</th>
                  <th className="p-3 font-bold text-[#0066CC] uppercase tracking-wider text-xs">{t('box_updater.th_new_name')}</th>
                  <th className="p-3 font-bold text-center text-gray-600 uppercase tracking-wider text-xs">{t('box_updater.th_status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewData.map((item) => (
                  <tr key={item.id} className={item.status === 'NOT_FOUND' ? 'bg-red-50' : 'hover:bg-gray-50 transition-colors'}>
                    <td className="p-3 font-mono font-bold text-[#0066CC]">{item.pckId}</td>
                    <td className="p-3 text-gray-500 font-medium">{item.oldCodename || <span className="italic text-gray-400">{t('box_updater.empty')}</span>}</td>
                    <td className="p-3 font-black text-gray-800">{item.codename}</td>
                    <td className="p-3 text-center">
                      {item.status === 'READY'
                        ? <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-xs font-bold border border-emerald-200">{t('box_updater.status_ready')}</span>
                        : <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-200">{t('box_updater.status_not_found')}</span>
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
            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-sm transition-colors text-lg disabled:bg-gray-100 disabled:text-gray-400 disabled:border disabled:border-gray-200 disabled:shadow-none flex justify-center items-center gap-2"
          >
            {isUpdating ? t('box_updater.btn_updating') : t('box_updater.btn_confirm')}
          </button>
        </div>
      )}
    </div>
  );
}