import { useState, useEffect } from 'react';
import { api, handleError } from '../api';

export default function Chat() {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    api.fetchChats().then(setChats).catch(handleError);
  }, []);

  useEffect(() => {
    if (activeChat) {
      api.fetchMessages(activeChat).then(setMessages).catch(handleError);
    }
  }, [activeChat]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api.sendMessage(activeChat, text);
      const newMessages = await api.fetchMessages(activeChat); 
      setMessages(newMessages);
      setText('');
    } catch (err) { handleError(err); }
  };

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        {chats.map(c => (
          <div key={c.id} onClick={() => setActiveChat(c.id)} className={`chat-item ${activeChat === c.id ? 'chat-item-active' : ''}`}>
            {c.name}
          </div>
        ))}
      </div>
      <div className="chat-main">
        <div className="chat-messages">
          {messages.map(m => (
            <div key={m.id} className={`msg ${m.sender === 'Вы' ? 'msg-me' : 'msg-other'}`}>
              <div>{m.text}</div>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="comment-form">
          <input type="text" value={text} onChange={e => setText(e.target.value)} className="form-input" />
          <button type="submit" className="btn btn-primary">Отправить</button>
        </form>
      </div>
    </div>
  );
}