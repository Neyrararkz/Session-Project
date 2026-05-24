import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, handleError } from '../api';
import Avatar from '../components/Avatar';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadAdminData = async () => {
    try {
      setLoading(true);

      const statsData = await api.fetchAdminStats();
      const usersData = await api.fetchAdminUsers();

      setStats(statsData);
      setUsers(usersData || []);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter(user => {
      const fullText = `${user.name} ${user.surname} ${user.email} ${user.group} ${user.direction}`.toLowerCase();
      const matchesSearch = !query || fullText.includes(query);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const groupedUsers = useMemo(() => {
    return {
      admins: filteredUsers.filter(user => user.role === 'admin'),
      teachers: filteredUsers.filter(user => user.role === 'teacher'),
      students: filteredUsers.filter(user => user.role === 'student'),
    };
  }, [filteredUsers]);

  const handleRoleChange = async (userId, role) => {
    try {
      setActionLoadingId(userId);

      await api.updateUserRole(userId, role);

      setUsers(prev => prev.map(user => {
        if (user.id === userId) {
          return { ...user, role };
        }

        return user;
      }));

      const statsData = await api.fetchAdminStats();
      setStats(statsData);
    } catch (err) {
      handleError(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Удалить пользователя ${user.name} ${user.surname}?`)) return;

    try {
      setActionLoadingId(user.id);

      await api.deleteUserByAdmin(user.id);

      setUsers(prev => prev.filter(item => item.id !== user.id));

      const statsData = await api.fetchAdminStats();
      setStats(statsData);
    } catch (err) {
      handleError(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const roleLabel = (role) => {
    if (role === 'admin') return 'Админ';
    if (role === 'teacher') return 'Преподаватель';
    return 'Студент';
  };

  const renderUserCard = (user) => (
    <div key={user.id} className="admin-user-card">
      <Link to={`/profile/${user.id}`} className="admin-user-main">
        <Avatar src={user.avatar_url} size="42px" />

        <div>
          <span className="admin-user-name">
            {user.name} {user.surname}
          </span>

          <span className="admin-user-meta">
            {user.email}
          </span>

          <span className="admin-user-meta">
            {user.role === 'student'
              ? `${user.group || 'Группа не указана'} · ${user.course || '—'} курс`
              : user.direction || roleLabel(user.role)}
          </span>
        </div>
      </Link>

      <div className="admin-user-actions">
        <select
          className="admin-role-select"
          value={user.role}
          disabled={actionLoadingId === user.id}
          onChange={(e) => handleRoleChange(user.id, e.target.value)}
        >
          <option value="student">Студент</option>
          <option value="teacher">Преподаватель</option>
          <option value="admin">Админ</option>
        </select>

        <button
          type="button"
          className="post-icon-action post-icon-action-danger"
          disabled={actionLoadingId === user.id}
          onClick={() => handleDeleteUser(user)}
          title="Удалить пользователя"
        >
          <img src="/icons/delete.svg" alt="" />
        </button>
      </div>
    </div>
  );

  const renderGroup = (title, items) => (
    <section className="admin-users-section">
      <h3>{title} ({items.length})</h3>

      {items.length === 0 ? (
        <p className="empty-state">Пользователей нет.</p>
      ) : (
        <div className="admin-users-list">
          {items.map(renderUserCard)}
        </div>
      )}
    </section>
  );

  if (loading) {
    return <div className="empty-state">Загрузка админ-панели...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="page-title">Админ-панель</h1>
          <p className="admin-page-subtitle">
            Статистика ITSTEP Social
          </p>
        </div>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <span>Пользователи</span>
          <strong>{stats?.users_count || 0}</strong>
        </div>

        <div className="admin-stat-card">
          <span>Студенты</span>
          <strong>{stats?.students_count || 0}</strong>
        </div>

        <div className="admin-stat-card">
          <span>Преподаватели</span>
          <strong>{stats?.teachers_count || 0}</strong>
        </div>

        <div className="admin-stat-card">
          <span>Админы</span>
          <strong>{stats?.admins_count || 0}</strong>
        </div>

        <div className="admin-stat-card">
          <span>Посты</span>
          <strong>{stats?.posts_count || 0}</strong>
        </div>

        <div className="admin-stat-card">
          <span>Клубы</span>
          <strong>{stats?.clubs_count || 0}</strong>
        </div>

        <div className="admin-stat-card">
          <span>Новости</span>
          <strong>{stats?.news_count || 0}</strong>
        </div>

        <div className="admin-stat-card">
          <span>Чаты</span>
          <strong>{stats?.chats_count || 0}</strong>
        </div>
      </div>

      <div className="admin-quick-links">
        <Link to="/news" className="admin-quick-link">
          <span>Новости</span>
          <small>Создание и редактирование объявлений</small>
        </Link>

        <Link to="/clubs" className="admin-quick-link">
          <span>Клубы</span>
          <small>Создание, редактирование и удаление клубов</small>
        </Link>

        <Link to="/" className="admin-quick-link">
          <span>Лента</span>
          <small>Просмотр пользовательских публикаций</small>
        </Link>
      </div>

      <div className="card admin-users-panel">
        <div className="admin-users-toolbar">
          <input
            className="form-input admin-search-input"
            placeholder="Поиск по имени, email, группе или направлению..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="admin-filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Все роли</option>
            <option value="student">Студенты</option>
            <option value="teacher">Преподаватели</option>
            <option value="admin">Админы</option>
          </select>
        </div>

        {renderGroup('Администраторы', groupedUsers.admins)}
        {renderGroup('Преподаватели', groupedUsers.teachers)}
        {renderGroup('Студенты', groupedUsers.students)}
      </div>
    </div>
  );
}