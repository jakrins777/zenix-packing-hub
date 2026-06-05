import React from 'react';

export default function Inventory({ boxes }) {
  return (
    <div className="bg-transparent rounded-xl p-2 md:p-6 animate-fade-in-up">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-200">📦 รายงานสต็อกบรรจุภัณฑ์</h2>
          <p className="text-slate-400 font-medium">ระบบตรวจสอบยอดคงเหลือ และสถานะกล่อง</p>
        </div>
        <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all flex items-center gap-2"><span>🖨️</span> พิมพ์รายงานสรุป (Print)</button>
      </div>

      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-2xl font-black text-black">รายงานสต็อกกล่องบรรจุภัณฑ์</h1>
        <p className="text-sm text-gray-600">วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700 shadow-sm print:border-black">
        <table className="min-w-full bg-slate-800 print:bg-white">
          <thead className="bg-slate-900/50 text-slate-300 print:bg-gray-200 print:text-black border-b border-slate-700 print:border-black">
            <tr>
              <th className="py-3 px-4 text-left font-bold">รหัสกล่อง</th>
              <th className="py-3 px-4 text-left font-bold">รายละเอียด</th>
              <th className="py-3 px-4 text-center font-bold">ยอดสต็อกปัจจุบัน</th>
              <th className="py-3 px-4 text-center font-bold">สถานะแจ้งเตือน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50 print:divide-gray-300">
            {boxes.map((box) => {
              const isLowStock = !box.isConsignment && box.currentStock <= box.minStockLevel;
              return (
                <tr key={box.pckId} className="hover:bg-white/5 print:hover:bg-transparent">
                  <td className="py-3 px-4 font-mono font-bold text-blue-400 print:text-black">{box.pckId}</td>
                  <td className="py-3 px-4 text-slate-300 print:text-black">{box.description}</td>
                  
                  {/* 🌟 แสดงเฉพาะยอดสต็อกปัจจุบัน */}
                  <td className={`py-3 px-4 text-center font-black text-lg ${isLowStock ? 'text-red-400' : 'text-green-400'} print:text-black`}>
                    {box.currentStock || 0}
                  </td>
                  
                  <td className="py-3 px-4 text-center font-bold">
                    {box.isConsignment ? (
                      <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs print:border print:border-black print:bg-white print:text-black">
                        🔄 โควต้า Consignment
                      </span>
                    ) : isLowStock ? (
                      <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs animate-pulse print:border print:border-black print:bg-white print:text-black">
                        🚨 ใกล้จะหมด!
                      </span>
                    ) : (
                      <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs print:border print:border-black print:bg-white print:text-black">
                        ✅ สต็อกปกติ
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