import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, handleError } from '../api';
import Avatar from '../components/Avatar';

function UserCard({ user, children }) {
  return (
    <div className="card friend-card">
      <Link to={`/profile/${user.id}`} className="friend-card-main">
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
        <div className="friend-card-actions">
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

  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatuses, setSearchStatuses] = useState({});
  const [searchLoading, setSearchLoading] = useState(false);

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

  const loadSearchResults = async (query = userSearch) => {
    const trimmed = query.trim();

    if (!trimmed) {
      setSearchResults([]);
      setSearchStatuses({});
      return;
    }

    try {
      setSearchLoading(true);

      const users = await api.searchUsers(trimmed);
      setSearchResults(users || []);

      const statuses = {};

      for (const foundUser of users || []) {
        const status = await api.getFriendshipStatus(foundUser.id);
        statuses[foundUser.id] = status;
      }

      setSearchStatuses(statuses);
    } catch (err) {
      handleError(err);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    loadFriendsData();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadSearchResults(userSearch);
    }, 350);

    return () => clearTimeout(timeout);
  }, [userSearch]);

  const refreshAfterFriendAction = async () => {
    await loadFriendsData();
    await loadSearchResults();
    window.dispatchEvent(new Event('friends-updated'));
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.acceptFriendRequest(requestId);
      await refreshAfterFriendAction();
    } catch (err) {
      handleError(err);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    try {
      await api.deleteFriendRequest(requestId);
      await refreshAfterFriendAction();
    } catch (err) {
      handleError(err);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Удалить пользователя из друзей?')) return;

    try {
      await api.removeFriend(friendId);
      await refreshAfterFriendAction();
    } catch (err) {
      handleError(err);
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      await api.sendFriendRequest(userId);
      await refreshAfterFriendAction();
    } catch (err) {
      handleError(err);
    }
  };

  const renderSearchAction = (foundUser) => {
    const status = searchStatuses[foundUser.id];

    if (!status) return null;

    if (status.status === 'none') {
      return (
        <button
          className="btn btn-inline btn-primary"
          onClick={() => handleSendFriendRequest(foundUser.id)}
        >
          Добавить
        </button>
      );
    }

    if (status.status === 'outgoing_pending') {
      return (
        <button
          className="btn btn-inline btn-secondary"
          onClick={() => handleDeleteRequest(status.request_id)}
        >
          Отменить заявку
        </button>
      );
    }

    if (status.status === 'incoming_pending') {
      return (
        <>
          <button
            className="btn btn-inline btn-success"
            onClick={() => handleAcceptRequest(status.request_id)}
          >
            Принять
          </button>

          <button
            className="btn btn-inline btn-secondary"
            onClick={() => handleDeleteRequest(status.request_id)}
          >
            Отклонить
          </button>
        </>
      );
    }

    if (status.status === 'friends') {
      return (
        <button
          className="btn btn-inline btn-danger"
          onClick={() => handleRemoveFriend(foundUser.id)}
        >
          Удалить из друзей
        </button>
      );
    }

    return null;
  };

  if (loading) {
    return <div className="empty-state">Загрузка друзей...</div>;
  }

  return (
    <div className="friends-page">
      <h1 className="page-title">Друзья ({friends.length})</h1>

      <section style={{ marginBottom: '2rem' }}>
        
        <div className="page-search-row">
          <input
            type="text"
            className="form-input page-search-input"
            placeholder="Найти пользователя..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
        </div>

        {userSearch.trim() && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {searchLoading ? (
              <p className="empty-state">Ищем пользователей...</p>
            ) : searchResults.length === 0 ? (
              <p className="empty-state">Пользователи не найдены</p>
            ) : (
              searchResults.map(foundUser => (
                <UserCard key={foundUser.id} user={foundUser}>
                  {renderSearchAction(foundUser)}
                </UserCard>
              ))
            )}
          </div>
        )}
      </section>

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
          <h3 className="section-title">Мои друзья ({friends.length})</h3>

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