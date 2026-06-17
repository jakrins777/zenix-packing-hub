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
        // 🌟 เก็บค่าเฉพาะที่ระบุในไฟล์
        const updateData = {};
        if (row['Description'] || row['คำอธิบาย']) updateData.description = String(row['Description'] || row['คำอธิบาย']);
        if (row['Lot Size'] || row['ความจุสูงสุด']) updateData.maxCapacity = parseInt(row['Lot Size'] || row['ความจุสูงสุด'], 10);
        if (row['Current Stock'] || row['สต็อก']) updateData.currentStock = parseInt(row['Current Stock'] || row['สต็อก'], 10);
        if (row['Min Stock'] || row['จุดสั่งซื้อ']) updateData.minStockLevel = parseInt(row['Min Stock'] || row['จุดสั่งซื้อ'], 10);

        // 🌟 update only when the uploaded row contains at least one valid field
        if (Object.keys(updateData).length > 0) {
          await prisma.box.updateMany({
            where: { pckId: rawId },
            data: updateData
          });
          successCount++;
        }
      }
    }
    res.json({ success: true, message: `✅ อัปเดตข้อมูลกล่องสำเร็จ ${successCount} รายการ (ข้อมูลเก่าส่วนที่ไม่เกี่ยวข้องยังอยู่ครบ)` });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'ระบบขัดข้อง: ' + error.message }); 
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

// 📥 อัปโหลดสินค้า (รองรับหลายไฟล์ + Upsert + ดักความจุกล่องและแยกกล่อง)
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
      // 🌟 1. ดักจับรหัสสินค้า
      const rawItemCode = row['itemId'] || row['ItemId'] || row['itemid'] || row['Item'] || row['รหัสสินค้า'] || '';
      const itemCode = String(rawItemCode).toUpperCase().trim();

      if (itemCode) {
        const updateData = {};

        // 🌟 2. ดักชื่อลูกค้า และ น้ำหนัก
        // [แก้บั๊ก Prisma ตรงนี้]: ถ้าไม่มีคอลัมน์ชื่อสินค้าใน Excel ให้ดึง "รหัสสินค้า" มายัดใส่เป็นชื่อแทนเลย!
        const rawName = row['Description'] || row['ชื่อสินค้า'] || row['itemName'] || itemCode;
        updateData.itemName = String(rawName).trim();

        const rawSupplier = row['Product Code'] || row['ซัพพลายเออร์'] || row['supplier'] || row['Customer'];
        if (rawSupplier !== undefined) updateData.supplier = String(rawSupplier).trim();

        const rawWeight = row['Unit Weight'] || row['น้ำหนัก'] || row['itemWeight'];
        if (rawWeight !== undefined) updateData.itemWeight = parseFloat(rawWeight) || 0;

        // 🌟 3. ดักรหัสกล่อง
        const rawBox = row['Box ID'] || row['รหัสกล่อง'] || row['defaultPckId'] || row['pckId'];
        if (rawBox !== undefined) updateData.defaultPckId = String(rawBox).toUpperCase().trim();

        // 🌟 4. ดักจำนวนจุต่อกล่อง 
        const rawStdPack = row['stdPackQty'] || row['Std Pack'] || row['จำนวนจุต่อกล่อง'];
        if (rawStdPack !== undefined) updateData.stdPackQty = parseInt(rawStdPack, 10) || 1;

        // 🌟 5. [เพิ่มใหม่] ดักจำนวนแยกกล่อง (สำหรับ Stelia D2P)
        const rawBoxesPerUnit = row['boxesPerUnit'] || row['จำนวนกล่อง/ชิ้น'];
        if (rawBoxesPerUnit !== undefined) updateData.boxesPerUnit = parseInt(rawBoxesPerUnit, 10) || 1;

        // 🌟 6. บันทึกลงฐานข้อมูล (มีอยู่แล้วอัปเดต, ไม่มีให้สร้างใหม่)
        if (Object.keys(updateData).length > 0) {
          const existingItem = await prisma.item.findUnique({
            where: { itemId: itemCode }
          });

          if (existingItem) {
            await prisma.item.update({
              where: { itemId: itemCode },
              data: updateData
            });
          } else {
            await prisma.item.create({
              data: {
                itemId: itemCode,
                ...updateData
              }
            });
          }
          successCount++;
        }
      }
    }
    res.json({ success: true, message: `✅ อัปเดตข้อมูลสำเร็จ ${successCount} รายการ` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'ระบบขัดข้อง: ' + error.message });
  }
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
        
        // 🌟 เพิ่มบรรทัดนี้เข้าไป เพื่อให้หลังบ้านรับค่าความจุไปบันทึก
        stdPackQty: Number(req.body.stdPackQty) || 1 
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