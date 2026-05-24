import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, handleError } from '../api'; 

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', surname: '', email: '', password: '', group: '', course: 1, direction: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.register(form);
      alert('Регистрация успешна!');
      navigate('/login');
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-card">
        <h2 className="auth-title">Регистрация профиля</h2>
        <input type="text" placeholder="Имя" required onChange={e => setForm({...form, name: e.target.value})} className="form-input" />
        <input type="text" placeholder="Фамилия" required onChange={e => setForm({...form, surname: e.target.value})} className="form-input" />
        <input type="email" placeholder="Email" required onChange={e => setForm({...form, email: e.target.value})} className="form-input" />
        <input type="password" placeholder="Пароль" required onChange={e => setForm({...form, password: e.target.value})} className="form-input" />
        <input type="text" placeholder="Группа (например, SE-2302)" required onChange={e => setForm({...form, group: e.target.value})} className="form-input" />
        <input type="number" placeholder="Курс" min="1" max="4" required onChange={e => setForm({...form, course: parseInt(e.target.value)})} className="form-input" />
        <input type="text" placeholder="Направление" required onChange={e => setForm({...form, direction: e.target.value})} className="form-input" />
        <button type="submit" className="btn btn-success">Зарегистрироваться</button>
        <p className="auth-switch-text">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  );
}