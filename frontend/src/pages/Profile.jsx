import { useState, useEffect } from 'react';
import { api, handleError } from '../api';
import Avatar from '../components/Avatar';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
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
      let avatarUrl = user.avatar_url;
      
      if (avatarFile) {
        avatarUrl = await api.uploadImage(avatarFile);
      }

      await api.put('/user/profile', { 
        bio: bio, 
        clubs: user.clubs || [],
        avatar_url: avatarUrl
      });
      setIsEditing(false);
      setAvatarFile(null);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Avatar src={avatarFile ? URL.createObjectURL(avatarFile) : user.avatar_url} size="60px" />
            <div>
              <h2 className="profile-name">{user.name} {user.surname}</h2>
              {user.role !== 'admin' && <p className="profile-dir">{user.direction}</p>}
            </div>
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
            <h5 className="profile-section-heading">О себе</h5>
            <p className="profile-bio-text">{user.bio || 'Информация не заполнена'}</p>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="form-group">
              <label className="form-label">Аватар</label>
              <input type="file" accept="image/*" className="form-input" onChange={(e) => setAvatarFile(e.target.files[0])} />
            </div>
            <div className="form-group">
              <label className="form-label">Расскажите о себе</label>
              <textarea 
                className="form-input" 
                rows="3" 
                value={bio} 
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-success">Сохранить изменения</button>
          </form>
        )}
      </div>
      
      <div>
        <h3 className="profile-posts-heading">Мои посты</h3>
        {posts.map((post) => (
          <div key={post.id} className="card">
            <h4 className="card-title">{post.title}</h4>
            <p className="post-content">{post.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}