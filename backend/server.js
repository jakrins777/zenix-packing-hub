const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const bcrypt = require('bcrypt');
const multer = require('multer');
const xlsx = require('xlsx');

const upload = multer({ storage: multer.memoryStorage() });
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

BigInt.prototype.toJSON = function () {
  return this.toString();
};

app.use(cors());
app.use(express.json());

// เช็คสถานะ API
app.get('/', (req, res) => {
  res.send('🟢 Zenix API Server is Running!');
});

// ==========================================
// 📦 BOXES CRUD (จัดการ Master Data กล่อง)
// ==========================================

// [READ] ดึงข้อมูลกล่องทั้งหมด
app.get('/api/boxes', async (req, res) => {
  try {
    const boxes = await prisma.box.findMany({
      orderBy: { pckId: 'asc' } // เรียงตามรหัสกล่อง
    });
    res.json({ success: true, data: boxes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 📥 API นำเข้าข้อมูลกล่องผ่าน Excel (รองรับจำนวนสต็อก)
app.post('/api/boxes/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์ Excel หรือ CSV' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    let allRawData = [];

    workbook.SheetNames.forEach(sheetName => {
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      allRawData = allRawData.concat(sheetData);
    });

    let successCount = 0;

    for (const row of allRawData) {
      const id = String(row['Item'] || row['รหัสกล่อง'] || row.pckId || '').toUpperCase().trim();
      
      if (id) {
        const desc = String(row['Description'] || row['คำอธิบาย'] || row.description || '-');
        const cap = parseInt(row['Lot Size'] || row['ความจุสูงสุด'] || row.maxCapacity || 1, 10);
        
        // 🌟 ดึงข้อมูลสต็อก และ จุดแจ้งเตือนสั่งซื้อจาก Excel
        const stock = parseInt(row['Current Stock'] || row['จำนวนกล่อง'] || row['สต็อก'] || row.currentStock || 0, 10);
        const minStock = parseInt(row['Min Stock'] || row['จุดสั่งซื้อ'] || row.minStockLevel || 0, 10);

        await prisma.box.upsert({
          where: { pckId: id },
          update: {
            description: desc,
            maxCapacity: cap,
            currentStock: stock,     // อัปเดตสต็อกถ้ามีกล่องอยู่แล้ว
            minStockLevel: minStock
          },
          create: {
            pckId: id,
            description: desc,
            maxCapacity: cap,
            currentStock: stock,
            minStockLevel: minStock
          }
        });
        successCount++;
      }
    }

    res.json({ success: true, message: `✅ นำเข้าข้อมูลกล่องและสต็อกสำเร็จ ${successCount} รายการ` });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'รูปแบบไฟล์ไม่ถูกต้อง หรือ ' + error.message }); 
  }
});

// 🌟 แถม: อัปเดตตอนสร้างกล่องใหม่แบบพิมพ์เอง ให้รองรับสต็อกด้วย
// 📥 API นำเข้าข้อมูลกล่องผ่าน Excel (รองรับอัปโหลดหลายไฟล์พร้อมกัน)
app.post('/api/boxes/upload', upload.array('files', 10), async (req, res) => {
  // สังเกต ☝️ เปลี่ยนเป็น upload.array('files', 10) หมายถึงรับได้สูงสุด 10 ไฟล์พร้อมกัน
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์ Excel อย่างน้อย 1 ไฟล์' });
    }

    let allRawData = [];

    // 🌟 วนลูปอ่านไฟล์ทุกไฟล์ที่ถูกอัปโหลดเข้ามา
    for (const file of req.files) {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      workbook.SheetNames.forEach(sheetName => {
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        allRawData = allRawData.concat(sheetData); // เอาข้อมูลมาต่อกันเรื่อยๆ
      });
    }

    let successCount = 0;

    // 🌟 วนลูปบันทึกข้อมูลทั้งหมดลงฐานข้อมูล (โค้ดเดิม)
    for (const row of allRawData) {
      const rawId = String(row['Item'] || row['รหัสกล่อง'] || row.pckId || '').toUpperCase().trim();
      
      if (rawId && rawId !== 'NAN' && rawId !== 'UNDEFINED') {
        const desc = String(row['ชื่ออุปกรณ์-เบอร์กล่อง'] || row['Description'] || row['description'] || '-');
        const cap = parseInt(row['Max_Capacity'] || row['Lot Size'] || row.maxCapacity || 1, 10);
        const stock = parseInt(row['คงเหลือ'] || row['Current Stock'] || row.currentStock || 0, 10);
        const minStock = 5; 

        await prisma.box.upsert({
          where: { pckId: rawId },
          update: { description: desc, maxCapacity: cap, currentStock: stock, minStockLevel: minStock },
          create: { pckId: rawId, description: desc, maxCapacity: cap, currentStock: stock, minStockLevel: minStock }
        });
        successCount++;
      }
    }

    res.json({ success: true, message: `✅ นำเข้าข้อมูลกล่องสำเร็จรวม ${successCount} รายการ จาก ${req.files.length} ไฟล์` });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'รูปแบบไฟล์ไม่ถูกต้อง หรือ ' + error.message }); 
  }
});

