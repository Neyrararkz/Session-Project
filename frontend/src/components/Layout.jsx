import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Avatar from './Avatar';

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();   
  const location = useLocation();
  const [incomingCount, setIncomingCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
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

  const loadUnreadMessagesCount = async () => {
    if (!user) {
      setUnreadMessagesCount(0);
      return;
    }

    try {
      const count = await api.fetchUnreadMessagesCount();
      setUnreadMessagesCount(count || 0);
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
    loadUnreadMessagesCount();
    loadHeaderUser();
  }, [user, location.pathname]);

  useEffect(() => {
    const handleFriendsUpdated = () => {
      loadIncomingCount();
    };

    const handleProfileUpdated = () => {
      loadHeaderUser();
    };

    const handleChatsUpdated = () => {
      loadUnreadMessagesCount();
    };

    window.addEventListener('friends-updated', handleFriendsUpdated);
    window.addEventListener('profile-updated', handleProfileUpdated);
    window.addEventListener('chats-updated', handleChatsUpdated);

    const interval = setInterval(() => {
      loadUnreadMessagesCount();
    }, 15000);

    return () => {
      window.removeEventListener('friends-updated', handleFriendsUpdated);
      window.removeEventListener('profile-updated', handleProfileUpdated);
      window.removeEventListener('chats-updated', handleChatsUpdated);
      clearInterval(interval);
    };
  }, [user]);

  if (!user) return <main className="main-content">{children}</main>;

  const menuItems = [
    { path: '/', label: 'Лента', icon: '/icons/feed.svg' },
    { path: '/friends', label: 'Друзья', icon: '/icons/friends.svg', badge: incomingCount },
    { path: '/chats', label: 'Сообщения', icon: '/icons/chat.svg', badge: unreadMessagesCount },
    { path: '/clubs', label: 'Клубы', icon: '/icons/clubs.svg' },
    { path: '/news', label: 'Новости', icon: '/icons/news.svg' },
    { path: '/navigation', label: 'Помощник студента', icon: '/icons/navigation.svg' },
  ];

  if (user.role === 'admin') {
    menuItems.push({ path: '/admin', label: 'Админ-панель', icon: '/icons/admin.svg' });
  }

  return (
    <div className="app-shell">
      <header className="top-header">
        <Link to="/" className="top-header-logo">
          ITSTEP Social
        </Link>

        <div className="top-header-actions">
          <Link to="/chats" className="top-header-icon" title="Сообщения">
            <img src="/icons/chat.svg" alt="" className="top-header-svg-icon" />
            {unreadMessagesCount > 0 && (
              <span className="top-header-badge">{unreadMessagesCount}</span>
            )}
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
                <span className="nav-link-main">
                  <img src={item.icon} alt="" className="nav-icon" />
                  <span>{item.label}</span>
                </span>

                {item.badge > 0 && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Выйти
            </button>
          </div>
        </aside>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};