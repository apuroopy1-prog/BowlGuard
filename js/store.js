/**
 * BowlGuard Data Store
 * Handles all localStorage operations and session management
 */
const Store = {
  STORAGE_KEY: 'bowlguard_sessions',
  PROFILE_KEY: 'bowlguard_profile',

  getProfile() {
    return JSON.parse(localStorage.getItem(this.PROFILE_KEY) || 'null');
  },

  saveProfile(profile) {
    localStorage.setItem(this.PROFILE_KEY, JSON.stringify(profile));
  },

  hasProfile() {
    return !!localStorage.getItem(this.PROFILE_KEY);
  },

  getSessions() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
  },

  saveSessions(sessions) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
  },

  addSession(session) {
    const sessions = this.getSessions();
    sessions.push(session);
    this.saveSessions(sessions);
    return sessions;
  },

  clearAll() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  /**
   * Seed demo data for first-time users
   */
  seedDemoData() {
    const sessions = this.getSessions();
    if (sessions.length > 0) return;

    const now = new Date();
    const demoSessions = [
      { daysAgo: 25, balls: 54, intensity: 5, type: 'nets', soreness: { shoulder: 2, back: 2, knee: 1, ankle: 1 } },
      { daysAgo: 23, balls: 48, intensity: 5, type: 'nets', soreness: { shoulder: 2, back: 2, knee: 1, ankle: 1 } },
      { daysAgo: 21, balls: 60, intensity: 6, type: 'nets', soreness: { shoulder: 2, back: 3, knee: 1, ankle: 1 } },
      { daysAgo: 19, balls: 48, intensity: 5, type: 'nets', soreness: { shoulder: 2, back: 2, knee: 1, ankle: 1 } },
      { daysAgo: 17, balls: 72, intensity: 7, type: 'match', soreness: { shoulder: 3, back: 4, knee: 2, ankle: 1 } },
      { daysAgo: 14, balls: 54, intensity: 6, type: 'nets', soreness: { shoulder: 2, back: 3, knee: 1, ankle: 1 } },
      { daysAgo: 12, balls: 66, intensity: 7, type: 'nets', soreness: { shoulder: 3, back: 3, knee: 2, ankle: 2 } },
      { daysAgo: 10, balls: 90, intensity: 8, type: 'match', soreness: { shoulder: 4, back: 5, knee: 3, ankle: 2 } },
      { daysAgo: 7, balls: 42, intensity: 5, type: 'nets', soreness: { shoulder: 2, back: 3, knee: 1, ankle: 1 } },
      { daysAgo: 5, balls: 78, intensity: 8, type: 'match', soreness: { shoulder: 4, back: 5, knee: 2, ankle: 2 } },
      { daysAgo: 3, balls: 60, intensity: 7, type: 'nets', soreness: { shoulder: 3, back: 4, knee: 2, ankle: 1 } },
      { daysAgo: 1, balls: 84, intensity: 8, type: 'match', soreness: { shoulder: 5, back: 6, knee: 3, ankle: 2 } },
    ];

    const seeded = demoSessions.map(d => {
      const date = new Date(now);
      date.setDate(date.getDate() - d.daysAgo);
      return {
        id: Date.now() + Math.random(),
        date: date.toISOString(),
        type: d.type,
        balls: d.balls,
        overs: Math.floor(d.balls / 6),
        intensity: d.intensity,
        soreness: d.soreness,
        inputMode: 'overs'
      };
    });

    this.saveSessions(seeded);
  }
};
