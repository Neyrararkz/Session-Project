import { useState, useEffect } from 'react';
import { api, handleError } from '../api';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

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

  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      await api.createPost({ title, content });
      setTitle('');
      setContent('');
      loadFeed(); 
    } catch (err) {
      handleError(err);
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
        <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>Создать новую публикацию</h3>
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
            style={{ marginBottom: '1rem', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
            Опубликовать
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ fontWeight: '600', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
          Лента новостей колледжа
        </h3>
        
        {posts.length === 0 ? (
          <p style={{ textAllign: 'center', color: '#888', marginTop: '1rem' }}>
            Здесь пока пусто. Будьте первым, кто напишет пост!
          </p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="auth-card" style={{ padding: '1.5rem', position: 'relative' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <span style={{ fontWeight: '600', color: '#2c3e50' }}>
                    {post.author_name} {post.author_surname}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#888', marginLeft: '0.5rem' }}>
                    • {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                {currentUserId === post.user_id && (
                  <button 
                    onClick={() => handleDeletePost(post.id)}
                    style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    Удалить
                  </button>
                )}
              </div>

              <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333' }}>{post.title}</h4>
              <p style={{ margin: '0 0 1.2rem 0', color: '#555', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                {post.content}
              </p>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button 
                  onClick={() => handleToggleLike(post.id, post.is_liked)}
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
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{post.is_liked ? '❤️' : '🤍'}</span>
                  <span>{post.likes_count}</span>
                </button>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}