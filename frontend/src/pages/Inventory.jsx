import React from 'react';

export default function Inventory({ boxes }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-indigo-900">📦 รายงานสต็อกบรรจุภัณฑ์</h2>
          <p className="text-gray-500 font-medium">ระบบตรวจสอบและแจ้งเตือนจุดสั่งซื้อ (Reorder Point)</p>
        </div>
        <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all flex items-center gap-2"><span>🖨️</span> พิมพ์รายงานสรุป (Print)</button>
      </div>

      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-2xl font-black text-gray-900">รายงานสต็อกกล่องบรรจุภัณฑ์</h1>
        <p className="text-sm text-gray-500">วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full bg-white">
          <thead className="bg-indigo-900 text-white print:bg-gray-200 print:text-black">
            <tr>
              <th className="py-3 px-4 text-left font-bold border-b print:border-gray-800">รหัสกล่อง</th>
              <th className="py-3 px-4 text-left font-bold border-b print:border-gray-800">รายละเอียด</th>
              <th className="py-3 px-4 text-center font-bold border-b print:border-gray-800">ยอดสต็อกปัจจุบัน</th>
              <th className="py-3 px-4 text-center font-bold border-b print:border-gray-800">จุดสั่งซื้อ (Min)</th>
              <th className="py-3 px-4 text-center font-bold border-b print:border-gray-800">สถานะแจ้งเตือน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {boxes.map((box) => {
              const isLowStock = box.currentStock <= box.minStockLevel;
              return (
                <tr key={box.pckId} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono font-bold text-gray-800">{box.pckId}</td>
                  <td className="py-3 px-4 text-gray-600">{box.description}</td>
                  <td className={`py-3 px-4 text-center font-black text-lg ${isLowStock ? 'text-red-600 print:text-black' : 'text-green-600 print:text-black'}`}>{box.currentStock || 0}</td>
                  <td className="py-3 px-4 text-center text-gray-500 font-bold">{box.minStockLevel || 0}</td>
                  <td className="py-3 px-4 text-center font-bold">
                    {isLowStock ? (
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs animate-pulse print:border print:border-black print:bg-white print:text-black">🚨 ต้องสั่งซื้อเพิ่ม!</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs print:border print:border-black print:bg-white print:text-black">✅ สต็อกปกติ</span>
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