import React from 'react';
import { useTranslation } from 'react-i18next'; // 🌟 Import เครื่องมือแปลภาษา

export default function PackingStation({ barcode, setBarcode, handleScan, loading, result, error, saveMessage, qty, setQty, calculatedTotalWeight, calculatedBoxesUsed, handleSavePack }) {
  const { t } = useTranslation(); // 🌟 เรียกใช้งาน Hook แปลภาษา

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-blue-600 text-white p-6 text-center">
            <h1 className="text-3xl font-bold">{t('packing_station.title')}</h1>
        </div>
        <div className="p-6">
            <input 
              type="text" 
              autoFocus 
              value={barcode} 
              onChange={(e) => setBarcode(e.target.value.toUpperCase())} 
              onKeyDown={handleScan} 
              placeholder={t('packing_station.scan_placeholder')} 
              className="w-full text-xl p-3 border-2 rounded-lg mb-6"
            />
            
            {error && <p className="text-red-600 bg-red-100 p-4 rounded text-center mb-4">{error}</p>}
            {saveMessage && <p className="text-green-700 bg-green-100 p-4 rounded text-center mb-4">{saveMessage}</p>}
            
            {result && (
                <div className="bg-[#0B132B]/50 border border-white/10 rounded-xl p-6">
                    <h2 className="text-2xl font-bold mb-6 text-white">📦 {result.itemName}</h2>
                    
                    {/* ===== Input จำนวน ===== */}
                    <div className="mb-6">
                      <label className="block text-sm font-bold text-gray-700 mb-2">{t('packing_station.pack_qty_label')}</label>
                      <input 
                        type="number" 
                        value={qty} 
                        onChange={(e) => setQty(e.target.value)} 
                        className="w-full text-2xl font-bold text-center border-2 border-blue-400 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* ===== Information Grid ===== */}
                    {/* 🌟 ปรับเป็น 3 คอลัมน์ตอนจอใหญ่ เพื่อให้กล่อง 3 ใบเรียงสวยพอดีครับ */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {/* น้ำหนักต่อชิ้น */}
                      <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                        <div className="text-xs font-bold text-gray-600 mb-1">{t('packing_station.weight_per_piece')}</div>
                        <div className="text-xl font-bold text-gray-800">{result.itemWeight || 0} kg</div>
                      </div>

                      {/* น้ำหนักรวม */}
                      <div className="bg-white border-2 border-blue-400 rounded-lg p-4">
                        <div className="text-xs font-bold text-blue-600 mb-1">{t('packing_station.total_weight')}</div>
                        <div className="text-xl font-bold text-blue-700">{calculatedTotalWeight} kg</div>
                      </div>

                      {/* กล่องที่ใช้ */}
                      <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                        <div className="text-xs font-bold text-gray-600 mb-1">{t('packing_station.boxes_used')}</div>
                        <div className="text-xl font-bold text-gray-800">{calculatedBoxesUsed} {t('packing_station.unit_box')}</div>
                      </div>
                    </div> 

                    {/* ===== บันทึก Button ===== */}
                    <button 
                      onClick={handleSavePack} 
                      disabled={loading} 
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? t('packing_station.saving') : t('packing_station.save_history')}
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}