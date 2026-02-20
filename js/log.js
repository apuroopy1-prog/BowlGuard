/**
 * Log Session Module
 * Handles all session logging inputs and submission
 */
const Log = {

  // State
  currentOvers: 0,
  tapCount: 0,
  inputMode: 'overs',
  sessionType: 'nets',
  intensity: 5,
  soreness: { shoulder: 1, back: 1, knee: 1, ankle: 1 },

  /**
   * Initialize soreness input grid
   */
  init() {
    const container = document.getElementById('soreness-inputs');
    const zones = [
      { key: 'shoulder', label: 'Shoulder', icon: '💪' },
      { key: 'back', label: 'Lower Back', icon: '🔙' },
      { key: 'knee', label: 'Knee', icon: '🦵' },
      { key: 'ankle', label: 'Ankle', icon: '🦶' }
    ];

    container.innerHTML = zones.map(z => `
      <div class="soreness-input-item">
        <div class="soreness-input-label"><span class="icon">${z.icon}</span> ${z.label}</div>
        <div class="soreness-btns" data-zone="${z.key}">
          ${[1, 3, 5, 7, 9].map(v => `
            <button class="soreness-btn" onclick="BowlGuard.Log.setSoreness('${z.key}', ${v}, this)" data-val="${v}">${v}</button>
          `).join('')}
        </div>
      </div>
    `).join('');
  },

  setSessionType(type, btn) {
    this.sessionType = type;
    const toggle = btn.parentElement;
    toggle.querySelectorAll('.session-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  },

  setInputMode(mode) {
    this.inputMode = mode;
    document.getElementById('mode-overs-btn').classList.toggle('active', mode === 'overs');
    document.getElementById('mode-live-btn').classList.toggle('active', mode === 'live');
    document.getElementById('overs-input').style.display = mode === 'overs' ? 'flex' : 'none';
    document.getElementById('balls-display').style.display = mode === 'overs' ? 'block' : 'none';
    document.getElementById('live-counter').classList.toggle('active', mode === 'live');
  },

  adjustOvers(delta) {
    this.currentOvers = Math.max(0, Math.min(50, this.currentOvers + delta));
    document.getElementById('overs-number').textContent = this.currentOvers;
    document.getElementById('balls-display').textContent = `= ${this.currentOvers * 6} balls`;
  },

  tapBall() {
    this.tapCount++;
    document.getElementById('tap-count').textContent = this.tapCount;
    const btn = document.querySelector('.tap-btn');
    btn.style.transform = 'scale(0.93)';
    setTimeout(() => btn.style.transform = 'scale(1)', 100);
  },

  resetTap() {
    this.tapCount = 0;
    document.getElementById('tap-count').textContent = '0';
  },

  updateIntensity(val) {
    this.intensity = parseInt(val);
    const el = document.getElementById('intensity-value');
    el.textContent = val;
    el.className = 'intensity-value ' + (val <= 3 ? 'low' : val <= 6 ? 'med' : 'high');
  },

  setSoreness(zone, val, btn) {
    this.soreness[zone] = val;
    const parent = btn.parentElement;
    parent.querySelectorAll('.soreness-btn').forEach(b => b.classList.remove('active', 'low', 'med', 'high'));
    btn.classList.add('active');
    btn.classList.add(val <= 3 ? 'low' : val <= 6 ? 'med' : 'high');
  },

  submit() {
    const balls = this.inputMode === 'overs' ? this.currentOvers * 6 : this.tapCount;

    if (balls === 0) {
      BowlGuard.showToast('⚠️ Enter balls bowled first!');
      return;
    }

    const session = {
      id: Date.now(),
      date: new Date().toISOString(),
      type: this.sessionType,
      balls: balls,
      overs: this.inputMode === 'overs' ? this.currentOvers : Math.floor(this.tapCount / 6),
      intensity: this.intensity,
      soreness: { ...this.soreness },
      inputMode: this.inputMode
    };

    Store.addSession(session);
    this.resetForm();
    BowlGuard.showToast('✅ Session logged!');

    // Navigate to dashboard after short delay
    setTimeout(() => {
      const dashBtn = document.querySelectorAll('.bottom-nav-item')[0];
      BowlGuard.navigate('dashboard', dashBtn);
    }, 800);
  },

  resetForm() {
    this.currentOvers = 0;
    this.tapCount = 0;
    this.intensity = 5;
    this.soreness = { shoulder: 1, back: 1, knee: 1, ankle: 1 };

    document.getElementById('overs-number').textContent = '0';
    document.getElementById('balls-display').textContent = '= 0 balls';
    document.getElementById('tap-count').textContent = '0';
    document.getElementById('intensity-slider').value = 5;
    this.updateIntensity(5);
    document.querySelectorAll('.soreness-btn').forEach(b => b.classList.remove('active', 'low', 'med', 'high'));
  }
};
