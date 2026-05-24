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
export const getUserById = async (id) => { const res = await axiosInstance.get(`/users/${id}`); return res.data.user; };
export const getUserPosts = async (id) => { const res = await axiosInstance.get(`/users/${id}/posts`); return res.data; };
export const searchUsers = async (query) => { const res = await axiosInstance.get('/search/users', { params: { q: query } }); return res.data; };

export const uploadImage = async (file) => { const formData = new FormData(); formData.append('image', file); const res = await axiosInstance.post('/upload', formData); return res.data.url; };

export const fetchPosts = async () => { const res = await axiosInstance.get('/posts'); return res.data; };
export const createPost = async (postData) => { const res = await axiosInstance.post('/posts', postData); return res.data; };
export const deletePost = async (id) => { const res = await axiosInstance.delete(`/posts/${id}`); return res.data; };
export const getPostComments = async (postId) => { const res = await axiosInstance.get(`/posts/${postId}/comments`); return res.data; };
export const addPostComment = async (postId, content, parentId = null) => { const res = await axiosInstance.post(`/posts/${postId}/comments`, { content, parent_id: parentId }); return res.data; };
export const toggleLike = async (id, isLike) => { const res = await axiosInstance.post(`/posts/${id}/like`, { isLike }); return res.data; }; 

export const fetchClubs = async () => { const res = await axiosInstance.get('/clubs'); return res.data; };
export const createClub = async (data) => { const res = await axiosInstance.post('/clubs', data); return res.data; };
export const deleteClub = async (id) => { const res = await axiosInstance.delete(`/clubs/${id}`); return res.data; };
export const toggleClubMembership = async (id, action) => { const res = await axiosInstance.post(`/clubs/${id}/membership`, { action }); return res.data; };
export const fetchClubMembers = async (id) => { const res = await axiosInstance.get(`/clubs/${id}/members`); return res.data; };
export const fetchClubComments = async (id) => { const res = await axiosInstance.get(`/clubs/${id}/comments`); return res.data; };
export const addClubComment = async (id, content, parentId = null) => { const res = await axiosInstance.post(`/clubs/${id}/comments`, { content, parent_id: parentId }); return res.data; };
export const updateClub = async (id, data) => { const res = await axiosInstance.put(`/clubs/${id}`, data); return res.data; };

export const fetchFriends = async () => { const res = await axiosInstance.get('/friends'); return res.data; };
export const fetchUserFriends = async (id) => { const res = await axiosInstance.get(`/users/${id}/friends`); return res.data; };
export const fetchIncomingFriendRequests = async () => { const res = await axiosInstance.get('/friends/requests/incoming'); return res.data; };
export const fetchOutgoingFriendRequests = async () => { const res = await axiosInstance.get('/friends/requests/outgoing'); return res.data; };
export const getFriendshipStatus = async (id) => { const res = await axiosInstance.get(`/friends/status/${id}`); return res.data; };
export const sendFriendRequest = async (id) => { const res = await axiosInstance.post(`/friends/requests/${id}`); return res.data; };
export const acceptFriendRequest = async (id) => { const res = await axiosInstance.put(`/friends/requests/${id}/accept`); return res.data; };
export const deleteFriendRequest = async (id) => { const res = await axiosInstance.delete(`/friends/requests/${id}`); return res.data; };
export const removeFriend = async (id) => { const res = await axiosInstance.delete(`/friends/${id}`); return res.data; };

export const fetchChats = async () => { const res = await axiosInstance.get('/chats'); return res.data; };
export const createDirectChat = async (userId) => { const res = await axiosInstance.post(`/chats/direct/${userId}`); return res.data; };
export const createGroupChat = async (data) => { const res = await axiosInstance.post('/chats/group', data); return res.data; };
export const fetchMessages = async (chatId) => { const res = await axiosInstance.get(`/chats/${chatId}/messages`); return res.data; };
export const sendMessage = async (chatId, text) => { const res = await axiosInstance.post(`/chats/${chatId}/messages`, { text }); return res.data; };
export const fetchUnreadMessagesCount = async () => { const res = await axiosInstance.get('/messages/unread-count'); return res.data.count; };

export const updateProfile = async (data) => { const res = await axiosInstance.put('/user/profile', data); return res.data; };

export const handleError = (error) => {
    console.error("Полный лог ошибки:", error);

    if (error.response) {
        const msg = error.response.data?.message || error.response.data || `Статус код: ${error.response.status}`;
        alert(`Ошибка: ${msg}`);
    } else {
        alert('Сервер недоступен. Проверьте запуск Go.');
    }
};
export const api = {
    get: (url, config) => axiosInstance.get(url, config),
    post: (url, data, config) => axiosInstance.post(url, data, config),
    put: (url, data, config) => axiosInstance.put(url, data, config),
    delete: (url, config) => axiosInstance.delete(url, config),
    
    login, 
    register, 
    updateProfile,
    fetchPosts, 
    createPost, 
    deletePost, 
    getPostComments,
    addPostComment,
    toggleLike, 
    fetchClubs, 
    getCurrentUser, 
    getUserById,
    getUserPosts,
    searchUsers,
    fetchFriends, 
    fetchChats, 
    fetchMessages, 
    sendMessage,
    createDirectChat,
    createGroupChat,    
    fetchUnreadMessagesCount,
    createClub,
    deleteClub,
    toggleClubMembership,
    fetchClubMembers,
    fetchClubComments,
    addClubComment,
    updateClub,
    fetchUserFriends,
    fetchIncomingFriendRequests,
    fetchOutgoingFriendRequests,
    getFriendshipStatus,
    sendFriendRequest,
    acceptFriendRequest,
    deleteFriendRequest,
    removeFriend,
    uploadImage,
};