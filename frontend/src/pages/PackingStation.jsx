export default function PackingStation({ user, barcode, setBarcode, handleScan, loading, result, error, saveMessage, qty, setQty, calculatedTotalWeight, calculatedBoxesUsed, calculatedDesiccant, handleSavePack }) {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-blue-600 text-white p-6 text-center"><h1 className="text-3xl font-bold">🚀 สแกนแพ็คสินค้า</h1></div>
        <div className="p-6">
            <input type="text" autoFocus value={barcode} onChange={(e) => setBarcode(e.target.value.toUpperCase())} onKeyDown={handleScan} placeholder="สแกนบาร์โค้ด แล้วกด Enter..." className="w-full text-xl p-3 border-2 rounded-lg mb-6"/>
            {error && <p className="text-red-600 bg-red-100 p-4 rounded text-center mb-4">{error}</p>}
            {saveMessage && <p className="text-green-700 bg-green-100 p-4 rounded text-center mb-4">{saveMessage}</p>}
            {result && (
                <div className="bg-gray-50 border-2 rounded-xl p-6">
                    <h2 className="text-2xl font-bold mb-4">📦 {result.itemName}</h2>
                    <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-24 text-2xl font-bold text-center border p-2 mb-4"/>
                    {/* (เพิ่มข้อมูล Grid ตามเดิม) */}
                    <button onClick={handleSavePack} className="w-full py-4 bg-blue-600 text-white font-bold rounded">💾 บันทึกประวัติ</button>
                </div>
            )}
        </div>
    </div>
  );
}