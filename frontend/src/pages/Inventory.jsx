import React from 'react';

export default function Inventory({ boxes }) {
  // 🌟 จัดเรียงรหัสกล่อง A-Z ก่อนนำไปแสดงผล
  const sortedBoxes = [...(boxes || [])].sort((a, b) => 
    (a.pckId || a.pckid || '').localeCompare(b.pckId || b.pckid || '')
  );

return (
    <div className="bg-transparent rounded-xl p-2 md:p-6 animate-fade-in-up">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-white">{t('inventory.title')}</h2>
          <p className="text-[#94A3B8] font-medium">{t('inventory.subtitle')}</p>
        </div>
        <button onClick={() => window.print()} className="bg-[#00B4D8] hover:bg-[#0096B4] text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all flex items-center gap-2">
          <span>🖨️</span> {t('inventory.print_summary')}
        </button>
      </div>

      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-2xl font-black text-black">{t('inventory.report_title')}</h1>
        <p className="text-sm text-gray-600">{t('inventory.print_date')} {new Date().toLocaleDateString('th-TH')}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10 shadow-sm print:border-black">
        <table className="min-w-full bg-[#1C2541] print:bg-white">
          <thead className="bg-[#0B132B]/80 text-[#94A3B8] print:bg-gray-200 print:text-black border-b border-white/10 print:border-black">
            <tr>
              <th className="py-3 px-4 text-left font-bold">{t('inventory.th_box_id')}</th>
              <th className="py-3 px-4 text-left font-bold">{t('inventory.th_details')}</th>
              <th className="py-3 px-4 text-center font-bold">{t('inventory.th_current_stock')}</th>
              <th className="py-3 px-4 text-center font-bold">{t('inventory.th_status_alert')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 print:divide-gray-300">
            {sortedBoxes.map((box) => {
              const stock = box.currentStock || 0;
              const minStock = box.minStockLevel || 0;
              
              // 🌟 แยกเงื่อนไขสถานะให้ชัดเจน
              const isOutOfStock = stock <= 0;
              const isLowStock = stock > 0 && stock <= minStock;

              // กำหนดสีตัวเลขสต็อก
              let stockColorClass = 'text-emerald-400';
              if (!box.isConsignment) {
                if (isOutOfStock) stockColorClass = 'text-red-500';
                else if (isLowStock) stockColorClass = 'text-orange-400';
              }

              return (
                <tr key={box.pckId} className="hover:bg-white/5 print:hover:bg-transparent transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#00B4D8] print:text-black">{box.pckId}</td>
                  <td className="py-3 px-4 text-white print:text-black">{box.description}</td>
                  
                  <td className={`py-3 px-4 text-center font-black text-lg ${stockColorClass} print:text-black`}>
                    {stock}
                  </td>
                  
                  <td className="py-3 px-4 text-center font-bold">
                    {box.isConsignment ? (
                      <span className="bg-[#00B4D8]/20 text-[#00B4D8] px-3 py-1 rounded-full text-xs print:border print:border-black print:bg-white print:text-black">
                        {t('inventory.status_consignment')}
                      </span>
                    ) : isOutOfStock ? (
                      <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-black animate-pulse print:border print:border-black print:bg-white print:text-black">
                        {t('inventory.status_out_of_stock')}
                      </span>
                    ) : isLowStock ? (
                      <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold print:border print:border-black print:bg-white print:text-black">
                        {t('inventory.status_low_stock')}
                      </span>
                    ) : (
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