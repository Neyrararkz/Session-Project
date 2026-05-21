import { useState, useEffect } from 'react';
import { api, handleError } from '../api';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [bio, setBio] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const loadProfileData = async () => {
    try {
      const userData = await api.getCurrentUser();
      if (userData) {
        setUser(userData);
        setBio(userData.bio || '');
      }
    } catch (err) {
      handleError(err);
    }

    try {
      const res = await api.get('/user/posts');
      setPosts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put('/user/profile', { 
        bio: bio, 
        clubs: user.clubs || [] 
      });
      setIsEditing(false);
      loadProfileData();
    } catch (err) {
      handleError(err);
    }
  };

  if (!user) return <div className="empty-state">Загрузка профиля...</div>;

  return (
    <div className="profile-wrapper">
      <div className="card">
        <div className="profile-top-bar">
          <div>
            <h2 className="profile-name">{user.name} {user.surname}</h2>
            <p className="profile-dir">{user.direction}</p>
            <p className="profile-sub">Группа: {user.group} | Курс: {user.course}</p>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className={`btn btn-inline ${isEditing ? 'btn-secondary' : 'btn-primary'}`}
          >
            {isEditing ? 'Отмена' : 'Редактировать'}
          </button>
        </div>

        {!isEditing ? (
          <div className="profile-details">
            <div>
              <h5 className="profile-section-heading">О себе</h5>
              <p className="profile-bio-text">{user.bio || 'Информация не заполнена'}</p>
            </div>
            <div>
              <h5 className="profile-section-heading">Студенческие клубы</h5>
              <div className="badge-container">
                {user.clubs && user.clubs.length > 0 ? (
                  user.clubs.map((club, idx) => (
                    <span key={idx} className="badge">{club}</span>
                  ))
                ) : (
                  <p className="profile-empty-text">Не состоит в клубах</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="form-group">
              <label className="form-label">Расскажите о себе</label>
              <textarea 
                className="form-input" 
                rows="3" 
                value={bio} 
                onChange={(e) => setBio(e.target.value)}
                placeholder="Твои интересы, стек технологий или хобби..."
              />
            </div>
            <button type="submit" className="btn btn-success">Сохранить изменения</button>
          </form>
        )}
      </div>

      <div>
        <h3 className="profile-posts-heading">Мои публикации</h3>
        {posts.length === 0 ? (
          <p className="empty-state">Вы еще ничего не публиковали.</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="card">
              <div className="post-header">
                <h4 className="card-title">{post.title}</h4>
                <span className="post-date">{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
              <p className="post-content">{post.content}</p>
              <div className="post-likes">
                <span>❤️ {post.likes_count}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}