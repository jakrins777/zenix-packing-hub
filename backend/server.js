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

app.get('/api/boxes', async (req, res) => {
  try {
    const boxes = await prisma.box.findMany({ orderBy: { pckId: 'asc' } });
    res.json({ success: true, data: boxes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 📥 อัปโหลดกล่อง (รองรับหลายไฟล์ + อัปเดตสต็อก)
app.post('/api/boxes/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์' });

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
      
      if (rawId && rawId !== 'NAN' && rawId !== 'UNDEFINED') {
        const desc = String(row['ชื่ออุปกรณ์-เบอร์กล่อง'] || row['Description'] || row['คำอธิบาย'] || row.description || '-');
        const cap = parseInt(row['Max_Capacity'] || row['Lot Size'] || row['ความจุสูงสุด'] || row.maxCapacity || 1, 10);
        const stock = parseInt(row['คงเหลือ'] || row['Current Stock'] || row['จำนวนกล่อง'] || row.currentStock || 0, 10);
        const minStock = parseInt(row['Min Stock'] || row['จุดสั่งซื้อ'] || row.minStockLevel || 5, 10);

        await prisma.box.upsert({
          where: { pckId: rawId },
          update: { description: desc, maxCapacity: cap, currentStock: stock, minStockLevel: minStock },
          create: { pckId: rawId, description: desc, maxCapacity: cap, currentStock: stock, minStockLevel: minStock }
        });
        successCount++;
      }
    }
    res.json({ success: true, message: `✅ นำเข้าข้อมูลกล่องสำเร็จรวม ${successCount} รายการ` });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'รูปแบบไฟล์ไม่ถูกต้อง หรือ ' + error.message }); 
  }
});

app.put('/api/boxes/:id', async (req, res) => {
  try {
    const { description, maxCapacity, currentStock, minStockLevel } = req.body; 
    await prisma.box.update({
      where: { pckId: req.params.id },
      data: { 
        description, 
        maxCapacity: parseInt(maxCapacity, 10),
        currentStock: parseInt(currentStock || 0, 10),    
        minStockLevel: parseInt(minStockLevel || 0, 10)  
      }
    });
    res.json({ success: true, message: '✅ อัปเดตข้อมูลกล่องและสต็อกสำเร็จ' });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'ระบบขัดข้อง: ' + error.message }); 
  }
});

