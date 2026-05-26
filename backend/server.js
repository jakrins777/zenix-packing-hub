const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

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
app.post('/api/boxes', async (req, res) => {
  try {
    const newBox = await prisma.box.create({ data: req.body });
    res.status(201).json({ success: true, data: newBox, message: 'เพิ่มกล่องใหม่สำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: รหัสกล่องอาจซ้ำกัน' });
  }
});

// [UPDATE] แก้ไขข้อมูลกล่อง
app.put('/api/boxes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBox = await prisma.box.update({
      where: { pckId: id },
      data: req.body
    });
    res.json({ success: true, data: updatedBox, message: 'อัปเดตข้อมูลกล่องสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
        supplier: req.body.supplier,
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

// [POST] 1. อัปโหลด Excel เพื่อเพิ่ม "สินค้า"
// [POST] 1. อัปโหลด Excel เพื่อเพิ่ม "สินค้า"
app.post('/api/items/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์ Excel' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const itemsToInsert = data.map(row => {
      // ดึงรหัสสินค้ามาก่อน
      const id = String(row['รหัสสินค้า'] || row.itemId || '').toUpperCase().trim();
      
      return {
        itemId: id,
        // 🌟 ถ้าไม่มีชื่อสินค้า ให้ใช้รหัสสินค้า (id) แทนเลย Database จะได้ไม่พัง
        itemName: String(row['ชื่อสินค้า'] || row.itemName || id),
        supplier: String(row['Supplier'] || row.supplier || '-'),
        itemWeight: parseFloat(row['น้ำหนัก'] || row.itemWeight || 0),
        defaultPckId: row['กล่องมาตรฐาน'] || row.defaultPckId || null,
        requireDesiccant: parseDesiccant(row['กันชื้น'] || row.requireDesiccant)
      };
    }).filter(item => item.itemId); // 🌟 กรองเอาแค่บรรทัดที่มี "รหัสสินค้า" ก็พอ ไม่ต้องสนชื่อ

    const result = await prisma.item.createMany({ data: itemsToInsert, skipDuplicates: true });
    res.json({ success: true, message: `✅ นำเข้าข้อมูลสินค้าสำเร็จ ${result.count} รายการ` });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'รูปแบบไฟล์ไม่ถูกต้อง หรือ ' + error.message }); 
  }
});

// [POST] 2. อัปโหลด Excel เพื่อเพิ่ม "กล่อง"
app.post('/api/boxes/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์ Excel' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const boxesToInsert = data.map(row => ({
      pckId: String(row['รหัสกล่อง'] || row.pckId || '').toUpperCase(),
      description: String(row['คำอธิบาย'] || row.description || '-'),
      maxCapacity: parseInt(row['ความจุสูงสุด'] || row.maxCapacity || 0),
      boxWeight: parseFloat(row['น้ำหนัก'] || row.boxWeight || 0),
      desiccantQty: 0 // ❌ ไม่สนใจค่าจากกล่องแล้ว ดันค่า 0 กลับไปให้ Database สบายใจ
    })).filter(box => box.pckId); 

    const result = await prisma.box.createMany({ data: boxesToInsert, skipDuplicates: true });
    res.json({ success: true, message: `✅ นำเข้าข้อมูลกล่องสำเร็จ ${result.count} รายการ` });
  } catch (error) { res.status(500).json({ success: false, message: 'รูปแบบไฟล์ไม่ถูกต้อง หรือ ' + error.message }); }
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
// 🔐 AUTH (ระบบเข้าสู่ระบบ)
// ==========================================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 1. ค้นหา User จาก username
    const user = await prisma.user.findUnique({ where: { username } });
    
    // 2. เช็คว่าเจอไหม และรหัสผ่านตรงไหม 
    // (Note: ของจริงต้องใช้ bcrypt เทียบรหัสผ่านที่ถูก Hash ไว้ แต่ตอนนี้เราเทียบตรงๆ ไปก่อนครับ)
    if (!user || user.passwordHash !== password) {
      return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
    }
    
    // 3. ถ้าผ่าน ส่งข้อมูลพื้นฐานกลับไป (ห้ามส่ง Password กลับไปเด็ดขาด)
    res.json({ 
      success: true, 
      data: { id: user.id, username: user.username, firstName: user.firstName, role: user.role } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// ==========================================
// สั่งเปิดเซิร์ฟเวอร์
app.listen(PORT, () => {
  console.log(`🚀 Zenix Backend รันพร้อมแล้วที่ http://localhost:${PORT}`);
});