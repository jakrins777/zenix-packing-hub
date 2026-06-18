const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const bcrypt = require('bcrypt');
const multer = require('multer');
const xlsx = require('xlsx');
// 🌟 เพิ่มไลบรารีคำนวณพื้นที่จัดวาง 3 มิติ
const { Packer, Bin, Item } = require('bp3d');

const upload = multer({ storage: multer.memoryStorage() });
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

BigInt.prototype.toJSON = function () {
  return this.toString();
};

app.use(cors());
app.use(express.json());

// ==========================================================================
// 🧠 SMART SIZE PARSER FUNCTIONS (ฟังก์ชันสกัดขนาดอัจฉริยะ)
// ==========================================================================

/**
 * ฟังก์ชันแยกขนาด กว้าง x ยาว x สูง อัตโนมัติจากข้อความ Description
 * รองรับฟอร์แมต L...xW...xH..., ตัวเลขล้วน และหน่วยนิ้ว (Inch) ที่จะแปลงเป็น mm ให้ทันที
 * หน่วยผลลัพธ์: มิลลิเมตร (mm)
 */
function parseSmartSize(sizeStr) {
  const dimensions = { width: 0, length: 0, height: 130 }; // ค่าความสูงพาเลทเริ่มต้น
  if (!sizeStr) return dimensions;

  // แปลงเป็นตัวพิมพ์ใหญ่และลบช่องว่างออกทั้งหมด เช่น "l2010 x w630" -> "L2010XW630"
  const cleanStr = String(sizeStr).toUpperCase().replace(/\s+/g, '');

  // 1. ตรวจสอบเงื่อนไขหน่วยนิ้ว (เช่น 20X20X12INCH)
  const inchMatch = cleanStr.match(/(\d+(?:\.\d+)?)\s*X\s*(\d+(?:\.\d+)?)\s*X\s*(\d+(?:\.\d+)?).*INCH/);
  // 2. ตรวจสอบเงื่อนไขแบบมีตัวอักษร L, W, H กำกับตัวเลข
  const lMatch = cleanStr.match(/L(\d+)/);
  const wMatch = cleanStr.match(/W(\d+)/);
  const hMatch = cleanStr.match(/H(\d+)/);
  // 3. ตรวจสอบเงื่อนไขตัวเลข 3 ชุดคั่นด้วย X (เช่น 1210X740X130)
  const generic3DMatch = cleanStr.match(/(\d+)\s*X\s*(\d+)\s*X\s*(\d+)/);

  if (inchMatch) {
    // แปลง นิ้ว เป็น มิลลิเมตร (คูณ 25.4 และปัดเศษ)
    dimensions.length = Math.round(parseFloat(inchMatch[1]) * 25.4);
    dimensions.width = Math.round(parseFloat(inchMatch[2]) * 25.4);
    dimensions.height = Math.round(parseFloat(inchMatch[3]) * 25.4);
  } else if (lMatch || wMatch || hMatch) {
    if (wMatch) dimensions.width = parseInt(wMatch[1], 10);
    if (lMatch) dimensions.length = parseInt(lMatch[1], 10);
    if (hMatch) dimensions.height = parseInt(hMatch[1], 10);
  } else if (generic3DMatch) {
    dimensions.length = parseInt(generic3DMatch[1], 10);
    dimensions.width = parseInt(generic3DMatch[2], 10);
    dimensions.height = parseInt(generic3DMatch[3], 10);
  } else {
    // เผื่อกรณีระบุมาแค่ 2 มิติ กว้างxยาว (เช่น 650X1400 mm.)
    const generic2DMatch = cleanStr.match(/(\d+)\s*X\s*(\d+)/);
    if (generic2DMatch) {
      dimensions.length = parseInt(generic2DMatch[1], 10);
      dimensions.width = parseInt(generic2DMatch[2], 10);
      dimensions.height = 130; // ใช้ค่า Default
    }
  }

  return dimensions;
}

// ==========================================================================
// 🟢 SYSTEM STATUS CHECK (ตรวจสอบระบบ)
// ==========================================================================

app.get('/', (req, res) => {
  res.send('🟢 Zenix API Server is Running perfectly with 3D Packing Engine!');
});

// ==========================================================================
// 🚛 3D PALLET PACKING ALGORITHM & MANAGEMENT (จัดการและคำนวณพาเลท)
// ==========================================================================