// ตัวอย่างตอน PUT (แก้ไขกล่อง)
app.put('/api/boxes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, maxCapacity, currentStock, minStockLevel } = req.body; // 🌟 รับค่าเพิ่ม
    await prisma.box.update({
      where: { pckId: id },
      data: { 
        description, 
        maxCapacity: parseInt(maxCapacity, 10),
        currentStock: parseInt(currentStock || 0, 10),     // 🌟 อัปเดตสต็อก
        minStockLevel: parseInt(minStockLevel || 0, 10)  // 🌟 อัปเดตจุดแจ้งเตือน
      }
    });
    res.json({ success: true, message: '✅ อัปเดตข้อมูลกล่องและสต็อกสำเร็จ' });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'ระบบขัดข้อง: ' + error.message }); 
  }
});

// [DELETE] ลบข้อมูลกล่อง
app.delete('/api/boxes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.box.delete({ where: { pckId: id } });
    res.json({ success: true, message: 'ลบข้อมูลกล่องสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'ไม่สามารถลบได้ (อาจมีสินค้าระบุใช้กล่องไซส์นี้อยู่)' });
  }
});

// ==========================================
// 🏷️ ITEMS CRUD (จัดการ Master Data สินค้า)
// ==========================================

// [READ] ดึงข้อมูลสินค้าทั้งหมด (พร้อมแสดงข้อมูลกล่องที่ผูกไว้)
app.get('/api/items', async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      include: { defaultBox: true },
      orderBy: { itemId: 'asc' }
    });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// [READ ONE] ดึงข้อมูลสินค้า 1 ชิ้น (ใช้สำหรับตอนสแกนบาร์โค้ด)
app.get('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.item.findUnique({
      where: { itemId: id },
      include: { defaultBox: true } 
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'ไม่พบรหัสสินค้านี้ในระบบ' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 📥 API นำเข้าข้อมูลสินค้าผ่าน Excel (รองรับอัปโหลดหลายไฟล์พร้อมกัน)
app.post('/api/items/upload', upload.array('files', 10), async (req, res) => {
  // ☝️ เปลี่ยนเป็น upload.array รับได้สูงสุด 10 ไฟล์
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณาอัปโหลดไฟล์อย่างน้อย 1 ไฟล์' });
    }

    let allRawData = [];

    // 🌟 วนลูปอ่านทุกไฟล์ที่ถูกอัปโหลดเข้ามา
    for (const file of req.files) {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      // อ่านข้อมูลจากทุกชีทในไฟล์
      workbook.SheetNames.forEach(sheetName => {
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        allRawData = allRawData.concat(sheetData);
      });
    }

    let successCount = 0;

    // 🌟 วนลูปบันทึกข้อมูลลงฐานข้อมูล
    for (const row of allRawData) {
      // ดึงข้อมูลและตัดช่องว่าง
      const itemCode = String(row['Item'] || row['รหัสสินค้า'] || row['itemId'] || '').toUpperCase().trim();
      
      // ถ้ามีรหัสสินค้า และไม่ใช่ขยะที่เกิดจากช่องว่างใน Excel
      if (itemCode && itemCode !== 'NAN' && itemCode !== 'UNDEFINED') {
        
        const itemName = String(row['Description'] || row['ชื่อสินค้า'] || row['itemName'] || '').trim();
        const customer = String(row['Product Code'] || row['ซัพพลายเออร์'] || row['supplier'] || '-').trim();
        const boxId = String(row['Box ID'] || row['รหัสกล่อง'] || row['defaultPckId'] || '').toUpperCase().trim();
        const unitWeight = String(row['Unit Weight'] || row['น้ำหนัก'] || row['itemWeight'] || '').trim();

        const parsedWeight = parseFloat(unitWeight) || 0;
        const finalBoxId = (boxId !== '' && boxId !== 'NAN') ? boxId : null;

        await prisma.item.upsert({
          where: { itemId: itemCode },
          update: { 
            itemName: itemName || undefined, 
            supplier: customer !== '-' ? customer : undefined,
            itemWeight: parsedWeight > 0 ? parsedWeight : undefined,
            defaultPckId: finalBoxId 
          },
          create: { 
            itemId: itemCode, 
            itemName: itemName || 'ไม่ระบุชื่อสินค้า', 
            supplier: customer,
            itemWeight: parsedWeight,
            requireDesiccant: false, // ค่าเริ่มต้น
            defaultPckId: finalBoxId 
          }
        });
        successCount++;
      }
    }

    res.json({ success: true, message: `✅ อัปโหลดและอัปเดตสำเร็จ ${successCount} รายการ จาก ${req.files.length} ไฟล์` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'ระบบขัดข้อง: ' + error.message });
  }
});

