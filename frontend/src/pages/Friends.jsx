import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, handleError } from '../api';
import Avatar from '../components/Avatar';

function UserCard({ user, children }) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        margin: 0
      }}
    >
      <Link
        to={`/profile/${user.id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.9rem',
          textDecoration: 'none',
          color: 'inherit',
          flex: 1
        }}
      >
        <Avatar src={user.avatar_url} size="46px" />

        <div>
          <div style={{ fontWeight: '600', color: '#2c3e50' }}>
            {user.name} {user.surname}
          </div>

          {user.role === 'student' ? (
            <div style={{ fontSize: '0.85rem', color: '#888' }}>
              {user.group || 'Группа не указана'} · {user.course || '—'} курс
            </div>
          ) : user.role === 'teacher' ? (
            <div style={{ fontSize: '0.85rem', color: '#888' }}>
              Преподаватель
            </div>
          ) : user.role === 'admin' ? (
            <div style={{ fontSize: '0.85rem', color: '#888' }}>
              Администратор
            </div>
          ) : null}
        </div>
      </Link>

      {children && (
        <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFriendsData = async () => {
    try {
      setLoading(true);

      const friendsData = await api.fetchFriends();
      const incomingData = await api.fetchIncomingFriendRequests();
      const outgoingData = await api.fetchOutgoingFriendRequests();

      setFriends(friendsData || []);
      setIncomingRequests(incomingData || []);
      setOutgoingRequests(outgoingData || []);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriendsData();
  }, []);

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.acceptFriendRequest(requestId);
      await loadFriendsData();
      window.dispatchEvent(new Event('friends-updated'));
    } catch (err) {
      handleError(err);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    try {
      await api.deleteFriendRequest(requestId);
      await loadFriendsData();
      window.dispatchEvent(new Event('friends-updated'));
    } catch (err) {
      handleError(err);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Удалить пользователя из друзей?')) return;

    try {
      await api.removeFriend(friendId);
      await loadFriendsData();
      window.dispatchEvent(new Event('friends-updated'));
    } catch (err) {
      handleError(err);
    }
  };

  if (loading) {
    return <div className="empty-state">Загрузка друзей...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="page-title">Друзья</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <section>
          <h3 className="section-title">Входящие заявки ({incomingRequests.length})</h3>

          {incomingRequests.length === 0 ? (
            <p className="empty-state">Входящих заявок нет</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {incomingRequests.map(request => (
                <UserCard key={request.id} user={request.user}>
                  <button
                    className="btn btn-inline btn-success"
                    onClick={() => handleAcceptRequest(request.id)}
                  >
                    Принять
                  </button>

                  <button
                    className="btn btn-inline btn-secondary"
                    onClick={() => handleDeleteRequest(request.id)}
                  >
                    Отклонить
                  </button>
                </UserCard>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="section-title">Мои друзья  ({friends.length})</h3>

          {friends.length === 0 ? (
            <p className="empty-state">Список друзей пока пуст</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {friends.map(friend => (
                <UserCard key={friend.id} user={friend}>
                  <button
                    className="btn btn-inline btn-danger"
                    onClick={() => handleRemoveFriend(friend.id)}
                  >
                    Удалить
                  </button>
                </UserCard>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="section-title">Исходящие заявки ({outgoingRequests.length})</h3>

          {outgoingRequests.length === 0 ? (
            <p className="empty-state">Исходящих заявок нет</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {outgoingRequests.map(request => (
                <UserCard key={request.id} user={request.user}>
                  <button
                    className="btn btn-inline btn-secondary"
                    onClick={() => handleDeleteRequest(request.id)}
                  >
                    Отменить
                  </button>
                </UserCard>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}