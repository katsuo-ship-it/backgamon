// 実績システム。
// 解除条件はゲームコントローラから個別に通知される。
// 解除時に画面右上にトースト通知を表示。

import { Storage } from "./storage.js";

export const ACHIEVEMENTS = {
  "first-win":         { name: "初勝利",           description: "初めてゲームに勝った" },
  "first-match-win":   { name: "マッチ制覇",         description: "初めてマッチに勝った" },
  "gammon":            { name: "ギャモン勝利",       description: "ギャモンで勝利" },
  "backgammon":        { name: "バックギャモン勝利", description: "バックギャモンで勝利" },
  "tutorial-done":     { name: "卒業生",             description: "チュートリアルを完了" },
  "puzzle-3":          { name: "解析家",             description: "パズル 3 問を正解" },
  "puzzle-10":         { name: "戦術家",             description: "パズル 10 問を正解" },
  "puzzle-all":        { name: "理論家",             description: "全パズル正解" },
  "beat-easy":         { name: "見習い破り",         description: "やさしい AI に勝つ" },
  "beat-normal":       { name: "博士破り",           description: "ふつう AI に勝つ" },
  "beat-hard":         { name: "達人挑戦者",         description: "つよい AI に勝つ" },
  "no-undo-match":     { name: "覚悟の人",           description: "Undo を使わずマッチ制覇" },
  "streak-3":          { name: "三連勝",             description: "ゲーム 3 連勝" },
  "streak-5":          { name: "五連勝",             description: "ゲーム 5 連勝" },
  "story-1":           { name: "第一章 突破",       description: "ストーリー 1 章クリア" },
  "story-2":           { name: "第二章 突破",       description: "ストーリー 2 章クリア" },
  "story-3":           { name: "第三章 突破",       description: "ストーリー 3 章クリア" },
  "story-4":           { name: "第四章 突破",       description: "ストーリー 4 章クリア" },
  "story-5":           { name: "第五章 突破",       description: "ストーリー 5 章クリア" },
  "story-all":         { name: "ストーリー完結",     description: "ストーリー全章クリア" },
  "beat-master":       { name: "賢者超え",           description: "達人 AI に勝つ" },
  "cube-double":       { name: "キューブ使い",       description: "ダブルを提示し勝利" },
  "comeback":          { name: "逆転王",             description: "+15 ピップ劣勢から勝利" },
};

export function unlock(id, onShow) {
  if (!ACHIEVEMENTS[id]) return false;
  if (Storage.unlockAchievement(id)) {
    showToast(ACHIEVEMENTS[id], onShow);
    return true;
  }
  return false;
}

function showToast(ach, onShow) {
  const div = document.createElement("div");
  div.className = "ach-toast";
  div.innerHTML = `
    <div class="ach-icon">★</div>
    <div class="ach-body">
      <div class="ach-title">実績解除: ${ach.name}</div>
      <div class="ach-desc">${ach.description}</div>
    </div>
  `;
  document.body.appendChild(div);
  // フェードイン
  requestAnimationFrame(() => div.classList.add("show"));
  // 4 秒で消す
  setTimeout(() => {
    div.classList.remove("show");
    setTimeout(() => div.remove(), 400);
  }, 4000);
  onShow?.();
}

// 既存の実績一覧 (UI 表示用)
export function listAchievements() {
  const unlocked = Storage.getAchievements();
  return Object.entries(ACHIEVEMENTS).map(([id, a]) => ({
    id,
    name: a.name,
    description: a.description,
    unlocked: !!unlocked[id],
    unlockedAt: unlocked[id] ?? null,
  }));
}
