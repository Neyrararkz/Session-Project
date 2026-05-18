import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', surname: '', email: '', password: '', group: '', course: '1', direction: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await register(form);
    alert('Регистрационная форма сохранена успешно!');
    navigate('/login');
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-card">
        <h2 className="auth-title">Регистрация профиля</h2>
        
        <div className="form-group">
          <label className="form-label">Имя</label>
          <input type="text" required onChange={e => setForm({...form, name: e.target.value})} className="form-input" />
        </div>

        <div className="form-group">
          <label className="form-label">Фамилия</label>
          <input type="text" required onChange={e => setForm({...form, surname: e.target.value})} className="form-input" />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" required onChange={e => setForm({...form, email: e.target.value})} className="form-input" />
        </div>

        <div className="form-group">
          <label className="form-label">Пароль</label>
          <input type="password" required onChange={e => setForm({...form, password: e.target.value})} className="form-input" />
        </div>

        <div className="form-group-row">
          <div style={{ flex: 2 }}>
            <label className="form-label">Группа</label>
            <input type="text" placeholder="SE-2302" required onChange={e => setForm({...form, group: e.target.value})} className="form-input" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Курс</label>
            <select onChange={e => setForm({...form, course: e.target.value})} className="form-select">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">Направление обучения</label>
          <input type="text" placeholder="Разработка программного обеспечения" required onChange={e => setForm({...form, direction: e.target.value})} className="form-input" />
        </div>

        <button type="submit" className="btn btn-success">Зарегистрироваться</button>
        <p style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '1rem' }}>
          Уже зарегистрированы? <Link to="/login" style={{ color: 'var(--primary)' }}>Выполнить вход</Link>
        </p>
      </form>
    </div>
  );
}