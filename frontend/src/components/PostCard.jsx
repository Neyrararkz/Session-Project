import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, handleError } from '../api';
import Avatar from './Avatar';

export default function PostCard({ post, currentUserId, onDelete, onToggleLike, onCommentAdded, onUpdate }) {
  const [displayPost, setDisplayPost] = useState(post);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || '');
  const [editContent, setEditContent] = useState(post.content || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    setDisplayPost(post);

    if (!isEditing) {
      setEditTitle(post.title || '');
      setEditContent(post.content || '');
    }
  }, [post]);

  const images = displayPost.image_urls || [];
  const isOwnPost = currentUserId === displayPost.user_id;

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
      const data = await api.getPostComments(displayPost.id);
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

  const handleStartEdit = () => {
    setEditTitle(displayPost.title || '');
    setEditContent(displayPost.content || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditTitle(displayPost.title || '');
    setEditContent(displayPost.content || '');
    setIsEditing(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editTitle.trim() || !editContent.trim()) return;

    try {
      setIsSavingEdit(true);

      const response = await api.updatePost(displayPost.id, {
        title: editTitle,
        content: editContent,
        image_urls: images
      });

      if (response.post) {
        setDisplayPost(response.post);

        if (onUpdate) {
          onUpdate(response.post);
        }
      }

      setIsEditing(false);
    } catch (err) {
      handleError(err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();

    if (!newComment.trim()) return;

    try {
      await api.addPostComment(displayPost.id, newComment, null);
      setNewComment('');
      await loadComments();

      setDisplayPost(prev => ({
        ...prev,
        comments_count: (prev.comments_count || 0) + 1
      }));

      if (onCommentAdded) {
        onCommentAdded(displayPost.id);
      }
    } catch (err) {
      handleError(err);
    }
  };

  const handleReplySubmit = async (e, parentId) => {
    e.preventDefault();

    if (!replyContent.trim()) return;

    try {
      await api.addPostComment(displayPost.id, replyContent, parentId);
      setReplyContent('');
      setReplyingToId(null);
      await loadComments();

      setDisplayPost(prev => ({
        ...prev,
        comments_count: (prev.comments_count || 0) + 1
      }));

      if (onCommentAdded) {
        onCommentAdded(displayPost.id);
      }
    } catch (err) {
      handleError(err);
    }
  };

  const rootComments = comments.filter(c => !c.parent_id);
  const getRepliesFor = (parentId) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="card feed-card post-card">
      <div className="post-card-header">
        <Link to={`/profile/${displayPost.user_id}`} className="post-author-link">
          <Avatar src={displayPost.author_avatar} size="40px" />

          <div>
            <span className="post-author-name">
              {displayPost.author_name} {displayPost.author_surname}
            </span>

            <span className="post-date">
              {new Date(displayPost.created_at).toLocaleDateString()}
            </span>
          </div>
        </Link>

        {isOwnPost && !isEditing && (
          <div className="post-owner-actions">
            <button
              type="button"
              className="post-icon-action"
              onClick={handleStartEdit}
              title="Редактировать"
            >
              <img src="/icons/edit.svg" alt="" />
            </button>

            {onDelete && (
              <button
                type="button"
                className="post-icon-action post-icon-action-danger"
                onClick={() => onDelete(displayPost.id)}
                title="Удалить"
              >
                <img src="/icons/delete.svg" alt="" />
              </button>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleEditSubmit} className="post-edit-form">
          <input
            type="text"
            className="form-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Заголовок"
          />

          <textarea
            className="form-input"
            rows="4"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Текст поста"
          />

          <div className="post-edit-actions">
            <button
              type="button"
              className="btn btn-inline btn-secondary"
              onClick={handleCancelEdit}
            >
              Отмена
            </button>

            <button
              type="submit"
              className="btn btn-inline btn-primary"
              disabled={!editTitle.trim() || !editContent.trim() || isSavingEdit}
            >
              {isSavingEdit ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <h4 className="post-title">{displayPost.title}</h4>

          <p className="post-text">{displayPost.content}</p>
        </>
      )}

      {images.length > 0 && (
        <div className="post-media">
          <img
            src={images[currentImgIndex]}
            alt="Media"
            className="post-media-image"
          />

          {images.length > 1 && (
            <>
              {currentImgIndex > 0 && (
                <button
                  type="button"
                  onClick={prevImg}
                  className="post-media-nav post-media-nav-left"
                >
                  ‹
                </button>
              )}

              {currentImgIndex < images.length - 1 && (
                <button
                  type="button"
                  onClick={nextImg}
                  className="post-media-nav post-media-nav-right"
                >
                  ›
                </button>
              )}

              <div className="post-media-count">
                {currentImgIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}

      <div className="post-actions-row">
        <button
          type="button"
          onClick={() => onToggleLike(displayPost.id, displayPost.is_liked)}
          className={`post-action-button post-like-button ${displayPost.is_liked ? 'post-like-button-active' : ''}`}
        >
          <img
            src={displayPost.is_liked ? '/icons/like-filled.svg' : '/icons/like.svg'}
            alt=""
            className="post-action-icon"
          />

          <span>{displayPost.likes_count}</span>
        </button>

        <button
          type="button"
          onClick={handleToggleComments}
          className={`post-action-button post-comments-button ${showComments ? 'post-comments-button-active' : ''}`}
        >          
          <img
            src={showComments ? '/icons/chevron-up.svg' : '/icons/chevron-down.svg'}
            alt=""
            className="post-action-chevron"
          />
          <span>Комментарии ({displayPost.comments_count || 0})</span>
        </button>
      </div>

      {showComments && (
        <div className="post-comments-section">
          <div className="post-comments-list">
            {rootComments.length === 0 ? (
              <p className="post-comments-empty">
                Пока нет комментариев. Будьте первым!
              </p>
            ) : (
              rootComments.map(c => (
                <div key={c.id} className="post-comment-thread">
                  <div className="post-comment">
                    <Link to={`/profile/${c.user_id}`} className="post-comment-avatar">
                      <Avatar src={c.author_avatar} size="32px" />
                    </Link>

                    <div className="post-comment-bubble">
                      <div className="post-comment-top">
                        <Link to={`/profile/${c.user_id}`} className="post-comment-author">
                          {c.author_name} {c.author_surname}
                        </Link>

                        <span className="post-comment-date">
                          {new Date(c.created_at).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div className="post-comment-text">{c.content}</div>

                      <button
                        type="button"
                        onClick={() => setReplyingToId(replyingToId === c.id ? null : c.id)}
                        className="post-reply-button"
                      >
                        Ответить
                      </button>
                    </div>
                  </div>

                  {getRepliesFor(c.id).map(reply => (
                    <div key={reply.id} className="post-reply">
                      <Link to={`/profile/${reply.user_id}`} className="post-comment-avatar">
                        <Avatar src={reply.author_avatar} size="28px" />
                      </Link>

                      <div className="post-comment-bubble post-reply-bubble">
                        <div className="post-comment-top">
                          <Link to={`/profile/${reply.user_id}`} className="post-comment-author">
                            {reply.author_name} {reply.author_surname}
                          </Link>

                          <span className="post-comment-date">
                            {new Date(reply.created_at).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <div className="post-comment-text">{reply.content}</div>
                      </div>
                    </div>
                  ))}

                  {replyingToId === c.id && (
                    <form
                      onSubmit={(e) => handleReplySubmit(e, c.id)}
                      className="post-reply-form"
                    >
                      <input
                        type="text"
                        placeholder={`Ответить ${c.author_name}...`}
                        value={replyContent}
                        onChange={e => setReplyContent(e.target.value)}
                        className="form-input post-comment-input"
                      />

                      <button
                        type="submit"
                        disabled={!replyContent.trim()}
                        className="post-comment-send-button"
                      >
                        <img src="/icons/send.svg" alt="" />
                      </button>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleCommentSubmit} className="post-comment-form">
            <input
              type="text"
              placeholder="Написать комментарий..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              className="form-input post-comment-input"
            />

            <button
              type="submit"
              disabled={!newComment.trim()}
              className="post-comment-send-button post-comment-send-button-large"
            >
              <img src="/icons/send.svg" alt="" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}