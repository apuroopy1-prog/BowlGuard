/**
 * BowlGuard Workload Chat
 *
 * Natural language chat powered by Claude API.
 * Bowler asks questions about their workload, AI answers
 * using their actual session data as context.
 */
const Chat = {

  messages: [],

  /**
   * Send message from input field
   */
  send() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    this.handleMessage(text);
  },

  /**
   * Send a suggestion chip
   */
  sendSuggestion(btn) {
    const text = btn.textContent;
    const suggestions = document.querySelector('.chat-suggestions');
    if (suggestions) suggestions.style.display = 'none';
    this.handleMessage(text);
  },

  /**
   * Process a user message
   */
  async handleMessage(text) {
    this.addBubble('user', text);
    this.messages.push({ role: 'user', content: text });

    const typingId = this.showTyping();

    const sessions = Store.getSessions();
    const summary = ACWR.getSummaryForAI(sessions);
    const systemPrompt = this.buildSystemPrompt(summary, sessions);

    try {
      const reply = await this.callAPI(systemPrompt);
      this.removeTyping(typingId);
      this.addBubble('ai', reply);
      this.messages.push({ role: 'assistant', content: reply });
    } catch (err) {
      console.error('Chat API error:', err);
      this.removeTyping(typingId);
      const fallback = this.generateFallbackResponse(text, summary);
      this.addBubble('ai', fallback);
      this.messages.push({ role: 'assistant', content: fallback });
    }
  },

  /**
   * Build system prompt with full bowler data context
   */
  buildSystemPrompt(summary, sessions) {
    const today = new Date();
    const dayName = today.toLocaleDateString('en-IN', { weekday: 'long' });
    const dateStr = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    if (!summary) {
      return `You are BowlGuard AI — a cricket fast bowling coach and sports scientist.
Today is ${dayName}, ${dateStr}.
The bowler has NO sessions logged yet. Tell them to log their first session before you can give advice. Be friendly but brief.`;
    }

    // Build full session log (all sessions, not just last 5)
    const allSessionsLog = sessions.map(s => {
      const d = new Date(s.date);
      const dateLabel = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      const daysAgo = Math.floor((today - d) / (24 * 60 * 60 * 1000));
      return `${dateLabel} (${daysAgo}d ago): ${s.balls} balls (${Math.floor(s.balls/6)} overs), intensity ${s.intensity}/10, ${s.type}, soreness: shoulder=${s.soreness.shoulder} back=${s.soreness.back} knee=${s.soreness.knee} ankle=${s.soreness.ankle}`;
    }).join('\n');

    // Calculate additional context
    const acwr = parseFloat(summary.acwr) || 0;
    let zoneExplanation = '';
    if (acwr > 1.5) zoneExplanation = 'HIGH RISK — injury probability is significantly elevated. Research shows >1.5 ACWR doubles injury risk in fast bowlers.';
    else if (acwr > 1.3) zoneExplanation = 'CAUTION — workload is above safe range. The bowler should reduce volume or intensity.';
    else if (acwr >= 0.8) zoneExplanation = 'SWEET SPOT — workload is well managed. Safe to maintain or slightly increase.';
    else if (acwr > 0) zoneExplanation = 'UNDERTRAINED — the bowler has been resting too much. Sudden full-intensity bowling from here is the #1 cause of fast bowler injuries. Must ramp up gradually.';

    // Soreness analysis
    const soreness = summary.latestSoreness;
    const sorenessFlags = [];
    if (soreness.shoulder >= 6) sorenessFlags.push(`Shoulder at ${soreness.shoulder}/10 — HIGH`);
    if (soreness.back >= 6) sorenessFlags.push(`Lower back at ${soreness.back}/10 — HIGH`);
    if (soreness.knee >= 6) sorenessFlags.push(`Knee at ${soreness.knee}/10 — HIGH`);
    if (soreness.ankle >= 6) sorenessFlags.push(`Ankle at ${soreness.ankle}/10 — HIGH`);

    const trends = summary.sorenessTrend;
    const risingZones = [];
    if (trends) {
      Object.entries(trends).forEach(([zone, data]) => {
        if (data.trend === 'rising') risingZones.push(`${zone} (rising to ${data.current}/10)`);
      });
    }

    // Days until typical match days
    const dayOfWeek = today.getDay(); // 0=Sun
    const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
    const daysUntilSun = (7 - dayOfWeek) % 7 || 7;

    // Profile data
    const profileBlock = Profile.getAISummary() || 'No profile set up yet.';

    return `You are BowlGuard AI — an elite cricket sports scientist and fast bowling coach. You analyze real bowling workload data and give precise, data-backed advice. Address the bowler by name when appropriate.

${profileBlock}

TODAY: ${dayName}, ${dateStr}
Days until Saturday: ${daysUntilSat} | Days until Sunday: ${daysUntilSun}

═══ BOWLER'S CURRENT STATE ═══

ACWR (Acute:Chronic Workload Ratio): ${summary.acwr || 'N/A'}
Zone: ${summary.zone}
Assessment: ${zoneExplanation}

This week's load: ${summary.thisWeekBalls} balls
4-week average: ${summary.chronic} balls/week
Week-over-week change: ${summary.weekTrend > 0 ? '+' : ''}${summary.weekTrend}%
Avg intensity (last 5 sessions): ${summary.avgIntensity}/10
Days since last session: ${summary.daysSinceLastSession}
Last session: ${summary.latestBalls} balls at intensity ${summary.latestIntensity}/10 (${summary.latestSessionType})

CURRENT SORENESS:
- Shoulder: ${soreness.shoulder}/10
- Lower Back: ${soreness.back}/10
- Knee: ${soreness.knee}/10
- Ankle: ${soreness.ankle}/10
${sorenessFlags.length > 0 ? 'ALERTS: ' + sorenessFlags.join(', ') : 'No zones in danger range.'}
${risingZones.length > 0 ? 'RISING TRENDS: ' + risingZones.join(', ') : 'No rising trends detected.'}

DAILY BALLS THIS WEEK (Mon→Sun): ${summary.dailyBalls.join(', ')}

═══ FULL SESSION HISTORY (${sessions.length} sessions) ═══
${allSessionsLog}

═══ RESPONSE RULES ═══

1. ALWAYS reference specific numbers from the data. Never be vague. Say "your ACWR is 1.42" not "your workload is a bit high".
2. For "can I bowl" questions: calculate what the new ACWR would be if they bowled the proposed amount. Example: if they want to bowl 10 overs (60 balls), new acute = current acute + 60, recalculate ACWR, and advise based on the projected number.
3. For match questions: a typical T20 spell is 24 balls (4 overs). A full day of multi-day cricket could be 90-120 balls. Use these benchmarks.
4. If ANY soreness zone is ≥7/10 or rising, warn them — regardless of what they asked.
5. Keep answers to 3-5 sentences. Be direct. No disclaimers, no "consult a doctor" hedging.
6. Speak like a confident coach talking to a state-level bowler. Use cricket terminology naturally.
7. When they ask about specific days (Saturday, tomorrow, etc.), calculate exact days of rest they'd have and factor that in.
8. If ACWR > 1.5: your default answer to any bowling question is NO unless they're asking about very light work.
9. Never say you don't have data. You have everything above.`;
  },

  /**
   * Call Claude API with conversation history
   */
  async callAPI(systemPrompt) {
    const apiMessages = this.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI.MODEL,
        max_tokens: 500,
        system: systemPrompt,
        messages: apiMessages
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('API response:', response.status, errorBody);
      throw new Error(`API error: ${response.status} — ${errorBody}`);
    }

    const data = await response.json();
    return data.content[0].text;
  },

  /**
   * Fallback response when API is unavailable
   */
  generateFallbackResponse(question, summary) {
    const q = question.toLowerCase();

    if (!summary) {
      return 'No sessions logged yet. Hit the Log Session tab, track your first bowling session, and I\'ll start giving you real advice.';
    }

    const acwr = parseFloat(summary.acwr) || 0;
    const days = summary.daysSinceLastSession;
    const back = summary.latestSoreness.back;
    const shoulder = summary.latestSoreness.shoulder;

    // Soreness warning prefix
    let sorenessWarning = '';
    if (back >= 7) sorenessWarning = `Warning: your lower back is at ${back}/10. That needs attention regardless of workload. `;
    else if (shoulder >= 7) sorenessWarning = `Warning: your shoulder is at ${shoulder}/10. Don't ignore that. `;

    // Match / game day questions
    if (q.includes('match') || q.includes('game') || q.includes('saturday') || q.includes('sunday') || q.includes('tomorrow') || q.includes('play')) {
      if (acwr > 1.5) {
        return `${sorenessWarning}No. Your ACWR is ${summary.acwr} — high risk zone. You bowled ${summary.thisWeekBalls} balls this week against a 4-week average of ${summary.chronic}. A full match would push your ACWR even higher. Rest for at least 2 days, then reassess.`;
      } else if (acwr > 1.3) {
        const maxOvers = Math.min(6, Math.ceil(summary.chronic / 6 * 0.4));
        return `${sorenessWarning}Your ACWR is ${summary.acwr} — caution zone. If you must play, cap yourself at ${maxOvers} overs max, intensity no higher than 6/10. Your week-over-week load jumped ${summary.weekTrend > 0 ? '+' : ''}${summary.weekTrend}%. Full match is risky right now.`;
      } else if (acwr >= 0.8) {
        return `${sorenessWarning}ACWR at ${summary.acwr} — sweet spot. You're cleared to bowl. You've bowled ${summary.thisWeekBalls} balls this week (avg ${summary.chronic}/week). ${days} day(s) rest since your last session. Monitor your back (${back}/10) and shoulder (${shoulder}/10) during the match.`;
      } else {
        return `${sorenessWarning}Your ACWR is ${summary.acwr} — undertrained. A full match from a deconditioned state is exactly how fast bowlers get stress fractures. Bowl 4-6 overs max if selected. Build up over 2-3 weeks before going full.`;
      }
    }

    // Workload questions
    if (q.includes('workload') || q.includes('too much') || q.includes('too high') || q.includes('overload') || q.includes('load')) {
      const weekDiff = summary.thisWeekBalls - summary.chronic;
      if (acwr > 1.3) {
        return `${sorenessWarning}Yes, workload is elevated. ACWR ${summary.acwr}. You've bowled ${summary.thisWeekBalls} balls this week — that's ${weekDiff > 0 ? '+' + weekDiff : weekDiff} vs your 4-week average of ${summary.chronic}. Week-over-week change: ${summary.weekTrend > 0 ? '+' : ''}${summary.weekTrend}%. Dial it back for 2-3 days.`;
      } else {
        return `${sorenessWarning}Workload looks fine. ACWR ${summary.acwr} (${summary.zone}). ${summary.thisWeekBalls} balls this week vs ${summary.chronic} average. Intensity averaging ${summary.avgIntensity}/10. You're in a safe range — maintain this consistency.`;
      }
    }

    // Rest questions
    if (q.includes('rest') || q.includes('break') || q.includes('off') || q.includes('recover')) {
      if (acwr > 1.5 || back >= 7 || shoulder >= 7) {
        return `${sorenessWarning}Yes, rest. ACWR is ${summary.acwr}, back soreness ${back}/10, shoulder ${shoulder}/10. Take 1-2 full rest days. When you return, start at 50-60% intensity for 3-4 overs max.`;
      } else if (days === 0) {
        return `${sorenessWarning}You bowled today — ${summary.latestBalls} balls at intensity ${summary.latestIntensity}/10. Rest tomorrow. Back-to-back high-intensity sessions are how you spike your ACWR into the danger zone.`;
      } else if (days >= 3 && acwr < 0.8) {
        return `${sorenessWarning}You've had ${days} days off and ACWR is ${summary.acwr} — undertrained. You actually need to get back to bowling, but gradually. 4-6 overs at 60% tomorrow. Don't go from rest straight to full intensity.`;
      } else {
        return `${sorenessWarning}${days} day(s) rest so far. ACWR ${summary.acwr}. You're fine to bowl tomorrow if soreness is manageable. Suggested: ${Math.ceil(summary.chronic / 6)} overs at your usual intensity.`;
      }
    }

    // Overs / how much questions
    if (q.includes('how many') || q.includes('overs') || q.includes('how much') || q.includes('balls')) {
      const suggestedBalls = Math.round(summary.chronic * 0.9);
      const suggestedOvers = Math.ceil(suggestedBalls / 6);
      if (acwr > 1.3) {
        return `${sorenessWarning}With ACWR at ${summary.acwr}, keep it light: max ${Math.min(4, suggestedOvers)} overs at 50-60% intensity. Your 4-week average is ${summary.chronic} balls/week and you've already bowled ${summary.thisWeekBalls} this week.`;
      } else {
        return `${sorenessWarning}Based on your 4-week average of ${summary.chronic} balls/week and current ACWR of ${summary.acwr}: aim for ${suggestedOvers - 2}-${suggestedOvers} overs at intensity ${Math.min(8, Math.round(parseFloat(summary.avgIntensity)))}/10. That keeps you in the sweet spot.`;
      }
    }

    // Intensity questions
    if (q.includes('intensity') || q.includes('pace') || q.includes('effort') || q.includes('fast') || q.includes('full')) {
      if (acwr > 1.3 || back >= 6) {
        return `${sorenessWarning}Not the time for full intensity. ACWR ${summary.acwr}, back soreness ${back}/10. Cap at 6/10 intensity — work on line and length, not raw pace. You can push harder once ACWR drops below 1.3.`;
      } else {
        return `${sorenessWarning}ACWR ${summary.acwr} is in the safe range. You can bowl at intensity ${Math.min(8, Math.round(parseFloat(summary.avgIntensity)) + 1)}/10. Your recent average is ${summary.avgIntensity}/10 — a small step up is fine, just don't spike it by more than 2 points.`;
      }
    }

    // Injury / pain questions
    if (q.includes('injury') || q.includes('pain') || q.includes('hurt') || q.includes('sore') || q.includes('stress')) {
      const highZones = [];
      if (back >= 5) highZones.push(`lower back (${back}/10)`);
      if (shoulder >= 5) highZones.push(`shoulder (${shoulder}/10)`);
      if (summary.latestSoreness.knee >= 5) highZones.push(`knee (${summary.latestSoreness.knee}/10)`);
      if (summary.latestSoreness.ankle >= 5) highZones.push(`ankle (${summary.latestSoreness.ankle}/10)`);

      if (highZones.length > 0) {
        return `Zones of concern: ${highZones.join(', ')}. ${acwr > 1.3 ? 'Combined with your elevated ACWR (' + summary.acwr + '), injury risk is real.' : 'Your ACWR (' + summary.acwr + ') is manageable, but watch these zones closely.'} If any zone hits 8+/10, take a mandatory rest day. Don't bowl through sharp pain — dull soreness is normal, sharp pain is not.`;
      } else {
        return `All soreness zones are in safe range (all below 5/10). ACWR at ${summary.acwr}. No immediate injury red flags. Keep logging consistently — the early warning is in the trends, not single readings.`;
      }
    }

    // Generic fallback with full snapshot
    return `${sorenessWarning}Here's your current state: ACWR ${summary.acwr} (${summary.zone}), ${summary.thisWeekBalls} balls this week vs ${summary.chronic} avg, intensity ${summary.avgIntensity}/10, ${days} day(s) rest. Soreness: shoulder ${shoulder}/10, back ${back}/10, knee ${summary.latestSoreness.knee}/10, ankle ${summary.latestSoreness.ankle}/10. Ask me something specific — "can I bowl Saturday?", "how many overs tomorrow?", "should I rest?"`;
  },

  /**
   * Add a chat bubble to the UI
   */
  addBubble(type, text) {
    const container = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-${type}`;

    if (type === 'ai') {
      bubble.innerHTML = `<div class="chat-bubble-avatar">🧠</div><div class="chat-bubble-text">${this.formatText(text)}</div>`;
    } else {
      bubble.innerHTML = `<div class="chat-bubble-text">${this.escapeHtml(text)}</div>`;
    }

    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  },

  /**
   * Format AI response text (basic markdown)
   */
  formatText(text) {
    return this.escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Show typing indicator
   */
  showTyping() {
    const container = document.getElementById('chat-messages');
    const id = 'typing-' + Date.now();
    const el = document.createElement('div');
    el.className = 'chat-bubble chat-ai chat-typing';
    el.id = id;
    el.innerHTML = `<div class="chat-bubble-avatar">🧠</div><div class="chat-bubble-text"><span class="typing-dots"><span></span><span></span><span></span></span></div>`;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    return id;
  },

  /**
   * Remove typing indicator
   */
  removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
};
