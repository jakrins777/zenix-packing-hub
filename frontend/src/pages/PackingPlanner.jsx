/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function PackingPlanner({ items, boxes, currentUser, fetchReportsData, fetchLogsData, fetchAdminData }) {
  const [bulkText, setBulkText] = useState('');
  const [calcResults, setCalcResults] = useState([]);
  const [boxSummary, setBoxSummary] = useState([]);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // ❌ ลบ capacity และ requiredBoxes ที่อยู่ตรงนี้ออกไปแล้วครับ ย้ายไปคำนวณด้านล่างแทน

  const handleBulkCalculate = () => {
    if (!bulkText.trim()) return;

    const rows = bulkText.split('\n').filter(r => r.trim());
    const results = [];
    const summaryMap = {}; 

    rows.forEach((row, index) => {
      const parts = row.trim().split(/[\t ]+/);
      let itemCode = (parts[0] || '').toUpperCase().trim().replace(/[\r\n\s]+/g, '');
      const qty = parseInt(parts[1] || 0, 10);

      if (!itemCode) return;

      const foundItem = items.find(i => i.itemId === itemCode);
      if (!foundItem) {
        results.push({ id: index, itemCode, qty, error: '❌ ไม่พบรหัสสินค้านี้' });
        return;
      }

      const foundBox = boxes.find(b => b.pckId === foundItem.defaultPckId);
      if (!foundBox) {
        results.push({ id: index, itemCode, qty, itemName: foundItem.itemName, customer: foundItem.supplier, error: '⚠️ ยังไม่ผูกกล่อง' });
        return;
      }

      // 🌟 แก้ไขตรงนี้: ดึงความจุจาก Std Pack ของสินค้าก่อน ถ้าไม่มีค่อยใช้ของกล่อง
      const boxCap = foundItem.stdPackQty || foundBox.maxCapacity || 1;
      
      const itemWeight = Number(foundItem.itemWeight || 0);
      const totalWeight = qty * itemWeight;

      results.push({
        id: index, itemCode, itemName: foundItem.itemName, customer: foundItem.supplier, qty, boxType: foundBox.pckId, boxDesc: foundBox.description, boxCap,
        itemWeight: itemWeight, totalWeight: totalWeight
      });

      if (!summaryMap[foundBox.pckId]) {
        summaryMap[foundBox.pckId] = { boxType: foundBox.pckId, boxDesc: foundBox.description, boxCap: boxCap, totalQty: 0, itemCount: 0 };
      }
      summaryMap[foundBox.pckId].totalQty += qty;
      summaryMap[foundBox.pckId].itemCount += 1;
    });

    const summaryArray = Object.values(summaryMap).map(box => {
      const totalBoxes = Math.ceil(box.totalQty / box.boxCap);
      const remainder = box.totalQty % box.boxCap;
      const spaceLeft = remainder === 0 ? 0 : box.boxCap - remainder; 
      return { ...box, totalBoxes, remainder, spaceLeft };
    });

    setCalcResults(results);
    setBoxSummary(summaryArray); 
    toast.success(`คำนวณข้อมูลสำเร็จ ${results.length} รายการ`);
  };

  const handleSaveReport = async () => {
    const validItems = calcResults.filter(r => !r.error);
    if (validItems.length === 0) return toast.error('ไม่มีข้อมูลที่ถูกต้องให้บันทึกครับ'); 
    
    const totalBoxesUsed = boxSummary.reduce((sum, box) => sum + (box.totalBoxes || 0), 0);
    const toastId = toast.loading('กำลังบันทึกรายงานและลงประวัติการแพ็ค...'); 

    try {
      const { error: reportError } = await supabase.from('Report').insert([{
        operator: currentUser?.firstName || 'ไม่ระบุตัวตน',
        totalOrders: validItems.length,
        totalBoxes: totalBoxesUsed, 
        data: validItems
      }]);

      if (reportError) throw reportError;

      const packingLogsPayload = validItems.map(item => {
        const boxesUsedForThisItem = Number((item.qty / (item.boxCap || 1)).toFixed(2));
        return {
          userId: currentUser.id,
          itemId: item.itemCode,
          packQty: Number(item.qty),
          boxUsed: boxesUsedForThisItem,
          totalWeight: Number((item.totalWeight || 0).toFixed(3))
        };
      });

      const { error: logsError } = await supabase.from('packing_logs').insert(packingLogsPayload);
      if (logsError) throw logsError;

      for (const sum of boxSummary) {
        const boxToUpdate = boxes.find(b => b.pckId === sum.boxType);
        if (boxToUpdate) {
          const newStock = Math.max(0, boxToUpdate.currentStock - Number(sum.totalBoxes));
          await supabase.from('boxes').update({ currentStock: newStock }).eq('pckId', boxToUpdate.pckId);
        }
      }

      toast.success('💾 บันทึกรายงานแผน, ลงประวัติการแพ็ค และตัดสต็อกเรียบร้อย!', { id: toastId }); 
      setCalcResults([]); 
      setBoxSummary([]); 
      setBulkText('');
      
      fetchReportsData(); 
      fetchLogsData();    
      fetchAdminData();   

    } catch (error) { 
      toast.error('บันทึกไม่สำเร็จ: ' + error.message, { id: toastId }); 
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100">
        <h2 className="text-2xl font-black text-indigo-900 mb-2">📋 วางแผนจำนวนกล่องบรรจุภัณฑ์</h2>
        <p className="text-gray-500 mb-6 font-medium">ก๊อปปี้ข้อมูล <span className="text-indigo-600 font-bold">รหัสสินค้า</span> และ <span className="text-indigo-600 font-bold">จำนวน</span> จาก Excel มาวางในช่องด้านล่างได้เลย</p>
        
        <div className="space-y-4">
          <textarea 
            rows="6"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"ตัวอย่างรูปแบบการวางจาก Excel:\nITEM001    500\nITEM002    120"}
            className="w-full p-4 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-mono text-sm bg-gray-50 text-gray-900"
          ></textarea>
          
          <div className="flex gap-4">
            <button onClick={handleBulkCalculate} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform active:scale-95 text-lg">🧮 คำนวณจำนวนกล่อง</button>
            <button onClick={() => { setBulkText(''); setCalcResults([]); setBoxSummary([]); toast('ล้างข้อมูลเรียบร้อย', {icon: '🧹'}); }} className="bg-gray-200 hover:bg-white-10 text-gray-700 font-bold py-4 px-8 rounded-xl transition-all">ล้างข้อมูล</button>
          </div>
        </div>
      </div>

      {calcResults.length > 0 && (
        <div className="space-y-6 animate-fade-in-up">
          {boxSummary.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl shadow-xl overflow-hidden text-white border border-indigo-800">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 p-4 print:hidden border-b border-white/20">
                <h3 className="text-xl font-bold text-white">📦 สรุปการเบิกกล่องรวม (Consolidation Plan)</h3>
                <button 
                  onClick={() => setShowSummaryModal(true)} 
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all flex items-center gap-2"
                >
                  📋 ดูใบสรุปเบิกกล่อง / พิมพ์
                </button>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {boxSummary.map((sum, idx) => (
                  <div key={idx} className="bg-white/10 rounded-xl p-4 border border-white/20">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-black text-xl text-yellow-300">{sum.boxType}</div>
                        <div className="text-xs text-indigo-200">{sum.boxDesc}</div>
                      </div>
                      <div className="bg-white/20 text-xs px-2 py-1 rounded font-bold">จุ {sum.boxCap} ชิ้น</div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-2 text-center">
                      <div>
                        <div className="text-xs text-indigo-200">ของรวม ({sum.itemCount} รายการ)</div>
                        <div className="font-bold text-lg">{sum.totalQty} ชิ้น</div>
                      </div>
                      <div>
                        <div className="text-xs text-indigo-200">ต้องเบิกกล่อง</div>
                        <div className="font-bold text-lg text-green-400">{sum.totalBoxes} ใบ</div>
                      </div>
                    </div>
                    {sum.spaceLeft > 0 ? (
                      <div className="mt-3 bg-red-500/20 text-red-200 text-xs font-bold p-2 rounded-lg text-center border border-red-500/30">กล่องใบสุดท้าย มีพื้นที่ว่างใส่ได้อีก {sum.spaceLeft} ชิ้น</div>
                    ) : (
                      <div className="mt-3 bg-green-500/20 text-green-200 text-xs font-bold p-2 rounded-lg text-center border border-green-500/30">แพ็คพอดีกล่องเต็มทุกใบ (ไม่มีที่ว่าง)</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="bg-gray-50 p-4 border-b border-gray-100 font-bold flex justify-between items-center text-gray-700">
              <span>รายละเอียดสินค้าที่ต้องแพ็ค ({calcResults.length} รายการ)</span>
              <button onClick={handleSaveReport} className="bg-green-500 hover:bg-green-400 text-white text-sm px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-2"><span>💾</span> ยืนยันและบันทึกรายงาน</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-white border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left font-bold text-gray-500 text-sm">รหัสสินค้า</th>
                    <th className="py-3 px-4 text-left font-bold text-gray-500 text-sm">ชื่อสินค้า / ลูกค้า</th>
                    <th className="py-3 px-4 text-center font-bold text-gray-500 text-sm">จำนวนที่สั่ง</th>
                    <th className="py-3 px-4 text-center font-bold text-gray-500 text-sm">น้ำหนัก/ชิ้น (kg)</th>
                    <th className="py-3 px-4 text-center font-bold text-gray-500 text-sm">น้ำหนักรวม (kg)</th>
                    <th className="py-3 px-4 text-center font-bold text-gray-500 text-sm">ชนิดกล่องที่จะถูกจับรวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {calcResults.map((res) => (
                    <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-800">{res.itemCode}</td>
                      {res.error ? (
                        <td colSpan="5" className="py-3 px-4 text-red-500 font-bold bg-red-50">{res.error}</td>
                      ) : (
                        <>
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-700">{res.itemName}</div>
                            <div className="text-xs text-indigo-600 font-bold">{res.customer}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-black text-gray-700">{res.qty}</td>
                          <td className="py-3 px-4 text-center font-medium text-gray-600">{(res.itemWeight || 0).toFixed(3)}</td>
                          <td className="py-3 px-4 text-center font-black text-indigo-900">{(res.totalWeight || 0).toFixed(3)}</td>
                          <td className="py-3 px-4 text-center"><span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">{res.boxType}</span></td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 1. ย้าย Popup ปริ้นท์ใบเบิกกล่องออกมาไว้นอกตาราง ไม่ให้มันลูปซ้ำ */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 print:bg-white print:block">
          
          <style type="text/css" media="print">
            {`
              body * { visibility: hidden; }
              #print-modal, #print-modal * { visibility: visible; }
              #print-modal { position: absolute; left: 0; top: 0; width: 100%; height: 100%; padding: 20px; box-shadow: none; background: white; }
            `}
          </style>

          <div id="print-modal" className="bg-slate-800 rounded-xl p-6 md:p-8 w-full max-w-2xl shadow-2xl print:bg-white print:text-black">
            <div className="flex justify-between items-center mb-6 print:hidden">
              <h2 className="text-2xl font-black text-white">📋 สรุปรายการเบิกกล่อง</h2>
              <button onClick={() => setShowSummaryModal(false)} className="text-red-400 hover:text-red-300 font-bold text-2xl">✕</button>
            </div>

            <div className="hidden print:block text-center mb-8">
              <h1 className="text-3xl font-black text-black mb-2">ใบเบิกบรรจุภัณฑ์ (Box Requisition)</h1>
              <p className="text-gray-600">วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')} เวลา {new Date().toLocaleTimeString('th-TH')}</p>
            </div>

            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-700 text-slate-200 print:bg-gray-200 print:text-black">
                <tr>
                  <th className="p-4 border border-slate-600 print:border-gray-400 font-bold text-lg w-20 text-center">ลำดับ</th>
                  <th className="p-4 border border-slate-600 print:border-gray-400 font-bold text-lg">รหัสกล่อง (Box Type)</th>
                  <th className="p-4 border border-slate-600 print:border-gray-400 font-bold text-center text-lg">จำนวนที่ต้องเบิก</th>
                </tr>
              </thead>
              <tbody className="text-slate-200 print:text-black">
                {boxSummary.map((sum, idx) => {
                  const boxDetail = boxes.find(b => b.pckId === sum.boxType || b.pckid === sum.boxType);
                  const description = boxDetail?.description || '-';

                  return (
                    <tr key={idx} className="hover:bg-slate-700/50 print:hover:bg-transparent">
                      <td className="p-4 border border-slate-600 print:border-gray-400 text-center text-lg align-top">{idx + 1}</td>
                      <td className="p-4 border border-slate-600 print:border-gray-400 align-top">
                        <div className="font-mono font-black text-xl text-blue-400 print:text-black">{sum.boxType}</div>
                        <div className="text-sm font-medium text-slate-400 print:text-gray-600 mt-1">{description}</div>
                      </td>
                      <td className="p-4 border border-slate-600 print:border-gray-400 font-black text-center text-2xl text-emerald-400 print:text-black align-top">
                        {sum.totalBoxes} <span className="text-sm font-medium text-slate-400 print:text-gray-600">ใบ</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-8 flex justify-end gap-4 print:hidden">
              <button onClick={() => setShowSummaryModal(false)} className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-bold transition-colors">ย้อนกลับ</button>
              <button onClick={() => window.print()} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors flex items-center gap-2 shadow-lg">
                🖨️ พิมพ์ใบเบิกกล่อง (Print)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}