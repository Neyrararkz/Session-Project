import axios from 'axios';

const API_URL = 'http://localhost:8080/api/v1';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const api = {
  login: async (data) => {
    try { const res = await axiosInstance.post('/auth/login', data); return res.data; }
    catch { return { token: 'mock-token-123', user: { id: 1, name: 'Алина', surname: 'Серикова', email: data.email, group: 'SE-2302', course: 3, direction: 'Software Engineering', bio: 'Учусь на разработчика, люблю чистый код.', clubs: ['IT Club', 'Design'], role: 'admin' } }; }
  },
  register: async (data) => {
    try { const res = await axiosInstance.post('/auth/register', data); return res.data; }
    catch { return { success: true }; }
  },
  getMe: async () => {
    try { const res = await axiosInstance.get('/auth/me'); return res.data; }
    catch { return { user: { id: 1, name: 'Алина', surname: 'Серикова', group: 'SE-2302', course: 3, direction: 'Software Engineering', bio: 'Учусь на разработчика.', clubs: ['IT Club'], role: 'admin' } }; }
  },
  getPosts: async () => {
    try { const res = await axiosInstance.get('/posts'); return res.data; }
    catch { return [
      { id: 1, author: 'Иван Иванов', content: 'Привет всем! Кто поможет развернуть Docker контейнер?', likes: 4, comments: [{id: 1, author: 'Аня', text: 'Посмотри официальный манифест на DockerHub.'}], date: '18.05.2026' },
      { id: 2, author: 'Деканат ITSTEP', content: 'Напоминаю, финальный дедлайн загрузки репозиториев на сессию — эта пятница до 23:59.', likes: 25, comments: [], date: '17.05.2026' }
    ]; }
  },
  createPost: async (post) => {
    try { const res = await axiosInstance.post('/posts', post); return res.data; }
    catch { return { id: Date.now(), author: 'Вы', content: post.content, likes: 0, comments: [], date: 'Сегодня' }; }
  },
  getClubs: async () => {
    try { const res = await axiosInstance.get('/clubs'); return res.data; }
    catch { return [
      { id: 1, name: 'IT Step Dev Club', desc: 'Пишем компиляторы на Go, изучаем экосистему React.', schedule: 'Вт, Чт в 18:00', contacts: '@itstep_dev' },
      { id: 2, name: 'CyberSport Community', desc: 'Организация внутренних чемпионатов академии.', schedule: 'Сб в 16:00', contacts: '@itstep_cyber' }
    ]; }
  }
};