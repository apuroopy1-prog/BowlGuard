/**
 * BowlGuard Profile Module
 * Handles onboarding and bowler profile data
 */
const Profile = {

  // Temp state during onboarding
  data: {
    name: '',
    age: null,
    type: null,
    experience: null,
    level: null,
    hasInjury: false,
    injuries: []
  },

  /**
   * Select a single-choice option
   */
  selectOption(field, value, btn) {
    this.data[field] = value;
    const parent = btn.parentElement;
    parent.querySelectorAll('.onboarding-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  },

  /**
   * Toggle injury yes/no
   */
  toggleInjury(hasInjury, btn) {
    this.data.hasInjury = hasInjury;
    const parent = btn.parentElement;
    parent.querySelectorAll('.onboarding-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('injury-details').style.display = hasInjury ? 'block' : 'none';
    if (!hasInjury) this.data.injuries = [];
  },

  /**
   * Toggle multi-select (injuries)
   */
  toggleMulti(field, value, btn) {
    const arr = this.data[field];
    const idx = arr.indexOf(value);
    if (idx === -1) {
      arr.push(value);
      btn.classList.add('active');
    } else {
      arr.splice(idx, 1);
      btn.classList.remove('active');
    }
  },

  /**
   * Save profile and proceed to app
   */
  save() {
    const name = document.getElementById('profile-name').value.trim();
    const age = document.getElementById('profile-age').value;

    if (!name) {
      BowlGuard.showToast('Enter your name');
      return;
    }
    if (!this.data.type) {
      BowlGuard.showToast('Select your bowling type');
      return;
    }

    const profile = {
      name: name,
      age: age ? parseInt(age) : null,
      type: this.data.type,
      experience: this.data.experience,
      level: this.data.level,
      hasInjury: this.data.hasInjury,
      injuries: this.data.injuries,
      createdAt: new Date().toISOString()
    };

    Store.saveProfile(profile);

    // Hide onboarding, show app
    document.getElementById('screen-onboarding').style.display = 'none';
    document.querySelector('.nav').style.display = 'flex';
    document.querySelector('.bottom-nav').style.display = 'flex';
    document.getElementById('screen-dashboard').classList.add('active');

    // Update greeting with name
    document.getElementById('greeting-text').textContent = `Hey ${profile.name} 🏏`;

    BowlGuard.showToast('Profile saved!');
    Dashboard.render();
  },

  /**
   * Get profile summary string for AI prompts
   */
  getAISummary() {
    const p = Store.getProfile();
    if (!p) return null;

    let summary = `BOWLER PROFILE:
- Name: ${p.name}`;

    if (p.age) summary += `\n- Age: ${p.age}`;
    if (p.type) summary += `\n- Bowling type: ${p.type}`;
    if (p.experience) summary += `\n- Experience: ${p.experience} years`;
    if (p.level) summary += `\n- Playing level: ${p.level}`;

    if (p.hasInjury && p.injuries.length > 0) {
      summary += `\n- INJURY HISTORY: ${p.injuries.join(', ')}`;
      summary += `\n- IMPORTANT: This bowler has previous injuries in ${p.injuries.join(' and ')}. Be MORE conservative with workload recommendations for these body zones. Lower ACWR thresholds by 0.1-0.2 for this bowler. Flag any soreness in injured zones earlier (at 4/10 instead of 6/10).`;
    } else {
      summary += `\n- No previous injury history`;
    }

    // Age-specific rules
    if (p.age && p.age < 18) {
      summary += `\n- YOUTH BOWLER: Apply Cricket Australia U18 guidelines. Max 6 overs per spell, max 12 overs per day. Be extra conservative.`;
    } else if (p.age && p.age < 21) {
      summary += `\n- YOUNG ADULT: Still developing physically. Don't recommend more than 15 overs in a single day.`;
    }

    // Type-specific
    if (p.type === 'fast') {
      summary += `\n- Fast bowler: Higher injury risk than medium or spin. Prioritize lower back and shoulder monitoring.`;
    } else if (p.type === 'spin') {
      summary += `\n- Spin bowler: Lower injury risk from pace workload but watch for shoulder and finger fatigue. ACWR thresholds can be slightly higher (sweet spot up to 1.4).`;
    }

    return summary;
  }
};
