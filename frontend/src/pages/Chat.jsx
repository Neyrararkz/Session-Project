import { useState } from 'react';

export default function Chat() {
  const [chats] = useState([
    { id: 1, name: 'Арман Алиев (Личные сообщения)' },
    { id: 2, name: 'Проектирование ПО - SE-2302 (Группа)' }
  ]);
  const [activeChat, setActiveChat] = useState(1);
  const [messages, setMessages] = useState({
    1: [{ id: 1, sender: 'Арман', text: 'Привет! До скольки сегодня открыта библиотека?' }],
    2: [{ id: 1, sender: 'Мария', text: 'Завтра сдаем техническое задание, не забудьте!' }]
  });
  const [text, setText] = useState('');

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setMessages({ ...messages, [activeChat]: [...(messages[activeChat] || []), { id: Date.now(), sender: 'Вы', text }] });
    setText('');
  };

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        {chats.map(c => (
          <div 
            key={c.id} 
            onClick={() => setActiveChat(c.id)} 
            className={`chat-item ${activeChat === c.id ? 'chat-item-active' : ''}`}
          >
            {c.name}
          </div>
        ))}
      </div>
      <div className="chat-main">
        <div className="chat-messages">
          {(messages[activeChat] || []).map(m => {
            const isMe = m.sender === 'Вы';
            return (
              <div key={m.id} className={`msg ${isMe ? 'msg-me' : 'msg-other'}`}>
                <div className="msg-sender">{m.sender}</div>
                <div>{m.text}</div>
              </div>
            );
          })}
        </div>
        <form onSubmit={send} className="comment-form">
          <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Введите текст сообщения..." className="form-input" />
          <button type="submit" className="btn btn-primary btn-inline">Отправить</button>
        </form>
      </div>
    </div>
  );
}