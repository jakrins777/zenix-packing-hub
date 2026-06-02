export default function PackingStation({ barcode, setBarcode, handleScan, loading, result, error, saveMessage, qty, setQty, calculatedTotalWeight, calculatedBoxesUsed, calculatedDesiccant, handleSavePack }) {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-blue-600 text-white p-6 text-center"><h1 className="text-3xl font-bold">🚀 สแกนแพ็คสินค้า</h1></div>
        <div className="p-6">
            <input type="text" autoFocus value={barcode} onChange={(e) => setBarcode(e.target.value.toUpperCase())} onKeyDown={handleScan} placeholder="สแกนบาร์โค้ด แล้วกด Enter..." className="w-full text-xl p-3 border-2 rounded-lg mb-6"/>
            {error && <p className="text-red-600 bg-red-100 p-4 rounded text-center mb-4">{error}</p>}
            {saveMessage && <p className="text-green-700 bg-green-100 p-4 rounded text-center mb-4">{saveMessage}</p>}
            {result && (
                <div className="bg-gray-50 border-2 rounded-xl p-6">
                    <h2 className="text-2xl font-bold mb-6">📦 {result.itemName}</h2>
                    
                    {/* ===== Input จำนวน ===== */}
                    <div className="mb-6">
                      <label className="block text-sm font-bold text-gray-700 mb-2">จำนวนที่แพ็ค (ชิ้น)</label>
                      <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full text-2xl font-bold text-center border-2 border-blue-400 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                    </div>

                    {/* ===== Information Grid ===== */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {/* น้ำหนักต่อชิ้น */}
                      <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                        <div className="text-xs font-bold text-gray-600 mb-1">⚖️ น้ำหนักต่อชิ้น</div>
                        <div className="text-xl font-bold text-gray-800">{result.itemWeight || 0} kg</div>
                      </div>

                      {/* น้ำหนักรวม */}
                      <div className="bg-white border-2 border-blue-400 rounded-lg p-4">
                        <div className="text-xs font-bold text-blue-600 mb-1">📊 น้ำหนักรวม</div>
                        <div className="text-xl font-bold text-blue-700">{calculatedTotalWeight} kg</div>
                      </div>

                      {/* กล่องที่ใช้ */}
                      <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                        <div className="text-xs font-bold text-gray-600 mb-1">📦 กล่องที่ใช้</div>
                        <div className="text-xl font-bold text-gray-800">{calculatedBoxesUsed} ใบ</div>
                      </div>

                      {/* ซองกันชื้น */}
                      <div className={`border-2 rounded-lg p-4 ${calculatedDesiccant > 0 ? 'bg-yellow-50 border-yellow-400' : 'bg-white border-gray-300'}`}>
                        <div className={`text-xs font-bold mb-1 ${calculatedDesiccant > 0 ? 'text-yellow-700' : 'text-gray-600'}`}>💧 ซองกันชื้น</div>
                        <div className={`text-xl font-bold ${calculatedDesiccant > 0 ? 'text-yellow-800' : 'text-gray-800'}`}>{calculatedDesiccant} ซอง</div>
                      </div>
                    </div>

                    {/* ===== บันทึก Button ===== */}
                    <button onClick={handleSavePack} disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50">
                      {loading ? '⏳ กำลังบันทึก...' : '💾 บันทึกประวัติ'}
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}