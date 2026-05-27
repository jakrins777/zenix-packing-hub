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

// [CREATE] เพิ่มข้อมูลกล่องใหม่
// [POST] เพิ่มกล่อง
app.post('/api/boxes', async (req, res) => {
  try {
    const { pckId, description, maxCapacity } = req.body;
    await prisma.box.create({
      data: { 
        pckId: pckId.toUpperCase(), 
        description, 
        // 🌟 ครอบ parseInt เพื่อแปลงข้อความเป็นตัวเลข (ฐาน 10)
        maxCapacity: parseInt(maxCapacity, 10) 
      }
    });
    res.json({ success: true, message: '✅ เพิ่มกล่องสำเร็จ' });
  } catch (error) { 
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'รหัสกล่องนี้มีอยู่แล้ว' });
    res.status(500).json({ success: false, message: 'ระบบขัดข้อง: ' + error.message }); 
  }
});

// [PUT] แก้ไขข้อมูลกล่อง
app.put('/api/boxes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, maxCapacity } = req.body;
    await prisma.box.update({
      where: { pckId: id },
      data: { 
        description, 
        // 🌟 ครอบ parseInt ตรงนี้ด้วยเช่นกัน
        maxCapacity: parseInt(maxCapacity, 10) 
      }
    });
    res.json({ success: true, message: '✅ อัปเดตข้อมูลกล่องสำเร็จ' });
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
    // ดัก Error เผื่อว่ากล่องนี้ถูกผูกเป็นค่าเริ่มต้นให้สินค้าไปแล้ว จะห้ามลบ
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

// [CREATE] เพิ่มข้อมูลสินค้าใหม่
app.post('/api/items', async (req, res) => {
  try {
    const newItem = await prisma.item.create({ 
      data: {
        itemId: req.body.itemId,
        itemName: req.body.itemName,
        supplier: String(row['Customer'] || row['ลูกค้า'] || row['Product Code'] || row.supplier || '-'),
        itemWeight: Number(req.body.itemWeight),
        requireDesiccant: Boolean(req.body.requireDesiccant), // <--- อัปเดตตรงนี้
        defaultPckId: req.body.defaultPckId || null
      } 
    });
    res.status(201).json({ success: true, data: newItem, message: 'เพิ่มสินค้าใหม่สำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: รหัสสินค้าอาจซ้ำกัน' });
  }
});

// [UPDATE] แก้ไขข้อมูลสินค้า
app.put('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedItem = await prisma.item.update({
      where: { itemId: id },
      data: {
        itemName: req.body.itemName,
        supplier: req.body.supplier,
        itemWeight: Number(req.body.itemWeight),
        requireDesiccant: Boolean(req.body.requireDesiccant), // <--- อัปเดตตรงนี้
        defaultPckId: req.body.defaultPckId || null
      }
    });
    res.json({ success: true, data: updatedItem, message: 'อัปเดตข้อมูลสินค้าสำเร็จ' });
  } catch (error) {
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

// ฟังก์ชันช่วยแปลงคำไทย/อังกฤษ ให้เป็น Boolean (แก้ปัญหาเรื่องซองกันชื้น)
const parseDesiccant = (val) => {
  if (!val) return false; // ถ้าปล่อยว่าง ถือว่าไม่ใส่
  const str = String(val).toLowerCase().trim();
  // ถ้าเจอคำเหล่านี้ ถือว่า "ต้องใส่" นอกนั้นถือว่า "ไม่ใส่" ทั้งหมด
  return str === 'true' || str === '1' || str === 'yes' || str === 'มี' || str === 'ใส่';
};


// [POST] 1. อัปโหลด Excel/CSV เพื่อเพิ่ม "สินค้า" (รองรับไฟล์จาก Infor CSI)
app.post('/api/items/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์ Excel หรือ CSV' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    let allRawData = [];

    workbook.SheetNames.forEach(sheetName => {
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      allRawData = allRawData.concat(sheetData);
    });

    const itemsToInsert = allRawData.map(row => {
      const id = String(row['Item'] || row['รหัสสินค้า'] || row.itemId || '').toUpperCase().trim();
      
      return {
        itemId: id,
        itemName: String(row['Description'] || row['ชื่อสินค้า'] || row.itemName || id),
        supplier: String(row['Product Code'] || row['MFR'] || row['Supplier'] || row.supplier || '-'), 
        itemWeight: parseFloat(row['Unit Weight'] || row['น้ำหนัก'] || row.itemWeight || 0),
        defaultPckId: row['กล่องมาตรฐาน'] || row.defaultPckId || null,
        requireDesiccant: row['กันชื้น'] === '✅' || row['กันชื้น'] === true || row['requireDesiccant'] === true || false
      };
    }).filter(item => item.itemId);

    const uniqueItemsMap = new Map();
    itemsToInsert.forEach(item => {
      uniqueItemsMap.set(item.itemId, item); 
    });
    const finalUniqueItems = Array.from(uniqueItemsMap.values());

    // 🌟 เปลี่ยนจาก createMany เป็น Upsert (Update + Insert)
    const upsertPromises = finalUniqueItems.map(item => {
      return prisma.item.upsert({
        where: { itemId: item.itemId },
        update: {
          itemName: item.itemName,
          supplier: item.supplier, // 🌟 จะอัปเดต Product Code ใหม่ให้ตรงนี้
          itemWeight: item.itemWeight,
          defaultPckId: item.defaultPckId,
          requireDesiccant: item.requireDesiccant
        },
        create: item // ถ้าไม่เคยมีสินค้านี้ ให้สร้างใหม่เลย
      });
    });

    // รันคำสั่งอัปเดต/เพิ่ม พร้อมกันทั้งหมด
    await prisma.$transaction(upsertPromises);

    res.json({ success: true, message: `✅ อัปเดต/นำเข้าข้อมูลสินค้าสำเร็จ ${finalUniqueItems.length} รายการ` });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'รูปแบบไฟล์ไม่ถูกต้อง หรือ ' + error.message }); 
  }
});

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
        // 🌟 ดึงค่าจากคอลัมน์ 'Description' ของ Infor CSI มาเป็น คำอธิบาย
        description: String(row['Description'] || row['คำอธิบาย'] || row.description || '-'),
        
        // 🌟 ความจุสูงสุด: ถ้าใน CSI ใช้คอลัมน์ไหนเก็บ สามารถแก้คำว่า 'Lot Size' เป็นชื่อคอลัมน์นั้นได้เลยครับ (ถ้าไม่มีจะใช้ค่า 1 ไปก่อน)
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

