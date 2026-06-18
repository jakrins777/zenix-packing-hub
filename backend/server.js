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
app.post('/api/pallet/calculate', async (req, res) => {
  try {
    const { palletId, shipmentItems } = req.body;

    if (!palletId) return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสพาเลทที่ใช้' });
    if (!shipmentItems || shipmentItems.length === 0) return res.status(400).json({ success: false, message: 'ไม่พบข้อมูลสินค้า' });

    // ดึงข้อมูลขนาดของพาเลทจากฐานข้อมูลแบบไดนามิก
    const palletSpec = await prisma.pallet.findUnique({ where: { palletId } });
    if (!palletSpec) return res.status(404).json({ success: false, message: 'ไม่พบสเปกพาเลทรหัสนี้ในระบบ' });

    const PALLET_WIDTH = palletSpec.width;
    const PALLET_LENGTH = palletSpec.length;
    const PALLET_MAX_HEIGHT = palletSpec.maxHeight; // เช่น 1500 mm (150 cm)
    const PALLET_BASE_THICKNESS = palletSpec.baseThickness; // ความสูงคานพาเลทเปล่า

    // ความสูงสุทธิที่เหลือให้วางซ้อนกล่องสินค้าได้จริง
    const USABLE_HEIGHT = PALLET_MAX_HEIGHT - PALLET_BASE_THICKNESS;
    const MAX_WEIGHT_CAPACITY = palletSpec.maxWeight;

    const palletBin = new Bin(palletSpec.palletId, PALLET_WIDTH, PALLET_LENGTH, USABLE_HEIGHT, MAX_WEIGHT_CAPACITY);
    const packer = new Packer();
    packer.addBin(palletBin);

    // วนลูปเตรียมกล่องสินค้าเข้าสู่ระบบคำนวณ
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

      // แตกจำนวนกล่องออกเป็นใบเดี่ยวๆ เพื่อคำนวณพิกัดทีละชิ้น แบบ Free Rotation
      for (let i = 0; i < totalBoxesNeeded; i++) {
        packer.addItem(new Item(`${itemData.itemId}-BOX-${i + 1}`, w, l, h, unitWeight));
      }
    }

    // ประมวลผลจัดวางพื้นที่ 3 มิติ
    // ประมวลผลจัดวางพื้นที่ 3 มิติ
    packer.pack();

    const packedResults = palletBin.items.map(packedItem => ({
      boxId: packedItem.name,
      position: { x: packedItem.position[0], y: packedItem.position[1], z: packedItem.position[2] },
      dimensions: { width: packedItem.width, length: packedItem.depth, height: packedItem.height },
      weight: packedItem.weight
    }));

    // ✅ แก้ไขบั๊กตรงนี้: เปลี่ยนจาก palletBin.unfittedItems เป็น packer.unfitItems
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