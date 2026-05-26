# 🛡️ ZENIX Packing Hub

ZENIX Packing Hub is a full-stack web application designed to optimize supply chain and warehouse packing operations. It provides an intuitive interface for operators to scan items, calculate required packaging, and maintain accurate packing logs.

## ✨ Key Features

* **📦 Smart Packing Station:** Barcode scanning integration with automated calculation for total weight, box selection, and required desiccant quantities.
* **📊 Real-time Dashboard:** Comprehensive reporting with data filtering (daily, monthly, yearly, custom dates), visual metric cards, and printable reports.
* **⚙️ Master Data Management:** Full CRUD (Create, Read, Update, Delete) operations for Items and Boxes master data.
* **📁 Bulk Import:** Seamlessly upload bulk master data (Items and Boxes) using Excel/CSV files.
* **🔐 Role-Based Access Control:** Secure login system differentiating between regular operators and admin users.

## 🛠️ Technology Stack

**Frontend:**
* React.js (Vite)
* Tailwind CSS (Styling & UI)
* React Router (Navigation)

**Backend:**
* Node.js & Express.js
* Prisma (ORM)
* PostgreSQL (Database)
* Multer & SheetJS/xlsx (Excel File Processing)

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

* Node.js (v16.x or higher)
* PostgreSQL installed and running

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/jakrins777/zenix-packing-hub.git](https://github.com/jakrins777/zenix-packing-hub.git)
    cd zenix-packing-hub
    ```

2.  **Backend Setup**
    ```bash
    cd backend
    npm install
    ```
    * Create a `.env` file in the `backend` directory and add your database connection string:
        `DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/zenix_db"`
    * Run Prisma migrations:
        ```bash
        npx prisma migrate dev
        ```
    * Start the backend server:
        ```bash
        npm run dev
        ```

3.  **Frontend Setup**
    ```bash
    cd ../frontend
    npm install
    npm run dev
    ```

4.  **Access the application**
    Open your browser and navigate to `http://localhost:5173`

## 📂 Excel Upload Templates

To bulk upload data via the Admin Panel, please use the following column headers in your Excel (.xlsx) files:

* **Items Master:** `รหัสสินค้า` (Required), `ชื่อสินค้า`, `Supplier`, `น้ำหนัก`, `กล่องมาตรฐาน`, `กันชื้น`
* **Boxes Master:** `รหัสกล่อง` (Required), `คำอธิบาย`, `ความจุสูงสุด`, `น้ำหนัก`

## 👨‍💻 Author

* **Jakrin Siriboon** - *Full-Stack Developer* ## 📄 License

This project is licensed under the MIT License.