// บันทึกประวัติการแพ็ค (ทำงานตอนพนักงานกดปุ่ม Save)
app.post('/api/pack', async (req, res) => {
  try {
    const { userId, itemId, packQty, boxUsed, totalWeight } = req.body;
    
    const newLog = await prisma.packingLog.create({
      data: {
        userId: userId,
        itemId: itemId,
        packQty: packQty,
        boxUsed: boxUsed,
        totalWeight: totalWeight
      }
    });
    
    res.status(201).json({ success: true, message: '✅ บันทึกประวัติสำเร็จ!', data: newLog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// [READ] ดึงข้อมูลประวัติการแพ็ค (Dashboard)
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await prisma.packingLog.findMany({
      include: {
        item: true, // ดึงข้อมูลสินค้า (ชื่อสินค้า) ติดมาด้วย
        user: true  // ดึงข้อมูลคนแพ็คติดมาด้วย
      },
      orderBy: { packedAt: 'desc' }, // เรียงจากใหม่ล่าสุดขึ้นก่อน
      
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// [DELETE] ลบประวัติการแพ็คสินค้า (จากหน้า Dashboard)
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
    const { username, password } = req.body;
    const cleanUsername = String(username).toUpperCase().trim();

    const user = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'ไม่พบรหัสพนักงานนี้ในระบบ' });
    }

    let isMatch = false;

    // 1. ลองเทียบรหัสผ่านแบบเข้ารหัสด้วย Bcrypt
    isMatch = await bcrypt.compare(password, user.passwordHash);

    // 2. 🌟 ถ้าระบบเดิมยังไม่ได้เข้ารหัส (Plaintext) ให้เทียบตรงๆ ก่อน 
    if (!isMatch && password === user.passwordHash) {
      isMatch = true;
      // แอบอัปเดต Database ให้เป็นแบบเข้ารหัสทันที (Seamless Migration)
      const hashedPassword = await bcrypt.hash(password, 10);
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

// [POST] เพิ่มพนักงานใหม่
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, firstName, role } = req.body;
    const cleanUsername = String(username).toUpperCase().trim();
    const cleanRole = role === 'admin' ? 'Admin' : 'Operator';

    // 🌟 เข้ารหัสผ่านก่อนบันทึก (ความปลอดภัยระดับ 10 รอบ)
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: { 
        username: cleanUsername, 
        passwordHash: hashedPassword, // 🌟 เซฟรหัสที่เข้ารหัสแล้ว
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
    const { username, password, firstName, role } = req.body;
    const cleanUsername = String(username).toUpperCase().trim();
    const cleanRole = role === 'admin' ? 'Admin' : 'Operator';
    
    const updateData = { username: cleanUsername, firstName: firstName, role: cleanRole };
    
    // 🌟 ถ้ามีการกรอกรหัสผ่านใหม่เข้ามา ให้เข้ารหัสก่อนบันทึก
    if (password && password.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(password, 10); 
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
    // ถ้าพนักงานคนนี้เคยแพ็คของไปแล้ว จะลบไม่ได้ (ติด Foreign Key)
    res.status(500).json({ success: false, message: 'ไม่สามารถลบได้ เนื่องจากพนักงานคนนี้มีประวัติการแพ็คสินค้าอยู่ในระบบ' }); 
  }
});

// ==========================================
// สั่งเปิดเซิร์ฟเวอร์
app.listen(PORT, () => {
  console.log(`🚀 Zenix Backend รันพร้อมแล้วที่ http://localhost:${PORT}`);
});