/**
 * ACWR (Acute:Chronic Workload Ratio) Calculation Engine
 * 
 * Based on research:
 * - Hulin et al. (2014) - "Spikes in acute workload are associated with increased injury risk"
 * - Hulin et al. (2017) - "High acute:chronic workloads are associated with injury in ECB fast bowlers"
 * 
 * ACWR = Acute Load (1 week) / Chronic Load (4 week average)
 * Sweet spot: 0.8 - 1.3
 */
const ACWR = {

  /**
   * Calculate current ACWR from session data
   * @param {Array} sessions - All logged sessions
   * @returns {Object} { acwr, acute, chronic, weeksOfData }
   */
  calculate(sessions) {
    if (sessions.length === 0) return { acwr: null, acute: 0, chronic: 0, weeksOfData: 0 };

    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now - 28 * 24 * 60 * 60 * 1000);

    // Acute = total balls in last 7 days
    const acute = sessions
      .filter(s => new Date(s.date) >= oneWeekAgo)
      .reduce((sum, s) => sum + s.balls, 0);

    // Chronic = average weekly balls over last 4 weeks
    const fourWeekBalls = sessions
      .filter(s => new Date(s.date) >= fourWeeksAgo)
      .reduce((sum, s) => sum + s.balls, 0);

    const oldestSession = new Date(Math.min(...sessions.map(s => new Date(s.date))));
    const weeksOfData = Math.min(4, Math.max(1, Math.ceil((now - oldestSession) / (7 * 24 * 60 * 60 * 1000))));
    const chronic = fourWeekBalls / weeksOfData;

    const acwr = chronic > 0 ? acute / chronic : null;

    return { acwr, acute, chronic: Math.round(chronic), weeksOfData };
  },

  /**
   * Calculate ACWR at a specific point in time (for history)
   * @param {Array} allSessions - All sessions
   * @param {Date} atDate - Calculate ACWR as of this date
   * @returns {Object} { acwr, acute, chronic }
   */
  calculateAt(allSessions, atDate) {
    const sessionsUpTo = allSessions.filter(x => new Date(x.date) <= atDate);
    if (sessionsUpTo.length === 0) return { acwr: null, acute: 0, chronic: 0 };

    const oneWeekBefore = new Date(atDate - 7 * 24 * 60 * 60 * 1000);
    const fourWeeksBefore = new Date(atDate - 28 * 24 * 60 * 60 * 1000);

    const acute = sessionsUpTo
      .filter(x => new Date(x.date) >= oneWeekBefore)
      .reduce((sum, x) => sum + x.balls, 0);

    const fourWeekBalls = sessionsUpTo
      .filter(x => new Date(x.date) >= fourWeeksBefore)
      .reduce((sum, x) => sum + x.balls, 0);

    const oldest = new Date(Math.min(...sessionsUpTo.map(x => new Date(x.date))));
    const weeks = Math.min(4, Math.max(1, Math.ceil((atDate - oldest) / (7 * 24 * 60 * 60 * 1000))));
    const chronic = fourWeekBalls / weeks;

    const acwr = chronic > 0 ? (acute / chronic) : null;
    return { acwr, acute, chronic: Math.round(chronic) };
  },

  /**
   * Get zone classification for an ACWR value
   * @param {number|null} acwr 
   * @returns {Object} { zone, label, color, emoji, rec }
   */
  getZone(acwr) {
    if (acwr === null) return {
      zone: 'neutral', label: 'No data', color: 'neutral', emoji: '',
      rec: 'Log at least 2 weeks of sessions to see your workload ratio'
    };
    if (acwr < 0.8) return {
      zone: 'yellow', label: 'Undertrained', color: 'yellow', emoji: '⚠️',
      rec: 'You\'ve been resting too much. Increase load gradually — sudden spikes from here are dangerous.'
    };
    if (acwr <= 1.3) return {
      zone: 'green', label: 'Sweet Spot', color: 'green', emoji: '✅',
      rec: 'Your workload is well balanced. Safe to bowl at current intensity. Keep it steady.'
    };
    if (acwr <= 1.5) return {
      zone: 'yellow', label: 'Caution Zone', color: 'yellow', emoji: '⚠️',
      rec: 'Workload is elevated. Reduce intensity tomorrow. Consider a lighter session or rest day.'
    };
    return {
      zone: 'red', label: 'High Risk', color: 'red', emoji: '🛑',
      rec: 'STOP — Injury risk is high. Rest for 1-2 days. Your body hasn\'t adapted to this spike.'
    };
  },

  /**
   * Get daily balls for the current week (Mon-Sun)
   * @param {Array} sessions 
   * @returns {Array} Array of 7 daily ball counts
   */
  getWeeklyBalls(sessions) {
    const now = new Date();
    const todayDay = now.getDay();
    const dayIndex = todayDay === 0 ? 6 : todayDay - 1; // Mon=0

    const dailyBalls = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (dayIndex - i));
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const balls = sessions
        .filter(s => {
          const sd = new Date(s.date);
          return sd >= dayStart && sd < dayEnd;
        })
        .reduce((sum, s) => sum + s.balls, 0);

      dailyBalls.push(balls);
    }

    return { dailyBalls, todayIndex: dayIndex };
  },

  /**
   * Analyze soreness trends across recent sessions
   * @param {Array} sessions 
   * @param {number} lookback - Number of recent sessions to analyze
   * @returns {Object} Soreness trend per zone
   */
  analyzeSorenessTrend(sessions, lookback = 5) {
    const recent = sessions.slice(-lookback);
    if (recent.length < 2) return null;

    const zones = ['shoulder', 'back', 'knee', 'ankle'];
    const trends = {};

    zones.forEach(zone => {
      const values = recent.map(s => s.soreness[zone] || 1);
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const change = avgSecond - avgFirst;
      trends[zone] = {
        current: values[values.length - 1],
        trend: change > 1 ? 'rising' : change < -1 ? 'falling' : 'stable',
        avgRecent: Math.round(avgSecond * 10) / 10
      };
    });

    return trends;
  },

  /**
   * Get recent sessions summary for AI analysis
   * @param {Array} sessions 
   * @returns {Object} Summary data for AI
   */
  getSummaryForAI(sessions) {
    if (sessions.length === 0) return null;

    const { acwr, acute, chronic, weeksOfData } = this.calculate(sessions);
    const zone = this.getZone(acwr);
    const sorenessTrend = this.analyzeSorenessTrend(sessions);
    const { dailyBalls } = this.getWeeklyBalls(sessions);

    const recentSessions = sessions.slice(-5);
    const avgIntensity = recentSessions.reduce((sum, s) => sum + s.intensity, 0) / recentSessions.length;

    const latestSession = sessions[sessions.length - 1];
    const daysSinceLastSession = Math.floor((new Date() - new Date(latestSession.date)) / (24 * 60 * 60 * 1000));

    // Week-over-week trend
    const twoWeeksAgo = new Date(new Date() - 14 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(new Date() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekBalls = sessions.filter(s => {
      const d = new Date(s.date);
      return d >= twoWeeksAgo && d < oneWeekAgo;
    }).reduce((sum, s) => sum + s.balls, 0);

    const thisWeekBalls = sessions.filter(s => new Date(s.date) >= oneWeekAgo).reduce((sum, s) => sum + s.balls, 0);
    const weekTrend = lastWeekBalls > 0 ? ((thisWeekBalls - lastWeekBalls) / lastWeekBalls * 100).toFixed(0) : 0;

    return {
      acwr: acwr ? acwr.toFixed(2) : null,
      zone: zone.label,
      acute,
      chronic,
      weeksOfData,
      avgIntensity: avgIntensity.toFixed(1),
      latestSoreness: latestSession.soreness,
      sorenessTrend,
      dailyBalls,
      daysSinceLastSession,
      thisWeekBalls,
      lastWeekBalls,
      weekTrend: parseInt(weekTrend),
      totalSessions: sessions.length,
      latestSessionType: latestSession.type,
      latestIntensity: latestSession.intensity,
      latestBalls: latestSession.balls
    };
  }
};
