export default function Navigation() {
  const sections = [
    { title: 'Расписание занятий и сессии', desc: 'Учебные графики доступны на платформе Mystat. В случае изменений старосты получают уведомления через деканат.' },
    { title: 'Административные и академические вопросы', desc: 'Заказ справок с места учебы, ведомостей и переводы осуществляются в Студенческом отделе (2 этаж, кабинет 204).' },
    { title: 'Кафедры и поиск преподавателей', desc: 'Преподавательский состав технических дисциплин располагается на 4 этаже в кабинете 412. График консультаций вывешен у двери.' },
    { title: 'Активности, Хакатоны и Конкурсы', desc: 'Все актуальные анонсы соревнований публикуются во вкладке "Лента" с тегом #Деканат, а также координируются лидерами IT Step Clubs.' }
  ];

  return (
    <div className="page-shell">
      <h1 className="page-title">Справочный центр студента ITSTEP</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {sections.map((s, idx) => (
          <div key={idx} className="card info-card">
            <h3 className="card-title" style={{ color: 'var(--primary)' }}>{s.title}</h3>
            <p className="card-desc" style={{ margin: 0 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}