import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, handleError } from '../api';
import Avatar from '../components/Avatar';

export default function Clubs() {
  const [user, setUser] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [clubSearch, setClubSearch] = useState('');
  const [view, setView] = useState('list'); 
  const [selectedClub, setSelectedClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); 
  const [replyText, setReplyText] = useState('');     

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClub, setNewClub] = useState({ name: '', description: '', meeting_time: '', contacts: '', image_url: '' });
  const [newImageFile, setNewImageFile] = useState(null);

  const [editClub, setEditClub] = useState({ name: '', description: '', meeting_time: '', contacts: '', image_url: '' });
  const [editImageFile, setEditImageFile] = useState(null);
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
      let imageUrl = newClub.image_url;
      
      if (newImageFile) {
        imageUrl = await api.uploadImage(newImageFile);
      }

      const clubToCreate = { ...newClub, image_url: imageUrl };
      await api.createClub(clubToCreate);
      
      setShowCreateForm(false);
      setNewClub({ name: '', description: '', meeting_time: '', contacts: '', image_url: '' });
      setNewImageFile(null);
      loadData();
    } catch (err) {
      handleError(err);
    }
  };

  const handleUpdateClub = async (e) => {
    e.preventDefault();
    try {
      let imageUrl = editClub.image_url;

      if (editImageFile) {
        imageUrl = await api.uploadImage(editImageFile);
      }

      const clubToUpdate = { ...editClub, image_url: imageUrl };
      await api.updateClub(selectedClub.id, clubToUpdate);
      
      setIsDetailEditing(false);
      setEditImageFile(null);
      await loadData();

      if (selectedClub) {
        setSelectedClub({
          ...selectedClub,
          ...clubToUpdate
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

  const handleToggleMembership = async (e, clubId, currentAction) => {
    e.stopPropagation();
    try {
      await api.toggleClubMembership(clubId, currentAction);

      const userData = await api.getCurrentUser();
      setUser(userData);

      await loadClubMembers(clubId);
    } catch (err) {
      handleError(err);
    }
  };

  const loadClubMembers = async (clubId) => {
    try {
      const data = await api.fetchClubMembers(clubId);
      setMembers(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const openClubDetails = async (club) => {
    setSelectedClub(club);
    setIsDetailEditing(false);
    setView('detail');
    setEditImageFile(null);
    setReplyingTo(null);
    setReplyText('');
    setNewComment('');

    try {
      const coms = await api.fetchClubComments(club.id);
      setComments(coms || []);
      await loadClubMembers(club.id);
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

  const handleAddReply = async (e, parentId) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      await api.addClubComment(selectedClub.id, replyText, parentId);
      setReplyText('');
      setReplyingTo(null); 
      const coms = await api.fetchClubComments(selectedClub.id);
      setComments(coms || []);
    } catch (err) {
      handleError(err);
    }
  };


  const userClubs = user.clubs || [];
  const isAdmin = user.role === 'admin';

  const filteredClubs = clubs.filter(club => {
    const query = clubSearch.toLowerCase().trim();

    if (!query) return true;

    const text = `${club.name} ${club.description} ${club.meeting_time} ${club.contacts}`.toLowerCase();

    return text.includes(query);
  });

  const rootComments = comments.filter(c => !c.parent_id);
  const getRepliesFor = (parentId) => comments.filter(c => c.parent_id === parentId);

  if (view === 'detail' && selectedClub) {
    const isMember = userClubs.includes(String(selectedClub.id));
    
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
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Обложка клуба</label>
              <input 
                type="file" 
                accept="image/*"
                className="form-input" 
                onChange={e => setEditImageFile(e.target.files[0])} 
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
            {selectedClub.image_url && (
              <img 
                src={selectedClub.image_url} 
                alt={selectedClub.name} 
                style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '0.5rem', marginBottom: '1.5rem' }} 
              />
            )}
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
                      image_url: selectedClub.image_url || '',
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
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h4 className="section-title">Участники</h4>

          {members.length === 0 ? (
            <p className="empty-state">В клубе пока нет участников</p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem',
                marginTop: '1rem'
              }}
            >
              {members.map(member => (
                <Link
                  key={member.id}
                  to={`/profile/${member.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    padding: '0.8rem 1rem',
                    borderRadius: '0.8rem',
                    backgroundColor: 'var(--bg-gray)',
                    textDecoration: 'none',
                    color: 'inherit'
                  }}
                >
                  <Avatar src={member.avatar_url} size="38px" />

                  <div>
                    <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                      {member.name} {member.surname}
                    </div>

                    {member.role === 'student' ? (
                      <div style={{ fontSize: '0.85rem', color: '#888' }}>
                        {member.group || 'Группа не указана'} · {member.course || '—'} курс
                      </div>
                    ) : member.role === 'teacher' ? (
                      <div style={{ fontSize: '0.85rem', color: '#888' }}>
                        Преподаватель
                      </div>
                    ) : member.role === 'admin' ? (
                      <div style={{ fontSize: '0.85rem', color: '#888' }}>
                        Администратор
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h4 className="section-title">Обсуждение</h4>

          <div style={{ marginTop: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2rem',
                marginBottom: '1.5rem'
              }}
            >
              {rootComments.length === 0 ? (
                <p
                  style={{
                    color: '#888',
                    fontSize: '0.9rem',
                    textAlign: 'center'
                  }}
                >
                  Пока нет комментариев. Будьте первым!
                </p>
              ) : (
                rootComments.map(c => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                      <Link to={`/profile/${c.user_id}`} style={{ textDecoration: 'none' }}>
                        <Avatar src={c.author_avatar} size="32px" />
                      </Link>

                      <div
                        style={{
                          background: '#f8f9fa',
                          padding: '0.6rem 1rem',
                          borderRadius: '12px',
                          flex: 1
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: '0.2rem'
                          }}
                        >
                          <Link
                            to={`/profile/${c.user_id}`}
                            style={{
                              fontWeight: '600',
                              fontSize: '0.85rem',
                              color: '#2c3e50',
                              textDecoration: 'none'
                            }}
                          >
                            {c.author_name} {c.author_surname}
                          </Link>

                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: '#aaa'
                            }}
                          >
                            {new Date(c.created_at).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: '0.9rem',
                            color: '#333'
                          }}
                        >
                          {c.content}
                        </div>

                        <button
                          onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3498db',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            marginTop: '0.4rem',
                            padding: 0,
                            fontWeight: '500'
                          }}
                        >
                          Ответить
                        </button>
                      </div>
                    </div>

                    {getRepliesFor(c.id).map(reply => (
                      <div
                        key={reply.id}
                        style={{
                          display: 'flex',
                          gap: '0.8rem',
                          marginLeft: '2.5rem',
                          borderLeft: '2px solid #edf2f7',
                          paddingLeft: '0.8rem'
                        }}
                      >
                        <Link to={`/profile/${reply.user_id}`} style={{ textDecoration: 'none' }}>
                          <Avatar src={reply.author_avatar} size="28px" />
                        </Link>

                        <div
                          style={{
                            background: '#f0f2f5',
                            padding: '0.5rem 0.8rem',
                            borderRadius: '12px',
                            flex: 1
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'baseline',
                              marginBottom: '0.2rem'
                            }}
                          >
                            <Link
                              to={`/profile/${reply.user_id}`}
                              style={{
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                color: '#2c3e50',
                                textDecoration: 'none'
                              }}
                            >
                              {reply.author_name} {reply.author_surname}
                            </Link>

                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: '#aaa'
                              }}
                            >
                              {new Date(reply.created_at).toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <div
                            style={{
                              fontSize: '0.85rem',
                              color: '#333'
                            }}
                          >
                            {reply.content}
                          </div>
                        </div>
                      </div>
                    ))}

                    {replyingTo === c.id && (
                      <form
                        onSubmit={(e) => handleAddReply(e, c.id)}
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          marginLeft: '2.5rem',
                          alignItems: 'center'
                        }}
                      >
                        <input
                          type="text"
                          placeholder={`Ответить ${c.author_name}...`}
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          className="form-input"
                          style={{
                            flex: 1,
                            marginBottom: 0,
                            padding: '0.5rem 0.8rem',
                            borderRadius: '20px',
                            fontSize: '0.85rem'
                          }}
                        />

                        <button
                          type="submit"
                          disabled={!replyText.trim()}
                          style={{
                            background: replyText.trim() ? '#34495e' : '#dcdde1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                            flexShrink: 0,
                            padding: 0
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ marginLeft: '1px' }}
                          >
                            <path
                              d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      </form>
                    )}
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleAddComment}
              style={{
                display: 'flex',
                gap: '0.8rem',
                alignItems: 'center'
              }}
            >
              <input
                type="text"
                placeholder="Написать комментарий..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                className="form-input"
                style={{
                  flex: 1,
                  marginBottom: 0,
                  padding: '0.7rem 1rem',
                  borderRadius: '20px',
                  width: '100%'
                }}
              />

              <button
                type="submit"
                disabled={!newComment.trim()}
                style={{
                  background: newComment.trim() ? '#4834d4' : '#dcdde1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                  flexShrink: 0,
                  padding: 0,
                  transition: 'background 0.2s ease'
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ marginLeft: '2px' }}
                >
                  <path
                    d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="clubs-page-header">
        <h2 className="page-title" style={{ margin: 0 }}>
          Студенческие клубы
        </h2>

        {isAdmin && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn btn-inline btn-primary"
          >
            {showCreateForm ? 'Отменить' : '+ Добавить'}
          </button>
        )}
      </div>

      <div className="clubs-search-row">
        <input
          type="text"
          className="form-input clubs-search-input"
          placeholder="Поиск по клубам"
          value={clubSearch}
          onChange={(e) => setClubSearch(e.target.value)}
        />
      </div>

      {isAdmin && showCreateForm && (
        <form onSubmit={handleCreateClub} className="card">
          <h4 className="section-title">Новый клуб</h4>
          <div className="form-group">
            <input className="form-input" placeholder="Название клуба" required value={newClub.name} onChange={e => setNewClub({...newClub, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Обложка клуба</label>
            <input 
              type="file" 
              accept="image/*"
              className="form-input" 
              onChange={e => setNewImageFile(e.target.files[0])} 
            />
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

      <div className="clubs-grid">
        {filteredClubs.map(club => {
          const isMember = userClubs.includes(String(club.id));
          return (
            <div key={club.id} className="card club-card flex-column-between" onClick={() => openClubDetails(club)}>
              <div>
                {club.image_url && (
                  <img 
                    src={club.image_url} 
                    alt={club.name} 
                    className="club-card-image"
                  />
                )}
                <div className="club-card-body">
                  <h3 className="card-title">{club.name}</h3>
                  <p className="card-meta">Время: {club.meeting_time}</p>
                  <p className="card-desc" style={{ marginTop: '0.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {club.description}
                  </p>
                </div>
              </div>
              <div
                className="flex-between"
                style={{
                  padding: '0 1.5rem 1.5rem 1.5rem',
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
        {filteredClubs.length === 0 && (
          <p className="empty-state">
            {clubSearch.trim() ? 'Клубы не найдены.' : 'Нет доступных клубов.'}
          </p>
        )}
      </div>
    </div>
  );
}