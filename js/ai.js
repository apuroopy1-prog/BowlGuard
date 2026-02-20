/**
 * BowlGuard AI Recommendation Engine
 * 
 * Uses Anthropic Claude API to analyze bowler data and provide
 * personalized training recommendations.
 * 
 * SETUP: Replace 'YOUR_API_KEY_HERE' with your Anthropic API key
 * Get one at: https://console.anthropic.com/
 */
const AI = {

  // API key is now stored securely on the backend (server.py)
  MODEL: 'claude-sonnet-4-20250514',

  /**
   * Generate AI recommendation based on current bowler data
   */
  async getRecommendation() {
    const sessions = Store.getSessions();
    const summary = ACWR.getSummaryForAI(sessions);

    if (!summary) {
      this.renderNoData();
      return;
    }

    const card = document.getElementById('ai-card');
    card.style.display = 'block';
    
    // Show loading
    const content = document.getElementById('ai-content');
    content.innerHTML = '<div class="ai-loading">Analyzing your bowling data...</div>';
    
    const refreshBtn = document.querySelector('.ai-refresh-btn');
    refreshBtn.classList.add('spinning');

    try {
      const prompt = this.buildPrompt(summary);
      const response = await this.callAPI(prompt);
      this.renderAIResponse(response, summary);
    } catch (error) {
      console.error('AI API Error:', error);
      // Fallback to rule-based
      this.renderRuleBasedRecommendation(summary);
    }

    refreshBtn.classList.remove('spinning');
  },

  /**
   * Build the prompt for Claude
   */
  buildPrompt(summary) {
    const profileBlock = Profile.getAISummary() || '';

    return `You are a cricket sports scientist specializing in fast bowler workload management. Analyze this bowler's data and give a BRIEF, actionable recommendation.

${profileBlock}

BOWLER DATA:
- ACWR (Acute:Chronic Workload Ratio): ${summary.acwr || 'Insufficient data'}
- Zone: ${summary.zone}
- This week's balls: ${summary.thisWeekBalls}
- 4-week average: ${summary.chronic} balls/week
- Week-over-week change: ${summary.weekTrend > 0 ? '+' : ''}${summary.weekTrend}%
- Average intensity (last 5 sessions): ${summary.avgIntensity}/10
- Days since last session: ${summary.daysSinceLastSession}
- Last session: ${summary.latestBalls} balls at intensity ${summary.latestIntensity}/10 (${summary.latestSessionType})
- Soreness — Shoulder: ${summary.latestSoreness.shoulder}/10, Lower Back: ${summary.latestSoreness.back}/10, Knee: ${summary.latestSoreness.knee}/10, Ankle: ${summary.latestSoreness.ankle}/10
- Soreness trends: ${JSON.stringify(summary.sorenessTrend)}
- Daily balls this week (Mon-Sun): ${summary.dailyBalls.join(', ')}
- Total sessions logged: ${summary.totalSessions}

Respond ONLY in this exact JSON format, no markdown, no backticks:
{
  "tomorrow": "One clear sentence — what should the bowler do tomorrow",
  "maxOvers": number or null if rest day,
  "maxIntensity": number 1-10 or null if rest day,
  "riskLevel": "low" or "medium" or "high",
  "watchZone": "shoulder" or "back" or "knee" or "ankle" or null,
  "watchReason": "Brief reason why this body zone needs attention" or null,
  "insight": "One sentence — a pattern or trend you noticed in the data"
}`;
  },

  /**
   * Call Anthropic Claude API
   */
  async callAPI(prompt) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.MODEL,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  },

  /**
   * Rule-based recommendation (no API key needed)
   * This is the fallback that works without an API key
   */
  generateRuleBased(summary) {
    const acwr = parseFloat(summary.acwr) || 0;
    const soreness = summary.latestSoreness;
    const trend = summary.sorenessTrend;
    const daysSince = summary.daysSinceLastSession;

    let result = {
      tomorrow: '',
      maxOvers: null,
      maxIntensity: null,
      riskLevel: 'low',
      watchZone: null,
      watchReason: null,
      insight: ''
    };

    // Find highest soreness zone
    const sorenessEntries = Object.entries(soreness);
    const maxSoreness = sorenessEntries.reduce((max, [zone, val]) => val > max.val ? { zone, val } : max, { zone: null, val: 0 });

    // Find rising soreness trends
    let risingZone = null;
    if (trend) {
      const rising = Object.entries(trend).filter(([_, v]) => v.trend === 'rising');
      if (rising.length > 0) {
        risingZone = rising.reduce((max, [zone, v]) => v.current > (max ? trend[max].current : 0) ? zone : max, null);
      }
    }

    // Set watch zone
    if (maxSoreness.val >= 6) {
      result.watchZone = maxSoreness.zone;
      result.watchReason = `${this.zoneLabel(maxSoreness.zone)} soreness is at ${maxSoreness.val}/10 — needs attention before it worsens`;
    } else if (risingZone) {
      result.watchZone = risingZone;
      result.watchReason = `${this.zoneLabel(risingZone)} soreness has been climbing over recent sessions — early intervention prevents injury`;
    }

    // Determine recommendation based on ACWR zone
    if (acwr === 0 || !summary.acwr) {
      result.tomorrow = 'Start with a light session — 6-8 overs at 60% effort to build baseline data';
      result.maxOvers = 8;
      result.maxIntensity = 6;
      result.riskLevel = 'low';
      result.insight = 'Need more data to give accurate recommendations. Keep logging every session.';
    } else if (acwr > 1.5) {
      // RED zone
      result.tomorrow = 'Complete rest day. Your workload has spiked too high — bowling now risks injury.';
      result.maxOvers = null;
      result.maxIntensity = null;
      result.riskLevel = 'high';
      result.insight = `Your workload jumped ${summary.weekTrend > 0 ? '+' + summary.weekTrend + '%' : ''} this week. Research shows ACWR above 1.5 more than doubles injury risk for fast bowlers.`;
    } else if (acwr > 1.3) {
      // YELLOW-HIGH zone
      if (maxSoreness.val >= 5) {
        result.tomorrow = 'Rest day recommended. Elevated workload combined with soreness is a warning sign.';
        result.maxOvers = null;
        result.maxIntensity = null;
        result.riskLevel = 'high';
      } else {
        result.tomorrow = `Light session only — max ${Math.min(4, Math.ceil(summary.chronic / 6 * 0.5))} overs at 50-60% effort. Focus on rhythm, not pace.`;
        result.maxOvers = Math.min(4, Math.ceil(summary.chronic / 6 * 0.5));
        result.maxIntensity = 6;
        result.riskLevel = 'medium';
      }
      result.insight = `Your ACWR is ${summary.acwr} — in the caution zone. Pulling back now prevents a bigger breakdown later.`;
    } else if (acwr >= 0.8) {
      // GREEN zone - sweet spot
      const suggestedOvers = Math.ceil(summary.chronic / 6);
      if (daysSince >= 2) {
        result.tomorrow = `Good to bowl. Aim for ${suggestedOvers - 2}-${suggestedOvers} overs at your usual intensity.`;
        result.maxOvers = suggestedOvers;
        result.maxIntensity = Math.min(8, Math.round(parseFloat(summary.avgIntensity)) + 1);
      } else {
        result.tomorrow = `You bowled yesterday. Light session today — ${Math.max(3, suggestedOvers - 4)} overs at moderate intensity, or rest.`;
        result.maxOvers = Math.max(3, suggestedOvers - 4);
        result.maxIntensity = 6;
      }
      result.riskLevel = 'low';
      result.insight = `ACWR at ${summary.acwr} — you're in the sweet spot. Consistent sessions like this build resilience against injury.`;
    } else {
      // YELLOW-LOW zone (undertrained)
      result.tomorrow = `Gradual ramp-up needed. Bowl 4-6 overs at 60% effort. Don't jump straight to full intensity.`;
      result.maxOvers = 6;
      result.maxIntensity = 6;
      result.riskLevel = 'medium';
      result.insight = `ACWR is ${summary.acwr} — below the safe threshold. Your body has deconditioned. Sudden full-intensity bowling from here is the #1 cause of fast bowler injuries.`;
    }

    return result;
  },

  /**
   * Helper: Get human-readable zone label
   */
  zoneLabel(zone) {
    const labels = { shoulder: 'Shoulder', back: 'Lower back', knee: 'Knee', ankle: 'Ankle' };
    return labels[zone] || zone;
  },

  /**
   * Render rule-based recommendation (fallback)
   */
  renderRuleBasedRecommendation(summary) {
    const rec = this.generateRuleBased(summary);
    this.renderRecommendationCard(rec, summary);
  },

  /**
   * Render AI API response
   */
  renderAIResponse(response, summary) {
    this.renderRecommendationCard(response, summary);
  },

  /**
   * Render the recommendation card UI
   */
  renderRecommendationCard(rec, summary) {
    const content = document.getElementById('ai-content');
    const subtitle = document.getElementById('ai-subtitle');
    subtitle.textContent = `Based on ${summary.totalSessions} sessions`;

    const riskColor = rec.riskLevel === 'high' ? 'red' : rec.riskLevel === 'medium' ? 'yellow' : 'green';

    let html = `
      <div class="ai-rec-tomorrow">
        <div class="ai-rec-tomorrow-label">Tomorrow's Plan</div>
        <div class="ai-rec-tomorrow-text">${rec.tomorrow}</div>
      </div>
      <div class="ai-rec-details">
        <div class="ai-rec-detail">
          <div class="ai-rec-detail-label">Max Overs</div>
          <div class="ai-rec-detail-value ${riskColor}">${rec.maxOvers !== null ? rec.maxOvers : 'REST'}</div>
        </div>
        <div class="ai-rec-detail">
          <div class="ai-rec-detail-label">Max Intensity</div>
          <div class="ai-rec-detail-value ${riskColor}">${rec.maxIntensity !== null ? rec.maxIntensity + '/10' : 'REST'}</div>
        </div>
        <div class="ai-rec-detail">
          <div class="ai-rec-detail-label">Risk Level</div>
          <div class="ai-rec-detail-value ${riskColor}">${rec.riskLevel.toUpperCase()}</div>
        </div>
        <div class="ai-rec-detail">
          <div class="ai-rec-detail-label">ACWR</div>
          <div class="ai-rec-detail-value ${riskColor}">${summary.acwr || '—'}</div>
        </div>
      </div>
    `;

    if (rec.watchZone) {
      html += `
        <div class="ai-rec-watch">
          <div class="ai-rec-watch-label">⚠️ Body Zone Alert — ${this.zoneLabel(rec.watchZone)}</div>
          <div class="ai-rec-watch-text">${rec.watchReason}</div>
        </div>
      `;
    }

    if (rec.insight) {
      html += `<div class="ai-rec-insight">💡 ${rec.insight}</div>`;
    }

    content.innerHTML = html;
  },

  /**
   * Render no-data state
   */
  renderNoData() {
    const card = document.getElementById('ai-card');
    card.style.display = 'block';
    const content = document.getElementById('ai-content');
    content.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 12px;">Log your first session to get AI-powered recommendations</div>';
  }
};
