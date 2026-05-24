import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchStatuses, setUserSearchStatuses] = useState({});
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [friendRequestLoadingId, setFriendRequestLoadingId] = useState(null);

  const [showChatSettings, setShowChatSettings] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsImageFile, setSettingsImageFile] = useState(null);
  const [settingsImageURL, setSettingsImageURL] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [memberStatuses, setMemberStatuses] = useState({});

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
      window.dispatchEvent(new Event('chats-updated'));
      return chatsData || [];
    } catch (err) {
      handleError(err);
      return [];
    }
  };

  const loadMessages = async (chatId) => {
    try {
      setMessagesLoading(true);
      const data = await api.fetchMessages(chatId);
      setMessages(data || []);
      window.dispatchEvent(new Event('chats-updated'));
    } catch (err) {
      handleError(err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const searchUsers = async (query) => {
    const trimmed = query.trim();

    if (!trimmed) {
      setUserSearchResults([]);
      setUserSearchStatuses({});
      return;
    }

    try {
      setUserSearchLoading(true);

      const users = await api.searchUsers(trimmed);
      setUserSearchResults(users || []);

      const statuses = {};

      await Promise.all((users || []).map(async (foundUser) => {
        try {
          const status = await api.getFriendshipStatus(foundUser.id);
          statuses[foundUser.id] = status;
        } catch (err) {
          statuses[foundUser.id] = null;
        }
      }));

      setUserSearchStatuses(statuses);
    } catch (err) {
      handleError(err);
    } finally {
      setUserSearchLoading(false);
    }
  };

  const loadMemberStatuses = async (chat) => {
    if (!chat || !currentUser || !chat.members) return;

    const statuses = {};

    await Promise.all(chat.members.map(async (member) => {
      if (member.id === currentUser.id) return;

      try {
        const status = await api.getFriendshipStatus(member.id);
        statuses[member.id] = status;
      } catch (err) {
        statuses[member.id] = null;
      }
    }));

    setMemberStatuses(statuses);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchUsers(userSearch);
    }, 350);

    return () => clearTimeout(timeout);
  }, [userSearch]);

  useEffect(() => {
    if (showChatSettings && selectedChat) {
      loadMemberStatuses(selectedChat);
    }
  }, [showChatSettings, selectedChat]);

  const getOtherMember = (chat) => {
    if (!currentUser || !chat?.members) return null;
    return chat.members.find(member => member.id !== currentUser.id) || null;
  };

  const getChatTitle = (chat) => {
    if (!chat) return '';

    if (chat.type === 'group' || chat.type === 'club') {
      return chat.name || (chat.type === 'club' ? 'Чат клуба' : 'Групповой чат');
    }

    const other = getOtherMember(chat);
    if (!other) return 'Личный чат';

    return `${other.name} ${other.surname}`;
  };

  const getChatSubtitle = (chat) => {
    if (!chat) return '';

    if (chat.type === 'club') {
      return `${chat.members?.length || 0} участников клуба`;
    }

    if (chat.type === 'group') {
      return `${chat.members?.length || 0} участников`;
    }

    const other = getOtherMember(chat);

    if (other?.role === 'teacher') return 'Преподаватель';
    if (other?.role === 'admin') return 'Администратор';

    return other?.group || 'Студент';
  };

  const getChatAvatar = (chat) => {
    if (!chat) return '';

    if (chat.type === 'group' || chat.type === 'club') {
      return chat.image_url || '';
    }

    return getOtherMember(chat)?.avatar_url || '';
  };

  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const aName = `${a.name} ${a.surname}`;
      const bName = `${b.name} ${b.surname}`;
      return aName.localeCompare(bName);
    });
  }, [friends]);

  const friendIds = useMemo(() => {
    return new Set(friends.map(friend => friend.id));
  }, [friends]);

  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);
    setShowChatSettings(false);
    await loadMessages(chat.id);
    const updatedChats = await loadChats();
    const freshChat = updatedChats.find(item => item.id === chat.id);

    if (freshChat) {
      setSelectedChat(freshChat);
    }
  };

  const handleStartDirectChat = async (userId) => {
    try {
      const chat = await api.createDirectChat(userId);
      await loadChats();
      setSelectedChat(chat);
      setUserSearch('');
      setUserSearchResults([]);
      await loadMessages(chat.id);
    } catch (err) {
      handleError(err);
    }
  };

  const handleSendFriendRequest = async (e, userId) => {
    e.stopPropagation();

    try {
      setFriendRequestLoadingId(userId);

      await api.sendFriendRequest(userId);

      setUserSearchStatuses(prev => ({
        ...prev,
        [userId]: {
          status: 'outgoing_pending',
          request_id: 0
        }
      }));

      setMemberStatuses(prev => ({
        ...prev,
        [userId]: {
          status: 'outgoing_pending',
          request_id: 0
        }
      }));

      window.dispatchEvent(new Event('friends-updated'));
    } catch (err) {
      handleError(err);
    } finally {
      setFriendRequestLoadingId(null);
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

  const openChatSettings = () => {
    if (!selectedChat || selectedChat.type === 'direct') return;

    setSettingsName(selectedChat.name || '');
    setSettingsDescription(selectedChat.description || '');
    setSettingsImageURL(selectedChat.image_url || '');
    setSettingsImageFile(null);
    setShowChatSettings(true);
  };

  const handleSaveChatSettings = async (e) => {
    e.preventDefault();

    if (!selectedChat) return;

    try {
      setSettingsSaving(true);

      let imageURL = settingsImageURL;

      if (settingsImageFile) {
        imageURL = await api.uploadImage(settingsImageFile);
      }

      const response = await api.updateChat(selectedChat.id, {
        name: settingsName,
        description: settingsDescription,
        image_url: imageURL
      });

      if (response.chat) {
        setSelectedChat(response.chat);
        setChats(prev => prev.map(chat => chat.id === response.chat.id ? response.chat : chat));
      }

      setShowChatSettings(false);
      window.dispatchEvent(new Event('chats-updated'));
    } catch (err) {
      handleError(err);
    } finally {
      setSettingsSaving(false);
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
        </div>
      </div>

      <div className="chat-container">
        <aside className="chat-sidebar">
          <div className="chat-sidebar-scroll">
            <div className="chat-sidebar-section chat-search-section">
              <input
                className="form-input chat-user-search-input"
                placeholder="Найти пользователя..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />

              {userSearch.trim() && (
                <div className="chat-search-results">
                  {userSearchLoading ? (
                    <p className="chat-sidebar-empty">Ищем...</p>
                  ) : userSearchResults.length === 0 ? (
                    <p className="chat-sidebar-empty">Пользователи не найдены</p>
                  ) : (
                    userSearchResults.map(foundUser => (
                      <button
                        key={foundUser.id}
                        className="chat-search-user"
                        onClick={() => handleStartDirectChat(foundUser.id)}
                      >
                        <Avatar src={foundUser.avatar_url} size="36px" />

                        <div className="chat-list-text">
                          <span className="chat-list-title">
                            {foundUser.name} {foundUser.surname}
                          </span>

                          <span className="chat-list-subtitle">
                            {foundUser.role === 'teacher'
                              ? 'Преподаватель'
                              : foundUser.role === 'admin'
                                ? 'Администратор'
                                : foundUser.group || 'Студент'}
                          </span>
                        </div>

                        {!friendIds.has(foundUser.id) && userSearchStatuses[foundUser.id]?.status === 'none' && (
                          <span
                            className="chat-add-friend-button"
                            onClick={(e) => handleSendFriendRequest(e, foundUser.id)}
                            title="Добавить в друзья"
                          >
                            {friendRequestLoadingId === foundUser.id ? (
                              <span className="chat-add-friend-loading">...</span>
                            ) : (
                              <img src="/icons/add-friend.svg" alt="" />
                            )}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

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
                    {chat.type === 'group' || chat.type === 'club' ? (
                      getChatAvatar(chat) ? (
                        <Avatar src={getChatAvatar(chat)} size="40px" />
                      ) : (
                        <div className="chat-group-avatar">
                          {chat.type === 'club' ? 'C' : '#'}
                        </div>
                      )
                    ) : (
                      <Avatar src={getChatAvatar(chat)} size="40px" />
                    )}

                    <div className="chat-list-text">
                      <span className="chat-list-title">{getChatTitle(chat)}</span>
                      <span className="chat-list-subtitle">
                        {chat.last_message || getChatSubtitle(chat)}
                      </span>
                    </div>

                    {chat.unread_count > 0 && (
                      <span className="chat-unread-badge">{chat.unread_count}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="chat-sidebar-footer">
            {showGroupForm && (
              <form onSubmit={handleCreateGroupChat} className="chat-group-inline-form">
                <input
                  className="form-input"
                  placeholder="Название чата"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />

                <div className="chat-friends-picker">
                  {sortedFriends.length === 0 ? (
                    <p className="empty-state">Сначала добавьте друзей.</p>
                  ) : (
                    sortedFriends.map(friend => (
                      <label key={friend.id} className="chat-friend-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.includes(friend.id)}
                          onChange={() => handleToggleGroupMember(friend.id)}
                        />

                        <Avatar src={friend.avatar_url} size="30px" />

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
                  Создать
                </button>
              </form>
            )}

            <button
              className="btn btn-primary"
              onClick={() => setShowGroupForm(!showGroupForm)}
            >
              {showGroupForm ? 'Скрыть форму' : '+ Групповой чат'}
            </button>
          </div>
        </aside>

        <main className="chat-main">
          {!selectedChat ? (
            <div className="chat-empty-panel">
              <h3>Выберите чат</h3>
              <p>Найдите пользователя, откройте существующий диалог или создайте групповой чат.</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={`chat-header ${selectedChat.type !== 'direct' ? 'chat-header-clickable' : ''}`}
                onClick={openChatSettings}
              >
                {selectedChat.type !== 'direct' && getChatAvatar(selectedChat) && (
                  <Avatar src={getChatAvatar(selectedChat)} size="42px" />
                )}

                <div>
                  <h3>{getChatTitle(selectedChat)}</h3>
                  <p>{getChatSubtitle(selectedChat)}</p>
                </div>
              </button>

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
                        className={`chat-message-row ${isMine ? 'chat-message-row-me' : 'chat-message-row-other'}`}
                      >
                        {!isMine && (
                          <Avatar src={message.sender?.avatar_url} size="32px" />
                        )}

                        <div className={`msg ${isMine ? 'msg-me' : 'msg-other'}`}>
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

                        {isMine && (
                          <Avatar src={currentUser?.avatar_url} size="32px" />
                        )}
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
                  className="chat-send-button"
                  disabled={!messageText.trim()}
                  title="Отправить"
                >
                  <img src="/icons/send.svg" alt="" />
                </button>
              </form>
            </>
          )}
        </main>
      </div>

      {showChatSettings && selectedChat && (
        <div className="chat-settings-overlay" onClick={() => setShowChatSettings(false)}>
          <div className="chat-settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-settings-header">
              <div>
                <h3>Настройки чата</h3>
                <p>{selectedChat.type === 'club' ? 'Чат клуба' : 'Групповой чат'}</p>
              </div>

              <button
                type="button"
                className="chat-settings-close"
                onClick={() => setShowChatSettings(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveChatSettings} className="chat-settings-form">
              <div className="chat-settings-image-row">
                <Avatar
                  src={settingsImageFile ? URL.createObjectURL(settingsImageFile) : settingsImageURL}
                  size="72px"
                />

                <div className="form-group">
                  <label className="form-label">Картинка чата</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-input"
                    onChange={(e) => setSettingsImageFile(e.target.files[0])}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Название</label>
                <input
                  className="form-input"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder="Название чата"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Описание</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={settingsDescription}
                  onChange={(e) => setSettingsDescription(e.target.value)}
                  placeholder="Описание чата"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={settingsSaving || !settingsName.trim()}
              >
                {settingsSaving ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
            </form>

            <div className="chat-settings-members">
              <h4>Участники ({selectedChat.members?.length || 0})</h4>

              <div className="chat-settings-members-list">
                {(selectedChat.members || []).map(member => (
                  <div key={member.id} className="chat-settings-member">
                    <Link to={`/profile/${member.id}`} className="chat-settings-member-main">
                      <Avatar src={member.avatar_url} size="38px" />

                      <div>
                        <span>{member.name} {member.surname}</span>
                        <small>
                          {member.role === 'teacher'
                            ? 'Преподаватель'
                            : member.role === 'admin'
                              ? 'Администратор'
                              : member.group || 'Студент'}
                        </small>
                      </div>
                    </Link>

                    {currentUser?.id !== member.id &&
                      !friendIds.has(member.id) &&
                      memberStatuses[member.id]?.status === 'none' && (
                        <button
                          type="button"
                          className="chat-add-friend-button"
                          onClick={(e) => handleSendFriendRequest(e, member.id)}
                          title="Добавить в друзья"
                        >
                          {friendRequestLoadingId === member.id ? (
                            <span className="chat-add-friend-loading">...</span>
                          ) : (
                            <img src="/icons/add-friend.svg" alt="" />
                          )}
                        </button>
                      )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}