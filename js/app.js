/**
 * BowlGuard — Main Application Controller
 */
const BowlGuard = {

  Log: Log,
  AI: AI,
  Chat: Chat,

  init() {
    Store.seedDemoData();
    Log.init();

    if (!Store.hasProfile()) {
      // First-time user — show onboarding
      document.getElementById('screen-onboarding').style.display = 'block';
      document.querySelector('.nav').style.display = 'none';
      document.querySelector('.bottom-nav').style.display = 'none';
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    } else {
      // Returning user — show dashboard
      this.applyProfile();
      Dashboard.render();
    }

    console.log('🏏 BowlGuard initialized');
  },

  /**
   * Apply profile data to the UI (greeting, etc.)
   */
  applyProfile() {
    const profile = Store.getProfile();
    if (profile && profile.name) {
      const h = new Date().getHours();
      let greeting = 'Hey';
      if (h < 12) greeting = 'Good morning';
      else if (h < 17) greeting = 'Good afternoon';
      else greeting = 'Good evening';
      document.getElementById('greeting-text').textContent = `${greeting}, ${profile.name} 🏏`;
    }
  },

  navigate(name, btn) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${name}`).classList.add('active');
    document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (name === 'dashboard') Dashboard.render();
    if (name === 'history') History.render();
    if (name === 'chat') document.getElementById('chat-input').focus();
  },

  showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  },

  exportData() {
    const sessions = Store.getSessions();
    if (sessions.length === 0) {
      this.showToast('⚠️ No data to export');
      return;
    }

    const header = 'Date,Type,Balls,Overs,Intensity,Shoulder,Back,Knee,Ankle\n';
    const rows = sessions.map(s => {
      const date = new Date(s.date).toLocaleDateString();
      return `${date},${s.type},${s.balls},${s.overs},${s.intensity},${s.soreness.shoulder},${s.soreness.back},${s.soreness.knee},${s.soreness.ankle}`;
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bowlguard_sessions.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('📥 Data exported!');
  },

  clearAllData() {
    if (confirm('Delete all session data? This cannot be undone.')) {
      Store.clearAll();
      Dashboard.render();
      this.showToast('🗑️ All data cleared');
    }
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => BowlGuard.init());
if (document.readyState !== 'loading') BowlGuard.init();
