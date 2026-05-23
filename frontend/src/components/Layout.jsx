import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Avatar from './Avatar';

export const Layout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [incomingCount, setIncomingCount] = useState(0);
  const [headerUser, setHeaderUser] = useState(user);

  const loadIncomingCount = async () => {
    if (!user) {
      setIncomingCount(0);
      return;
    }

    try {
      const requests = await api.fetchIncomingFriendRequests();
      setIncomingCount(requests?.length || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const loadHeaderUser = async () => {
    if (!user) {
      setHeaderUser(null);
      return;
    }

    try {
      const freshUser = await api.getCurrentUser();
      setHeaderUser(freshUser);
    } catch (err) {
      console.error(err);
      setHeaderUser(user);
    }
  };

  useEffect(() => {
    loadIncomingCount();
    loadHeaderUser();
  }, [user, location.pathname]);

  useEffect(() => {
    const handleFriendsUpdated = () => {
      loadIncomingCount();
    };

    const handleProfileUpdated = () => {
      loadHeaderUser();
    };

    window.addEventListener('friends-updated', handleFriendsUpdated);
    window.addEventListener('profile-updated', handleProfileUpdated);

    return () => {
      window.removeEventListener('friends-updated', handleFriendsUpdated);
      window.removeEventListener('profile-updated', handleProfileUpdated);
    };
  }, [user]);

  if (!user) return <main className="main-content">{children}</main>;

  const friendsLabel = incomingCount > 0
    ? `👥 Друзья (${incomingCount})`
    : '👥 Друзья';

  const menuItems = [
    { path: '/', label: '📰 Лента новостей' },
    { path: '/friends', label: friendsLabel },
    { path: '/chats', label: '💬 Сообщения' },
    { path: '/clubs', label: '🏫 Клубы' },
    { path: '/navigation', label: '🧭 Помощник студента' },
  ];

  if (user.role === 'admin') {
    menuItems.push({ path: '/admin', label: '🛠️ Админ-панель' });
  }

  return (
    <div className="app-shell">
      <header className="top-header">
        <Link to="/" className="top-header-logo">
          ITSTEP Social
        </Link>

        <div className="top-header-actions">
          <Link to="/chats" className="top-header-icon" title="Сообщения">
            💬
          </Link>

          <Link to="/profile" className="top-header-avatar" title="Мой профиль">
            <Avatar src={headerUser?.avatar_url} size="44px" />
          </Link>
        </div>
      </header>

      <div className="layout-container">
        <aside className="sidebar">
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
        </aside>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};