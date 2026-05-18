import { useState } from 'react';

export default function Admin() {
  const [logs, setLogs] = useState([
    { id: 1, action: 'Модерация постов', info: 'Удалена публикация пользователя ID 91 за нарушение правил.' },
    { id: 2, action: 'Управление клубами', info: 'Зарегистрировано новое направление "Робототехника".' },
    { id: 3, action: 'Управление пользователями', info: 'Обновлены права доступа для аккаунта Модератора.' }
  ]);

  const executeAction = (action) => {
    setLogs([{ id: Date.now(), action, info: `Операция успешно проведена в ${new Date().toLocaleTimeString()}` }, ...logs]);
  };

  return (
    <div>
      <h1 className="page-title" style={{ color: 'var(--danger)' }}>🛠️ Панель управления администратора</h1>
      
      <div className="grid-200">
        <button onClick={() => executeAction('Управление новостями')} className="admin-btn">📢 Опубликовать объявление</button>
        <button onClick={() => executeAction('Модерация постов')} className="admin-btn">🧹 Модерация контента</button>
        <button onClick={() => executeAction('Управление клубами')} className="admin-btn">🏫 Контроль клубов</button>
        <button onClick={() => executeAction('Управление пользователями')} className="admin-btn">👥 Права и доступы</button>
      </div>

      <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Лог системных событий</h3>
      <div className="terminal-box">
        {logs.map(log => (
          <div key={log.id} style={{ marginBottom: '0.5rem' }}>
            <span className="terminal-tag">[{log.action}]</span> {log.info}
          </div>
        ))}
      </div>
    </div>
  );
}