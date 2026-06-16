import React from 'react';
import { useTranslation } from 'react-i18next'; // 🌟 Import เครื่องมือแปลภาษา

export default function Inventory({ boxes }) {
  const { t } = useTranslation(); // 🌟 เรียกใช้งาน Hook แปลภาษา

  // 🌟 จัดเรียงรหัสกล่อง A-Z ก่อนนำไปแสดงผล
  const sortedBoxes = [...(boxes || [])].sort((a, b) => 
    (a.pckId || a.pckid || '').localeCompare(b.pckId || b.pckid || '')
  );

  return (
    <div className="bg-transparent rounded-xl p-2 md:p-6 animate-fade-in-up">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-200">{t('inventory.title')}</h2>
          <p className="text-slate-400 font-medium">{t('inventory.subtitle')}</p>
        </div>
        <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all flex items-center gap-2">
          {t('inventory.print_summary')}
        </button>
      </div>

      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-2xl font-black text-black">{t('inventory.report_title')}</h1>
        <p className="text-sm text-gray-600">{t('inventory.print_date')} {new Date().toLocaleDateString('th-TH')}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700 shadow-sm print:border-black">
        <table className="min-w-full bg-slate-800 print:bg-white">
          <thead className="bg-slate-900/50 text-slate-300 print:bg-gray-200 print:text-black border-b border-slate-700 print:border-black">
            <tr>
              <th className="py-3 px-4 text-left font-bold">{t('inventory.th_box_id')}</th>
              <th className="py-3 px-4 text-left font-bold">{t('inventory.th_details')}</th>
              <th className="py-3 px-4 text-center font-bold">{t('inventory.th_current_stock')}</th>
              <th className="py-3 px-4 text-center font-bold">{t('inventory.th_status_alert')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50 print:divide-gray-300">
            {sortedBoxes.map((box) => {
              const stock = box.currentStock || 0;
              const minStock = box.minStockLevel || 0;
              
              // 🌟 แยกเงื่อนไขสถานะให้ชัดเจน
              const isOutOfStock = stock <= 0;
              const isLowStock = stock > 0 && stock <= minStock;

              // กำหนดสีตัวเลขสต็อก
              let stockColorClass = 'text-green-400';
              if (!box.isConsignment) {
                if (isOutOfStock) stockColorClass = 'text-red-500';
                else if (isLowStock) stockColorClass = 'text-orange-400';
              }

              return (
                <tr key={box.pckId} className="hover:bg-white/5 print:hover:bg-transparent">
                  <td className="py-3 px-4 font-mono font-bold text-blue-400 print:text-black">{box.pckId}</td>
                  <td className="py-3 px-4 text-slate-300 print:text-black">{box.description}</td>
                  
                  <td className={`py-3 px-4 text-center font-black text-lg ${stockColorClass} print:text-black`}>
                    {stock}
                  </td>
                  
                  <td className="py-3 px-4 text-center font-bold">
                    {box.isConsignment ? (
                      <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs print:border print:border-black print:bg-white print:text-black">
                        {t('inventory.status_consignment')}
                      </span>
                    ) : isOutOfStock ? (
                      // 🌟 แจ้งเตือนเมื่อสต็อก = 0
                      <span className="bg-red-600/20 text-red-500 px-3 py-1 rounded-full text-xs font-black animate-pulse print:border print:border-black print:bg-white print:text-black">
                        {t('inventory.status_out_of_stock')}
                      </span>
                    ) : isLowStock ? (
                      // 🌟 แจ้งเตือนเมื่อสต็อกเหลือน้อย
                      <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold print:border print:border-black print:bg-white print:text-black">
                        {t('inventory.status_low_stock')}
                      </span>
                    ) : (
                      // 🌟 สถานะปกติ
                      <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs print:border print:border-black print:bg-white print:text-black">
                        {t('inventory.status_normal')}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}