/**
 * 🔮 API คำนวณการจัดเรียงกล่องหลากไซส์ลงบนพาเลทแบบ 3 มิติ (Mixed SKUs)
 * ควบคุมความสูงสูงสุดตามสเปกพาเลทแต่ละไซส์ (เพดานไม่เกิน 1500 mm ต่อ Shipment)
 */
// 🔮 API คำนวณการจัดเรียงกล่องหลากไซส์ลงบนพาเลทแบบ 3 มิติ
// 🔮 API คำนวณการจัดเรียงกล่องหลากไซส์ลงบนพาเลทแบบ 3 มิติ
app.post('/api/pallet/calculate', async (req, res) => {
  try {
    const { palletId, shipmentItems } = req.body;

    if (!palletId) return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสพาเลทที่ใช้' });
    if (!shipmentItems || shipmentItems.length === 0) return res.status(400).json({ success: false, message: 'ไม่พบข้อมูลสินค้า' });

    const palletSpec = await prisma.pallet.findUnique({ where: { palletId } });
    if (!palletSpec) return res.status(404).json({ success: false, message: 'ไม่พบสเปกพาเลทรหัสนี้ในระบบ' });

    const PALLET_WIDTH = palletSpec.width;
    const PALLET_LENGTH = palletSpec.length;
    const PALLET_MAX_HEIGHT = palletSpec.maxHeight;
    const PALLET_BASE_THICKNESS = palletSpec.baseThickness;

    const USABLE_HEIGHT = PALLET_MAX_HEIGHT - PALLET_BASE_THICKNESS;
    const MAX_WEIGHT_CAPACITY = palletSpec.maxWeight;

    // 🌟 แก้ไข 1: เรียงพารามิเตอร์ของพาเลทให้ถูกต้องตามไลบรารี (กว้าง, สูง, ลึก/ยาว)
    const palletBin = new Bin(palletSpec.palletId, PALLET_WIDTH, USABLE_HEIGHT, PALLET_LENGTH, MAX_WEIGHT_CAPACITY);
    const packer = new Packer();
    packer.addBin(palletBin);

    for (const sItem of shipmentItems) {
      const itemData = await prisma.item.findUnique({
        where: { itemId: sItem.itemId },
        include: { defaultBox: true }
      });

      if (!itemData || !itemData.defaultBox) continue;

      const box = itemData.defaultBox;
      const w = parseInt(box.width, 10) || 300;
      const l = parseInt(box.length, 10) || 400;
      const h = parseInt(box.height, 10) || 200;

      const unitWeight = (itemData.itemWeight * (itemData.stdPackQty || 1));
      const totalBoxesNeeded = Math.ceil(sItem.qtyToPack / (itemData.stdPackQty || 1));

      for (let i = 0; i < totalBoxesNeeded; i++) {
        // 🌟 แก้ไข 2: สลับตำแหน่ง h กับ l ตอนสร้างกล่องให้ตรงกับแกน Y (ความสูง) และ Z (ความลึก/ยาว)
        const newItem = new Item(`${itemData.itemId}-BOX-${i + 1}`, w, h, l, unitWeight);

        // 🌟 แก้ไข 3: ล็อกการหมุน! บังคับให้วางแนวนอนเท่านั้น 
        // รหัส 0 = วางปกติ (กว้าง, สูง, ยาว)
        // รหัส 3 = หมุน 90 องศาแนวราบ (ยาว, สูง, กว้าง)
        newItem.allowedRotations = [0, 3];

        packer.addItem(newItem);
      }
    }

    packer.pack();

    const packedResults = palletBin.items.map(packedItem => ({
      boxId: packedItem.name,
      position: { x: packedItem.position[0], y: packedItem.position[1], z: packedItem.position[2] },
      dimensions: { width: packedItem.width, length: packedItem.depth, height: packedItem.height },
      weight: packedItem.weight
    }));

    const unpackedResults = packer.unfitItems.map(item => item.name);

    res.json({
      success: true,
      palletSpecification: {
        palletId: palletSpec.palletId,
        totalWidthMm: PALLET_WIDTH,
        totalLengthMm: PALLET_LENGTH,
        maxHeightMm: PALLET_MAX_HEIGHT,
        baseThicknessMm: PALLET_BASE_THICKNESS,
        usableHeightMm: USABLE_HEIGHT
      },
      packedBoxes: packedResults,
      unpackedBoxes: unpackedResults,
      totalPackedCount: packedResults.length,
      isOverfilled: unpackedResults.length > 0
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'การคำนวณล้มเหลว: ' + error.message });
  }
});

