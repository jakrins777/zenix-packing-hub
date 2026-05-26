const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 กำลังเริ่มสร้างข้อมูลจำลอง...');

  // 1. สร้างผู้ใช้งาน (Admin)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: 'hashed_password_123', 
      firstName: 'Jakrin',
      role: 'admin',
    },
  });

  // 🌟 1.2 สร้างผู้ใช้งาน (Packer - พนักงานทั่วไป)
  await prisma.user.upsert({
    where: { username: 'packer01' },
    update: {},
    create: {
      username: 'packer01',
      passwordHash: 'pack1234', // รหัสผ่านของพนักงาน
      firstName: 'สมชาย',
      lastName: 'ขยันแพ็ค',
      role: 'packer', // กำหนดสิทธิ์เป็นแค่คนแพ็ค
    },
  });

  // 2. สร้างข้อมูลกล่อง (Boxes)
  await prisma.box.createMany({
    skipDuplicates: true,
    data: [
      { pckId: 'PCK0000022', description: '430 x 600 x 100 mm', maxCapacity: 10, boxWeight: 0.15, desiccantQty: 2 },
      { pckId: 'PCK0000010', description: '300 x 300 x 150 mm', maxCapacity: 5, boxWeight: 0.10, desiccantQty: 1 },
    ],
  });

  // 3. สร้างข้อมูลสินค้า (Items)
  await prisma.item.createMany({
    skipDuplicates: true,
    data: [
      { itemId: 'ITEM-8942', itemName: 'Zenix Standard Valve', supplier: 'Supplier A', itemWeight: 0.5, defaultPckId: 'PCK0000022', requireDesiccant: true },
      { itemId: 'ITEM-1105', itemName: 'Zenix Mini Sensor', supplier: 'Supplier B', itemWeight: 0.2, defaultPckId: 'PCK0000010', requireDesiccant: false },
    ],
  });

  console.log('✅ โยนข้อมูลจำลองเข้า Database สำเร็จแล้ว!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });