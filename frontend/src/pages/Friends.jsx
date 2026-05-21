import { useState, useEffect } from 'react';
import { api, handleError } from '../api';

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    api.fetchFriends().then(data => {
      setFriends(data.friends);
      setRequests(data.requests);
    }).catch(handleError);
  }, []);

  return (
    <div>
      <h2 className="page-title">Запросы ({requests.length})</h2>
      {requests.map(r => (
        <div key={r.id} className="card">{r.name}</div>
      ))}
      <h2 className="page-title">Друзья ({friends.length})</h2>
      {friends.map(f => (
        <div key={f.id} className="card">{f.name}</div>
      ))}
    </div>
  );
}