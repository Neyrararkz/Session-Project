import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, handleError } from '../api';
import Avatar from '../components/Avatar';

export default function Profile() {
  const { id } = useParams();

  const [currentUser, setCurrentUser] = useState(null);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const loadProfileData = async () => {
    try {
      const me = await api.getCurrentUser();
      setCurrentUser(me);

      let profileUser = me;

      if (id && Number(id) !== me.id) {
        profileUser = await api.getUserById(id);
      }

      setUser(profileUser);
      setBio(profileUser.bio || '');

      const postsData = await api.getUserPosts(profileUser.id);
      setPosts(postsData || []);

      const clubsData = await api.fetchClubs();
      setClubs(clubsData || []);
    } catch (err) {
      handleError(err);
    }
  };

  useEffect(() => {
    setIsEditing(false);
    setAvatarFile(null);
    loadProfileData();
  }, [id]);

  const isOwnProfile = currentUser && user && currentUser.id === user.id;

  const userClubIds = (user?.clubs || []).map(String);

  const userClubs = clubs.filter(club =>
    userClubIds.includes(String(club.id)) || userClubIds.includes(club.name)
  );

  const handleRemoveClub = (club) => {
    setUser(prev => ({
      ...prev,
      clubs: (prev.clubs || []).filter(item =>
        item !== String(club.id) && item !== club.name
      )
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    try {
      let avatarUrl = user.avatar_url;

      if (avatarFile) {
        avatarUrl = await api.uploadImage(avatarFile);
      }

      await api.updateProfile({
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
            <Avatar
              src={avatarFile ? URL.createObjectURL(avatarFile) : user.avatar_url}
              size="60px"
            />

            <div>
              <h2 className="profile-name">
                {user.name} {user.surname}
              </h2>

              {user.role !== 'admin' && (
                <p className="profile-dir">{user.direction}</p>
              )}

              {user.role === 'student' ? (
                <p className="profile-sub">
                  Группа: {user.group || '—'} | Курс: {user.course || '—'}
                </p>
              ) : user.role === 'teacher' ? (
                <p className="profile-sub">Преподаватель</p>
              ) : user.role === 'admin' ? (
                <p className="profile-sub">Администратор</p>
              ) : null}
            </div>
          </div>

          {isOwnProfile && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`btn btn-inline ${isEditing ? 'btn-secondary' : 'btn-primary'}`}
            >
              {isEditing ? 'Отмена' : 'Редактировать'}
            </button>
          )}
        </div>

        {!isEditing ? (
          <div className="profile-details">
            <div>
              <h5 className="profile-section-heading">О себе</h5>
              <p className="profile-bio-text">
                {user.bio || 'Информация не заполнена'}
              </p>
            </div>

            {user.role !== 'admin' && (
              <div>
                <h5 className="profile-section-heading">Клубы</h5>

                {userClubs.length === 0 ? (
                  <p className="profile-empty-text">Не состоит в клубах</p>
                ) : (
                  <div className="badge-container">
                    {userClubs.map(club => (
                      <Link
                        key={club.id}
                        to="/clubs"
                        className="badge"
                        style={{ textDecoration: 'none' }}
                      >
                        {club.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="form-group">
              <label className="form-label">Аватар</label>
              <input
                type="file"
                accept="image/*"
                className="form-input"
                onChange={(e) => setAvatarFile(e.target.files[0])}
              />
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

            {user.role !== 'admin' && (
              <div className="form-group">
                <label className="form-label">Мои клубы</label>

                {userClubs.length === 0 ? (
                  <p className="profile-empty-text">Вы пока не состоите в клубах</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    {userClubs.map(club => (
                      <div
                        key={club.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.8rem 1rem',
                          backgroundColor: 'var(--bg-gray)',
                          borderRadius: '0.7rem'
                        }}
                      >
                        <span style={{ fontWeight: '500' }}>{club.name}</span>

                        <button
                          type="button"
                          className="btn btn-inline btn-danger"
                          onClick={() => handleRemoveClub(club)}
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="btn btn-success">
              Сохранить изменения
            </button>
          </form>
        )}
      </div>

      <div>
        <h3 className="profile-posts-heading">
          {isOwnProfile ? 'Мои посты' : 'Посты пользователя'}
        </h3>

        {posts.length === 0 ? (
          <p className="empty-state">Постов пока нет.</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="card">
              <div className="post-header">
                <h4 className="card-title">{post.title}</h4>
                <span className="post-date">
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>

              <p className="post-content">{post.content}</p>

              {post.image_urls && post.image_urls.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <img
                    src={post.image_urls[0]}
                    alt="post"
                    style={{
                      width: '100%',
                      maxHeight: '350px',
                      objectFit: 'contain',
                      borderRadius: '0.7rem',
                      backgroundColor: '#f8f9fa'
                    }}
                  />
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  marginTop: '1rem',
                  color: '#777',
                  fontSize: '0.9rem'
                }}
              >
                <span>❤️ {post.likes_count || 0}</span>
                <span>💬 {post.comments_count || 0}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}