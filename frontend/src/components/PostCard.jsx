import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, handleError } from '../api';
import Avatar from './Avatar';

export default function PostCard({ post, currentUserId, onDelete, onToggleLike, onCommentAdded }) {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  const images = post.image_urls || [];

  const nextImg = () => {
    if (currentImgIndex < images.length - 1) {
      setCurrentImgIndex(prev => prev + 1);
    }
  };

  const prevImg = () => {
    if (currentImgIndex > 0) {
      setCurrentImgIndex(prev => prev - 1);
    }
  };

  const loadComments = async () => {
    try {
      const data = await api.getPostComments(post.id);
      setComments(data || []);
    } catch (err) {
      console.error('Ошибка загрузки комментариев:', err);
    }
  };

  const handleToggleComments = async () => {
    if (!showComments) {
      await loadComments();
    }

    setShowComments(!showComments);
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();

    if (!newComment.trim()) return;

    try {
      await api.addPostComment(post.id, newComment, null);
      setNewComment('');
      await loadComments();

      if (onCommentAdded) {
        onCommentAdded(post.id);
      }
    } catch (err) {
      handleError(err);
    }
  };

  const handleReplySubmit = async (e, parentId) => {
    e.preventDefault();

    if (!replyContent.trim()) return;

    try {
      await api.addPostComment(post.id, replyContent, parentId);
      setReplyContent('');
      setReplyingToId(null);
      await loadComments();

      if (onCommentAdded) {
        onCommentAdded(post.id);
      }
    } catch (err) {
      handleError(err);
    }
  };

  const rootComments = comments.filter(c => !c.parent_id);
  const getRepliesFor = (parentId) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="card feed-card" style={{ padding: '1.5rem', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Link
          to={`/profile/${post.user_id}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            textDecoration: 'none'
          }}
        >
          <Avatar src={post.author_avatar} size="40px" />

          <div>
            <span style={{ fontWeight: '600', color: '#2c3e50', display: 'block' }}>
              {post.author_name} {post.author_surname}
            </span>

            <span style={{ fontSize: '0.85rem', color: '#888' }}>
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>
        </Link>

        {currentUserId === post.user_id && onDelete && (
          <button
            onClick={() => onDelete(post.id)}
            style={{
              background: 'none',
              border: 'none',
              color: '#e74c3c',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Удалить
          </button>
        )}
      </div>

      <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333' }}>
        {post.title}
      </h4>

      <p
        style={{
          margin: '0 0 1.2rem 0',
          color: '#555',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap'
        }}
      >
        {post.content}
      </p>

      {images.length > 0 && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '1.2rem',
            backgroundColor: '#f8f9fa',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <img
            src={images[currentImgIndex]}
            alt="Media"
            style={{
              maxWidth: '100%',
              maxHeight: '400px',
              objectFit: 'contain',
              display: 'block'
            }}
          />

          {images.length > 1 && (
            <>
              {currentImgIndex > 0 && (
                <button
                  onClick={prevImg}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.8)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer'
                  }}
                >
                  ←
                </button>
              )}

              {currentImgIndex < images.length - 1 && (
                <button
                  onClick={nextImg}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.8)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer'
                  }}
                >
                  →
                </button>
              )}

              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '0.8rem'
                }}
              >
                {currentImgIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => onToggleLike(post.id, post.is_liked)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: post.is_liked ? '#e8f8f5' : '#f8f9fa',
            border: '1px solid',
            borderColor: post.is_liked ? '#2ecc71' : '#ddd',
            color: post.is_liked ? '#2ecc71' : '#555',
            padding: '0.4rem 0.8rem',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          <span>{post.is_liked ? '❤️' : '🤍'}</span>
          <span>{post.likes_count}</span>
        </button>

        <button
          onClick={handleToggleComments}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: showComments ? '#eef2f5' : '#f8f9fa',
            border: '1px solid #ddd',
            color: '#555',
            padding: '0.4rem 0.8rem',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          <span>💬</span>
          <span>Комментарии ({post.comments_count || 0})</span>
        </button>
      </div>

      {showComments && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '1.5rem' }}>
            {rootComments.length === 0 ? (
              <p style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center' }}>
                Пока нет комментариев. Будьте первым!
              </p>
            ) : (
              rootComments.map(c => (
                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <Link to={`/profile/${c.user_id}`} style={{ textDecoration: 'none' }}>
                      <Avatar src={c.author_avatar} size="32px" />
                    </Link>

                    <div style={{ background: '#f8f9fa', padding: '0.6rem 1rem', borderRadius: '12px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem' }}>
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

                        <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                          {new Date(c.created_at).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.9rem', color: '#333' }}>
                        {c.content}
                      </div>

                      <button
                        onClick={() => setReplyingToId(replyingToId === c.id ? null : c.id)}
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

                      <div style={{ background: '#f0f2f5', padding: '0.5rem 0.8rem', borderRadius: '12px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem' }}>
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

                          <span style={{ fontSize: '0.7rem', color: '#aaa' }}>
                            {new Date(reply.created_at).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.85rem', color: '#333' }}>
                          {reply.content}
                        </div>
                      </div>
                    </div>
                  ))}

                  {replyingToId === c.id && (
                    <form
                      onSubmit={(e) => handleReplySubmit(e, c.id)}
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
                        value={replyContent}
                        onChange={e => setReplyContent(e.target.value)}
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
                        disabled={!replyContent.trim()}
                        style={{
                          background: replyContent.trim() ? '#34495e' : '#dcdde1',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: replyContent.trim() ? 'pointer' : 'not-allowed',
                          flexShrink: 0,
                          padding: 0
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '1px' }}>
                          <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor" />
                        </svg>
                      </button>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleCommentSubmit}
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '2px' }}>
                <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}