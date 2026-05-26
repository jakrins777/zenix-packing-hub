export default function Dashboard({ logs, timeFilter, setTimeFilter, customDate, setCustomDate, filteredLogs }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 print:shadow-none">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h2 className="text-2xl font-bold">📊 รายงานสรุป</h2>
        <div className="flex gap-2">
          <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="p-2 border rounded">
            <option value="today">วันนี้</option>
            <option value="month">เดือนนี้</option>
            <option value="year">ปีนี้</option>
            <option value="custom">เลือกวันที่เอง</option>
            <option value="all">ทั้งหมด</option>
          </select>
          {timeFilter === 'custom' && <input type="date" onChange={(e) => setCustomDate(e.target.value)} className="p-2 border rounded"/>}
          <button onClick={() => window.print()} className="bg-gray-800 text-white px-4 py-2 rounded">🖨️ พิมพ์</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded">การแพ็ค: {filteredLogs.length} ครั้ง</div>
        <div className="bg-green-50 p-4 rounded">สินค้ารวม: {filteredLogs.reduce((sum, log) => sum + log.packQty, 0)} ชิ้น</div>
        <div className="bg-orange-50 p-4 rounded">กล่องที่ใช้: {filteredLogs.reduce((sum, log) => sum + log.boxUsed, 0).toFixed(2)} ใบ</div>
      </div>
      <table className="min-w-full border">
        <thead><tr className="bg-gray-100 text-left"><th>เวลา</th><th>ผู้ทำ</th><th>สินค้า</th><th>จำนวน</th><th>กล่อง</th></tr></thead>
        <tbody>
          {filteredLogs.map(log => (
            <tr key={log.logId} className="border-b">
              <td>{new Date(log.packedAt).toLocaleString('th-TH')}</td>
              <td>{log.user?.firstName}</td>
              <td>{log.itemId}</td>
              <td>{log.packQty}</td>
              <td>{log.boxUsed.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}