// 🪵 PALLETS CRUD ROUTE (จัดการพาเลท)
app.get('/api/pallets', async (req, res) => {
  try {
    const pallets = await prisma.pallet.findMany({ orderBy: { palletId: 'asc' } });
    res.json({ success: true, data: pallets });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.post('/api/pallets', async (req, res) => {
  try {
    const { palletId, description, width, length, maxHeight, baseThickness, maxWeight, currentStock } = req.body;
    await prisma.pallet.create({
      data: {
        palletId: String(palletId).toUpperCase().trim(),
        description,
        width: parseInt(width, 10),
        length: parseInt(length, 10),
        maxHeight: parseInt(maxHeight, 10) || 1500,
        baseThickness: parseInt(baseThickness, 10),
        maxWeight: parseInt(maxWeight, 10) || 2000,
        currentStock: parseInt(currentStock || 0, 10)
      }
    });
    res.json({ success: true, message: '✅ เพิ่มข้อมูลพาเลทสำเร็จ' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.delete('/api/pallets/:id', async (req, res) => {
  try {
    await prisma.pallet.delete({ where: { palletId: req.params.id } });
    res.json({ success: true, message: 'ลบข้อมูลพาเลทสำเร็จ' });
  } catch (error) { res.status(500).json({ success: false, message: 'ไม่สามารถลบได้' }); }
});

// ==========================================================================
// ⚡ ONE-TIME MIGRATION DATA ROUTES (สคริปต์กวาดและแกะขนาดอัตโนมัติ)
// ==========================================================================

// 📦 สำหรับคัดแยกและอัปเดตขนาดกล่อง Master ทั้งหมดจากช่อง Description
app.get('/api/box/extract-sizes', async (req, res) => {
  try {
    const boxes = await prisma.box.findMany();
    let updateCount = 0;
    let detailsLog = [];

    for (const box of boxes) {
      if (!box.description) continue;
      const parsed = parseSmartSize(box.description);

      if (parsed.width > 0 && parsed.length > 0) {
        await prisma.box.update({
          where: { pckId: box.pckId },
          data: { width: parsed.width, length: parsed.length, height: parsed.height }
        });
        updateCount++;
        detailsLog.push(`✅ ${box.pckId} -> W:${parsed.width} L:${parsed.length} H:${parsed.height} mm`);
      }
    }
    res.json({ success: true, message: `อัปเดตแกะขนาดกล่องสำเร็จ ${updateCount} รายการ`, details: detailsLog });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// 🪵 สำหรับป้อนข้อมูลขนาดพาเลทตั้งต้นเข้าคอลัมน์ใหม่ (ตามฟอร์แมตข้อความที่ส่งมา)
app.get('/api/pallet/init-data', async (req, res) => {
  try {
    const palletUpdates = [
      { id: "PCK0000044", sizeText: "1210x740x130 mm." },
      { id: "PCK0000045", sizeText: "1310x805x130 mm." },
      { id: "PCK0000046", sizeText: "910x740x130 mm." },
      { id: "PCK0000047", sizeText: "1085x923x130 mm." },
      { id: "PCK0000048", sizeText: "1195x1085x130 mm." },
      { id: "PCK0000049", sizeText: "1304x1155x130 mm." },
      { id: "PCK0000050", sizeText: "790x1015x130 mm." },
      { id: "PCK0000051", sizeText: "650x1400 mm." },
      { id: "PCK0000052", sizeText: "650x2010 mm." },
      { id: "PCK0000053", sizeText: "Pallet+Cover MC165 L122xW82xH13 Cm" }
    ];

    let log = [];
    for (const item of palletUpdates) {
      try {
        const parsed = parseSmartSize(item.sizeText);
        await prisma.pallet.update({
          where: { palletId: item.id },
          data: { width: parsed.width, length: parsed.length, maxHeight: 1500, baseThickness: parsed.height }
        });
        log.push(`✅ พาเลท ${item.id} -> อัปเดตมิติสำเร็จ!`);
      } catch (e) { log.push(`❌ ข้าม ${item.id} (อาจยังไม่มีข้อมูลแถวนี้ในตาราง)`); }
    }
    res.json({ success: true, details: log });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ==========================================================================
// 📦 BOXES CRUD (จัดการ Master Data กล่องทั่วไป)
// ==========================================================================

app.get('/api/boxes', async (req, res) => {
  try {
    const boxes = await prisma.box.findMany({ orderBy: { pckId: 'asc' } });
    res.json({ success: true, data: boxes });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.post('/api/boxes/upload', upload.array('files', 10), async (req, res) => {
  try {
    let allRawData = [];
    for (const file of req.files) {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      workbook.SheetNames.forEach(sheetName => {
        allRawData = allRawData.concat(xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]));
      });
    }

    let successCount = 0;
    for (const row of allRawData) {
      const rawId = String(row['Item'] || row['รหัสกล่อง'] || row.pckId || '').toUpperCase().trim();
      if (rawId) {
        const updateData = {};
        if (row['Description'] || row['คำอธิบาย']) updateData.description = String(row['Description'] || row['คำอธิบาย']);
        if (row['Lot Size'] || row['ความจุสูงสุด']) updateData.maxCapacity = parseInt(row['Lot Size'] || row['ความจุสูงสุด'], 10);
        if (row['Current Stock'] || row['สต็อก']) updateData.currentStock = parseInt(row['Current Stock'] || row['สต็อก'], 10);
        if (row['Min Stock'] || row['จุดสั่งซื้อ']) updateData.minStockLevel = parseInt(row['Min Stock'] || row['จุดสั่งซื้อ'], 10);

        // หากใน Excel ดึงช่องขนาดมา สามารถสกัดบันทึกเข้าแกนได้เลยทันที
        if (row['Description'] || row['คำอธิบาย']) {
          const parsed = parseSmartSize(row['Description'] || row['คำอธิบาย']);
          if (parsed.width > 0) {
            updateData.width = parsed.width;
            updateData.length = parsed.length;
            updateData.height = parsed.height;
          }
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.box.updateMany({ where: { pckId: rawId }, data: updateData });
          successCount++;
        }
      }
    }
    res.json({ success: true, message: `✅ อัปเดตข้อมูลกล่องสำเร็จ ${successCount} รายการ` });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.put('/api/boxes/:id', async (req, res) => {
  try {
    const { description, maxCapacity, currentStock, minStockLevel, width, length, height } = req.body;
    await prisma.box.update({
      where: { pckId: req.params.id },
      data: {
        description,
        maxCapacity: parseInt(maxCapacity, 10),
        currentStock: parseInt(currentStock || 0, 10),
        minStockLevel: parseInt(minStockLevel || 0, 10),
        width: parseInt(width, 10) || undefined,
        length: parseInt(length, 10) || undefined,
        height: parseInt(height, 10) || undefined
      }
    });
    res.json({ success: true, message: '✅ อัปเดตข้อมูลกล่องและสต็อกสำเร็จ' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.delete('/api/boxes/:id', async (req, res) => {
  try {
    await prisma.box.delete({ where: { pckId: req.params.id } });
    res.json({ success: true, message: 'ลบข้อมูลกล่องสำเร็จ' });
  } catch (error) { res.status(500).json({ success: false, message: 'ไม่สามารถลบได้' }); }
});

app.get('/api/box/patch-sizes', async (req, res) => {
  try {
    // ข้อมูลกล่องทั้งหมดที่เราเพิ่งแกะกันมา
    const boxData = [
      { desc: "540 x 570 x 140 mm", w: 540, l: 570, h: 140 },
      { desc: "610 x 1030 x 120 mm.", w: 610, l: 1030, h: 120 },
      { desc: "880 x 550 x 360mm with Cover", w: 550, l: 880, h: 360 },
      { desc: "BOX + PARTITION L120xW80xH50 Cm.", w: 800, l: 1200, h: 500 },
      { desc: "BOX and Foam  size 600x920x1240 mm", w: 600, l: 920, h: 1240 },
      { desc: "Box-Partition 14\"x12.3\"x4.25\"", w: 312, l: 356, h: 108 },
      { desc: "Cardboard box 20x20x12 Inch+Partition20", w: 508, l: 508, h: 305 },
      { desc: "CARTON BOX (ID) L1015xW790xH370 mm.", w: 790, l: 1015, h: 370 },
      { desc: "CARTON BOX (ID) L1085xW923xH430 mm.", w: 923, l: 1085, h: 430 },
      { desc: "CARTON BOX (ID) L1195xW1085xH555 mm.", w: 1085, l: 1195, h: 555 },
      { desc: "CARTON BOX (ID) L1238xW518xH565 mm.", w: 518, l: 1238, h: 565 },
      { desc: "CARTON BOX (ID) L1304xW1155xH665 mm.", w: 1155, l: 1304, h: 665 },
      { desc: "CARTON BOX (ID) L520xW440xH310 mm.", w: 440, l: 520, h: 310 },
      { desc: "CARTON BOX (ID) L525xW435xH300 mm.", w: 435, l: 525, h: 300 },
      { desc: "CARTON BOX (ID) L569xW553xH85 mm.", w: 553, l: 569, h: 85 },
      { desc: "CARTON BOX (ID) L693xW358xH165 mm.", w: 358, l: 693, h: 165 },
      { desc: "CARTON BOX (ID) L903xW514xH265 mm.", w: 514, l: 903, h: 265 },
      { desc: "CARTON BOX L1200xW800xH100 mm(No PTN)", w: 800, l: 1200, h: 100 },
      { desc: "CARTON BOX L1200xW800xH100 mm(Short PTN)", w: 800, l: 1200, h: 100 },
      { desc: "CARTON BOX L1200xW800xH100 mm(Long PTN)", w: 800, l: 1200, h: 100 },
      { desc: "CARTON BOX (ID.) L1200xW800xH141 mm.", w: 800, l: 1200, h: 141 },
      { desc: "CARTON BOX (ID.) L1200xW800xH340 mm.", w: 800, l: 1200, h: 340 },
      { desc: "CARTON BOX (ID.) L1400xW630xH150 mm.", w: 630, l: 1400, h: 150 },
      { desc: "CARTON BOX (ID.) L2010xW630xH150 mm.", w: 630, l: 2010, h: 150 },
      { desc: "CARTON BOX (ID.) W650xL1280xH100 mm.", w: 650, l: 1280, h: 100 },
      { desc: "CARTON BOX (OD.) 450x445x200 mm.", w: 445, l: 450, h: 200 },
      { desc: "CARTON BOX (OD.) L1650xW750xH150 mm.", w: 750, l: 1650, h: 150 },
      { desc: "Carton Box 390x310x130mm. with Cover", w: 310, l: 390, h: 130 },
      { desc: "Carton Box 426x403x199mm.", w: 403, l: 426, h: 199 },
      { desc: "Carton Box 600x360x310mm.", w: 360, l: 600, h: 310 },
      { desc: "CARTON BOX AMT 1210x740x660 mm.", w: 740, l: 1210, h: 660 },
      { desc: "CARTON BOX AMT 1310x805x770 mm.", w: 805, l: 1310, h: 770 },
      { desc: "CARTON BOX AMT 710x740x325 mm.", w: 710, l: 740, h: 325 },
      { desc: "CARTON BOX AMT 910x740x515 mm.", w: 740, l: 910, h: 515 },
      { desc: "CARTON BOX L540xW440xH310 mm.", w: 440, l: 540, h: 310 },
      { desc: "CARTON BOX MC165 L1200xW800xH141 mm.", w: 800, l: 1200, h: 141 },
      { desc: "Carton Box PAD 1112 x 555 x 108 mm", w: 555, l: 1112, h: 108 },
      { desc: "CARTON-BOX-F-600*600*200 mm.", w: 600, l: 600, h: 200 },
      { desc: "CARTON-T2500 Kit Box", w: 0, l: 0, h: 0 },
      { desc: "Corner Board 50 x 50 x T5mm x L1000mm.", w: 50, l: 1000, h: 5 },
      { desc: "Packaging Box size 640x900x1300 mm.", w: 640, l: 900, h: 1300 },
      { desc: "PAD L520xW430 mm. (SPW20230323)", w: 430, l: 520, h: 0 },
      { desc: "Partition L520xW140 mm. (SPW20230323)", w: 140, l: 520, h: 0 },
      { desc: "SET PACKING BOX ID. W560xL875x1190 mm.", w: 560, l: 875, h: 1190 },
      { desc: "SET PACKING BOX ID. W870xL570x1230 mm.", w: 570, l: 870, h: 1230 },
      { desc: "CARTON BOX (ID.) 430 x 600 x 100 mm.", w: 430, l: 600, h: 100 },
      { desc: "CARTON BOX (ID) L365xW305xH150 mm.", w: 305, l: 365, h: 150 },
      { desc: "CARTON BOX (ID) L520xW440xH310 mm.+PTN", w: 440, l: 520, h: 310 },
      { desc: "CARTON BOX  L1000xW1000xH100 mm.", w: 1000, l: 1000, h: 100 }
    ];

    let log = [];
    let updatedCount = 0;

    for (const item of boxData) {
      // ค้นหาด้วยชื่อ Description แล้วอัปเดต "แค่ 3 ค่า" แบบเป็นตัวเลขเพียวๆ
      const result = await prisma.box.updateMany({
        where: { description: item.desc },
        data: { 
          width: item.w,    // เอา String() ออก ส่งเป็นตัวเลข
          length: item.l,   // เอา String() ออก
          height: item.h    // เอา String() ออก
        }
      });
      
      if (result.count > 0) {
        log.push(`✅ อัปเดตไซส์ของ ${item.desc} สำเร็จ`);
        updatedCount += result.count;
      }
    }

    res.json({ 
      success: true, 
      message: `อัปเดตขนาดกล่องสำเร็จทั้งหมด ${updatedCount} รายการ โดยความจุและข้อมูลเดิมไม่หาย!`, 
      details: log 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// ==========================================================================
// 🏷️ ITEMS CRUD (จัดการ Master Data สินค้า)
// ==========================================================================

app.get('/api/items', async (req, res) => {
  try {
    const items = await prisma.item.findMany({ include: { defaultBox: true }, orderBy: { itemId: 'asc' } });
    res.json({ success: true, data: items });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await prisma.item.findUnique({ where: { itemId: req.params.id }, include: { defaultBox: true } });
    if (!item) return res.status(404).json({ success: false, message: 'ไม่พบรหัสสินค้านี้ในระบบ' });
    res.json({ success: true, data: item });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.post('/api/items/upload', upload.array('files', 10), async (req, res) => {
  try {
    let allRawData = [];
    for (const file of req.files) {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      workbook.SheetNames.forEach(sheetName => {
        allRawData = allRawData.concat(xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]));
      });
    }

    let successCount = 0;
    for (const row of allRawData) {
      const rawItemCode = row['itemId'] || row['ItemId'] || row['itemid'] || row['Item'] || row['รหัสสินค้า'] || '';
      const itemCode = String(rawItemCode).toUpperCase().trim();

      if (itemCode) {
        const updateData = {};
        const rawName = row['Description'] || row['ชื่อสินค้า'] || row['itemName'] || itemCode;
        updateData.itemName = String(rawName).trim();

        const rawSupplier = row['Product Code'] || row['ซัพพลายเออร์'] || row['supplier'] || row['Customer'];
        if (rawSupplier !== undefined) updateData.supplier = String(rawSupplier).trim();

        const rawWeight = row['Unit Weight'] || row['น้ำหนัก'] || row['itemWeight'];
        if (rawWeight !== undefined) updateData.itemWeight = parseFloat(rawWeight) || 0;

        const rawBox = row['Box ID'] || row['รหัสกล่อง'] || row['defaultPckId'] || row['pckId'];
        if (rawBox !== undefined && String(rawBox).trim() !== '') {
          updateData.defaultBox = { connect: { pckId: String(rawBox).toUpperCase().trim() } };
        }

        const rawStdPack = row['stdPackQty'] || row['Std Pack'] || row['จำนวนจุต่อกล่อง'];
        if (rawStdPack !== undefined) updateData.stdPackQty = parseInt(rawStdPack, 10) || 1;

        const rawBoxesPerUnit = row['boxesPerUnit'] || row['จำนวนกล่อง/ชิ้น'];
        if (rawBoxesPerUnit !== undefined) updateData.boxesPerUnit = parseInt(rawBoxesPerUnit, 10) || 1;

        const existingItem = await prisma.item.findUnique({ where: { itemId: itemCode } });
        if (existingItem) {
          await prisma.item.update({ where: { itemId: itemCode }, data: updateData });
        } else {
          await prisma.item.create({ data: { itemId: itemCode, ...updateData } });
        }
        successCount++;
      }
    }
    res.json({ success: true, message: `✅ อัปเดตสินค้าสำเร็จ ${successCount} รายการ` });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.put('/api/items/:id', async (req, res) => {
  try {
    const updatedItem = await prisma.item.update({
      where: { itemId: req.params.id },
      data: {
        itemName: req.body.itemName,
        supplier: req.body.supplier,
        itemWeight: Number(req.body.itemWeight) || 0,
        defaultPckId: req.body.defaultPckId || null,
        stdPackQty: Number(req.body.stdPackQty) || 1
      }
    });
    res.json({ success: true, data: updatedItem, message: 'อัปเดตข้อมูลสินค้าสำเร็จ' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    await prisma.item.delete({ where: { itemId: req.params.id } });
    res.json({ success: true, message: 'ลบข้อมูลสินค้าสำเร็จ' });
  } catch (error) { res.status(500).json({ success: false, message: 'ไม่สามารถลบได้' }); }
});

// ==========================================================================
// 👤 USER MANAGEMENT & AUTH (จัดการพนักงานและการล็อกอิน)
// ==========================================================================

app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, firstName: true, role: true },
      orderBy: { id: 'asc' }
    });
    res.json({ success: true, data: users });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, password, passwordHash, firstName, role } = req.body;
    const cleanUsername = String(username).toUpperCase().trim();
    const rawPassword = password || passwordHash;

    if (!rawPassword) return res.status(400).json({ success: false, message: '❌ ไม่พบข้อมูลรหัสผ่าน' });
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    await prisma.user.create({
      data: { username: cleanUsername, passwordHash: hashedPassword, firstName, role: role === 'admin' ? 'Admin' : 'Operator' }
    });
    res.json({ success: true, message: '✅ เพิ่มพนักงานใหม่สำเร็จ' });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: '❌ รหัสพนักงานนี้มีอยู่ในระบบแล้ว' });
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { username, password, passwordHash, firstName, role } = req.body;
    const updateData = { username: String(username).toUpperCase().trim(), firstName, role: role === 'admin' ? 'Admin' : 'Operator' };
    const rawPassword = password || passwordHash;

    if (rawPassword && String(rawPassword).trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(rawPassword, 10);
    }

    await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: updateData });
    res.json({ success: true, message: '✅ อัปเดตข้อมูลพนักงานสำเร็จ' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: '✅ ลบพนักงานสำเร็จ' });
  } catch (error) { res.status(500).json({ success: false, message: 'ไม่สามารถลบได้' }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username: String(username).toUpperCase().trim() } });
    if (!user) return res.status(401).json({ success: false, message: '❌ ไม่พบรหัสพนักงานนี้' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ success: false, message: '❌ รหัสผ่านไม่ถูกต้อง' });

    res.json({ success: true, user: { id: user.id, username: user.username, firstName: user.firstName, role: user.role } });
  } catch (error) { res.status(500).json({ success: false, message: 'ระบบขัดข้อง' }); }
});

// ==========================================================================
// 📝 TRANSACTION LOGS & REPORTS (ประวัติการทำงานและออกรายงาน)
// ==========================================================================

app.post('/api/pack', async (req, res) => {
  try {
    const { userId, itemId, packQty, boxUsed, totalWeight, boxId } = req.body;
    await prisma.packingLog.create({ data: { userId, itemId, packQty, boxUsed, totalWeight } });

    if (boxUsed > 0 && boxId) {
      await prisma.box.update({ where: { pckId: boxId }, data: { currentStock: { decrement: boxUsed } } });
    }
    res.status(201).json({ success: true, message: '✅ บันทึกและตัดสต็อกสำเร็จ!' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.get('/api/logs', async (req, res) => {
  try {
    const logs = await prisma.packingLog.findMany({ include: { item: true, user: true }, orderBy: { packedAt: 'desc' } });
    res.json({ success: true, data: logs });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.delete('/api/logs/:id', async (req, res) => {
  try {
    await prisma.packingLog.delete({ where: { logId: parseInt(req.params.id) } });
    res.json({ success: true, message: '✅ ลบประวัติสำเร็จ!' });
  } catch (error) { res.status(500).json({ success: false, message: 'ไม่สามารถลบได้' }); }
});

app.post('/api/reports', async (req, res) => {
  try {
    const { operator, totalOrders, totalBoxes, data } = req.body;
    await prisma.report.create({ data: { operator, totalOrders, totalBoxes, data: JSON.stringify(data) } });
    res.json({ success: true, message: '✅ บันทึกรายงานสำเร็จ' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.get('/api/reports', async (req, res) => {
  try {
    const reports = await prisma.report.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    res.json({ success: true, reports });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ==========================================================================
// 🚀 START SERVER
// ==========================================================================
app.listen(PORT, () => {
  console.log(`🚀 Zenix Backend รันพร้อมแล้วที่พอร์ต ${PORT}`);
});
