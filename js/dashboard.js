/**
 * Dashboard Module
 * Renders the main dashboard view
 */
const Dashboard = {

  render() {
    this.updateGreeting();
    this.renderACWR();
    this.renderStats();
    this.renderWeekChart();
    this.renderSoreness();

    // Trigger AI recommendation
    AI.getRecommendation();
  },

  updateGreeting() {
    const h = new Date().getHours();
    const el = document.getElementById('greeting-text');
    if (h < 12) el.textContent = 'Good morning 🏏';
    else if (h < 17) el.textContent = 'Good afternoon 🏏';
    else el.textContent = 'Good evening 🏏';
  },

  renderACWR() {
    const sessions = Store.getSessions();
    const { acwr } = ACWR.calculate(sessions);
    const zone = ACWR.getZone(acwr);

    const card = document.getElementById('acwr-card');
    card.className = `acwr-card ${zone.color}`;
    document.getElementById('acwr-value').textContent = acwr !== null ? acwr.toFixed(2) : '—';
    document.getElementById('acwr-status').textContent = zone.label;
    document.getElementById('acwr-rec').textContent = zone.rec;

    const badge = document.getElementById('acwr-badge');
    if (acwr !== null) {
      badge.style.display = 'flex';
      badge.textContent = zone.emoji;
    } else {
      badge.style.display = 'none';
    }
  },

  renderStats() {
    const sessions = Store.getSessions();
    const { acute, chronic } = ACWR.calculate(sessions);

    document.getElementById('stat-acute').textContent = acute;
    document.getElementById('stat-chronic').textContent = chronic;
    document.getElementById('stat-sessions').textContent = sessions.length;
  },

  renderWeekChart() {
    const sessions = Store.getSessions();
    const { dailyBalls, todayIndex } = ACWR.getWeeklyBalls(sessions);
    const container = document.getElementById('chart-bars');
    container.innerHTML = '';

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxBalls = Math.max(...dailyBalls, 30);

    dailyBalls.forEach((balls, i) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'chart-bar-wrapper';

      const valueEl = document.createElement('div');
      valueEl.className = 'chart-bar-value';
      valueEl.textContent = balls > 0 ? balls : '';

      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      const height = balls > 0 ? Math.max(8, (balls / maxBalls) * 120) : 4;
      bar.style.height = height + 'px';

      if (balls === 0) bar.classList.add('empty');
      else if (balls < 60) bar.classList.add('green');
      else if (balls < 100) bar.classList.add('yellow');
      else bar.classList.add('red');

      const label = document.createElement('div');
      label.className = 'chart-bar-label';
      label.textContent = days[i];
      if (i === todayIndex) label.style.color = 'var(--accent)';

      wrapper.appendChild(valueEl);
      wrapper.appendChild(bar);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });
  },

  renderSoreness() {
    const sessions = Store.getSessions();
    const display = document.getElementById('soreness-display');
    const dateEl = document.getElementById('soreness-date');

    if (sessions.length === 0) {
      dateEl.textContent = 'No data';
      return;
    }

    const latest = sessions[sessions.length - 1];
    const d = new Date(latest.date);
    dateEl.textContent = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    const zones = [
      { name: 'Shoulder', key: 'shoulder' },
      { name: 'Lower Back', key: 'back' },
      { name: 'Knee', key: 'knee' },
      { name: 'Ankle', key: 'ankle' }
    ];

    display.innerHTML = zones.map(z => {
      const val = latest.soreness[z.key] || 1;
      const cls = val <= 3 ? 'low' : val <= 6 ? 'med' : 'high';
      return `<div class="soreness-item">
        <span class="soreness-zone">${z.name}</span>
        <span class="soreness-value ${cls}">${val}/10</span>
      </div>`;
    }).join('');
  }
};
