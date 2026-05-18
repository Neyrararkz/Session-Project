import { useState } from 'react';

export default function Friends() {
  const [friends, setFriends] = useState([
    { id: 1, name: 'Арман Алиев', group: 'SE-2301' },
    { id: 2, name: 'Мария Сидорова', group: 'GD-2402' }
  ]);
  const [requests, setRequests] = useState([
    { id: 3, name: 'Данияр Омаров', group: 'SE-2302' }
  ]);

  const acceptFriend = (req) => { setFriends([...friends, req]); setRequests(requests.filter(r => r.id !== req.id)); };
  const declineFriend = (id) => { setRequests(requests.filter(r => r.id !== id)); };
  const removeFriend = (id) => { setFriends(friends.filter(f => f.id !== id)); };

  return (
    <div>
      <h2 className="page-title">Запросы в друзья ({requests.length})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
        {requests.map(r => (
          <div key={r.id} className="card flex-between" style={{ margin: 0, padding: '1rem' }}>
            <div><strong>{r.name}</strong> ({r.group})</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => acceptFriend(r)} className="btn btn-success btn-inline" style={{ padding: '0.4rem 1rem' }}>Принять</button>
              <button onClick={() => declineFriend(r.id)} className="btn btn-danger btn-inline" style={{ padding: '0.4rem 1rem' }}>Отклонить</button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="page-title">Контакты и друзья ({friends.length})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {friends.map(f => (
          <div key={f.id} className="card flex-between" style={{ margin: 0, padding: '1rem' }}>
            <div><strong>{f.name}</strong> ({f.group})</div>
            <button onClick={() => removeFriend(f.id)} className="btn btn-danger btn-inline" style={{ padding: '0.4rem 1rem', backgroundColor: '#f3f4f6', color: '#ef4444' }}>Удалить</button>
          </div>
        ))}
      </div>
    </div>
  );
}