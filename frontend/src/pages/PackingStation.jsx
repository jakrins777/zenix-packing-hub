export default function PackingStation({ barcode, setBarcode, handleScan, loading, result, error, saveMessage, qty, setQty, calculatedTotalWeight, calculatedBoxesUsed, handleSavePack }) {
 return (
    <div className="max-w-4xl mx-auto bg-[#1C2541] rounded-xl shadow-lg overflow-hidden border border-white/10">
        <div className="bg-[#0B132B]/80 text-white p-6 text-center border-b border-white/10">
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
              className="w-full text-xl p-3 border border-white/10 rounded-lg mb-6 bg-[#0B132B] text-white placeholder-[#94A3B8] focus:ring-1 focus:ring-[#00B4D8] focus:border-[#00B4D8] outline-none transition-all"
            />
            
            {error && <p className="text-red-400 bg-red-500/20 p-4 rounded-lg text-center mb-4 border border-red-500/30 font-bold">{error}</p>}
            {saveMessage && <p className="text-emerald-400 bg-emerald-500/20 p-4 rounded-lg text-center mb-4 border border-emerald-500/30 font-bold">{saveMessage}</p>}
            
            {result && (
                <div className="bg-[#0B132B]/50 border border-white/10 rounded-xl p-6">
                    <h2 className="text-2xl font-bold mb-6 text-white">📦 {result.itemName}</h2>
                    
                    {/* ===== Input จำนวน ===== */}
                    <div className="mb-6">
                      <label className="block text-sm font-bold text-[#94A3B8] mb-2">{t('packing_station.pack_qty_label')}</label>
                      <input 
                        type="number" 
                        value={qty} 
                        onChange={(e) => setQty(e.target.value)} 
                        className="w-full text-2xl font-bold text-center border border-[#00B4D8] p-3 rounded-lg focus:ring-1 focus:ring-[#00B4D8] outline-none bg-[#1C2541] text-white"
                      />
                    </div>

                    {/* ===== Information Grid ===== */}
                    {/* 🌟 ปรับเป็น 3 คอลัมน์ตอนจอใหญ่ เพื่อให้กล่อง 3 ใบเรียงสวยพอดีครับ */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {/* น้ำหนักต่อชิ้น */}
                      <div className="bg-[#1C2541] border border-white/10 rounded-lg p-4 shadow-sm">
                        <div className="text-xs font-bold text-[#94A3B8] mb-1">{t('packing_station.weight_per_piece')}</div>
                        <div className="text-xl font-bold text-white">{result.itemWeight || 0} kg</div>
                      </div>

                      {/* น้ำหนักรวม */}
                      <div className="bg-[#1C2541] border border-[#00B4D8]/50 rounded-lg p-4 shadow-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-[#00B4D8]/5"></div>
                        <div className="text-xs font-bold text-[#00B4D8] mb-1 relative z-10">{t('packing_station.total_weight')}</div>
                        <div className="text-xl font-bold text-[#00B4D8] relative z-10">{calculatedTotalWeight} kg</div>
                      </div>

                      {/* กล่องที่ใช้ */}
                      <div className="bg-[#1C2541] border border-white/10 rounded-lg p-4 shadow-sm">
                        <div className="text-xs font-bold text-[#94A3B8] mb-1">{t('packing_station.boxes_used')}</div>
                        <div className="text-xl font-bold text-white">{calculatedBoxesUsed} <span className="text-sm font-normal text-[#94A3B8]">{t('packing_station.unit_box')}</span></div>
                      </div>
                    </div> 

                    {/* ===== บันทึก Button ===== */}
                    <button 
                      onClick={handleSavePack} 
                      disabled={loading} 
                      className="w-full py-4 bg-[#00B4D8] hover:bg-[#0096B4] text-white font-bold rounded-xl shadow-[0_0_15px_rgba(0,180,216,0.3)] transition-colors disabled:opacity-50 disabled:shadow-none disabled:bg-[#94A3B8]/20 disabled:text-[#94A3B8]"
                    >
                      {loading ? t('packing_station.saving') : t('packing_station.save_history')}
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}