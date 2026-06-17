import React from 'react';
import { useTranslation } from 'react-i18next'; // 🌟 Import เครื่องมือแปลภาษา

export default function Inventory({ boxes }) {
  const { t } = useTranslation(); // 🌟 เรียกใช้งาน Hook แปลภาษา

  // 🌟 จัดเรียงรหัสกล่อง A-Z ก่อนนำไปแสดงผล
  const sortedBoxes = [...(boxes || [])].sort((a, b) =>
    (a.pckId || a.pckid || '').localeCompare(b.pckId || b.pckid || '')
  );

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 print:shadow-none print:border-none print:p-0">

        {/* ส่วนหัวของหน้า (Header) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 pb-5 mb-6 gap-4 print:border-gray-400">
          <div>
            <h2 className="text-2xl font-black text-[#0066CC] flex items-center gap-3 print:text-black">
              <span className="text-3xl"></span> {t('inventory.title')}
            </h2>
            <p className="text-sm font-medium text-gray-500 mt-1 print:text-gray-700">{t('inventory.subtitle')}</p>
          </div>

          <button
            onClick={() => window.print()}
            className="bg-[#0066CC] hover:bg-[#0052a3] text-white font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors flex items-center gap-2 print:hidden"
          >
           {t('inventory.print_summary')}
          </button>
        </div>

        {/* ส่วนหัวสำหรับตอน Print */}
        <div className="hidden print:block mb-6 text-center">
          <h1 className="text-2xl font-black text-black">{t('inventory.report_title')}</h1>
          <p className="text-sm text-gray-600">{t('inventory.print_date')} {new Date().toLocaleDateString('th-TH')}</p>
        </div>

        {/* ตารางแสดงสต็อก */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm print:shadow-none print:border-gray-400">
          <table className="min-w-full bg-white print:text-black">
            <thead className="bg-gray-50 border-b border-gray-200 print:bg-gray-200 print:border-gray-400">
              <tr>
                <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase tracking-wider text-sm print:text-black">{t('inventory.th_box_id')}</th>
                <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase tracking-wider text-sm print:text-black">{t('inventory.th_details')}</th>
                <th className="py-4 px-6 text-center font-bold text-gray-600 uppercase tracking-wider text-sm print:text-black">{t('inventory.th_current_stock')}</th>
                <th className="py-4 px-6 text-center font-bold text-gray-600 uppercase tracking-wider text-sm print:text-black">{t('inventory.th_status_alert')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 print:divide-gray-300">
              {sortedBoxes.length > 0 ? (
                sortedBoxes.map((box) => {
                  const stock = box.currentStock || 0;
                  const minStock = box.minStockLevel || 0;

                  // 🌟 แยกเงื่อนไขสถานะให้ชัดเจน
                  const isOutOfStock = stock <= 0;
                  const isLowStock = stock > 0 && stock <= minStock;

                  // กำหนดสีตัวเลขสต็อก
                  let stockColorClass = 'text-emerald-600';
                  if (!box.isConsignment) {
                    if (isOutOfStock) stockColorClass = 'text-red-600';
                    else if (isLowStock) stockColorClass = 'text-amber-500';
                  }

                  return (
                    <tr key={box.pckId || box.id} className="hover:bg-gray-50 transition-colors print:break-inside-avoid">
                      <td className="py-4 px-6 font-mono font-black text-[#0066CC] print:text-black">{box.pckId}</td>
                      <td className="py-4 px-6 text-sm font-medium text-gray-800 print:text-black">
                        {box.description || '-'}
                        {box.codename && <span className="ml-2 text-[10px] bg-blue-50 text-[#0066CC] px-2 py-0.5 rounded border border-blue-100 print:border-none print:text-gray-600">({box.codename})</span>}
                      </td>

                      <td className={`py-4 px-6 text-center font-black text-2xl ${stockColorClass} print:text-black`}>
                        {stock}
                      </td>

                      <td className="py-4 px-6 text-center">
                        {box.isConsignment ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#0066CC] border border-blue-200 print:border-none print:bg-white print:text-black">
                             {t('inventory.status_consignment')}
                          </span>
                        ) : isOutOfStock ? (
                          // 🌟 แจ้งเตือนเมื่อสต็อก = 0
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-50 text-red-600 border border-red-200 animate-pulse print:border-none print:bg-white print:text-black print:animate-none">
                             {t('inventory.status_out_of_stock')}
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 print:border-none print:bg-white print:text-black">
                             {t('inventory.status_low_stock')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 print:border-none print:bg-white print:text-black">
                             {t('inventory.status_normal')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-gray-400 font-bold">
                    {t('inventory.empty_stock')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}