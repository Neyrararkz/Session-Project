import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return <main className="main-content">{children}</main>;

  const menuItems = [
    { path: '/', label: '📰 Лента новостей' },
    { path: '/profile', label: '👤 Мой профиль' },
    { path: '/friends', label: '👥 Друзья' },
    { path: '/chats', label: '💬 Сообщения' },
    { path: '/clubs', label: '🏫 Клубы' },
    { path: '/navigation', label: '🧭 Помощник студента' },
  ];

  if (user.role === 'admin') {
    menuItems.push({ path: '/admin', label: '🛠️ Админ-панель' });
  }

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-logo">ITSTEP Social</div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`nav-link ${location.pathname === item.path ? 'nav-link-active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button onClick={() => { logout(); navigate('/login'); }} className="btn btn-danger">
          Выйти из аккаунта
        </button>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};