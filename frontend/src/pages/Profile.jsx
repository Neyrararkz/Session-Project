import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="card">
      <div className="profile-header">
        <div className="avatar-mock">
          {user?.name?.[0]}{user?.surname?.[0]}
        </div>
        <div>
          <h1 className="profile-name">{user?.name} {user?.surname}</h1>
          <p className="profile-sub">Группа {user?.group} • {user?.course} курс</p>
          <p className="profile-dir">Специализация: {user?.direction}</p>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title">О себе</h3>
        <p style={{ color: '#4b5563', margin: 0 }}>{user?.bio || 'Биография не заполнена.'}</p>
      </div>

      <div>
        <h3 className="section-title">Академические интересы и клубы</h3>
        <div className="badge-container">
          {user?.clubs?.map(club => (
            <span key={club} className="badge">{club}</span>
          )) || <span>Нет активных подписок</span>}
        </div>
      </div>
    </div>
  );
}