/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import axios from 'axios';
import Pallet3DViewer from './Pallet3DViewer';

const NODE_API_URL = import.meta.env.VITE_NODE_API_URL || 'https://zenix-packing-hub.onrender.com';

export default function PackingPlanner({ items, boxes, currentUser, fetchReportsData, fetchLogsData, fetchAdminData }) {
  const { t } = useTranslation();
  const [bulkText, setBulkText] = useState('');
  const [calcResults, setCalcResults] = useState([]);
  const [boxSummary, setBoxSummary] = useState([]);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const [packingMode, setPackingMode] = useState('consolidate');
  const [moveConfig, setMoveConfig] = useState(null);

  const [palletsList, setPalletsList] = useState([]);
  const [selectedPallet, setSelectedPallet] = useState('');
  const [pallet3DResult, setPallet3DResult] = useState(null);
  const [isCalculating3D, setIsCalculating3D] = useState(false);

  // 🌟 State สำหรับสลับหน้าต่างดูพาเลทใบต่างๆ
  const [activePalletTab, setActivePalletTab] = useState(0);

  useEffect(() => {
    const fetchPallets = async () => {
      try {
        const { data, error } = await supabase.from('Pallet').select('*');
        if (error) throw error;
        if (data) setPalletsList(data);
      } catch (error) {
        console.error("โหลดข้อมูลพาเลทไม่สำเร็จ:", error.message);
      }
    };
    fetchPallets();
  }, []);

  const handleBulkCalculate = () => {
    if (!bulkText.trim()) return;

    const rows = bulkText.split('\n').filter(r => r.trim());
    const validItemsList = [];
    const errorList = [];

    const NO_ORDER = t('planner.no_order');
    const NO_PO = t('planner.no_po');

    rows.forEach((row, index) => {
      if (index === 0 && /(item|qty|จำนวน|รหัส|po|order|line|lot)/i.test(row)) return;

      let parts = row.trim().split(/[\t ]+/).filter(Boolean);
      if (parts.length < 2) return;

      let orderNo = NO_ORDER;
      let poNumber = NO_PO;
      let lineNo = '-';
      let itemCode = '';
      let lotNo = '';
      let qty = 0;

      const itemIndex = parts.findIndex(p => items.some(i => i.itemId === p.toUpperCase().trim()));

      if (itemIndex === -1) {
        errorList.push({ id: index, orderNo, poNumber, itemCode: parts[0], lotNo, qty: 0, error: t('planner.err_item_not_found') });
        return;
      }

      itemCode = parts[itemIndex].toUpperCase().trim();

      let qtyIndex = -1;
      if (itemIndex < parts.length - 1 && !isNaN(parts[itemIndex + 1]) && Number(parts[itemIndex + 1]) > 0) {
        qtyIndex = itemIndex + 1;
      } else if (itemIndex > 0 && !isNaN(parts[itemIndex - 1]) && Number(parts[itemIndex - 1]) > 0) {
        qtyIndex = itemIndex - 1;
      } else {
        qtyIndex = parts.findLastIndex((p, idx) => idx !== itemIndex && !isNaN(p) && Number(p) > 0);
      }

      if (qtyIndex !== -1) {
        qty = parseInt(parts[qtyIndex], 10);
      } else {
        errorList.push({ id: index, orderNo, poNumber, itemCode, lotNo, qty: 0, error: 'ไม่พบจำนวน (Qty)' });
        return;
      }

      const indicesToRemove = [itemIndex, qtyIndex].sort((a, b) => b - a);
      indicesToRemove.forEach(idx => parts.splice(idx, 1));

      if (parts.length > 0) poNumber = parts[0].toUpperCase().trim();
      if (parts.length > 1) orderNo = parts[1].toUpperCase().trim();
      if (parts.length > 2) lineNo = parts[2].toUpperCase().trim();
      if (parts.length > 3) lotNo = parts[3].toUpperCase().trim();

      const dbItem = items.find(i => i.itemId === itemCode);
      const foundBox = boxes.find(b => b.pckId === dbItem.defaultPckId);

      if (!foundBox) {
        errorList.push({ id: index, orderNo, poNumber, itemCode, lotNo, qty, itemName: dbItem.itemName, error: t('planner.err_no_box_linked') });
        return;
      }

      const boxesPerUnit = Number(dbItem.boxesPerUnit || 1);
      const itemName = dbItem.itemName || itemCode;

      let boxCap = 1;
      if (dbItem.stdPackQty && Number(dbItem.stdPackQty) > 0) {
        boxCap = Number(dbItem.stdPackQty);
      } else if (foundBox.maxCapacity && Number(foundBox.maxCapacity) > 0) {
        boxCap = Number(foundBox.maxCapacity);
      }

      let groupKey = '';
      if (packingMode === 'consolidate') {
        groupKey = 'ALL_MIXED';
      } else if (packingMode === 'strict-item') {
        groupKey = lotNo ? `${itemCode}_${lotNo}` : itemCode;
      } else {
        groupKey = `${orderNo}_${poNumber}_${lineNo}_${itemCode}${lotNo ? `_${lotNo}` : ''}`;
      }

      const cardGroupKey = packingMode === 'consolidate' ? foundBox.pckId : `${foundBox.pckId}_CAP${boxCap}`;

      if (boxesPerUnit > 1) {
        const totalSplitBoxes = qty * boxesPerUnit;
        for (let splitIdx = 0; splitIdx < totalSplitBoxes; splitIdx++) {
          const partSeq = (splitIdx % boxesPerUnit) + 1;
          validItemsList.push({
            id: Number(`${index}.${splitIdx}`),
            orderNo, poNumber, lineNo, itemCode,
            itemName: `${itemName} (Part ${partSeq}/${boxesPerUnit})`,
            customer: dbItem.supplier || '',
            qty: 1 / boxesPerUnit,
            boxType: foundBox.pckId,
            boxDesc: foundBox.description,
            boxCodename: foundBox.codename || foundBox.description,
            boxCap: 1,
            groupKey: `${groupKey}_PART${splitIdx}`,
            cardGroupKey,
            lotNo,
            isSpecialSplit: true,
            itemWeight: Number(dbItem.itemWeight || 0) / boxesPerUnit,
            totalWeight: Number(dbItem.itemWeight || 0) / boxesPerUnit
          });
        }
      } else {
        validItemsList.push({
          id: index, orderNo, poNumber, lineNo, itemCode, itemName: itemName, customer: dbItem.supplier || '', qty,
          boxType: foundBox.pckId, boxDesc: foundBox.description, boxCodename: foundBox.codename || foundBox.description, boxCap, groupKey, cardGroupKey,
          lotNo,
          itemWeight: Number(dbItem.itemWeight || 0), totalWeight: qty * Number(dbItem.itemWeight || 0)
        });
      }
    });

    const boxTypesObj = {};
    validItemsList.forEach(item => {
      if (!boxTypesObj[item.cardGroupKey]) {
        boxTypesObj[item.cardGroupKey] = {
          cardGroupKey: item.cardGroupKey, boxType: item.boxType, boxDesc: item.boxDesc,
          boxCodename: item.boxCodename, boxCap: item.boxCap, totalQty: 0, items: []
        };
      }
      boxTypesObj[item.cardGroupKey].totalQty += item.isSpecialSplit ? (item.qty * item.boxesPerUnit) : item.qty;
      boxTypesObj[item.cardGroupKey].items.push(item);
    });

    const summaryArray = Object.values(boxTypesObj).map(boxGroup => {
      boxGroup.items.sort((a, b) => a.groupKey.localeCompare(b.groupKey));

      let currentBoxIndex = 1;
      let currentBoxUsedSpace = 0;
      let currentGroupKey = null;
      let boxesBreakdown = [{ boxNo: 1, items: [], spaceLeftPct: 100, spaceLeft: boxGroup.boxCap }];

      boxGroup.items.forEach(item => {
        let remainingQty = item.qty;
        let spacePerPiece = 1 / item.boxCap;

        while (remainingQty > 0) {
          if ((packingMode !== 'consolidate' && currentBoxUsedSpace > 0 && currentGroupKey !== item.groupKey) ||
            (item.isSpecialSplit && currentBoxUsedSpace > 0)) {
            currentBoxIndex++;
            currentBoxUsedSpace = 0;
            boxesBreakdown.push({ boxNo: currentBoxIndex, items: [], spaceLeftPct: 100, spaceLeft: item.boxCap });
          }

          currentGroupKey = item.groupKey;
          let availableSpace = 1 - currentBoxUsedSpace;

          if (availableSpace < 0.0001) {
            currentBoxIndex++;
            currentBoxUsedSpace = 0;
            availableSpace = 1;
            boxesBreakdown.push({ boxNo: currentBoxIndex, items: [], spaceLeftPct: 100, spaceLeft: item.boxCap });
          }

          let fitQty = Math.floor(availableSpace / spacePerPiece + 0.0001);

          if (fitQty === 0) {
            currentBoxIndex++;
            currentBoxUsedSpace = 0;
            availableSpace = 1;
            boxesBreakdown.push({ boxNo: currentBoxIndex, items: [], spaceLeftPct: 100, spaceLeft: item.boxCap });
            fitQty = Math.floor(availableSpace / spacePerPiece + 0.0001);
          }

          let takeQty = Math.min(remainingQty, fitQty);

          boxesBreakdown[currentBoxIndex - 1].items.push({
            orderNo: item.orderNo, poNumber: item.poNumber, lineNo: item.lineNo,
            itemCode: item.itemCode, itemName: item.itemName,
            qty: item.isSpecialSplit ? 1 : takeQty,
            cap: item.boxCap, lotNo: item.lotNo, isSpecialSplit: item.isSpecialSplit
          });

          remainingQty -= takeQty;
          currentBoxUsedSpace += (takeQty * spacePerPiece);

          boxesBreakdown[currentBoxIndex - 1].spaceLeftPct = Math.max(0, Math.round((1 - currentBoxUsedSpace) * 100));
          if (packingMode !== 'consolidate') {
            boxesBreakdown[currentBoxIndex - 1].spaceLeft = Math.round((1 - currentBoxUsedSpace) / spacePerPiece);
          }
        }
      });

      return { ...boxGroup, totalBoxes: currentBoxIndex, boxesBreakdown };
    });

    setCalcResults([...validItemsList, ...errorList].sort((a, b) => a.id - b.id));
    setBoxSummary(summaryArray);
    setPallet3DResult(null);
    toast.success(t('planner.calc_success', { pass: validItemsList.length, fail: errorList.length }));
  };

  const handleCalculate3DPallet = async () => {
    if (!boxSummary || boxSummary.length === 0) return toast.error('กรุณาคำนวณกล่องก่อนครับ');

    setIsCalculating3D(true);
    const toastId = toast.loading('กำลังประมวลผลวิเคราะห์หาพาเลทที่พอดีที่สุดอัตโนมัติ...');

    try {
      const boxesToPack = [];

      // 🌟 ลูปรอบนอกสุด: ดึงกลุ่มกล่องหลักมาคำนวณ
      boxSummary.forEach(group => {
        // ค้นหาข้อมูลสเปกกล่องจาก Master Data
        const boxData = boxes.find(b => b.pckId === group.boxType);
        if (!boxData) return;

        // 🌟 ลูปด้านใน: เจาะลึกกล่องแต่ละใบในกลุ่ม
        group.boxesBreakdown.forEach(b => {
          // คำนวณยอดชิ้นสินค้าที่แพ็คอยู่ในกล่องใบนี้จริงๆ
          const totalItemsInThisBox = b.items.reduce((sum, item) => sum + item.qty, 0);

          boxesToPack.push({
            pckId: boxData.pckId, // ส่ง ID เผื่อหลังบ้านเอาไปใช้แจ้ง Error
            name: `${group.boxCodename || group.boxType}-#${b.boxNo}`,
            width: Number(boxData.width) || 300,   // 🚨 แก้จาก w เป็น width
            length: Number(boxData.length) || 400, // 🚨 แก้จาก l เป็น length
            height: Number(boxData.height) || 200, // 🚨 แก้จาก h เป็น height
            weight: Number(boxData.weight) || 10,  // ดึงน้ำหนักจริงจากกล่อง (ถ้ามี)
            itemCap: group.boxCap || 0,
            packedQty: totalItemsInThisBox || 0,
            boundPalletId: boxData.boundPalletId || null // ผูกรหัสพาเลทจาก Master Data
          });
        });
      });

      // 🌟 เปลี่ยนมาใช้ NODE_API_URL แทนการ Hardcode
      const response = await axios.post(`${NODE_API_URL}/api/pallet/calculate`, {
        boxesToPack: boxesToPack
      });

      if (response.data.success) {
        setPallet3DResult(response.data);
        setActivePalletTab(0);
        toast.success(`คำนวณสำเร็จ! ระบบจัดสรรพาเลทที่เหมาะสมที่สุดให้รวม ${response.data.totalPalletsUsed} ใบ`, { id: toastId });
      } else {
        toast.error('ล้มเหลว: ' + response.data.message, { id: toastId });
      }
    } catch (error) {
      toast.error('ระบบขัดข้อง: ' + (error.response?.data?.message || error.message), { id: toastId });
    } finally {
      // ย้ายการปิด Loading มาไว้ใน finally เพื่อให้มันปิดเสมอไม่ว่าจะ Error หรือไม่
      setIsCalculating3D(false);
    }
  };

  const handleExportPlanToExcel = () => {
    if (!boxSummary || boxSummary.length === 0) return toast.error('ไม่มีข้อมูลแผนการแพ็คสำหรับ Export');

    // --- 1. เตรียมข้อมูล Sheet: Packing Plan (รายละเอียดการแพ็ครายกล่อง) ---
    const exportData = [];
    boxSummary.forEach((group) => {
      const boxName = group.boxCodename || group.boxType;
      const pckNo = group.boxType;

      group.boxesBreakdown.forEach((box) => {
        if (box.items.length === 0) {
          exportData.push({
            'PCK No.': pckNo,
            'Box Type (ชนิดกล่อง)': boxName,
            'Box No (ใบที่)': `Box #${box.boxNo}`,
            'Item Code': 'EMPTY BOX (กล่องเปล่า)',
            'Item Name': '-',
            'Qty (ชิ้น)': 0,
            'Order No': '-',
            'PO Number': '-',
            'Lot/PO': '-'
          });
        } else {
          box.items.forEach((item) => {
            exportData.push({
              'PCK No.': pckNo,
              'Box Type (ชนิดกล่อง)': boxName,
              'Box No (ใบที่)': `Box #${box.boxNo}`,
              'Item Code': item.itemCode,
              'Item Name': item.itemName || '-',
              'Qty (ชิ้น)': item.qty,
              'Order No': item.orderNo !== t('planner.no_order') ? item.orderNo : '-',
              'PO Number': item.poNumber !== t('planner.no_po') ? item.poNumber : '-',
              'Lot/PO': item.lotNo || '-'
            });
          });
        }
      });
    });

    // --- 2. เตรียมข้อมูล Sheet: Box Summary (สรุปยอดเบิกกล่องรวม) ---
    const summaryMap = {};
    boxSummary.forEach(group => {
      if (!summaryMap[group.boxType]) {
        summaryMap[group.boxType] = {
          pckNo: group.boxType,
          boxName: group.boxCodename || group.boxType,
          total: 0
        };
      }
      summaryMap[group.boxType].total += group.totalBoxes;
    });

    const summaryData = Object.values(summaryMap).map(item => ({
      'PCK No.': item.pckNo,
      'Box Type (ชนิดกล่อง)': item.boxName,
      'Total Boxes (รวมจำนวนกล่อง/ใบ)': item.total
    }));

    // --- 🌟 3. เตรียมข้อมูล Sheet ใหม่: Pivot Summary (ตารางวิเคราะห์ สินค้า x ชนิดกล่อง) ---
    const uniqueItems = {};       // เก็บรายชื่อสินค้า { itemCode: itemName }
    const uniqueBoxTypes = new Set(); // เก็บรายชื่อชนิดกล่องเพื่อทำเป็นหัวคอลัมน์ด้านบน
    const matrix = {};            // สมุดจดสองมิติ { itemCode: { boxType: totalQty } }

    boxSummary.forEach((group) => {
      // ใช้ชื่อเล่นกล่อง (Codename) หรือถ้าไม่มีให้ใช้รหัสกล่อง เป็นหัวคอลัมน์
      const boxHeaderName = group.boxCodename || group.boxType;
      uniqueBoxTypes.add(boxHeaderName);

      group.boxesBreakdown.forEach((box) => {
        box.items.forEach((item) => {
          // 3.1 บันทึกรายชื่อคู่รหัสและชื่อสินค้า
          if (!uniqueItems[item.itemCode]) {
            uniqueItems[item.itemCode] = item.itemName || '-';
          }

          // 3.2 บันทึกยอดสะสมลงพิกัด Matrix
          if (!matrix[item.itemCode]) {
            matrix[item.itemCode] = {};
          }
          if (!matrix[item.itemCode][boxHeaderName]) {
            matrix[item.itemCode][boxHeaderName] = 0;
          }
          matrix[item.itemCode][boxHeaderName] += item.qty;
        });
      });
    });

    // แปลงโครงสร้างคู่พิกัดด้านบน ออกมาเป็นตารางรูปแบบวัตถุ (JSON) ที่ Excel พร้อมอ่าน
    const pivotData = [];
    const boxHeadersArray = Array.from(uniqueBoxTypes);

    Object.entries(uniqueItems).forEach(([itemCode, itemName]) => {
      // ตั้งต้นแถวด้วยรหัสและชื่อสินค้า
      const row = {
        'Item Code (รหัสสินค้า)': itemCode,
        'Item Name (ชื่อสินค้า)': itemName
      };

      let totalRowQty = 0;
      // วนลูปสร้างคอลัมน์ตามชนิดกล่องที่มีการใช้งานจริง
      boxHeadersArray.forEach((boxName) => {
        const packedQty = matrix[itemCode]?.[boxName] || 0;
        row[boxName] = packedQty; // ยอดรวมสินค้าตัวนี้ในกล่องไซส์นี้
        totalRowQty += packedQty; // สะสมยอดรวมขวาสุด
      });

      row['Grand Total (รวมจำนวนทั้งสิ้น)'] = totalRowQty;
      pivotData.push(row);
    });

    // --- 4. ประกอบร่างสร้างมัลติแผ่นงาน (Multi-Sheet Workbook) ---
    const workbook = XLSX.utils.book_new();

    // แท็บที่ 1: สรุปยอดเบิกกล่องสำหรับสโตร์
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, wsSummary, "Box Summary");

    // แท็บที่ 2: ตาราง Pivot Summary วิเคราะห์ข้อมูลสินค้าปะทะกล่อง (ฟีเจอร์ใหม่!)
    const wsPivot = XLSX.utils.json_to_sheet(pivotData);
    XLSX.utils.book_append_sheet(workbook, wsPivot, "Pivot Summary");

    // แท็บที่ 3: รายละเอียดการหยิบและแพ็คของรายกล่องแบบละเอียด
    const wsPlan = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, wsPlan, "Packing Plan");

    // สั่งดาวน์โหลดไฟล์ออกมาใช้งาน
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Packing_Plan_${dateStr}.xlsx`);
    toast.success('ดาวน์โหลดไฟล์ Excel พร้อมตาราง Pivot สำเร็จ!');
  };

  const handleAdjustBox = (cardGroupKey, amount) => {
    setBoxSummary(prev => prev.map(box => {
      if (box.cardGroupKey === cardGroupKey) {
        const newTotal = Math.max(1, box.totalBoxes + amount);
        const newBreakdown = [...box.boxesBreakdown];

        if (amount > 0) {
          newBreakdown.push({ boxNo: newTotal, items: [], spaceLeftPct: 100, spaceLeft: box.boxCap });
        } else if (amount < 0 && newBreakdown.length > newTotal) {
          if (newBreakdown[newBreakdown.length - 1].items.length === 0) {
            newBreakdown.pop();
          } else {
            toast.error(t('planner.err_cannot_reduce_box'));
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
      groupIndex, fromBoxNo: boxNo, itemCode: item.itemCode, orderNo: item.orderNo,
      poNumber: item.poNumber, lineNo: item.lineNo, lotNo: item.lotNo || '',
      maxQty: item.qty, cap: item.cap, moveQty: 1,
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

          const spacePerPiece = 1 / movingItem.cap;
          fromBox.spaceLeftPct = Math.min(100, fromBox.spaceLeftPct + Math.round((actualMoveQty * spacePerPiece) * 100));
          if (packingMode !== 'consolidate') fromBox.spaceLeft += actualMoveQty;

          const toItems = [...toBox.items];
          const toItemIndex = toItems.findIndex(i => i.itemCode === itemCode && i.orderNo === orderNo && i.poNumber === poNumber && i.lineNo === lineNo && (i.lotNo || '') === lotNo);
          if (toItemIndex > -1) {
            toItems[toItemIndex].qty += actualMoveQty;
          } else {
            toItems.push({ ...movingItem, qty: actualMoveQty });
          }
          toBox.items = toItems;

          toBox.spaceLeftPct = Math.max(0, toBox.spaceLeftPct - Math.round((actualMoveQty * spacePerPiece) * 100));
          if (packingMode !== 'consolidate') toBox.spaceLeft -= actualMoveQty;

          breakdown[fromBoxIndex] = fromBox;
          breakdown[toBoxIndex] = toBox;
          group.boxesBreakdown = breakdown;
          newSummary[groupIndex] = group;
          toast.success(t('planner.move_success', { item: itemCode, qty: actualMoveQty, box: toBoxNo }));
        }
      }
      return newSummary;
    });
    setMoveConfig(null);
  };

  const handleSaveReport = async () => {
    const validItems = calcResults.filter(r => !r.error);
    if (validItems.length === 0) return toast.error(t('planner.err_no_valid_data'));

    const totalBoxesUsed = boxSummary.reduce((sum, box) => sum + (box.totalBoxes || 0), 0);
    const toastId = toast.loading(t('planner.saving_report'));

    try {
      const { error: reportError } = await supabase.from('Report').insert([{
        operator: currentUser?.firstName || t('common.unspecified_user'),
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

      toast.success(t('planner.save_success'), { id: toastId });
      setCalcResults([]);
      setBoxSummary([]);
      setBulkText('');
      setPallet3DResult(null);

      fetchReportsData();
      fetchLogsData();
      fetchAdminData();

    } catch (error) {
      toast.error(t('planner.save_error') + error.message, { id: toastId });
    }
  };

  const aggregatedBoxRequisition = Object.values(boxSummary.reduce((acc, curr) => {
    if (!acc[curr.boxType]) {
      acc[curr.boxType] = { boxType: curr.boxType, boxCodename: curr.boxCodename, totalBoxes: 0, subCaps: {} };
    }
    acc[curr.boxType].totalBoxes += curr.totalBoxes;

    const capKey = packingMode === 'consolidate' ? t('planner.mixed_spec_vol') : `${curr.boxCap} ${t('planner.unit_piece')}`;
    if (!acc[curr.boxType].subCaps[capKey]) acc[curr.boxType].subCaps[capKey] = 0;
    acc[curr.boxType].subCaps[capKey] += curr.totalBoxes;

    return acc;
  }, {})).map(box => {
    const subCapsArray = Object.entries(box.subCaps).map(([cap, count]) => ({ cap, boxesCount: count }));
    return { ...box, subCaps: subCapsArray };
  }).sort((a, b) => b.totalBoxes - a.totalBoxes);

  const NO_ORDER = t('planner.no_order');
  const NO_PO = t('planner.no_po');

  // 🌟 ดึงข้อมูลพาเลทที่กำลังเลือกเปิดแท็บดูโมเดลอยู่มาส่งให้ตัว Viewer
  const activePalletData = pallet3DResult && pallet3DResult.pallets && pallet3DResult.pallets[activePalletTab]
    ? { success: true, ...pallet3DResult.pallets[activePalletTab] }
    : null;

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-200 text-gray-800 print:hidden">
        <h2 className="text-2xl font-black text-[#0066CC] mb-4">{t('planner.title')}</h2>

        <div className="mb-6">
          <div className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="text-sm font-bold text-[#0066CC] mb-3">{t('planner.select_mode')}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className={`cursor-pointer flex items-center p-3 rounded-lg border-2 transition-all ${packingMode === 'consolidate' ? 'bg-[#0066CC] border-[#0066CC] text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-[#0066CC]/50'}`}>
                <input type="radio" name="packMode" className="hidden" checked={packingMode === 'consolidate'} onChange={() => setPackingMode('consolidate')} />
                <div>
                  <div className="font-bold">{t('planner.mode_consolidate')}</div>
                  <div className={`text-xs mt-1 ${packingMode === 'consolidate' ? 'text-blue-100' : 'text-gray-400'}`}>{t('planner.mode_consolidate_desc')}</div>
                </div>
              </label>
              <label className={`cursor-pointer flex items-center p-3 rounded-lg border-2 transition-all ${packingMode === 'strict-item' ? 'bg-[#0066CC] border-[#0066CC] text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-[#0066CC]/50'}`}>
                <input type="radio" name="packMode" className="hidden" checked={packingMode === 'strict-item'} onChange={() => setPackingMode('strict-item')} />
                <div>
                  <div className="font-bold">{t('planner.mode_strict_item')}</div>
                  <div className={`text-xs mt-1 ${packingMode === 'strict-item' ? 'text-blue-100' : 'text-gray-400'}`}>{t('planner.mode_strict_item_desc')}</div>
                </div>
              </label>
              <label className={`cursor-pointer flex items-center p-3 rounded-lg border-2 transition-all ${packingMode === 'strict-po' ? 'bg-[#0066CC] border-[#0066CC] text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-[#0066CC]/50'}`}>
                <input type="radio" name="packMode" className="hidden" checked={packingMode === 'strict-po'} onChange={() => setPackingMode('strict-po')} />
                <div>
                  <div className="font-bold">{t('planner.mode_strict_po')}</div>
                  <div className={`text-xs mt-1 ${packingMode === 'strict-po' ? 'text-blue-100' : 'text-gray-400'}`}>{t('planner.mode_strict_po_desc')}</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <textarea
            rows="6"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={t('planner.textarea_placeholder')}
            className="w-full p-4 border border-gray-300 rounded-xl focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] outline-none transition-all font-mono text-sm bg-white text-gray-800 placeholder-gray-400 shadow-inner"
          ></textarea>

          <div className="flex gap-4">
            <button onClick={handleBulkCalculate} className="flex-1 bg-[#0066CC] hover:bg-[#0052a3] text-white font-bold py-4 rounded-xl shadow-md transition-all transform active:scale-95 text-lg">
               {t('planner.btn_calculate')}
            </button>
            <button onClick={() => { setBulkText(''); setCalcResults([]); setBoxSummary([]); setPallet3DResult(null); toast(t('planner.clear_success'), { icon: '🧹' }); }} className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-600 font-bold py-4 px-8 rounded-xl transition-all">
              {t('common.clear')}
            </button>
          </div>
        </div>
      </div>

      {calcResults.length > 0 && (
        <div className="space-y-6 animate-fade-in-up print:hidden">

          {boxSummary.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden text-gray-800 border border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 border-b border-gray-200 gap-4">
                <h3 className="text-xl font-bold text-[#0066CC] flex items-center gap-2">
                   {t('planner.summary_title')}
                </h3>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button onClick={handleCalculate3DPallet} disabled={isCalculating3D} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2">
                    {isCalculating3D ? 'กำลังคำนวณ...' : '🔮 จำลองพาเลท 3D'}
                  </button>
                  <button onClick={handleExportPlanToExcel} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2">
                    <span>📊</span> Export
                  </button>
                  <button onClick={() => setShowSummaryModal(true)} className="flex-1 sm:flex-none bg-[#0066CC] hover:bg-[#0052a3] text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2">
                     {t('planner.btn_view_print')}
                  </button>
                </div>
              </div>

              {/* 🌟 โซนแสดงผลลัพธ์ 3D แบบ Multi-Pallet Dynamic */}
              {pallet3DResult && pallet3DResult.pallets && (
                <div className="p-6 bg-slate-50 border-b border-gray-200">

                  {/* ปุ่มสลับแท็บเลือกส่องพาเลทแต่ละใบ */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {pallet3DResult.pallets.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActivePalletTab(idx)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activePalletTab === idx ? 'bg-[#0066CC] text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      >
                         ใบที่ {p.palletNo} ({p.palletSpecification.palletId})
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 shadow-inner rounded-xl overflow-hidden border border-slate-200">
                      <Pallet3DViewer palletData={activePalletData} />
                    </div>
                    {activePalletData && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                        <h4 className="font-bold text-slate-800 text-sm border-b pb-2 uppercase tracking-wide">📋 รายละเอียดพาเลทใบนี้</h4>
                        <ul className="text-xs space-y-3 text-slate-600">
                          <li className="flex justify-between"><span>พาเลทลำดับที่:</span> <span className="font-bold text-slate-800">ใบที่ {activePalletData.palletNo}</span></li>
                          <li className="flex justify-between"><span>โมเดลที่ระบบเลือก:</span> <span className="font-bold text-[#0066CC]">{activePalletData.palletSpecification.palletId}</span></li>
                          <li className="flex justify-between"><span>คำอธิบาย:</span> <span className="font-bold text-slate-700">{activePalletData.palletSpecification.description || '-'}</span></li>
                          <li className="flex justify-between"><span>กล่องวางสำเร็จบนใบนี้:</span> <span className="font-bold text-emerald-600 text-sm">{activePalletData.totalPackedCount} ใบ</span></li>
                          <li className="flex justify-between"><span>ขนาดแท้จริงพาเลท:</span> <span className="font-bold text-slate-800">{activePalletData.palletSpecification.totalWidthMm}x{activePalletData.palletSpecification.totalLengthMm} mm</span></li>
                        </ul>
                        {pallet3DResult.isOverfilled && activePalletTab === (pallet3DResult.pallets.length - 1) && (
                          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs border border-red-200 font-bold mt-2">
                            ⚠️ หมายเหตุ: ตรวจพบกล่องขนาดใหญ่เกินไปกว่าที่สเปกพาเลททุกรุ่นในระบบจะรองรับได้จำนวน {pallet3DResult.unpackedBoxes.length} ชิ้น
                          </div>
                        )}
                        <div className="mt-auto text-[10px] text-slate-400 text-center">
                          *ระบบคำนวณสลับไซส์ให้อัตโนมัติเพื่อความประหยัดที่สุด
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ส่วนตารางสรุปเดิม ... */}
              <div className="p-6">
                <div className="mb-4 text-sm font-bold text-gray-500 flex items-center gap-2">{t('planner.quick_summary')}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {aggregatedBoxRequisition.map((sum, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
                      <div>
                        <div className="font-black text-lg text-[#0066CC]">{sum.boxCodename || sum.boxType}</div>
                        <div className="text-xs text-gray-500 space-y-1 mt-2 pl-3 border-l-2 border-[#0066CC]/30">
                          {sum.subCaps.map((sub, sIdx) => (
                            <div key={sIdx}>• {sub.cap} {t('planner.used')} <span className="text-gray-800 font-bold">{sub.boxesCount} {t('planner.unit_box')}</span></div>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{t('planner.total_requisition')}</div>
                        <div className="text-4xl font-black text-gray-800">{sum.totalBoxes} <span className="text-sm font-normal text-gray-500">{t('planner.unit_box')}</span></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
                  {boxSummary.map((sum, groupIdx) => (
                    <div key={groupIdx} className="bg-gray-50 rounded-xl p-5 border border-gray-200 flex flex-col h-full shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="font-black text-xl text-gray-800">
                            {sum.boxCodename || sum.boxType}
                            {packingMode !== 'consolidate' && (
                              <span className="text-sm text-[#0066CC] ml-2 border border-[#0066CC]/20 bg-[#0066CC]/10 px-2 py-0.5 rounded-md whitespace-nowrap">
                                {sum.boxCap} {t('planner.unit_piece')}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-wider">System ID: {sum.boxType}</div>
                        </div>
                        {packingMode === 'consolidate' && (
                          <div className="bg-[#0066CC]/10 text-[#0066CC] text-xs px-2 py-1 rounded border border-[#0066CC]/20">{t('planner.cap_mixed_vol')}</div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-center mb-4 bg-white p-3 rounded-lg border border-gray-200">
                        <div>
                          <div className="text-[11px] text-gray-500 uppercase tracking-wider">{t('planner.total_mixed_items')}</div>
                          <div className="font-bold text-xl text-gray-800">{sum.totalQty} <span className="text-sm font-normal text-gray-500">{t('planner.unit_piece')}</span></div>
                        </div>
                        <div>
                          <div className="text-[11px] text-gray-500 uppercase tracking-wider">{t('planner.requisition_box')}</div>
                          <div className="flex items-center justify-center gap-2 mt-1">
                            <button onClick={() => handleAdjustBox(sum.cardGroupKey, -1)} className="bg-red-100 text-red-600 hover:bg-red-500 hover:text-white w-6 h-6 rounded flex items-center justify-center font-bold transition-colors">-</button>
                            <div className="font-bold text-xl text-[#0066CC] w-8">{sum.totalBoxes}</div>
                            <button onClick={() => handleAdjustBox(sum.cardGroupKey, 1)} className="bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white w-6 h-6 rounded flex items-center justify-center font-bold transition-colors">+</button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-200">
                        <div className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-2">
                          <span></span> {t('planner.packing_plan')}
                        </div>
                        <div className="space-y-3 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                          {sum.boxesBreakdown.map((b) => (
                            <div key={b.boxNo} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                                <span className="text-xs font-bold text-gray-800">{t('planner.box_no', { no: b.boxNo })}</span>
                                {packingMode === 'consolidate'
                                  ? (b.spaceLeftPct > 0 && <span className="text-[10px] text-[#0066CC]">{t('planner.space_left_pct', { pct: b.spaceLeftPct })}</span>)
                                  : (b.spaceLeft > 0 && <span className="text-[10px] text-[#0066CC]">{t('planner.space_left_pcs', { pcs: b.spaceLeft })}</span>)
                                }
                              </div>
                              <div className="space-y-2">
                                {b.items.length === 0 && <div className="text-xs text-gray-400 text-center italic py-2">{t('planner.empty_box')}</div>}
                                {b.items.map((item, i) => (
                                  <div key={i} className="flex flex-col text-xs bg-gray-50 p-2 rounded border-l-2 border-[#0066CC]">
                                    <div className="flex justify-between items-start">
                                      <span className="font-bold text-gray-800">{item.itemCode}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-emerald-600 min-w-max">{item.qty} {t('planner.unit_piece')}</span>
                                        {packingMode === 'consolidate' && <span className="text-gray-400 text-[9px] ml-1">{t('planner.spec_cap', { cap: item.cap })}</span>}
                                        {sum.boxesBreakdown.length > 1 && (
                                          <button onClick={() => openMoveModal(groupIdx, b.boxNo, item)} className="text-[9px] bg-blue-100 text-[#0066CC] w-5 h-5 rounded hover:bg-[#0066CC] hover:text-white transition-colors flex items-center justify-center">🔄</button>
                                        )}
                                      </div>
                                    </div>

                                    {item.lotNo && (
                                      <div className="text-[10px] text-gray-500 font-mono mt-1">{t('planner.lot_po')} <span className="text-gray-800">{item.lotNo}</span></div>
                                    )}

                                    {(item.poNumber !== NO_PO || item.orderNo !== NO_ORDER) && (
                                      <div className="text-[10px] text-gray-500 mt-1 leading-tight bg-white p-1 rounded border border-gray-200">
                                        {item.orderNo !== NO_ORDER ? <span className="text-gray-800">{item.orderNo}</span> : ''}
                                        {item.lineNo !== '-' ? ` (L:${item.lineNo}) ` : ' '}
                                        {item.poNumber !== NO_PO && item.poNumber !== item.lotNo ? ` | PO: ` : ''}
                                        {item.poNumber !== NO_PO && item.poNumber !== item.lotNo ? <span className="text-gray-800">{item.poNumber}</span> : ''}
                                      </div>
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
            </div>
          )}

          {/* ตารางสินค้าคงเดิม ... */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gray-50 p-4 border-b border-gray-200 font-bold flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-gray-800">
              <span className="flex items-center gap-2">
                <span></span> {t('planner.items_to_pack', { count: calcResults.length })}
              </span>
              <button onClick={handleSaveReport} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-6 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 font-bold">
                <span></span> {t('planner.btn_confirm_save')}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="py-4 px-4 text-left font-bold text-gray-600 text-sm uppercase tracking-wider">{t('planner.th_order_po')}</th>
                    <th className="py-4 px-4 text-left font-bold text-gray-600 text-sm uppercase tracking-wider">{t('planner.th_item_code')}</th>
                    <th className="py-4 px-4 text-left font-bold text-gray-600 text-sm uppercase tracking-wider">{t('planner.th_item_name_cust')}</th>
                    <th className="py-4 px-4 text-center font-bold text-gray-600 text-sm uppercase tracking-wider">{t('planner.th_qty')}</th>
                    <th className="py-4 px-4 text-center font-bold text-gray-600 text-sm uppercase tracking-wider">{t('planner.th_box_type')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {calcResults.map((res) => (
                    <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-amber-600 text-xs mb-1">{res.orderNo !== NO_ORDER ? res.orderNo : '-'}</div>
                        <div className="font-bold text-gray-500 text-xs">{res.poNumber !== NO_PO ? res.poNumber : '-'}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-800">
                        <div className="text-sm text-[#0066CC]">{res.itemCode}</div>
                        {res.lotNo && <div className="text-[11px] text-gray-400 font-mono font-normal mt-1">{t('planner.lot_po')} <span className="text-gray-600">{res.lotNo}</span></div>}
                      </td>
                      {res.error ? (
                        <td colSpan="3" className="py-3 px-4 text-red-600 font-bold bg-red-50 border-l-2 border-red-500">{res.error}</td>
                      ) : (
                        <>
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-800 text-sm mb-1">{res.itemName}</div>
                            <div className="text-xs text-gray-500 font-bold">{res.customer}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-black text-gray-800 text-lg">{res.qty}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="font-bold text-[#0066CC] bg-[#0066CC]/10 border border-[#0066CC]/20 px-3 py-1.5 rounded-lg mb-1 inline-block">
                              {res.boxCodename || res.boxType} <span className="text-[#0066CC] text-xs ml-1">({res.boxCap} {t('planner.unit_piece')})</span>
                            </div>
                            {res.boxCodename && <div className="text-[10px] text-gray-400 font-mono text-center mt-1">ID: {res.boxType}</div>}
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

      {/* Modals ต่างๆ โค้ดเดิมคงไว้ 100% ... */}
      {moveConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm border border-gray-200 text-gray-800">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><span>🔄</span> {t('planner.move_modal_title')}</h3>
            <div className="mb-4 bg-gray-50 p-4 rounded-xl text-sm text-gray-800 border border-gray-200">
              <span className="font-bold text-[#0066CC] text-base">{moveConfig.itemCode}</span>
              {moveConfig.lotNo && <span className="text-xs text-gray-500 block mt-1">{t('planner.lot_po')} <span className="text-gray-800">{moveConfig.lotNo}</span></span>}
              <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                {t('planner.from_box_no', { no: moveConfig.fromBoxNo })}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{t('planner.move_qty_label')}</label>
                <input type="number" min="1" max={moveConfig.maxQty} value={moveConfig.moveQty} onChange={(e) => setMoveConfig({ ...moveConfig, moveQty: Number(e.target.value) })} className="w-full p-3 border border-gray-300 rounded-lg font-bold text-center bg-white text-gray-800 focus:outline-none focus:border-[#0066CC]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{t('planner.move_dest_label')}</label>
                <select value={moveConfig.toBoxNo} onChange={(e) => setMoveConfig({ ...moveConfig, toBoxNo: Number(e.target.value) })} className="w-full p-3 border border-gray-300 rounded-lg font-bold text-gray-800 bg-white focus:outline-none focus:border-[#0066CC]">
                  {boxSummary[moveConfig.groupIndex].boxesBreakdown.map(b => (
                    <option key={b.boxNo} value={b.boxNo} disabled={b.boxNo === moveConfig.fromBoxNo}>
                      {t('planner.box_no', { no: b.boxNo })} ({packingMode === 'consolidate' ? t('planner.space_left_pct', { pct: b.spaceLeftPct }) : t('planner.space_left_pcs', { pcs: b.spaceLeft })})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setMoveConfig(null)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg font-bold text-gray-600 transition-colors">{t('common.cancel')}</button>
              <button onClick={confirmMove} className="px-5 py-2.5 bg-[#0066CC] hover:bg-[#0052a3] text-white rounded-lg font-bold shadow-md transition-colors">{t('common.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto pt-10 pb-10 print:block print:static print:bg-white print:p-0 print:overflow-visible">
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

          <div id="print-modal" className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-3xl shadow-2xl my-auto border border-gray-200 print:border-none print:bg-white print:text-black print:my-0 print:shadow-none print:w-full print:max-w-full text-gray-800">
            <div className="flex justify-between items-center mb-6 print:hidden">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2"><span>📋</span> {t('planner.print_modal_title')}</h2>
              <button onClick={() => setShowSummaryModal(false)} className="text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors">✕</button>
            </div>

            <div className="hidden print:block text-center mb-6">
              <h1 className="text-3xl font-black text-black mb-2">{t('planner.print_header')}</h1>
              <p className="text-gray-600">{t('planner.calc_mode_label')} {packingMode === 'consolidate' ? t('planner.mode_name_consolidate') : packingMode === 'strict-item' ? t('planner.mode_name_item') : t('planner.mode_name_po')}</p>
            </div>

            <h3 className="text-lg font-bold text-[#0066CC] print:text-black mb-3 mt-4 flex items-center gap-2">
              <span>🛒</span> {t('planner.print_step1')}
            </h3>
            <table className="w-full text-left border-collapse mb-10 bg-white print:bg-white rounded-lg overflow-hidden border border-gray-200">
              <thead className="bg-gray-100 text-gray-600 print:bg-gray-200 print:text-black border-b border-gray-200 print:border-gray-300">
                <tr>
                  <th className="p-3 font-bold text-center w-16">{t('planner.th_seq')}</th>
                  <th className="p-3 font-bold">{t('planner.th_box_spec')}</th>
                  <th className="p-3 font-bold text-center w-32">{t('planner.th_req_qty')}</th>
                </tr>
              </thead>
              <tbody className="text-gray-800 print:text-black">
                {aggregatedBoxRequisition.map((sum, idx) => (
                  <tr key={idx} className="border-b border-gray-100 print:border-gray-300 last:border-0 hover:bg-gray-50">
                    <td className="p-3 text-center align-middle font-medium text-gray-500 print:text-black">{idx + 1}</td>
                    <td className="p-3 align-middle">
                      <div className="font-black text-[#0066CC] print:text-black text-xl">{sum.boxCodename || sum.boxType}</div>
                      <div className="text-xs text-gray-500 print:text-gray-600 mb-2">ID: {sum.boxType}</div>

                      <div className="pl-3 border-l-2 border-[#0066CC]/50 text-xs space-y-1 text-gray-600 print:text-gray-700 font-medium">
                        {sum.subCaps.map((sub, sIdx) => (
                          <div key={sIdx}>
                            • {sub.cap} = <span className="font-bold text-gray-800 print:text-black">{sub.boxesCount} {t('planner.unit_box')}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 font-black text-center text-4xl text-emerald-600 print:text-black align-middle">
                      {sum.totalBoxes} <span className="text-sm font-normal text-gray-500 print:text-gray-700 block mt-1">{t('planner.unit_box')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="text-lg font-bold text-gray-800 print:text-black mb-4 flex items-center gap-2 pt-4 border-t border-gray-200 print:border-gray-300">
              <span></span> {t('planner.print_step2')}
            </h3>
            <div className="space-y-6">
              {boxSummary.map((sum, idx) => (
                <div key={idx} className="avoid-break bg-gray-50 p-5 rounded-xl border border-gray-200 print:border-gray-400 print:p-2 print:bg-transparent shadow-sm">
                  <div className="font-bold text-[#0066CC] print:text-black mb-4 border-b border-gray-200 print:border-gray-300 pb-3 flex justify-between items-center">
                    <span className="text-lg">
                      📦 {sum.boxCodename || sum.boxType}
                      {packingMode !== 'consolidate' && <span className="text-sm text-[#0066CC] print:text-black ml-2 bg-[#0066CC]/10 print:bg-transparent px-2 py-0.5 rounded border border-[#0066CC]/20 print:border-none">({sum.boxCap} {t('planner.unit_piece')})</span>}
                    </span>
                    <span className="text-sm font-normal text-gray-600 print:text-gray-600 bg-white border border-gray-200 print:bg-transparent px-3 py-1 rounded-full">
                      {packingMode === 'consolidate' && <span className="text-[#0066CC] font-bold mr-2">{t('planner.mixed_tag')}</span>}
                      {t('planner.used_total_boxes', { count: sum.totalBoxes })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sum.boxesBreakdown.map((b) => (
                      <div key={b.boxNo} className="bg-white p-4 rounded-lg border border-gray-200 print:bg-gray-50 print:border-gray-300 avoid-break shadow-sm">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 print:border-gray-300">
                          <span className="font-bold text-[#0066CC] print:text-black bg-blue-50 print:bg-transparent px-2 py-0.5 rounded">{t('planner.box_no', { no: b.boxNo })}</span>
                          {packingMode === 'consolidate'
                            ? (b.spaceLeftPct > 0 && <span className="text-[10px] text-gray-500 print:text-gray-500 font-bold">{t('planner.space_left_pct', { pct: b.spaceLeftPct })}</span>)
                            : (b.spaceLeft > 0 && <span className="text-[10px] text-gray-500 print:text-gray-500 font-bold">{t('planner.space_left_pcs', { pcs: b.spaceLeft })}</span>)
                          }
                        </div>
                        <ul className="space-y-2">
                          {b.items.length === 0 && <div className="text-xs text-gray-400 text-center italic py-2">{t('planner.empty_box_hint')}</div>}
                          {b.items.map((item, i) => (
                            <li key={i} className="flex flex-col text-sm text-gray-800 print:text-black mb-2 bg-gray-50 print:bg-transparent p-2 print:p-0 rounded border-l-2 border-[#0066CC] print:border-none">
                              <div className="flex justify-between items-start">
                                <span className="font-bold pr-2">{item.itemCode}</span>
                                <div className="text-right">
                                  <span className="font-black text-emerald-600 print:text-black text-base">{item.qty} <span className="text-xs font-normal">{t('planner.unit_piece')}</span></span>
                                  {packingMode === 'consolidate' && <div className="text-gray-500 print:text-gray-600 text-[10px]">{t('planner.spec_cap', { cap: item.cap })}</div>}
                                </div>
                              </div>

                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                {item.lotNo && (
                                  <div className="text-[10px] text-gray-500 print:text-gray-600 font-mono bg-white border border-gray-200 print:border-none print:bg-transparent px-1.5 py-0.5 rounded">
                                    {t('planner.lot_po')} <span className="text-gray-800 print:text-black">{item.lotNo}</span>
                                  </div>
                                )}

                                {(item.poNumber !== NO_PO || item.orderNo !== NO_ORDER) && (
                                  <span className="text-[10px] text-gray-500 print:text-gray-600 bg-white border border-gray-200 print:border-none print:bg-transparent px-1.5 py-0.5 rounded leading-tight flex items-center gap-1">
                                    {item.orderNo !== NO_ORDER ? <span className="text-gray-800 print:text-black">{item.orderNo}</span> : ''}
                                    {item.lineNo !== '-' ? `(L:${item.lineNo})` : ''}
                                    {item.poNumber !== NO_PO && item.poNumber !== item.lotNo ? ` | PO: ` : ''}
                                    {item.poNumber !== NO_PO && item.poNumber !== item.lotNo ? <span className="text-gray-800 print:text-black">{item.poNumber}</span> : ''}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end gap-3 print:hidden">
              <button onClick={() => setShowSummaryModal(false)} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-600 rounded-lg font-bold transition-colors">
                {t('common.back')}
              </button>
              <button onClick={() => window.print()} className="px-6 py-2.5 bg-[#0066CC] hover:bg-[#0052a3] text-white rounded-lg font-bold transition-colors flex items-center gap-2 shadow-sm">
                {t('planner.btn_print_instruction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}