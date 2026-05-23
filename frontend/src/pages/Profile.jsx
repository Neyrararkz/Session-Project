import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, handleError } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [currentUser, setCurrentUser] = useState(null);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendshipStatus, setFriendshipStatus] = useState(null);
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

      const friendsData = await api.fetchUserFriends(profileUser.id);
      setFriends(friendsData || []);

      if (profileUser.id !== me.id) {
        const statusData = await api.getFriendshipStatus(profileUser.id);
        setFriendshipStatus(statusData);
      } else {
        setFriendshipStatus({ status: 'self', request_id: 0 });
      }

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
      window.dispatchEvent(new Event('profile-updated'));
      loadProfileData();
    } catch (err) {
      handleError(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCommentAddedLocally = (postId) => {
  setPosts(prevPosts => prevPosts.map(p => {
    if (p.id === postId) {
      return { ...p, comments_count: (p.comments_count || 0) + 1 };
    }

    return p;
  }));
};

const handleToggleLike = async (postId, isLikedNow) => {
  try {
    await api.toggleLike(postId, !isLikedNow);

    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          is_liked: !isLikedNow,
          likes_count: isLikedNow ? p.likes_count - 1 : p.likes_count + 1
        };
      }

      return p;
    }));
  } catch (err) {
    handleError(err);
  }
};

const handleDeletePost = async (postId) => {
  if (!window.confirm('Вы уверены, что хотите удалить этот пост?')) return;

  try {
    await api.deletePost(postId);
    setPosts(posts.filter(p => p.id !== postId));
  } catch (err) {
    handleError(err);
  }
};

const reloadFriendshipData = async () => {
  if (!currentUser || !user) return;

  const friendsData = await api.fetchUserFriends(user.id);
  setFriends(friendsData || []);

  if (currentUser.id !== user.id) {
    const statusData = await api.getFriendshipStatus(user.id);
    setFriendshipStatus(statusData);
  }

  window.dispatchEvent(new Event('friends-updated'));
};

const handleSendFriendRequest = async () => {
  try {
    await api.sendFriendRequest(user.id);
    await reloadFriendshipData();
  } catch (err) {
    handleError(err);
  }
};

const handleAcceptFriendRequest = async () => {
  try {
    await api.acceptFriendRequest(friendshipStatus.request_id);
    await reloadFriendshipData();
  } catch (err) {
    handleError(err);
  }
};

const handleCancelFriendRequest = async () => {
  try {
    await api.deleteFriendRequest(friendshipStatus.request_id);
    await reloadFriendshipData();
  } catch (err) {
    handleError(err);
  }
};

const handleRemoveFriend = async () => {
  if (!window.confirm('Удалить пользователя из друзей?')) return;

  try {
    await api.removeFriend(user.id);
    await reloadFriendshipData();
  } catch (err) {
    handleError(err);
  }
};

const renderFriendshipButton = () => {
  if (isOwnProfile || !friendshipStatus) return null;

  if (friendshipStatus.status === 'none') {
    return (
      <button
        className="btn btn-inline btn-primary"
        onClick={handleSendFriendRequest}
      >
        Добавить в друзья
      </button>
    );
  }

  if (friendshipStatus.status === 'outgoing_pending') {
    return (
      <button
        className="btn btn-inline btn-secondary"
        onClick={handleCancelFriendRequest}
      >
        Отменить заявку
      </button>
    );
  }

  if (friendshipStatus.status === 'incoming_pending') {
    return (
      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <button
          className="btn btn-inline btn-success"
          onClick={handleAcceptFriendRequest}
        >
          Принять заявку
        </button>

        <button
          className="btn btn-inline btn-secondary"
          onClick={handleCancelFriendRequest}
        >
          Отклонить
        </button>
      </div>
    );
  }

  if (friendshipStatus.status === 'friends') {
    return (
      <button
        className="btn btn-inline btn-danger"
        onClick={handleRemoveFriend}
      >
        Удалить из друзей
      </button>
    );
  }

  return null;
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

          <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`btn btn-inline ${isEditing ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {isEditing ? 'Отмена' : 'Редактировать'}
                </button>

                <button
                  onClick={handleLogout}
                  className="btn btn-inline btn-danger"
                >
                  Выйти
                </button>
              </>
            ) : (
              renderFriendshipButton()
            )}
          </div>
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

            <div>
              <h5 className="profile-section-heading">Друзья ({friends.length})</h5>

              {friends.length === 0 ? (
                <p className="profile-empty-text">Список друзей пуст</p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.8rem'
                  }}
                >
                  {friends.map(friend => (
                    <Link
                      key={friend.id}
                      to={`/profile/${friend.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.7rem',
                        padding: '0.8rem',
                        backgroundColor: 'var(--bg-gray)',
                        borderRadius: '0.8rem',
                        textDecoration: 'none',
                        color: 'inherit'
                      }}
                    >
                      <Avatar src={friend.avatar_url} size="36px" />

                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                          {friend.name} {friend.surname}
                        </div>

                        {friend.role === 'student' ? (
                          <div style={{ fontSize: '0.78rem', color: '#888' }}>
                            {friend.group || 'Группа не указана'}
                          </div>
                        ) : friend.role === 'teacher' ? (
                          <div style={{ fontSize: '0.78rem', color: '#888' }}>
                            Преподаватель
                          </div>
                        ) : friend.role === 'admin' ? (
                          <div style={{ fontSize: '0.78rem', color: '#888' }}>
                            Администратор
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
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
                          Выйти
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
          {isOwnProfile ? `Мои посты (${posts.length})` : `Посты пользователя (${posts.length})`}
        </h3>

        {posts.length === 0 ? (
          <p className="empty-state">Постов пока нет.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUser?.id}
                onDelete={isOwnProfile ? handleDeletePost : null}
                onToggleLike={handleToggleLike}
                onCommentAdded={handleCommentAddedLocally}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}