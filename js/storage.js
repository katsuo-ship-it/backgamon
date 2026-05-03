// localStorage 永続化層。
// キー名前空間: "bg." プレフィックス。読み込みエラーは静かに無視する。

const NS = "bg.";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch (e) { /* quota / private mode */ }
}

const KEYS = {
  stats:        "stats",        // { matches, matchWins, gameWins, gameLosses, bestStreak, currentStreak }
  achievements: "achievements", // { [id]: timestamp }
  story:        "story",        // { defeated: [opponentId...], current: idx }
  themes:       "themes",       // { unlocked: [themeId...], current: themeId }
  puzzleSolved: "puzzleSolved", // { [puzzleId]: true }
  settings:     "settings",     // { soundOn, animationsFast, ... }
};

export const Storage = {
  getStats() {
    return read(KEYS.stats, {
      matches: 0,
      matchWins: 0,
      gameWins: 0,
      gameLosses: 0,
      bestStreak: 0,
      currentStreak: 0,
      gammonWins: 0,
      backgammonWins: 0,
      noUndoMatchWins: 0,
    });
  },
  setStats(s) { write(KEYS.stats, s); },

  getAchievements() { return read(KEYS.achievements, {}); },
  setAchievements(a) { write(KEYS.achievements, a); },
  unlockAchievement(id) {
    const a = this.getAchievements();
    if (a[id]) return false;
    a[id] = Date.now();
    this.setAchievements(a);
    return true;
  },

  getStory() {
    return read(KEYS.story, { defeated: [], current: 0 });
  },
  setStory(s) { write(KEYS.story, s); },

  getThemes() {
    return read(KEYS.themes, {
      unlocked: ["classic"],
      current: "classic",
    });
  },
  setThemes(t) { write(KEYS.themes, t); },
  unlockTheme(id) {
    const t = this.getThemes();
    if (t.unlocked.includes(id)) return false;
    t.unlocked.push(id);
    this.setThemes(t);
    return true;
  },

  getPuzzleSolved() { return read(KEYS.puzzleSolved, {}); },
  setPuzzleSolved(p) { write(KEYS.puzzleSolved, p); },
  markPuzzleSolved(id) {
    const p = this.getPuzzleSolved();
    if (p[id]) return false;
    p[id] = Date.now();
    this.setPuzzleSolved(p);
    return true;
  },

  getSettings() {
    return read(KEYS.settings, {
      soundOn: true,
      animationsFast: false,
    });
  },
  setSettings(s) { write(KEYS.settings, s); },
};
