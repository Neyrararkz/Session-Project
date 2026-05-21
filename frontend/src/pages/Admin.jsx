import { useState } from 'react';
import { handleError } from '../api';

export default function Admin() {
  const [logs, setLogs] = useState([
    { id: 1, action: 'Система', info: 'Бэкенд Go успешно инициализирован.' }
  ]);

  const executeAction = async (action) => {
    try {
      setLogs([{ id: Date.now(), action, info: `Операция "${action}" выполнена успешно` }, ...logs]);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div>
      <h1 className="page-title" style={{ color: 'var(--danger)' }}>🛠️ Панель управления администратора</h1>
      <div className="grid-200">
        <button onClick={() => executeAction('Модерация')} className="admin-btn">🧹 Модерация контента</button>
        <button onClick={() => executeAction('Клубы')} className="admin-btn">🏫 Контроль клубов</button>
        <button onClick={() => executeAction('Пользователи')} className="admin-btn">👥 Права доступа</button>
      </div>
      <h3>Лог системных событий</h3>
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