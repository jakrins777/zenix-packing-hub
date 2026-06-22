import axios from 'axios';


const api = axios.create({
    baseURL: 'https://zenix-packing-hub.onrender.com', 
    timeout: 10000, // 
});


api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('zenix_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`; 
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);


api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('zenix_token');
            localStorage.removeItem('zenix_user');
            window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);

export default api;