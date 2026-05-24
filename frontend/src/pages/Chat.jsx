import { useEffect, useMemo, useState } from 'react';
import { api, handleError } from '../api';
import Avatar from '../components/Avatar';

export default function Chat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const userData = await api.getCurrentUser();
      const friendsData = await api.fetchFriends();
      const chatsData = await api.fetchChats();

      setCurrentUser(userData);
      setFriends(friendsData || []);
      setChats(chatsData || []);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const loadChats = async () => {
    try {
      const chatsData = await api.fetchChats();
      setChats(chatsData || []);
    } catch (err) {
      handleError(err);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      setMessagesLoading(true);
      const data = await api.fetchMessages(chatId);
      setMessages(data || []);
    } catch (err) {
      handleError(err);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const getOtherMember = (chat) => {
    if (!currentUser || !chat?.members) return null;
    return chat.members.find(member => member.id !== currentUser.id) || null;
  };

  const getChatTitle = (chat) => {
    if (!chat) return '';

    if (chat.type === 'group') {
      return chat.name || 'Групповой чат';
    }

    const other = getOtherMember(chat);
    if (!other) return 'Личный чат';

    return `${other.name} ${other.surname}`;
  };

  const getChatSubtitle = (chat) => {
    if (!chat) return '';

    if (chat.type === 'group') {
      return `${chat.members?.length || 0} участников`;
    }

    const other = getOtherMember(chat);

    if (other?.role === 'teacher') return 'Преподаватель';
    if (other?.role === 'admin') return 'Администратор';

    return 'Студент';
  };

  const getChatAvatar = (chat) => {
    if (!chat || chat.type === 'group') return '';
    return getOtherMember(chat)?.avatar_url || '';
  };

  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const aName = `${a.name} ${a.surname}`;
      const bName = `${b.name} ${b.surname}`;
      return aName.localeCompare(bName);
    });
  }, [friends]);

  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);
    await loadMessages(chat.id);
  };

  const handleStartDirectChat = async (friendId) => {
    try {
      const chat = await api.createDirectChat(friendId);
      await loadChats();
      setSelectedChat(chat);
      await loadMessages(chat.id);
    } catch (err) {
      handleError(err);
    }
  };

  const handleToggleGroupMember = (friendId) => {
    setSelectedMemberIds(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId);
      }

      return [...prev, friendId];
    });
  };

  const handleCreateGroupChat = async (e) => {
    e.preventDefault();

    if (!groupName.trim()) return;

    try {
      const chat = await api.createGroupChat({
        name: groupName,
        member_ids: selectedMemberIds
      });

      setGroupName('');
      setSelectedMemberIds([]);
      setShowGroupForm(false);

      await loadChats();
      setSelectedChat(chat);
      await loadMessages(chat.id);
    } catch (err) {
      handleError(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!selectedChat || !messageText.trim()) return;

    try {
      const message = await api.sendMessage(selectedChat.id, messageText);
      setMessages(prev => [...prev, message]);
      setMessageText('');
      await loadChats();
    } catch (err) {
      handleError(err);
    }
  };

  if (loading) {
    return <div className="empty-state">Загрузка чатов...</div>;
  }

  return (
    <div className="chat-page">
      <div className="chat-page-header">
        <div>
          <h1 className="page-title">Сообщения</h1>
          <p className="chat-page-subtitle">
            Личные и групповые переписки внутри ITSTEP Social
          </p>
        </div>

        <button
          className="btn btn-inline btn-primary"
          onClick={() => setShowGroupForm(!showGroupForm)}
        >
          {showGroupForm ? 'Скрыть' : '+ Групповой чат'}
        </button>
      </div>

      {showGroupForm && (
        <form onSubmit={handleCreateGroupChat} className="card chat-group-form">
          <h3 className="section-title">Новый групповой чат</h3>

          <div className="form-group">
            <input
              className="form-input"
              placeholder="Название чата"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="chat-friends-picker">
            {sortedFriends.length === 0 ? (
              <p className="empty-state">Чтобы создать групповой чат, сначала добавьте друзей.</p>
            ) : (
              sortedFriends.map(friend => (
                <label key={friend.id} className="chat-friend-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(friend.id)}
                    onChange={() => handleToggleGroupMember(friend.id)}
                  />

                  <Avatar src={friend.avatar_url} size="34px" />

                  <span>{friend.name} {friend.surname}</span>
                </label>
              ))
            )}
          </div>

          <button
            type="submit"
            className="btn btn-success"
            disabled={!groupName.trim() || selectedMemberIds.length === 0}
          >
            Создать чат
          </button>
        </form>
      )}

      <div className="chat-container">
        <aside className="chat-sidebar">
          <div className="chat-sidebar-section">
            <h3 className="chat-sidebar-title">Чаты</h3>

            {chats.length === 0 ? (
              <p className="chat-sidebar-empty">Пока нет диалогов</p>
            ) : (
              chats.map(chat => (
                <button
                  key={chat.id}
                  className={`chat-list-item ${selectedChat?.id === chat.id ? 'chat-list-item-active' : ''}`}
                  onClick={() => handleSelectChat(chat)}
                >
                  {chat.type === 'group' ? (
                    <div className="chat-group-avatar">#</div>
                  ) : (
                    <Avatar src={getChatAvatar(chat)} size="40px" />
                  )}

                  <div className="chat-list-text">
                    <span className="chat-list-title">{getChatTitle(chat)}</span>
                    <span className="chat-list-subtitle">
                      {chat.last_message || getChatSubtitle(chat)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="chat-sidebar-section">
            <h3 className="chat-sidebar-title">Начать личный чат</h3>

            {sortedFriends.length === 0 ? (
              <p className="chat-sidebar-empty">Список друзей пуст</p>
            ) : (
              sortedFriends.map(friend => (
                <button
                  key={friend.id}
                  className="chat-list-item"
                  onClick={() => handleStartDirectChat(friend.id)}
                >
                  <Avatar src={friend.avatar_url} size="40px" />

                  <div className="chat-list-text">
                    <span className="chat-list-title">{friend.name} {friend.surname}</span>
                    <span className="chat-list-subtitle">
                      {friend.role === 'teacher' ? 'Преподаватель' : friend.role === 'admin' ? 'Администратор' : friend.group || 'Студент'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="chat-main">
          {!selectedChat ? (
            <div className="chat-empty-panel">
              <h3>Выберите чат</h3>
              <p>Откройте существующий диалог или начните новый чат с другом.</p>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <div>
                  <h3>{getChatTitle(selectedChat)}</h3>
                  <p>{getChatSubtitle(selectedChat)}</p>
                </div>
              </div>

              <div className="chat-messages">
                {messagesLoading ? (
                  <p className="empty-state">Загрузка сообщений...</p>
                ) : messages.length === 0 ? (
                  <p className="empty-state">Сообщений пока нет. Напишите первым!</p>
                ) : (
                  messages.map(message => {
                    const isMine = message.sender_id === currentUser?.id;

                    return (
                      <div
                        key={message.id}
                        className={`msg ${isMine ? 'msg-me' : 'msg-other'}`}
                      >
                        {!isMine && (
                          <div className="msg-sender">
                            {message.sender?.name} {message.sender?.surname}
                          </div>
                        )}

                        <div>{message.text}</div>

                        <div className="msg-time">
                          {new Date(message.created_at).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSendMessage} className="chat-form">
                <input
                  className="form-input chat-input"
                  placeholder="Написать сообщение..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />

                <button
                  type="submit"
                  className="btn btn-inline btn-primary"
                  disabled={!messageText.trim()}
                >
                  Отправить
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}