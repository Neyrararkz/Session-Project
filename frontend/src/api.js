import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
});

axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const login = async (email, password) => { const res = await axiosInstance.post('/auth/login', { email, password }); return res.data; };
export const register = async (userData) => { const res = await axiosInstance.post('/auth/register', userData); return res.data; };
export const getCurrentUser = async () => { const res = await axiosInstance.get('/auth/me'); return res.data.user; };

export const fetchPosts = async () => { const res = await axiosInstance.get('/posts'); return res.data; };
export const createPost = async (postData) => { const res = await axiosInstance.post('/posts', postData); return res.data; };
export const deletePost = async (id) => { const res = await axiosInstance.delete(`/posts/${id}`); return res.data; };
export const toggleLike = async (id, isLike) => { const res = await axiosInstance.post(`/posts/${id}/like`, { isLike }); return res.data; }; 

export const fetchClubs = async () => { const res = await axiosInstance.get('/clubs'); return res.data; };
export const createClub = async (data) => { const res = await axiosInstance.post('/clubs', data); return res.data; };
export const deleteClub = async (id) => { const res = await axiosInstance.delete(`/clubs/${id}`); return res.data; };
export const toggleClubMembership = async (name, action) => { const res = await axiosInstance.post(`/clubs/${name}/membership`, { action }); return res.data; };
export const fetchClubComments = async (id) => { const res = await axiosInstance.get(`/clubs/${id}/comments`); return res.data; };
export const addClubComment = async (id, content) => { const res = await axiosInstance.post(`/clubs/${id}/comments`, { content }); return res.data; };

export const fetchFriends = async () => { const res = await axiosInstance.get('/friends'); return res.data; };
export const fetchChats = async () => { const res = await axiosInstance.get('/chats'); return res.data; };
export const fetchMessages = async (chatId) => { const res = await axiosInstance.get(`/chats/${chatId}/messages`); return res.data; };
export const sendMessage = async (chatId, text) => { const res = await axiosInstance.post(`/chats/${chatId}/messages`, { text }); return res.data; };

export const handleError = (error) => {
    if (error.response) alert(`Ошибка: ${error.response.data.message}`);
    else alert('Сервер недоступен. Проверьте запуск Go.');
};

export const api = {
    get: (url, config) => axiosInstance.get(url, config),
    post: (url, data, config) => axiosInstance.post(url, data, config),
    put: (url, data, config) => axiosInstance.put(url, data, config),
    delete: (url, config) => axiosInstance.delete(url, config),
    
    login, 
    register, 
    fetchPosts, 
    createPost, 
    deletePost, 
    toggleLike, 
    fetchClubs, 
    getCurrentUser, 
    fetchFriends, 
    fetchChats, 
    fetchMessages, 
    sendMessage,
    createClub,
    deleteClub,
    toggleClubMembership,
    fetchClubComments,
    addClubComment
};