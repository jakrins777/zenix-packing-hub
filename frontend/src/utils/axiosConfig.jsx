import axios from 'axios';
import toast from 'react-hot-toast';

// สร้าง Instance ของ Axios
const api = axios.create({
    baseURL: import.meta.env.VITE_NODE_API_URL || 'https://zenix-packing-hub.onrender.com',
    timeout: 60000, // ตั้งเผื่อไว้ 1 นาทีกัน Timeout
});

// 🌟 1. ด่านขาออก (Request): แปะ Token ไปกับทุกๆ การยิง API
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('zenix_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 🌟 2. ด่านขาเข้า (Response): ดักจับตอน Token พัง/หมดอายุ
api.interceptors.response.use(
    (response) => {
        // ถ้ายิง API สำเร็จ (HTTP 2xx) ก็ปล่อยผ่านปกติ
        return response;
    },
    (error) => {
        // ถ้า Backend ตอบกลับมาเป็น HTTP 401 (Unauthorized) หรือ 403 (Forbidden)
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {

            // 1. แจ้งเตือนผู้ใช้
            toast.error('เซสชันหมดอายุ กรุณาล็อกอินใหม่ 🔒', {
                id: 'session-expired', // ใส่ id กัน Toast เด้งซ้ำรัวๆ
            });

            // 2. เคลียร์ข้อมูลที่ค้างอยู่ในเครื่องทิ้งให้หมด
            localStorage.removeItem('zenix_token');
            localStorage.removeItem('zenix_user');
            // (ถ้าพี่มีตัวแปรอื่นใน localStorage เช่น role ก็สั่ง remove ทิ้งให้หมดตรงนี้ได้เลย)

            // 3. เตะกลับไปหน้า Login
            // ดีเลย์นิดนึงให้ผู้ใช้ทันอ่าน Toast ก่อนโดนเด้ง
            setTimeout(() => {
                window.location.href = '/login'; // 
            }, 1500);
        }

        return Promise.reject(error);
    }
);

export default api;