import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [commentText, setCommentText] = useState({});

  useEffect(() => { api.getPosts().then(setPosts); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    const post = await api.createPost({ content: newPost });
    setPosts([post, ...posts]);
    setNewPost('');
  };

  const handleLike = (id) => {
    setPosts(posts.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
  };

  const handleAddComment = (postId) => {
    if (!commentText[postId]?.trim()) return;
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return { ...p, comments: [...p.comments, { id: Date.now(), author: 'Вы', text: commentText[postId] }] };
      }
      return p;
    }));
    setCommentText({ ...commentText, [postId]: '' });
  };

  const startEdit = (post) => { setEditingId(post.id); setEditingContent(post.content); };
  const saveEdit = (id) => { setPosts(posts.map(p => p.id === id ? { ...p, content: editingContent } : p)); setEditingId(null); };
  const deletePost = (id) => { setPosts(posts.filter(p => p.id !== id)); };

  const filteredPosts = posts.filter(p => p.content.toLowerCase().includes(searchQuery.toLowerCase()) || p.author.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div>
      <input type="text" placeholder="🔍 Живой поиск по студенческой соцсети (посты, авторы)..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="search-input" />

      <form onSubmit={handleCreate} className="card">
        <textarea placeholder="Поделитесь новостью или вопросом с колледжем..." value={newPost} onChange={e => setNewPost(e.target.value)} className="post-textarea" />
        <button type="submit" className="btn btn-primary btn-inline">Опубликовать пост</button>
      </form>

      <div>
        {filteredPosts.map(post => (
          <div key={post.id} className="card">
            <div className="post-header">
              <div>
                <span className="post-author">{post.author}</span>
                <span className="post-date">• {post.date}</span>
              </div>
              {post.author === 'Вы' && (
                <div className="post-actions">
                  <button onClick={() => startEdit(post)} className="btn-icon">Изменить</button>
                  <button onClick={() => deletePost(post.id)} className="btn-icon btn-icon-danger">Удалить</button>
                </div>
              )}
            </div>

            {editingId === post.id ? (
              <div style={{ marginBottom: '1rem' }}>
                <input type="text" value={editingContent} onChange={e => setEditingContent(e.target.value)} className="form-input" style={{ marginBottom: '0.5rem' }} />
                <button onClick={() => saveEdit(post.id)} className="btn btn-success btn-inline" style={{ padding: '0.25rem 1rem', fontSize: '0.85rem' }}>Сохранить</button>
              </div>
            ) : (
              <p className="post-content">{post.content}</p>
            )}

            <button onClick={() => handleLike(post.id)} className="like-btn">
              ❤️ {post.likes}
            </button>

            <div className="comment-section">
              {post.comments.map(c => (
                <div key={c.id} className="comment-item">
                  <strong>{c.author}:</strong> {c.text}
                </div>
              ))}
              <div className="comment-form">
                <input type="text" placeholder="Написать комментарий к посту..." value={commentText[post.id] || ''} onChange={e => setCommentText({...commentText, [post.id]: e.target.value})} className="form-input" />
                <button onClick={() => handleAddComment(post.id)} className="btn btn-primary btn-inline" style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}>Ответить</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}