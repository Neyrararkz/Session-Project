import { useState, useEffect } from 'react';
import { api, handleError } from '../api';

export default function Clubs() {
  const [user, setUser] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [view, setView] = useState('list'); 
  const [selectedClub, setSelectedClub] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClub, setNewClub] = useState({ name: '', description: '', meeting_time: '', contacts: '' });
  const [editClub, setEditClub] = useState({ name: '', description: '', meeting_time: '', contacts: '' });
  const [isDetailEditing, setIsDetailEditing] = useState(false);

  const loadData = async () => {
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
      const clubsData = await api.fetchClubs();
      setClubs(clubsData || []);
    } catch (err) {
      handleError(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateClub = async (e) => {
    e.preventDefault();
    try {
      await api.createClub(newClub);
      setShowCreateForm(false);
      setNewClub({ name: '', description: '', meeting_time: '', contacts: '' });
      loadData();
    } catch (err) {
      handleError(err);
    }
  };

  const handleUpdateClub = async (e) => {
    e.preventDefault();
    try {
      await api.updateClub(selectedClub.id, editClub);
      setIsDetailEditing(false);
      await loadData();

      if (selectedClub) {
        setSelectedClub({
          ...selectedClub,
          ...editClub
        });
      }
    } catch (err) {
      handleError(err);
    }
  };

  const handleDeleteClub = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Вы точно хотите удалить клуб?')) return;
    try {
      await api.deleteClub(id);
      setIsDetailEditing(false);
      
      if (selectedClub && selectedClub.id === id) {
        setView('list');
        setSelectedClub(null);
      }
      loadData();
    } catch (err) {
      handleError(err);
    }
  };

  const handleToggleMembership = async (e, clubName, currentAction) => {
    e.stopPropagation();
    try {
      await api.toggleClubMembership(clubName, currentAction);
      loadData(); 
    } catch (err) {
      handleError(err);
    }
  };

  const openClubDetails = async (club) => {
    setSelectedClub(club);
    setIsDetailEditing(false); 
    setView('detail');
    try {
      const coms = await api.fetchClubComments(club.id);
      setComments(coms || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.addClubComment(selectedClub.id, newComment);
      setNewComment('');
      const coms = await api.fetchClubComments(selectedClub.id);
      setComments(coms || []);
    } catch (err) {
      handleError(err);
    }
  };

  if (!user) return <div className="empty-state">Загрузка...</div>;

  const userClubs = user.clubs || [];
  const isAdmin = user.role === 'admin';

  if (view === 'detail' && selectedClub) {
    const isMember = userClubs.includes(selectedClub.name);
    
    return (
      <div>
        <button 
          onClick={() => { 
            setView('list'); 
            setIsDetailEditing(false); 
          }} 
          className="btn btn-inline btn-secondary" 
          style={{ marginBottom: '1.5rem' }}
        >
          ← Назад к списку
        </button>
        
        {isDetailEditing ? (
          <form onSubmit={handleUpdateClub} className="card" style={{ marginBottom: '2rem', border: '2px solid var(--primary)' }}>
            <h4 className="section-title">Редактирование клуба</h4>
            <div className="form-group">
              <input 
                className="form-input" 
                value={editClub.name} 
                onChange={e => setEditClub({...editClub, name: e.target.value})} 
                required 
              />
            </div>
            <div className="form-group">
              <textarea 
                className="form-input" 
                rows="3" 
                value={editClub.description} 
                onChange={e => setEditClub({...editClub, description: e.target.value})} 
                required 
              />
            </div>
            <div className="form-group-row">
              <input 
                className="form-input" 
                value={editClub.meeting_time} 
                onChange={e => setEditClub({...editClub, meeting_time: e.target.value})} 
                placeholder="Время встреч" 
              />
              <input 
                className="form-input" 
                value={editClub.contacts} 
                onChange={e => setEditClub({...editClub, contacts: e.target.value})} 
                placeholder="Контакты" 
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-success">Сохранить</button>
              <button type="button" className="btn btn-secondary" onClick={() => setIsDetailEditing(false)}>Отмена</button>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={(e) => handleDeleteClub(e, selectedClub.id)}
              >
                Удалить клуб
              </button>
            </div>
          </form>
        ) : (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h2 className="page-title" style={{ margin: 0 }}>
                {selectedClub.name}
              </h2>

              {isAdmin ? (
                <button
                  className="btn btn-inline btn-primary"
                  onClick={() => {
                    setEditClub({
                      name: selectedClub.name,
                      description: selectedClub.description,
                      meeting_time: selectedClub.meeting_time,
                      contacts: selectedClub.contacts,
                    });
                    setIsDetailEditing(true); 
                  }}
                >
                  Редактировать
                </button>
              ) : (
                <button
                  onClick={(e) => handleToggleMembership(e, selectedClub.id, isMember ? 'leave' : 'join')}
                  className={`btn btn-inline ${isMember ? 'btn-danger' : 'btn-primary'}`}
                >
                  {isMember ? 'Выйти из клуба' : 'Вступить в клуб'}
                </button>
              )}
            </div>
            <p className="card-desc"><strong>Время встреч:</strong> {selectedClub.meeting_time}</p>
            <p className="card-desc"><strong>Контакты:</strong> {selectedClub.contacts}</p>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />
            <h4 className="section-title">О клубе</h4>
            <p className="post-content">{selectedClub.description}</p>
          </div>
        )}

        <div className="card">
          <h4 className="section-title">Обсуждение</h4>
          <div className="comment-section" style={{ borderTop: 'none', marginTop: 0 }}>
            {comments.length === 0 ? (
              <p className="empty-state">Комментариев пока нет</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="comment-item" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--bg-gray)', borderRadius: '0.5rem' }}>
                  <div className="post-author" style={{ fontSize: '0.95rem' }}>
                    {c.user_name} <span className="post-date">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ marginTop: '0.5rem', color: 'var(--text-main)' }}>{c.content}</div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleAddComment} className="comment-form" style={{ marginTop: '1.5rem' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Добавить комментарий..." 
              value={newComment} 
              onChange={e => setNewComment(e.target.value)} 
            />
            <button type="submit" className="btn btn-inline btn-success">Отправить</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Студенческие клубы</h2>
        {isAdmin && (
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn btn-inline btn-primary">
            {showCreateForm ? 'Отменить' : '+ Добавить'}
          </button>
        )}
      </div>

      {isAdmin && showCreateForm && (
        <form onSubmit={handleCreateClub} className="card">
          <h4 className="section-title">Новый клуб</h4>
          <div className="form-group">
            <input className="form-input" placeholder="Название клуба" required value={newClub.name} onChange={e => setNewClub({...newClub, name: e.target.value})} />
          </div>
          <div className="form-group">
            <textarea className="form-input" rows="3" placeholder="Описание" required value={newClub.description} onChange={e => setNewClub({...newClub, description: e.target.value})} />
          </div>
          <div className="form-group-row">
            <input className="form-input" placeholder="Время встреч (напр. Пт 18:00)" value={newClub.meeting_time} onChange={e => setNewClub({...newClub, meeting_time: e.target.value})} />
            <input className="form-input" placeholder="Контакты (Telegram, Кабинет)" value={newClub.contacts} onChange={e => setNewClub({...newClub, contacts: e.target.value})} />
          </div>
          <button type="submit" className="btn btn-success">Опубликовать</button>
        </form>
      )}

      <div className="grid-300">
        {clubs.map(club => {
          const isMember = userClubs.includes(club.name);
          return (
            <div key={club.id} className="card flex-column-between" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => openClubDetails(club)}>
              <div>
                <h3 className="card-title">{club.name}</h3>
                <p className="card-meta">Время: {club.meeting_time}</p>
                <p className="card-desc" style={{ marginTop: '0.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {club.description}
                </p>
              </div>
              <div
                className="flex-between"
                style={{
                  marginTop: '1rem',
                  justifyContent: isAdmin ? 'flex-end' : 'space-between',
                }}
              >
                {!isAdmin && (
                  <span
                    className={`badge ${isMember ? '' : 'bg-gray'}`}
                    style={
                      !isMember
                        ? {
                            backgroundColor: 'var(--bg-gray)',
                            color: 'var(--text-muted)',
                          }
                        : {}
                    }
                  >
                    {isMember ? 'Вы состоите' : 'Вы не состоите'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {clubs.length === 0 && <p className="empty-state">Нет доступных клубов.</p>}
      </div>
    </div>
  );
}