import { useState, useEffect } from 'react';
import { api, handleError } from '../api';
import PostCard from '../components/PostCard';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [postFiles, setPostFiles] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const loadFeed = async () => {
    try {
      const postsData = await api.fetchPosts();
      setPosts(postsData || []);

      const user = await api.getCurrentUser();
      if (user) setCurrentUserId(user.id);
    } catch (err) {
      handleError(err);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleCommentAddedLocally = (postId) => {
    setPosts(prevPosts => prevPosts.map(p => {
      if (p.id === postId) {
        return { ...p, comments_count: (p.comments_count || 0) + 1 };
      }

      return p;
    }));
  };

  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setPostFiles(files);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setIsPublishing(true);

    try {
      const uploadedUrls = [];

      if (postFiles.length > 0) {
        for (const file of postFiles) {
          const url = await api.uploadImage(file);
          uploadedUrls.push(url);
        }
      }

      await api.createPost({
        title,
        content,
        image_urls: uploadedUrls
      });

      setTitle('');
      setContent('');
      setPostFiles([]);
      loadFeed();
    } catch (err) {
      handleError(err);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleToggleLike = async (postId, isLikedNow) => {
    try {
      await api.toggleLike(postId, !isLikedNow);

      setPosts(posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            is_liked: !isLikedNow,
            likes_count: isLikedNow ? p.likes_count - 1 : p.likes_count + 1
          };
        }

        return p;
      }));
    } catch (err) {
      handleError(err);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот пост?')) return;

    try {
      await api.deletePost(postId);
      setPosts(posts.filter(p => p.id !== postId));
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div className="auth-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>
          Создать новую публикацию
        </h3>

        <form onSubmit={handleCreatePost}>
          <input
            type="text"
            placeholder="Заголовок"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="form-input"
            style={{ marginBottom: '0.8rem' }}
          />

          <textarea
            placeholder="Введите текст..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            className="form-input"
            rows="4"
            style={{
              marginBottom: '1rem',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label
              style={{
                cursor: 'pointer',
                color: '#3498db',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              📷 Прикрепить фото (до 5)
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelection}
              />
            </label>

            <button
              type="submit"
              className="btn btn-success"
              disabled={isPublishing || !title.trim() || !content.trim()}
            >
              {isPublishing ? 'Публикация...' : 'Опубликовать'}
            </button>
          </div>

          {postFiles.length > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#888' }}>
              Выбрано файлов: {postFiles.length}
            </div>
          )}
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3
          style={{
            fontWeight: '600',
            borderBottom: '1px solid #eee',
            paddingBottom: '0.5rem'
          }}
        >
          Лента новостей колледжа
        </h3>

        {posts.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', marginTop: '1rem' }}>
            Здесь пока пусто. Будьте первым, кто напишет пост!
          </p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onDelete={handleDeletePost}
              onToggleLike={handleToggleLike}
              onCommentAdded={handleCommentAddedLocally}
            />
          ))
        )}
      </div>
    </div>
  );
}