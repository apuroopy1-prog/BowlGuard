/**
 * History Module
 * Renders session history list
 */
const History = {

  render() {
    const sessions = Store.getSessions();
    const list = document.getElementById('history-list');

    if (sessions.length === 0) {
      list.innerHTML = `<div class="empty-state">
        <div class="icon">🏏</div>
        <h3>No sessions yet</h3>
        <p>Log your first bowling session to start tracking</p>
      </div>`;
      return;
    }

    const sorted = [...sessions].reverse();
    list.innerHTML = sorted.map(s => {
      const d = new Date(s.date);
      const dateStr = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

      const { acwr } = ACWR.calculateAt(sessions, new Date(s.date));
      const zone = ACWR.getZone(acwr);

      return `<div class="history-item">
        <div class="history-left">
          <div class="history-date">${dateStr}</div>
          <div class="history-details">${s.type === 'match' ? '🏟️ Match' : '🥅 Nets'} · ${s.balls} balls · Intensity ${s.intensity}/10</div>
        </div>
        <div class="history-right">
          <span class="history-acwr">${acwr !== null ? acwr.toFixed(2) : '—'}</span>
          <div class="history-dot ${zone.color}"></div>
        </div>
      </div>`;
    }).join('');
  }
};
