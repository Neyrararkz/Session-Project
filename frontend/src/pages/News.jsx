import { useEffect, useState } from 'react';
import { api, handleError } from '../api';
import { useAuth } from '../context/AuthContext';

function NewsCard({ item, isAdmin, onDelete, onUpdate }) {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title || '');
  const [editContent, setEditContent] = useState(item.content || '');
  const [editImages, setEditImages] = useState(item.image_urls || []);
  const [editImageFiles, setEditImageFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const images = item.image_urls || [];

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

  const startEdit = () => {
    setEditTitle(item.title || '');
    setEditContent(item.content || '');
    setEditImages(item.image_urls || []);
    setEditImageFiles([]);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditImageFiles([]);
  };

  const removeEditImage = (imageUrl) => {
    setEditImages(prev => prev.filter(url => url !== imageUrl));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!editTitle.trim() || !editContent.trim()) return;

    try {
      setSaving(true);

      const uploadedImages = await Promise.all(
        Array.from(editImageFiles).map(file => api.uploadImage(file))
      );

      const updated = await api.updateNews(item.id, {
        title: editTitle,
        content: editContent,
        image_urls: [...editImages, ...uploadedImages]
      });

      onUpdate(updated);
      setIsEditing(false);
      setEditImageFiles([]);
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card news-card">
      <div className="news-card-top">
        <span className="news-date">
          {new Date(item.created_at).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })}
        </span>

        {isAdmin && !isEditing && (
          <div className="post-owner-actions">
            <button
              type="button"
              className="post-icon-action"
              onClick={startEdit}
              title="Редактировать"
            >
              <img src="/icons/edit.svg" alt="" />
            </button>

            <button
              type="button"
              className="post-icon-action post-icon-action-danger"
              onClick={() => onDelete(item.id)}
              title="Удалить"
            >
              <img src="/icons/delete.svg" alt="" />
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="news-edit-form">
          <input
            className="form-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Заголовок новости"
          />

          <textarea
            className="form-input"
            rows="5"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Текст новости"
          />

          {editImages.length > 0 && (
            <div className="news-edit-images">
              {editImages.map(image => (
                <div key={image} className="news-edit-image-item">
                  <img src={image} alt="" />

                  <button
                    type="button"
                    onClick={() => removeEditImage(image)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Добавить изображения</label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="form-input"
              onChange={(e) => setEditImageFiles(e.target.files)}
            />
          </div>

          <div className="news-form-actions">
            <button
              type="button"
              className="btn btn-inline btn-secondary"
              onClick={cancelEdit}
            >
              Отмена
            </button>

            <button
              type="submit"
              className="btn btn-inline btn-primary"
              disabled={saving || !editTitle.trim() || !editContent.trim()}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      ) : (
        <>
          {images.length > 0 && (
            <div className="news-media">
              <img
                src={images[currentImgIndex]}
                alt=""
                className="news-media-image"
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

          <h2 className="news-title">{item.title}</h2>
          <p className="news-content">{item.content}</p>
        </>
      )}
    </div>
  );
}

export default function News() {
  const { user } = useAuth();

  const [news, setNews] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadNews = async () => {
    try {
      setLoading(true);
      const data = await api.fetchNews();
      setNews(data || []);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setImageFiles([]);
  };

  const handleCreateNews = async (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) return;

    try {
      setCreating(true);

      const uploadedImages = await Promise.all(
        Array.from(imageFiles).map(file => api.uploadImage(file))
      );

      const created = await api.createNews({
        title,
        content,
        image_urls: uploadedImages
      });

      setNews(prev => [created, ...prev]);
      resetForm();
      setShowCreateForm(false);
    } catch (err) {
      handleError(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteNews = async (id) => {
    if (!window.confirm('Удалить эту новость?')) return;

    try {
      await api.deleteNews(id);
      setNews(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      handleError(err);
    }
  };

  const handleUpdateNews = (updatedNews) => {
    setNews(prev => prev.map(item => {
      if (item.id === updatedNews.id) {
        return updatedNews;
      }

      return item;
    }));
  };

  return (
    <div className="news-page">
      <div className="news-page-header">
        <div>
          <h1 className="page-title">Новости</h1>
          <p className="news-page-subtitle">
            Официальные объявления и важные события ITSTEP
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn btn-inline btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Отменить' : '+ Добавить новость'}
          </button>
        )}
      </div>

      {isAdmin && showCreateForm && (
        <form onSubmit={handleCreateNews} className="card news-create-form">
          <h3 className="section-title">Новая новость</h3>

          <div className="form-group">
            <input
              className="form-input"
              placeholder="Заголовок"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <textarea
              className="form-input"
              rows="5"
              placeholder="Основной текст новости"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Изображения</label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="form-input"
              onChange={(e) => setImageFiles(e.target.files)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-success"
            disabled={creating || !title.trim() || !content.trim()}
          >
            {creating ? 'Публикация...' : 'Опубликовать'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="empty-state">Загрузка новостей...</p>
      ) : news.length === 0 ? (
        <p className="empty-state">Новостей пока нет.</p>
      ) : (
        <div className="news-list">
          {news.map(item => (
            <NewsCard
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              onDelete={handleDeleteNews}
              onUpdate={handleUpdateNews}
            />
          ))}
        </div>
      )}
    </div>
  );
}