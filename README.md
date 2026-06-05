# 📦 Zenix Packing Hub (WMS)

ระบบจัดการคลังสินค้าและการวางแผนบรรจุภัณฑ์ (Warehouse & Packing Management System) ที่ถูกออกแบบมาเพื่อรองรับกระบวนการทำงานของ **Zenix Aerospace** โดยเฉพาะ ช่วยให้ Operator สามารถคำนวณกล่องที่ต้องใช้ ตัดสต็อก พิมพ์ฉลาก และออกรายงานได้อย่างรวดเร็วและแม่นยำ

---

## ✨ ฟีเจอร์หลัก (Key Features)

### 1. 🧮 Smart Packing Planner (วางแผนการแพ็คแบบ Bulk)
* ก๊อปปี้ข้อมูลรหัสสินค้าและจำนวนจาก Excel มาวางเพื่อคำนวณหา "ประเภทกล่อง" และ "จำนวนกล่อง" ที่ต้องใช้ได้ทันที
* คำนวณน้ำหนักต่อชิ้น และ น้ำหนักรวม (Total Weight) อัตโนมัติ
* **Auto Inventory Deduction:** เมื่อกดยืนยัน ระบบจะบันทึกประวัติการแพ็คและตัดสต็อกกล่องในคลังให้อัตโนมัติ

### 2. 🏷️ Barcode Label Printing (ระบบพิมพ์ฉลาก)
* สร้างและพิมพ์ฉลากหน้ากล่องขนาดมาตรฐาน (10x10 cm) ทันทีจากหน้า Dashboard
* รองรับการสร้าง Barcode อัตโนมัติ (Item Code) 
* ระบุข้อมูลครบถ้วน: Part Number, Description, Qty, Box Type, Date และชื่อ Operator

### 3. 📦 Box Inventory Management (จัดการสต็อกบรรจุภัณฑ์)
* ตรวจสอบยอดสต็อกกล่องปัจจุบันแบบ Real-time
* **Reorder Point Alert:** มีระบบแจ้งเตือนกะพริบสีแดง (🚨) ทันทีที่สต็อกกล่องลดลงถึง "จุดสั่งซื้อ (Min Stock)"
* เมื่อทำการ "ลบ" ประวัติการแพ็ค ระบบจะ **คืนสต็อกกล่อง** กลับเข้าคลังให้อัตโนมัติ

### 4. 📊 Dashboard & Export
* สรุปยอดการแพ็ครายวัน / เดือน / ปี หรือเลือกช่วงเวลาแบบ Custom
* ตารางประวัติการแพ็ครายชิ้น และ ตารางประวัติการบันทึกแผนรวม (Consolidation Plan)
* Export ข้อมูลออกเป็นไฟล์ Excel (`.xlsx`) ผ่าน SheetJS
* รองรับหน้าต่าง Print-friendly สำหรับพิมพ์รายงานส่ง Auditor

### 5. 🔐 Admin Panel & Master Data
* จัดการข้อมูลสินค้า (Items), กล่องมาตรฐาน (Boxes), และสิทธิ์พนักงาน (Users)
* **Bulk Upload:** นำเข้าข้อมูล Master Data จำนวนมากผ่านไฟล์ Excel / CSV
* UI/UX รองรับ Dark-mode ไร้ปัญหาตัวอักษรกลืนกับพื้นหลัง (Defensive Rendering)
* ป้องกันข้อผิดพลาดด้วยระบบ Auto-safe guard ดักจับข้อมูล Null/Undefined

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

**Frontend:**
* **React.js** (Vite / CRA) - สำหรับสร้าง User Interface
* **Tailwind CSS** - สำหรับจัดแต่งหน้าจอและ Responsive Design
* **React Hot Toast** - ระบบแจ้งเตือน (Pop-up Notifications) และ Loading State
* **SheetJS (xlsx)** - สำหรับ Export/Import ไฟล์ Excel
* **React To Print & React Barcode** - สำหรับระบบพิมพ์ฉลากและสร้างบาร์โค้ด

**Backend & Database:**
* **Node.js / Express** - สำหรับ API จัดการไฟล์ Upload และเข้ารหัส Password
* **Supabase (PostgreSQL)** - ฐานข้อมูลหลัก (Database as a Service)
* **Row Level Security (RLS)** - การจัดการสิทธิ์ความปลอดภัยระดับฐานข้อมูล

---

## 🗄️ โครงสร้างฐานข้อมูล (Supabase Tables)

ระบบใช้ตารางใน Supabase ทั้งหมด 5 ตารางหลัก:
1. `items`: เก็บข้อมูล Master สินค้า (รหัส, ชื่อ, น้ำหนัก, กล่องมาตรฐาน, การใช้กันชื้น)
2. `boxes`: เก็บข้อมูล Master กล่อง (รหัส, ความจุ, สต็อกปัจจุบัน, Min Stock)
3. `users`: เก็บข้อมูลพนักงาน (Username, Password Hash, สิทธิ์ Operator/Admin)
4. `packing_logs`: ประวัติการแพ็คสินค้ารายชิ้น (ใช้คำนวณสถิติและพิมพ์ฉลาก)
5. `Report`: ประวัติการบันทึกรายงานแผนเบิกกล่อง (Bulk Calculation)

*(หมายเหตุ: ต้องทำการ GRANT USAGE ให้ Sequence ใน Supabase เพื่อให้ระบบรัน ID อัตโนมัติได้)*

---


👨‍💻 ผู้พัฒนา (Developer)
Jakrin Siriboon / Full-Stack Developer @ Zenix Aerospace
