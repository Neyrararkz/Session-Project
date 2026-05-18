import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await login({ email, password }); navigate('/'); } 
    catch { alert('Ошибка аутентификации'); }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-card">
        <h2 className="auth-title">Вход в систему</h2>
        <div className="form-group">
          <label className="form-label">Электронная почта</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="form-input" />
        </div>
        <div className="form-group">
          <label className="form-label">Пароль</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="form-input" />
        </div>
        <button type="submit" className="btn btn-primary">Войти</button>
        <p style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '1rem' }}>
          Впервые у нас? <Link to="/register" style={{ color: 'var(--primary)' }}>Создать аккаунт</Link>
        </p>
      </form>
    </div>
  );
}