// [UPDATE] แก้ไขข้อมูลสินค้า
app.put('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // แปลงค่า requireDesiccant ให้ชัวร์ว่าถ้าเป็น "false" หรือ "0" จะได้ค่า false จริงๆ
    const isDesiccantRequired = 
      req.body.requireDesiccant === true || 
      req.body.requireDesiccant === 'true' || 
      req.body.requireDesiccant === 1 || 
      req.body.requireDesiccant === '1';

    const updatedItem = await prisma.item.update({
      where: { itemId: id }, // อ้างอิง itemId ตรงตาม schema
      data: {
        itemName: req.body.itemName,
        supplier: req.body.supplier,
        itemWeight: Number(req.body.itemWeight) || 0,
        requireDesiccant: isDesiccantRequired, // ใช้ค่าที่แปลงแล้ว
        defaultPckId: req.body.defaultPckId || null
      }
    });
    
    res.json({ success: true, data: updatedItem, message: 'อัปเดตข้อมูลสินค้าสำเร็จ' });
  } catch (error) {
    console.error("Update Item Error:", error); // แนะนำให้ log error ไว้ดูใน Terminal ด้วยครับ
    res.status(500).json({ success: false, message: error.message });
  }
});

// [DELETE] ลบข้อมูลสินค้า
app.delete('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.item.delete({ where: { itemId: id } });
    res.json({ success: true, message: 'ลบข้อมูลสินค้าสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'ไม่สามารถลบได้ (เนื่องจากสินค้านี้มีประวัติการแพ็คถูกบันทึกไปแล้ว)' });
  }
});

// ==========================================
// 📁 BULK UPLOAD (ระบบอัปโหลด Excel)
// ==========================================

// ฟังก์ชันช่วยแปลงคำไทย/อังกฤษ ให้เป็น Boolean
const parseDesiccant = (val) => {
  if (!val) return false;
  const str = String(val).toLowerCase().trim();
  return str === 'true' || str === '1' || str === 'yes' || str === 'มี' || str === 'ใส่';
};

// 📥 API นำเข้าข้อมูลสินค้าผ่าน Excel (รองรับการผูกกล่องอัตโนมัติ)
app.post('/api/items/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'กรุณาอัปโหลดไฟล์' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log("📦 ข้อมูลบรรทัดแรกที่อ่านได้จาก Excel:", data[0]); 

    let successCount = 0;

    for (const row of data) {
// 🌟 ดึงข้อมูลจากคอลัมน์ Excel (รองรับทั้งชื่อเก่าและชื่อใหม่ที่ตรงกับ DB)
      const itemCode = String(row['Item'] || row['รหัสสินค้า'] || row['itemId'] || '').toUpperCase().trim();
      const itemName = String(row['Description'] || row['ชื่อสินค้า'] || row['itemName'] || '').trim();
      const customer = String(row['Product Code'] || row['ซัพพลายเออร์'] || row['supplier'] || '-').trim();
      
      // ดึงรหัสกล่อง
      const boxId = String(row['Box ID'] || row['รหัสกล่อง'] || row['defaultPckId'] || '').toUpperCase().trim();
      
      // ดึงน้ำหนัก
      const unitWeight = String(row['Unit Weight'] || row['น้ำหนัก'] || row['itemWeight'] || '').trim();

      if (itemCode) { // ถ้าเจอรหัสสินค้า ค่อยบันทึกลงฐานข้อมูล
        const parsedWeight = parseFloat(unitWeight) || 0;
        const finalBoxId = boxId !== '' ? boxId : null;

        await prisma.item.upsert({
          where: { itemId: itemCode },
          update: { 
            itemName: itemName || undefined, 
            supplier: customer !== '-' ? customer : undefined,
            itemWeight: parsedWeight > 0 ? parsedWeight : undefined,
            defaultPckId: finalBoxId 
          },
          create: { 
            itemId: itemCode, 
            itemName: itemName || 'ไม่ระบุชื่อสินค้า', 
            supplier: customer,
            itemWeight: parsedWeight,
            requireDesiccant: false, 
            defaultPckId: finalBoxId 
          }
        });
        successCount++;
      }
    }
    res.json({ success: true, message: `✅ อัปโหลดและอัปเดตสำเร็จ ${successCount} รายการ` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'ระบบขัดข้อง: ' + error.message });
  }
});

