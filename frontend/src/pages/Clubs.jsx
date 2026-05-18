import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [joined, setJoined] = useState([]);

  useEffect(() => { api.getClubs().then(setClubs); }, []);

  const toggleJoin = (id) => {
    setJoined(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
  };

  return (
    <div>
      <h1 className="page-title">Студенческие объединения</h1>
      <div className="grid-300">
        {clubs.map(club => {
          const isMember = joined.includes(club.id);
          return (
            <div key={club.id} className="card flex-column-between" style={{ margin: 0 }}>
              <div>
                <h3 className="card-title">{club.name}</h3>
                <p className="card-desc">{club.desc}</p>
                <div className="card-meta">🕒 <strong>Встречи:</strong> {club.schedule}</div>
                <div className="card-meta" style={{ marginBottom: '1.5rem' }}>📞 <strong>Контакты:</strong> {club.contacts}</div>
              </div>
              <button 
                onClick={() => toggleJoin(club.id)} 
                className={`btn ${isMember ? 'btn-danger' : 'btn-primary'}`}
              >
                {isMember ? 'Покинуть сообщество' : 'Подать заявку / Вступить'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}