app.delete('/api/boxes/:id', async (req, res) => {
  try {
    await prisma.box.delete({ where: { pckId: req.params.id } });
    res.json({ success: true, message: 'ลบข้อมูลกล่องสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'ไม่สามารถลบได้' });
  }
});

// ==========================================
// 🏷️ ITEMS CRUD (จัดการ Master Data สินค้า)
// ==========================================

app.get('/api/items', async (req, res) => {
  try {
    const items = await prisma.item.findMany({ include: { defaultBox: true }, orderBy: { itemId: 'asc' } });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await prisma.item.findUnique({ where: { itemId: req.params.id }, include: { defaultBox: true } });
    if (!item) return res.status(404).json({ success: false, message: 'ไม่พบรหัสสินค้านี้ในระบบ' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 📥 อัปโหลดสินค้า (รองรับหลายไฟล์)
app.post('/api/items/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'กรุณาอัปโหลดไฟล์' });

    let allRawData = [];
    for (const file of req.files) {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      workbook.SheetNames.forEach(sheetName => {
        allRawData = allRawData.concat(xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]));
      });
    }

    let successCount = 0;
    for (const row of allRawData) {
      const itemCode = String(row['Item'] || row['รหัสสินค้า'] || row['itemId'] || '').toUpperCase().trim();
      
      if (itemCode && itemCode !== 'NAN' && itemCode !== 'UNDEFINED') {
        const itemName = String(row['Description'] || row['ชื่อสินค้า'] || row['itemName'] || '').trim();
        const customer = String(row['Product Code'] || row['ซัพพลายเออร์'] || row['supplier'] || '-').trim();
        const boxId = String(row['Box ID'] || row['รหัสกล่อง'] || row['defaultPckId'] || '').toUpperCase().trim();
        const unitWeight = String(row['Unit Weight'] || row['น้ำหนัก'] || row['itemWeight'] || '').trim();

        const parsedWeight = parseFloat(unitWeight) || 0;
        const finalBoxId = (boxId !== '' && boxId !== 'NAN') ? boxId : null;

        await prisma.item.upsert({
          where: { itemId: itemCode },
          update: { itemName: itemName || undefined, supplier: customer !== '-' ? customer : undefined, itemWeight: parsedWeight > 0 ? parsedWeight : undefined, defaultPckId: finalBoxId },
          create: { itemId: itemCode, itemName: itemName || 'ไม่ระบุชื่อสินค้า', supplier: customer, itemWeight: parsedWeight, requireDesiccant: false, defaultPckId: finalBoxId }
        });
        successCount++;
      }
    }
    res.json({ success: true, message: `✅ อัปโหลดสำเร็จ ${successCount} รายการ` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'ระบบขัดข้อง: ' + error.message });
  }
});

app.put('/api/items/:id', async (req, res) => {
  try {
    const isDesiccantRequired = req.body.requireDesiccant === true || req.body.requireDesiccant === 'true' || req.body.requireDesiccant === 1 || req.body.requireDesiccant === '1';
    const updatedItem = await prisma.item.update({
      where: { itemId: req.params.id },
      data: {
        itemName: req.body.itemName,
        supplier: req.body.supplier,
        itemWeight: Number(req.body.itemWeight) || 0,
        requireDesiccant: isDesiccantRequired, 
        defaultPckId: req.body.defaultPckId || null
      }
    });
    res.json({ success: true, data: updatedItem, message: 'อัปเดตข้อมูลสินค้าสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    await prisma.item.delete({ where: { itemId: req.params.id } });
    res.json({ success: true, message: 'ลบข้อมูลสินค้าสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'ไม่สามารถลบได้' });
  }
});

// ==========================================
// 👤 USER MANAGEMENT (จัดการพนักงาน)
// ==========================================

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

    
    if (!rawPassword) {
      return res.status(400).json({ success: false, message: '❌ ไม่พบข้อมูลรหัสผ่านที่ส่งมาจากหน้าบ้าน' });
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    await prisma.user.create({
      data: { 
        username: cleanUsername, 
        passwordHash: hashedPassword, 
        firstName: firstName, 
        role: role === 'admin' ? 'Admin' : 'Operator' 
      }
    });
    res.json({ success: true, message: '✅ เพิ่มพนักงานใหม่สำเร็จ' });
  } catch (error) { 
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: '❌ รหัสพนักงานนี้มีอยู่ในระบบแล้ว' });
    res.status(500).json({ success: false, message: 'ระบบขัดข้อง: ' + error.message }); 
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    
    const { username, password, passwordHash, firstName, role } = req.body;
    const updateData = { 
      username: String(username).toUpperCase().trim(), 
      firstName, 
      role: role === 'admin' ? 'Admin' : 'Operator' 
    };
    
    
    const rawPassword = password || passwordHash;

    
    if (rawPassword && String(rawPassword).trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(rawPassword, 10); 
    }

    await prisma.user.update({ 
      where: { id: parseInt(req.params.id) }, 
      data: updateData 
    });
    res.json({ success: true, message: '✅ อัปเดตข้อมูลพนักงานสำเร็จ' });
  } catch (error) { 
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: '❌ รหัสพนักงานนี้มีคนใช้แล้ว' });
    res.status(500).json({ success: false, message: 'ระบบขัดข้อง: ' + error.message }); 
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: '✅ ลบพนักงานสำเร็จ' });
  } catch (error) { res.status(500).json({ success: false, message: 'ไม่สามารถลบได้' }); }
});

// ==========================================
// 🔐 AUTHENTICATION (Login ปลอดภัย)
// ==========================================

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username: String(username).toUpperCase().trim() } });
    
    if (!user) return res.status(401).json({ success: false, message: '❌ ไม่พบรหัสพนักงานนี้' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ success: false, message: '❌ รหัสผ่านไม่ถูกต้อง' });

    const safeUserData = { id: user.id, username: user.username, firstName: user.firstName, role: user.role };
    res.json({ success: true, user: safeUserData });
  } catch (error) { res.status(500).json({ success: false, message: 'ระบบขัดข้อง' }); }
});

// ==========================================
// 📝 TRANSACTION (ประวัติการแพ็ค & รายงาน)
// ==========================================

app.post('/api/pack', async (req, res) => {
  try {
    const { userId, itemId, packQty, boxUsed, totalWeight, boxId } = req.body; 
    await prisma.packingLog.create({ data: { userId, itemId, packQty, boxUsed, totalWeight } });

    if (boxUsed > 0 && boxId) {
      await prisma.box.update({
        where: { pckId: boxId },
        data: { currentStock: { decrement: boxUsed } } 
      });
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

// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 Zenix Backend รันพร้อมแล้วที่ http://localhost:${PORT}`);
});