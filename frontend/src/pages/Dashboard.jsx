import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // 🌟 อย่าลืมเช็ค path ไฟล์นี้ให้ตรงนะครับ

export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      // 🌟 เปลี่ยนมายิงตรงเข้า Supabase ดึงตาราง reports และเรียงจากใหม่ไปเก่า
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('createdAt', { ascending: false }); // เรียงวันที่ล่าสุดขึ้นก่อน

      if (error) {
        throw error;
      }

      // ถ้ามีข้อมูล ก็เอาไปใส่ใน State ได้เลย
      if (data) {
        setReports(data);
      }
    } catch (error) {
      console.error("🚨 Error fetching reports:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in-up">
      <h2 className="text-3xl font-black text-indigo-900 mb-6 flex items-center gap-3">
        <span>📊</span> รายงานสรุปการวางแผน (Batch Reports)
      </h2>

      {isLoading ? (
        <div className="text-center py-10 text-gray-500 font-bold">กำลังโหลดข้อมูล...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500">
          ยังไม่มีข้อมูลประวัติการทำงาน
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Batch #{report.id}
                </div>
                <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                  {new Date(report.createdAt).toLocaleString('th-TH')}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm font-bold text-gray-600">พนักงานผู้บันทึก</span>
                  <span className="font-black text-indigo-900">{report.operator}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl text-center">
                    <div className="text-xs font-bold text-blue-600 mb-1">ยอดออเดอร์</div>
                    <div className="text-2xl font-black text-blue-900">{report.totalOrders} <span className="text-sm font-medium">รายการ</span></div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl text-center">
                    <div className="text-xs font-bold text-purple-600 mb-1">กล่องที่ต้องใช้</div>
                    <div className="text-2xl font-black text-purple-900">{report.totalBoxes} <span className="text-sm font-medium">กล่อง</span></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}