// 📥 API นำเข้าข้อมูลกล่องผ่าน Excel
app.post('/api/boxes/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์ Excel หรือ CSV' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    let allRawData = [];

    workbook.SheetNames.forEach(sheetName => {
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      allRawData = allRawData.concat(sheetData);
    });

    const boxesToInsert = allRawData.map(row => {
      const id = String(row['Item'] || row['รหัสกล่อง'] || row.pckId || '').toUpperCase().trim();
      return {
        pckId: id,
        description: String(row['Description'] || row['คำอธิบาย'] || row.description || '-'),
        maxCapacity: parseInt(row['Lot Size'] || row['ความจุสูงสุด'] || row.maxCapacity || 1, 10),
      };
    }).filter(box => box.pckId);

    const uniqueBoxesMap = new Map();
    boxesToInsert.forEach(box => {
      uniqueBoxesMap.set(box.pckId, box); 
    });
    const finalUniqueBoxes = Array.from(uniqueBoxesMap.values());

    const result = await prisma.box.createMany({ 
      data: finalUniqueBoxes, 
      skipDuplicates: true 
    });

    res.json({ success: true, message: `✅ นำเข้าข้อมูลกล่องสำเร็จ ${result.count} รายการ` });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'รูปแบบไฟล์ไม่ถูกต้อง หรือ ' + error.message }); 
  }
});

// ==========================================
// 📝 TRANSACTION (บันทึกประวัติหน้างาน)
// ==========================================

// บันทึกประวัติการแพ็ค
app.post('/api/pack', async (req, res) => {
  try {
    const { userId, itemId, packQty, boxUsed, totalWeight, boxId } = req.body; // 🌟 รับ boxId มาด้วย
    
    // 1. บันทึกประวัติ
    const newLog = await prisma.packingLog.create({
      data: { userId, itemId, packQty, boxUsed, totalWeight }
    });

    // 🌟 2. หักยอดสต็อกกล่องอัตโนมัติ (ถ้ามีการใช้กล่อง)
    if (boxUsed > 0 && boxId) {
      await prisma.box.update({
        where: { pckId: boxId },
        data: { currentStock: { decrement: boxUsed } } // หักลบตามจำนวนกล่องที่เบิกไป
      });
    }
    
    res.status(201).json({ success: true, message: '✅ บันทึกและตัดสต็อกสำเร็จ!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// [READ] ดึงข้อมูลประวัติการแพ็ค (Dashboard)
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await prisma.packingLog.findMany({
      include: {
        item: true, 
        user: true  
      },
      orderBy: { packedAt: 'desc' }, 
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// [DELETE] ลบประวัติการแพ็คสินค้า
app.delete('/api/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.packingLog.delete({ 
      where: { logId: parseInt(id) } 
    });
    res.json({ success: true, message: '✅ ลบประวัติสำเร็จ!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'ไม่สามารถลบได้: ' + error.message });
  }
});

// ==========================================
// 🔐 API เข้าสู่ระบบ (Login)
// ==========================================
app.post('/api/login', async (req, res) => {
  try {
    const { username, passwordHash } = req.body;
    const cleanUsername = String(username).toUpperCase().trim();

    const user = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'ไม่พบรหัสพนักงานนี้ในระบบ' });
    }

    let isMatch = false;

    // เทียบรหัสผ่านแบบเข้ารหัสด้วย Bcrypt
    isMatch = await bcrypt.compare(passwordHash, user.passwordHash);

    // ถ้าระบบเดิมยังไม่ได้เข้ารหัส (Plaintext) ให้เทียบตรงๆ ก่อน 
    if (!isMatch && passwordHash === user.passwordHash) {
      isMatch = true;
      const hashedPassword = await bcrypt.hash(passwordHash, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword }
      });
      console.log(`🔄 อัปเดตรหัสผ่านของ ${cleanUsername} ให้ปลอดภัยเรียบร้อย!`);
    }

    if (isMatch) {
      res.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ', user: { id: user.id, username: user.username, firstName: user.firstName, role: user.role } });
    } else {
      res.status(401).json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
    }

  } catch (error) {
    res.status(500).json({ success: false, message: 'ระบบขัดข้อง: ' + error.message });
  }
});

