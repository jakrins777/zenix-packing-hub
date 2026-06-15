/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function PackingPlanner({ items, boxes, currentUser, fetchReportsData, fetchLogsData, fetchAdminData }) {
  const [bulkText, setBulkText] = useState('');
  const [calcResults, setCalcResults] = useState([]);
  const [boxSummary, setBoxSummary] = useState([]);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  
  const [packingMode, setPackingMode] = useState('consolidate'); // Default เป็นโหมดรวมมิตรเพื่อประหยัดกล่อง
  const [moveConfig, setMoveConfig] = useState(null);

  const handleBulkCalculate = () => {
    if (!bulkText.trim()) return;

    const rows = bulkText.split('\n').filter(r => r.trim());
    const validItemsList = [];
    const errorList = [];

    rows.forEach((row, index) => {
      const parts = row.trim().split(/[\t ]+/).filter(Boolean); 
      if (parts.length < 2) return;

      let orderNo = 'ไม่ระบุ Order';
      let poNumber = 'ไม่ระบุ PO';
      let lineNo = '-';
      let itemCode = '';
      let lotNo = ''; 
      let qty = 0;

      const isParts0Item = items.some(i => i.itemId === parts[0].toUpperCase().trim());

      if (isParts0Item) {
        itemCode = parts[0].toUpperCase().trim();
        if (!isNaN(parseInt(parts[1], 10))) {
          qty = parseInt(parts[1], 10);
          if (parts.length > 2) {
            poNumber = parts[parts.length - 1].toUpperCase().trim();
            orderNo = poNumber; 
            lotNo = poNumber; 
          }
        } 
        else if (parts.length >= 5 && !isNaN(parseInt(parts[4], 10))) {
          qty = parseInt(parts[4], 10);
          lotNo = parts[2].trim();
          poNumber = lotNo; 
          orderNo = lotNo;
        }
      } else {
        if (parts.length >= 5) {
          poNumber = parts[0].toUpperCase().trim();
          orderNo = parts[1].toUpperCase().trim();
          lineNo = parts[2].toUpperCase().trim();
          itemCode = parts[3].toUpperCase().trim();
          qty = parseInt(parts[4], 10);
        } else if (parts.length === 4) {
          orderNo = parts[0].toUpperCase().trim();
          poNumber = parts[1].toUpperCase().trim();
          itemCode = parts[2].toUpperCase().trim();
          qty = parseInt(parts[3], 10);
        } else if (parts.length === 3) {
          poNumber = parts[0].toUpperCase().trim();
          itemCode = parts[1].toUpperCase().trim();
          qty = parseInt(parts[2], 10);
        } else {
          itemCode = parts[0].toUpperCase().trim();
          qty = parseInt(parts[1], 10);
        }
      }

      if (!itemCode || isNaN(qty) || qty <= 0) return;

      const foundItem = items.find(i => i.itemId === itemCode);
      if (!foundItem) {
        errorList.push({ id: index, orderNo, poNumber, itemCode, lotNo, qty, error: '❌ ไม่พบรหัสสินค้านี้' });
        return;
      }

      const foundBox = boxes.find(b => b.pckId === foundItem.defaultPckId);
      if (!foundBox) {
        errorList.push({ id: index, orderNo, poNumber, itemCode, lotNo, qty, itemName: foundItem.itemName, error: '⚠️ ยังไม่ผูกกล่อง' });
        return;
      }

      // ยึดความจุตามสเปกสินค้า (stdPackQty) เป็นหลักสูงสุดในการคำนวณจำนวนชิ้นจริง
      let boxCap = 1; 
      if (foundItem.stdPackQty && Number(foundItem.stdPackQty) > 1) {
        boxCap = Number(foundItem.stdPackQty);
      } else if (foundBox.maxCapacity && Number(foundBox.maxCapacity) > 1) {
        boxCap = Number(foundBox.maxCapacity);
      }

      let groupKey = '';
      if (packingMode === 'consolidate') {
        groupKey = 'ALL_MIXED'; // โหมดรวมมิตร: ทุกรหัสสินค้าในกลุ่มความจุเดียวกันจะถูกเทรวมกันเพื่อแพ็คต่อเนื่อง
      } else if (packingMode === 'strict-item') {
        groupKey = lotNo ? `${itemCode}_${lotNo}` : itemCode; 
      } else {
        groupKey = `${orderNo}_${poNumber}_${lineNo}_${itemCode}${lotNo ? `_${lotNo}` : ''}`; 
      }

      // จัดกลุ่มคาร์ดแยกตาม ชนิดกล่อง + ความจุสเปกสินค้า เพื่อให้ของสเปกเดียวกันรวมมิตรกันได้อย่างถูกต้อง ไม่ปนข้ามไซส์
      const cardGroupKey = `${foundBox.pckId}_CAP${boxCap}`;

      validItemsList.push({
        id: index, orderNo, poNumber, lineNo, itemCode, itemName: foundItem.itemName, customer: foundItem.supplier, qty, 
        boxType: foundBox.pckId, boxDesc: foundBox.description, boxCodename: foundBox.codename || foundBox.description, boxCap, groupKey, cardGroupKey,
        lotNo,
        itemWeight: Number(foundItem.itemWeight || 0), totalWeight: qty * Number(foundItem.itemWeight || 0)
      });
    });

    const boxTypesObj = {};
    validItemsList.forEach(item => {
      if (!boxTypesObj[item.cardGroupKey]) {
        boxTypesObj[item.cardGroupKey] = {
          cardGroupKey: item.cardGroupKey, 
          boxType: item.boxType,
          boxDesc: item.boxDesc,
          boxCodename: item.boxCodename,
          boxCap: item.boxCap,
          totalQty: 0,
          items: []
        };
      }
      boxTypesObj[item.cardGroupKey].totalQty += item.qty;
      boxTypesObj[item.cardGroupKey].items.push(item);
    });

    const summaryArray = Object.values(boxTypesObj).map(boxGroup => {
      boxGroup.items.sort((a, b) => a.groupKey.localeCompare(b.groupKey));

      let currentBoxIndex = 0;
      let currentBoxSpace = 0;
      let currentGroupKey = null;
      let boxesBreakdown = [];

      boxGroup.items.forEach(item => {
        let remainingQty = item.qty;
        
        while (remainingQty > 0) {
          if (currentBoxSpace === 0 || (packingMode !== 'consolidate' && currentGroupKey !== item.groupKey)) {
            currentBoxIndex++;
            currentBoxSpace = boxGroup.boxCap;
            currentGroupKey = item.groupKey;
            boxesBreakdown.push({ boxNo: currentBoxIndex, items: [], spaceLeft: boxGroup.boxCap });
          }
          
          let takeQty = Math.min(remainingQty, currentBoxSpace);
          
          boxesBreakdown[currentBoxIndex - 1].items.push({
            orderNo: item.orderNo,
            poNumber: item.poNumber,
            lineNo: item.lineNo,
            itemCode: item.itemCode,
            itemName: item.itemName,
            qty: takeQty,
            lotNo: item.lotNo 
          });
          
          remainingQty -= takeQty;
          currentBoxSpace -= takeQty;
          boxesBreakdown[currentBoxIndex - 1].spaceLeft = currentBoxSpace;
        }
      });

      return { 
        ...boxGroup, 
        totalBoxes: currentBoxIndex, 
        boxesBreakdown 
      };
    });

    setCalcResults([...validItemsList, ...errorList].sort((a,b) => a.id - b.id));
    setBoxSummary(summaryArray); 
    toast.success(`คำนวณข้อมูลสำเร็จ (${validItemsList.length} ผ่าน, ${errorList.length} ผิดพลาด)`);
  };

  const handleAdjustBox = (cardGroupKey, amount) => {
    setBoxSummary(prev => prev.map(box => {
      if (box.cardGroupKey === cardGroupKey) {
        const newTotal = Math.max(1, box.totalBoxes + amount);
        const newBreakdown = [...box.boxesBreakdown];
        
        if (amount > 0) {
          newBreakdown.push({ boxNo: newTotal, items: [], spaceLeft: box.boxCap });
        } else if (amount < 0 && newBreakdown.length > newTotal) {
          if (newBreakdown[newBreakdown.length - 1].items.length === 0) {
            newBreakdown.pop();
          } else {
            toast.error('ไม่สามารถลดกล่องได้ เพราะกล่องใบสุดท้ายยังมีของอยู่ (กรุณาย้ายของออกก่อน)');
            return box;
          }
        }
        return { ...box, totalBoxes: newTotal, boxesBreakdown: newBreakdown };
      }
      return box;
    }));
  };

  const openMoveModal = (groupIndex, boxNo, item) => {
    setMoveConfig({
      groupIndex,
      fromBoxNo: boxNo,
      itemCode: item.itemCode,
      orderNo: item.orderNo,
      poNumber: item.poNumber,
      lineNo: item.lineNo,
      lotNo: item.lotNo || '', 
      maxQty: item.qty,
      moveQty: 1,
      toBoxNo: boxSummary[groupIndex].boxesBreakdown.length > 1 ? (boxNo === 1 ? 2 : 1) : 1
    });
  };

  const confirmMove = () => {
    if (!moveConfig) return;
    const { groupIndex, fromBoxNo, toBoxNo, itemCode, orderNo, poNumber, lineNo, moveQty, lotNo } = moveConfig;
    
    if (fromBoxNo === Number(toBoxNo) || moveQty <= 0) {
      setMoveConfig(null);
      return;
    }

    setBoxSummary(prev => {
      const newSummary = [...prev];
      const group = { ...newSummary[groupIndex] };
      const breakdown = [...group.boxesBreakdown];

      const fromBoxIndex = breakdown.findIndex(b => b.boxNo === fromBoxNo);
      const toBoxIndex = breakdown.findIndex(b => b.boxNo === Number(toBoxNo));

      if (fromBoxIndex > -1 && toBoxIndex > -1) {
        const fromBox = { ...breakdown[fromBoxIndex] };
        const toBox = { ...breakdown[toBoxIndex] };

        const fromItems = [...fromBox.items];
        const itemIndex = fromItems.findIndex(i => i.itemCode === itemCode && i.orderNo === orderNo && i.poNumber === poNumber && i.lineNo === lineNo && (i.lotNo || '') === lotNo);
        
        if (itemIndex > -1) {
          const movingItem = { ...fromItems[itemIndex] };
          const actualMoveQty = Math.min(moveQty, movingItem.qty);

          if (actualMoveQty >= movingItem.qty) {
            fromItems.splice(itemIndex, 1);
          } else {
            fromItems[itemIndex].qty -= actualMoveQty;
          }
          fromBox.items = fromItems;
          fromBox.spaceLeft += actualMoveQty;

          const toItems = [...toBox.items];
          const toItemIndex = toItems.findIndex(i => i.itemCode === itemCode && i.orderNo === orderNo && i.poNumber === poNumber && i.lineNo === lineNo && (i.lotNo || '') === lotNo);
          if (toItemIndex > -1) {
            toItems[toItemIndex].qty += actualMoveQty;
          } else {
            toItems.push({ ...movingItem, qty: actualMoveQty });
          }
          toBox.items = toItems;
          toBox.spaceLeft -= actualMoveQty;

          breakdown[fromBoxIndex] = fromBox;
          breakdown[toBoxIndex] = toBox;
          group.boxesBreakdown = breakdown;
          newSummary[groupIndex] = group;
          toast.success(`ย้าย ${itemCode} จำนวน ${actualMoveQty} ชิ้น ไปกล่องใบที่ ${toBoxNo} เรียบร้อย!`);
        }
      }
      return newSummary;
    });
    setMoveConfig(null);
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

      const stockDeductions = {};
      boxSummary.forEach(sum => {
        if (!stockDeductions[sum.boxType]) stockDeductions[sum.boxType] = 0;
        stockDeductions[sum.boxType] += sum.totalBoxes;
      });

      for (const [pckId, totalUsed] of Object.entries(stockDeductions)) {
        const boxToUpdate = boxes.find(b => b.pckId === pckId);
        if (boxToUpdate) {
          const newStock = Math.max(0, boxToUpdate.currentStock - totalUsed);
          await supabase.from('boxes').update({ currentStock: newStock }).eq('pckId', pckId);
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

  const aggregatedBoxRequisition = Object.values(boxSummary.reduce((acc, curr) => {
    if (!acc[curr.boxType]) {
      acc[curr.boxType] = {
        boxType: curr.boxType,
        boxCodename: curr.boxCodename,
        totalBoxes: 0,
        subCaps: {}
      };
    }
    acc[curr.boxType].totalBoxes += curr.totalBoxes;
    
    const capKey = `${curr.boxCap} Pcs.`;
    if (!acc[curr.boxType].subCaps[capKey]) {
      acc[curr.boxType].subCaps[capKey] = 0;
    }
    acc[curr.boxType].subCaps[capKey] += curr.totalBoxes;
    
    return acc;
  }, {})).map(box => {
    const subCapsArray = Object.entries(box.subCaps).map(([cap, count]) => ({
      cap,
      boxesCount: count
    }));
    return { ...box, subCaps: subCapsArray };
  }).sort((a, b) => b.totalBoxes - a.totalBoxes);

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100 print:hidden">
        <h2 className="text-2xl font-black text-indigo-900 mb-4">📋 วางแผนจำนวนกล่องบรรจุภัณฑ์</h2>
        
        <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <div className="text-sm font-bold text-indigo-800 mb-3">⚙️ เลือกโหมดการจัดกล่อง (Packing Mode)</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className={`cursor-pointer flex items-center p-3 rounded-lg border-2 transition-all ${packingMode === 'consolidate' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
              <input type="radio" name="packMode" className="hidden" checked={packingMode === 'consolidate'} onChange={() => setPackingMode('consolidate')} />
              <div>
                <div className="font-bold">📦 โหมดรวมมิตร (ประหยัดสุด)</div>
                <div className={`text-xs mt-1 ${packingMode === 'consolidate' ? 'text-indigo-100' : 'text-gray-400'}`}>ปนรหัสได้ เน้นยัดให้เต็มกล่อง</div>
              </div>
            </label>
            <label className={`cursor-pointer flex items-center p-3 rounded-lg border-2 transition-all ${packingMode === 'strict-item' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
              <input type="radio" name="packMode" className="hidden" checked={packingMode === 'strict-item'} onChange={() => setPackingMode('strict-item')} />
              <div>
                <div className="font-bold">🏷️ โหมดแยกรหัส (มาตรฐาน)</div>
                <div className={`text-xs mt-1 ${packingMode === 'strict-item' ? 'text-indigo-100' : 'text-gray-400'}`}>รหัสสินค้าต่างกัน แยกกล่องทันที</div>
              </div>
            </label>
            <label className={`cursor-pointer flex items-center p-3 rounded-lg border-2 transition-all ${packingMode === 'strict-po' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
              <input type="radio" name="packMode" className="hidden" checked={packingMode === 'strict-po'} onChange={() => setPackingMode('strict-po')} />
              <div>
                <div className="font-bold">🏢 โหมดแยก PO / Order</div>
                <div className={`text-xs mt-1 ${packingMode === 'strict-po' ? 'text-indigo-100' : 'text-gray-400'}`}>ห้ามปนรหัส, ห้ามปน Order เด็ดขาด</div>
              </div>
            </label>
          </div>
        </div>
        
        <div className="space-y-4">
          <textarea 
            rows="6"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"ก๊อปปี้ข้อมูลวางตรงนี้ จาก Excel หน้ารายงานสโตร์คัดลอกมาวางได้รวดเดียวเลย..."}
            className="w-full p-4 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-mono text-sm bg-gray-50 text-gray-900"
          ></textarea>
          
          <div className="flex gap-4">
            <button onClick={handleBulkCalculate} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform active:scale-95 text-lg">🧮 คำนวณตามโหมดที่เลือก</button>
            <button onClick={() => { setBulkText(''); setCalcResults([]); setBoxSummary([]); toast('ล้างข้อมูลเรียบร้อย', {icon: '🧹'}); }} className="bg-gray-200 hover:bg-white-10 text-gray-700 font-bold py-4 px-8 rounded-xl transition-all">ล้างข้อมูล</button>
          </div>
        </div>
      </div>

      {calcResults.length > 0 && (
        <div className="space-y-6 animate-fade-in-up print:hidden">
          {boxSummary.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl shadow-xl overflow-hidden text-white border border-indigo-800">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 p-4 border-b border-white/20">
                <h3 className="text-xl font-bold text-white">📦 สรุปการเบิกกล่อง 
                  <span className="text-sm font-normal text-yellow-300 ml-2">
                    (คำนวณด้วย: {packingMode === 'consolidate' ? 'โหมดรวมมิตร' : packingMode === 'strict-item' ? 'โหมดแยกรหัส' : 'โหมดแยก PO'})
                  </span>
                </h3>
                <button 
                  onClick={() => setShowSummaryModal(true)} 
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all flex items-center gap-2"
                >
                  📋 ดูใบสั่งแพ็คของลงกล่อง / พิมพ์
                </button>
              </div>

              <div className="mx-4 mb-6 p-4 bg-black/30 rounded-xl border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 text-sm font-bold text-yellow-300 flex items-center gap-2">🛒 สรุปใบเบิกสโตร์ด่วน (ยอดกล่องรวม + ความจุย่อย)</div>
                {aggregatedBoxRequisition.map((sum, idx) => (
                  <div key={idx} className="bg-white/5 p-3 rounded-lg border border-white/10 flex justify-between items-center">
                    <div>
                      <div className="font-black text-lg text-blue-300">{sum.boxCodename || sum.boxType}</div>
                      <div className="text-xs text-gray-400 space-y-1 mt-1.5 pl-2 border-l border-white/20">
                        {sum.subCaps.map((sub, sIdx) => (
                          <div key={sIdx}>• สเปกจุ <span className="text-white font-bold">{sub.cap}</span> ใช้จำนวน <span className="text-yellow-400 font-bold">{sub.boxesCount} ใบ</span></div>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 font-bold uppercase">เบิกรวม</div>
                      <div className="text-3xl font-black text-emerald-400">{sum.totalBoxes} <span className="text-xs font-normal text-gray-300">ใบ</span></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-white/10 pt-6">
                {boxSummary.map((sum, groupIdx) => (
                  <div key={groupIdx} className="bg-white/10 rounded-xl p-4 border border-white/20 flex flex-col h-full relative">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-black text-xl text-yellow-300">
                          {sum.boxCodename || sum.boxType}
                          <span className="text-base text-emerald-300 ml-2 border border-emerald-500/50 bg-emerald-500/20 px-2 py-0.5 rounded-lg whitespace-nowrap">
                            {sum.boxCap} Pcs.
                          </span>
                        </div>
                        <div className="text-[10px] text-indigo-300 mt-2 font-mono">System ID: {sum.boxType}</div>
                      </div>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-white/20 grid grid-cols-2 gap-2 text-center mb-2">
                      <div>
                        <div className="text-xs text-indigo-200">ของรวมทั้งหมด</div>
                        <div className="font-bold text-lg">{sum.totalQty} ชิ้น</div>
                      </div>
                      <div>
                        <div className="text-xs text-indigo-200">เบิกกล่อง</div>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <button onClick={() => handleAdjustBox(sum.cardGroupKey, -1)} className="bg-red-500/20 text-red-300 hover:bg-red-500/40 hover:text-white px-2 rounded font-bold transition-colors select-none">-</button>
                          <div className="font-bold text-xl text-green-400 w-8">{sum.totalBoxes}</div>
                          <button onClick={() => handleAdjustBox(sum.cardGroupKey, 1)} className="bg-green-500/20 text-green-300 hover:bg-green-500/40 hover:text-white px-2 rounded font-bold transition-colors select-none">+</button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-3 border-t border-white/10">
                      <div className="text-xs font-bold text-indigo-300 mb-2">📋 แผนจัดเรียงลงกล่อง</div>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {sum.boxesBreakdown.map((b) => (
                          <div key={b.boxNo} className="bg-black/30 rounded p-2 border border-white/5">
                            <div className="flex justify-between items-center mb-1 pb-1 border-b border-white/5">
                              <span className="text-[11px] font-bold text-emerald-300">กล่องใบที่ {b.boxNo}</span>
                              {b.spaceLeft > 0 && <span className="text-[10px] text-gray-400">ว่าง {b.spaceLeft} ชิ้น</span>}
                            </div>
                            <div className="space-y-1">
                              {b.items.length === 0 && <div className="text-xs text-gray-500 text-center italic py-1">กล่องเปล่า</div>}
                              {b.items.map((item, i) => (
                                <div key={i} className="flex flex-col text-xs bg-white/5 p-1 rounded border-l-2 border-indigo-500">
                                  <div className="flex justify-between items-start">
                                    <span className="font-bold text-gray-200">- {item.itemCode}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-emerald-400 min-w-max">{item.qty} ชิ้น</span>
                                      {sum.boxesBreakdown.length > 1 && (
                                        <button onClick={() => openMoveModal(groupIdx, b.boxNo, item)} className="text-[9px] bg-blue-500/20 text-blue-300 px-1 rounded hover:bg-blue-500 hover:text-white transition-colors">🔄</button>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {item.lotNo && (
                                    <div className="text-[10px] text-yellow-400 font-mono mt-0.5 ml-2">Lot: {item.lotNo}</div>
                                  )}

                                  {(item.poNumber !== 'ไม่ระบุ PO' || item.orderNo !== 'ไม่ระบุ Order') && (
                                    <span className="text-[10px] text-indigo-300 mt-0.5 ml-2 leading-tight">
                                      {item.orderNo !== 'ไม่ระบุ Order' ? item.orderNo : ''} {item.lineNo !== '-' ? `(L:${item.lineNo}) ` : ' '} 
                                      {item.poNumber !== 'ไม่ระบุ PO' && item.poNumber !== item.lotNo ? `| ${item.poNumber}` : ''}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

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
                    <th className="py-3 px-4 text-left font-bold text-gray-500 text-sm">Order / PO</th>
                    <th className="py-3 px-4 text-left font-bold text-gray-500 text-sm">รหัสสินค้า</th>
                    <th className="py-3 px-4 text-left font-bold text-gray-500 text-sm">ชื่อสินค้า / ลูกค้า</th>
                    <th className="py-3 px-4 text-center font-bold text-gray-500 text-sm">จำนวน</th>
                    <th className="py-3 px-4 text-center font-bold text-gray-500 text-sm">ชนิดกล่อง (ชื่อเรียก)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {calcResults.map((res) => (
                    <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-yellow-600 text-xs">{res.orderNo !== 'ไม่ระบุ Order' ? res.orderNo : '-'}</div>
                        <div className="font-bold text-indigo-600 text-xs">{res.poNumber !== 'ไม่ระบุ PO' ? res.poNumber : '-'}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-800">
                        <div>{res.itemCode}</div>
                        {res.lotNo && <div className="text-[11px] text-amber-600 font-mono font-normal">Lot/PO: {res.lotNo}</div>}
                      </td>
                      {res.error ? (
                        <td colSpan="3" className="py-3 px-4 text-red-500 font-bold bg-red-50">{res.error}</td>
                      ) : (
                        <>
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-700">{res.itemName}</div>
                            <div className="text-xs text-indigo-600 font-bold">{res.customer}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-black text-gray-700">{res.qty}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md mb-1 inline-block">
                              {res.boxCodename || res.boxType} <span className="text-indigo-500 text-xs ml-1">({res.boxCap} Pcs.)</span>
                            </div>
                            {res.boxCodename && <div className="text-[10px] text-gray-500 font-mono text-center">ID: {res.boxType}</div>}
                          </td>
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

      {/* Modal ย้ายของ */}
      {moveConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 print:hidden">
          <div className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-sm border-2 border-indigo-500">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><span>🔄</span> ย้ายสินค้าข้ามกล่อง</h3>
            <div className="mb-4 bg-gray-50 p-3 rounded text-sm text-gray-600 border border-gray-200">
              <span className="font-bold text-indigo-700">{moveConfig.itemCode}</span>
              {moveConfig.lotNo && <span className="text-xs text-amber-600 block mt-0.5">Lot/PO: {moveConfig.lotNo}</span>}
              <span className="block text-xs mt-1">จาก <span className="font-bold text-red-500">กล่องใบที่ {moveConfig.fromBoxNo}</span></span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">จำนวนที่ต้องการย้าย (ชิ้น)</label>
                <input type="number" min="1" max={moveConfig.maxQty} value={moveConfig.moveQty} onChange={(e) => setMoveConfig({...moveConfig, moveQty: Number(e.target.value)})} className="w-full p-2 border rounded font-bold text-center focus:outline-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">ย้ายไปปลายทาง</label>
                <select value={moveConfig.toBoxNo} onChange={(e) => setMoveConfig({...moveConfig, toBoxNo: Number(e.target.value)})} className="w-full p-2 border rounded font-bold text-indigo-700 bg-indigo-50 focus:outline-indigo-500">
                  {boxSummary[moveConfig.groupIndex].boxesBreakdown.map(b => (
                    <option key={b.boxNo} value={b.boxNo} disabled={b.boxNo === moveConfig.fromBoxNo}>กล่องใบที่ {b.boxNo} (ว่าง {b.spaceLeft} ชิ้น)</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setMoveConfig(null)} className="px-4 py-2 bg-gray-200 rounded font-bold text-gray-700">ยกเลิก</button>
              <button onClick={confirmMove} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold shadow-md">ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Print */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 overflow-y-auto pt-10 pb-10 print:block print:static print:bg-white print:p-0 print:overflow-visible">
          <style type="text/css" media="print">
            {`
              html, body, #root { background: white !important; height: auto !important; min-height: auto !important; }
              @page { size: A4 portrait; margin: 15mm 10mm; }
              table { width: 100% !important; border-collapse: collapse !important; font-size: 14px !important; }
              th, td { padding: 8px 12px !important; border: 1px solid #6b7280 !important; color: black !important; }
              thead { background-color: #f3f4f6 !important; }
              .avoid-break { page-break-inside: avoid !important; }
            `}
          </style>

          <div id="print-modal" className="bg-slate-800 rounded-xl p-6 md:p-8 w-full max-w-2xl shadow-2xl my-auto print:bg-white print:text-black print:my-0 print:shadow-none print:w-full print:max-w-full">
            <div className="flex justify-between items-center mb-6 print:hidden">
              <h2 className="text-2xl font-black text-white">📋 ใบสั่งเบิกและแพ็คสินค้า</h2>
              <button onClick={() => setShowSummaryModal(false)} className="text-red-400 hover:text-red-300 font-bold text-2xl">✕</button>
            </div>

            <div className="hidden print:block text-center mb-6">
              <h1 className="text-3xl font-black text-black mb-2">ใบเบิกกล่องและสั่งแพ็ค (Packing Instruction)</h1>
              <p className="text-gray-600">โหมดคำนวณ: {packingMode === 'consolidate' ? 'โหมดรวมมิตร' : packingMode === 'strict-item' ? 'โหมดแยกรหัส' : 'โหมดแยก PO'}</p>
            </div>

            <h3 className="text-lg font-bold text-emerald-400 print:text-black mb-2 mt-4 flex items-center gap-2">
              <span>🛒</span> 1. สรุปจำนวนกล่องรวม (ใบหยิบของจากสโตร์)
            </h3>
            <table className="w-full text-left border-collapse mb-10">
              <thead className="bg-slate-700 text-slate-200 print:bg-gray-200 print:text-black">
                <tr>
                  <th className="p-3 font-bold text-center w-16">ลำดับ</th>
                  <th className="p-3 font-bold">ชนิดบรรจุภัณฑ์ / รายละเอียดสเปกความจุ</th>
                  <th className="p-3 font-bold text-center w-32">จำนวนที่ต้องเบิก</th>
                </tr>
              </thead>
              <tbody className="text-slate-200 print:text-black">
                {aggregatedBoxRequisition.map((sum, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/50 print:hover:bg-transparent border-b border-slate-700 print:border-gray-300 last:border-0">
                    <td className="p-3 text-center align-middle">{idx + 1}</td>
                    <td className="p-3 align-middle">
                      <div className="font-black text-blue-400 print:text-black text-xl">{sum.boxCodename || sum.boxType}</div>
                      <div className="text-xs text-slate-400 print:text-gray-600 mb-2">ID: {sum.boxType}</div>
                      
                      <div className="pl-3 border-l-2 border-indigo-500 text-xs space-y-1 text-slate-300 print:text-gray-700 font-medium">
                        {sum.subCaps.map((sub, sIdx) => (
                          <div key={sIdx}>
                            • สเปกจุ <span className="font-bold text-white print:text-black">{sub.cap}</span> = <span className="font-bold text-yellow-400 print:text-black">{sub.boxesCount} ใบ</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 font-black text-center text-3xl text-emerald-400 print:text-black align-middle">
                      {sum.totalBoxes} <span className="text-sm font-normal text-slate-300 print:text-gray-700">ใบ</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="text-lg font-bold text-white print:text-black mb-4 flex items-center gap-2">
              <span>📦</span> 2. รายละเอียดการแพ็ค (แยกกล่องตามสเปก)
            </h3>
            <div className="space-y-6">
              {boxSummary.map((sum, idx) => (
                <div key={idx} className="avoid-break bg-slate-700/30 p-4 rounded-lg print:border print:border-gray-400 print:p-2 print:bg-transparent">
                  <div className="font-bold text-yellow-300 print:text-black mb-3 border-b border-white/20 print:border-gray-300 pb-2 flex justify-between">
                    <span>📦 {sum.boxCodename || sum.boxType} <span className="text-emerald-300 print:text-black">({sum.boxCap} Pcs.)</span></span>
                    <span className="text-sm font-normal text-slate-300 print:text-gray-600">(ใช้ทั้งหมด <span className="font-bold">{sum.totalBoxes}</span> ใบ)</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sum.boxesBreakdown.map((b) => (
                      <div key={b.boxNo} className="bg-slate-800 p-3 rounded border border-slate-600 print:bg-gray-50 print:border-gray-300 avoid-break">
                        <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-600 print:border-gray-300">
                          <span className="font-bold text-emerald-400 print:text-black">กล่องใบที่ {b.boxNo}</span>
                          {b.spaceLeft > 0 && <span className="text-[10px] text-gray-400 print:text-gray-500">ว่าง {b.spaceLeft} ชิ้น</span>}
                        </div>
                        <ul className="space-y-1">
                          {b.items.length === 0 && <div className="text-xs text-gray-500 text-center italic">กล่องเปล่า (ใส่ของเพิ่มได้)</div>}
                          {b.items.map((item, i) => (
                            <li key={i} className="flex flex-col text-sm text-slate-200 print:text-black mb-1.5">
                              <div className="flex justify-between items-start">
                                <span className="font-bold pr-2">- {item.itemCode}</span>
                                <span className="font-bold text-emerald-300 print:text-black min-w-max">{item.qty} ชิ้น</span>
                              </div>
                              
                              {item.lotNo && (
                                <div className="text-[11px] text-yellow-400 print:text-gray-600 font-mono ml-3 mt-0.5">Lot/PO: {item.lotNo}</div>
                              )}

                              {(item.orderNo !== 'ไม่ระบุ Order' || item.poNumber !== 'ไม่ระบุ PO') && (
                                <span className="text-[10px] text-slate-400 print:text-gray-600 ml-3 leading-tight">
                                  {item.orderNo !== 'ไม่ระบุ Order' ? item.orderNo : ''} {item.lineNo !== '-' ? `(L:${item.lineNo}) ` : ' '} 
                                  {item.poNumber !== 'ไม่ระบุ PO' && item.poNumber !== item.lotNo ? `| ${item.poNumber}` : ''}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end gap-4 print:hidden">
              <button onClick={() => setShowSummaryModal(false)} className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-bold transition-colors">ย้อนกลับ</button>
              <button onClick={() => window.print()} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors flex items-center gap-2 shadow-lg">
                🖨️ พิมพ์ใบสั่งแพ็ค (Print)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}