// ==========================================
// 👤 API สำหรับจัดการพนักงาน (User Management)
// ==========================================
// ==========================================
// 👤 API สำหรับจัดการพนักงาน (User Management)
// ==========================================

// 🌟 [GET] ดึงข้อมูลพนักงานทั้งหมด (API ที่หายไป)
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      // 💡 เลือกดึงมาเฉพาะข้อมูลที่จำเป็น (ไม่ดึงรหัสผ่านที่เข้ารหัสแล้วออกไปหน้าบ้าน เพื่อความปลอดภัย)
      select: {
        id: true,
        username: true,
        firstName: true,
        role: true
      },
      orderBy: { id: 'asc' }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// [POST] เพิ่มพนักงานใหม่
app.post('/api/users', async (req, res) => {
  try {
    const { username, passwordHash, firstName, role } = req.body;
    const cleanUsername = String(username).toUpperCase().trim();
    const cleanRole = role === 'admin' ? 'Admin' : 'Operator';

    const hashedPassword = await bcrypt.hash(passwordHash, 10);

    await prisma.user.create({
      data: { 
        username: cleanUsername, 
        passwordHash: hashedPassword, 
        firstName: firstName, 
        role: cleanRole 
      }
    });
    res.json({ success: true, message: '✅ เพิ่มพนักงานใหม่สำเร็จ' });
  } catch (error) { 
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: '❌ รหัสพนักงานนี้มีอยู่ในระบบแล้ว' });
    res.status(500).json({ success: false, message: 'ระบบขัดข้อง: ' + error.message }); 
  }
});

// [PUT] แก้ไขข้อมูลพนักงาน
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, passwordHash, firstName, role } = req.body;
    const cleanUsername = String(username).toUpperCase().trim();
    const cleanRole = role === 'admin' ? 'Admin' : 'Operator';
    
    const updateData = { username: cleanUsername, firstName: firstName, role: cleanRole };
    
    if (passwordHash && passwordHash.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(passwordHash, 10); 
    }

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    res.json({ success: true, message: '✅ อัปเดตข้อมูลพนักงานสำเร็จ' });
  } catch (error) { 
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: '❌ รหัสพนักงานนี้มีคนใช้แล้ว' });
    res.status(500).json({ success: false, message: 'ระบบขัดข้อง: ' + error.message }); 
  }
});

// [DELETE] ลบพนักงาน
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: '✅ ลบพนักงานสำเร็จ' });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'ไม่สามารถลบได้ เนื่องจากพนักงานคนนี้มีประวัติการแพ็คสินค้าอยู่ในระบบ' }); 
  }
});

// ==========================================
// 📝 TRANSACTION (บันทึกประวัติหน้างาน)
// ==========================================

// 🌟 [GET] ดึงข้อมูลประวัติการแพ็ค 
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await prisma.packingLog.findMany({
      include: {
        item: true, // ดึงข้อมูลสินค้ามาด้วย
        user: true  // ดึงข้อมูลพนักงานคนแพ็คมาด้วย
      },
      orderBy: { packedAt: 'desc' }, // เรียงประวัติจากล่าสุดไปเก่า
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 🌟 [DELETE] ลบประวัติการแพ็ค 
app.delete('/api/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.packingLog.delete({ 
      where: { logId: parseInt(id) } 
    });
    res.json({ success: true, message: '✅ ลบประวัติสำเร็จ!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'ไม่สามารถลบได้: ' + error.message });
  }
});

// [POST] บันทึกรายงานรอบการทำงาน
app.post('/api/reports', async (req, res) => {
  try {
    const { operator, totalOrders, totalBoxes, data } = req.body;
    await prisma.report.create({
      data: {
        operator,
        totalOrders,
        totalBoxes,
        data: JSON.stringify(data) 
      }
    });
    res.json({ success: true, message: '✅ บันทึกรายงานสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'ระบบขัดข้อง: ' + error.message });
  }
});

// [GET] ดึงประวัติรายงาน
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' }, 
      take: 50 
    });
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'ระบบขัดข้อง: ' + error.message });
  }
});

// ==========================================
// สั่งเปิดเซิร์ฟเวอร์
app.listen(PORT, () => {
  console.log(`🚀 Zenix Backend รันพร้อมแล้วที่ http://localhost:${PORT}`);
});