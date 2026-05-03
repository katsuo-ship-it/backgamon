// モーダル類とトップバー UI のヘルパ。
// main.js から呼ばれてユーザ入力を受け取る。

import { WHITE, BLACK } from "./game.js";
import { STORY_CHAPTERS, getStoryProgress } from "./story.js";
import { listAchievements, ACHIEVEMENTS } from "./achievements.js";
import { listThemes, setCurrentTheme, getCurrentThemeId } from "./themes.js";
import { VARIANTS } from "./variants.js";
import { totalPuzzles } from "./puzzles-data.js";
import { Storage } from "./storage.js";

export function bindStartScreen({
  onStartMatch,
  onStartTutorial,
  onStartPractice,
  onStartPuzzle,
  onStartStory,
}) {
  const modal = document.getElementById("modal-start");
  const tabs = modal.querySelectorAll(".mode-tab");
  const paneMatch = document.getElementById("pane-match");
  const paneTutorial = document.getElementById("pane-tutorial");
  const seg = (id) => document.getElementById(id);
  const segMatchLen = seg("seg-match-length");
  const segDifficulty = seg("seg-difficulty");

  // 既存のボタン以外に練習・パズルのボタンが必要なので動的に追加する
  ensureExtraButtons();

  // タブ切替
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const mode = tab.dataset.mode;
      paneMatch.classList.toggle("hidden", mode !== "match");
      paneTutorial.classList.toggle("hidden", mode !== "tutorial");
      const panePractice = document.getElementById("pane-practice");
      const panePuzzle = document.getElementById("pane-puzzle");
      if (panePractice) panePractice.classList.toggle("hidden", mode !== "practice");
      if (panePuzzle)   panePuzzle.classList.toggle("hidden",   mode !== "puzzle");
    });
  });

  // セグメンテッドコントロールの相互排他選択
  function bindSeg(el) {
    el.querySelectorAll("button").forEach(b => {
      b.addEventListener("click", () => {
        el.querySelectorAll("button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
      });
    });
  }
  bindSeg(segMatchLen);
  bindSeg(segDifficulty);

  document.getElementById("btn-start-match").addEventListener("click", () => {
    const len = parseInt(segMatchLen.querySelector(".active").dataset.value, 10);
    const diff = segDifficulty.querySelector(".active").dataset.value;
    hide(modal);
    onStartMatch({ matchLength: len, difficulty: diff });
  });

  // チュートリアル
  populateLessonList();
  document.getElementById("btn-start-tutorial").addEventListener("click", () => {
    hide(modal);
    onStartTutorial();
  });

  // 練習
  document.getElementById("btn-start-practice")?.addEventListener("click", () => {
    const segP = document.getElementById("seg-practice-difficulty");
    const diff = segP.querySelector(".active").dataset.value;
    hide(modal);
    onStartPractice({ difficulty: diff });
  });

  // パズル
  document.getElementById("btn-start-puzzle")?.addEventListener("click", () => {
    hide(modal);
    onStartPuzzle();
  });

  // ストーリー
  document.querySelectorAll("[data-story-chapter]").forEach(el => {
    el.addEventListener("click", () => {
      const ch = parseInt(el.dataset.storyChapter, 10);
      if (el.classList.contains("locked")) return;
      hide(modal);
      onStartStory?.(ch);
    });
  });

  // バリアント選択 (対局ペイン内)
  const segVariant = document.getElementById("seg-variant");
  if (segVariant) {
    segVariant.querySelectorAll("button").forEach(b => {
      b.addEventListener("click", () => {
        segVariant.querySelectorAll("button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
      });
    });
  }

  // テーマ選択
  const themeSel = document.getElementById("theme-select");
  if (themeSel) {
    themeSel.addEventListener("change", () => {
      setCurrentTheme(themeSel.value);
    });
  }

  // 修得済みパズル数の表示
  const psBadge = document.getElementById("puzzle-progress-badge");
  if (psBadge) {
    const solved = Object.keys(Storage.getPuzzleSolved()).length;
    psBadge.textContent = `${solved} / ${totalPuzzles()}`;
  }
}

// 対局開始時に選択されたバリアント
export function getSelectedVariant() {
  const seg = document.getElementById("seg-variant");
  if (!seg) return "standard";
  return seg.querySelector(".active")?.dataset.value ?? "standard";
}

function ensureExtraButtons() {
  const modalCard = document.querySelector("#modal-start .modal-card");
  if (!modalCard) return;
  if (document.getElementById("pane-practice")) return;

  // タブに練習・パズル・ストーリー・実績・テーマ追加
  const tabs = document.querySelector(".mode-tabs");
  const tabStory = document.createElement("button");
  tabStory.className = "mode-tab";
  tabStory.dataset.mode = "story";
  tabStory.textContent = "ストーリー";
  const tabPractice = document.createElement("button");
  tabPractice.className = "mode-tab";
  tabPractice.dataset.mode = "practice";
  tabPractice.textContent = "練習";
  const tabPuzzle = document.createElement("button");
  tabPuzzle.className = "mode-tab";
  tabPuzzle.dataset.mode = "puzzle";
  tabPuzzle.textContent = "今日の局面";
  const tabAch = document.createElement("button");
  tabAch.className = "mode-tab";
  tabAch.dataset.mode = "achievements";
  tabAch.textContent = "実績";
  // ストーリーは「対局」と「チュートリアル」の間に
  tabs.insertBefore(tabStory, tabs.children[1]);
  tabs.appendChild(tabPractice);
  tabs.appendChild(tabPuzzle);
  tabs.appendChild(tabAch);

  // 練習ペイン
  const panePractice = document.createElement("section");
  panePractice.className = "mode-pane hidden";
  panePractice.id = "pane-practice";
  panePractice.innerHTML = `
    <p class="modal-lead">
      Undo 自由・ヒント常時表示で、学んだルールを試せます。マッチではないので気軽に。
    </p>
    <div class="form-row">
      <label>難易度</label>
      <div class="seg-control" id="seg-practice-difficulty">
        <button type="button" data-value="easy" class="active">やさしい AI</button>
        <button type="button" data-value="normal">ふつう AI</button>
        <button type="button" data-value="hard">つよい AI</button>
      </div>
    </div>
    <div class="modal-actions">
      <button type="button" id="btn-start-practice" class="btn btn-primary">練習を始める</button>
    </div>
  `;
  modalCard.appendChild(panePractice);

  // パズルペイン
  const panePuzzle = document.createElement("section");
  panePuzzle.className = "mode-pane hidden";
  panePuzzle.id = "pane-puzzle";
  panePuzzle.innerHTML = `
    <p class="modal-lead">
      固定盤面の「ベストムーブを当てる」パズルです。腕試しに。
    </p>
    <div class="modal-actions">
      <button type="button" id="btn-start-puzzle" class="btn btn-primary">パズルに挑戦</button>
    </div>
  `;
  modalCard.appendChild(panePuzzle);

  // 既存のセグメンテッドコントロールに「ふつう」「つよい」「達人」追加 (4 段階化)
  const segDiff = document.getElementById("seg-difficulty");
  if (segDiff) {
    segDiff.innerHTML = `
      <button type="button" data-value="easy" class="active">やさしい</button>
      <button type="button" data-value="normal">ふつう</button>
      <button type="button" data-value="hard">つよい</button>
      <button type="button" data-value="master">達人</button>
    `;
  }

  // 対局ペインにバリアント選択を追加
  const paneMatch = document.getElementById("pane-match");
  if (paneMatch && !document.getElementById("seg-variant")) {
    const row = document.createElement("div");
    row.className = "form-row";
    row.innerHTML = `
      <label>ルール</label>
      <div class="seg-control" id="seg-variant">
        ${Object.entries(VARIANTS).map(([k, v], i) =>
          `<button type="button" data-value="${k}"${i === 0 ? ' class="active"' : ''}>${v.name}</button>`
        ).join("")}
      </div>
    `;
    // 最初の form-row の前に挿入
    paneMatch.insertBefore(row, paneMatch.querySelector(".form-row"));
  }

  // テーマ選択 (対局ペイン下部)
  if (paneMatch && !document.getElementById("theme-select")) {
    const row = document.createElement("div");
    row.className = "form-row";
    row.innerHTML = `<label>盤面テーマ</label>` + buildThemeSelect();
    paneMatch.appendChild(row);
  }

  // ストーリーペイン
  const paneStory = document.createElement("section");
  paneStory.className = "mode-pane hidden";
  paneStory.id = "pane-story";
  paneStory.innerHTML = buildStoryPane();
  modalCard.appendChild(paneStory);

  // 実績ペイン
  const paneAch = document.createElement("section");
  paneAch.className = "mode-pane hidden";
  paneAch.id = "pane-achievements";
  paneAch.innerHTML = buildAchievementsPane();
  modalCard.appendChild(paneAch);

  // セグメンテッドコントロール binding はここでは不要。bindSeg は呼び出し側で再実行する
  // 練習ペインのセグも binding する
  const segP = document.getElementById("seg-practice-difficulty");
  segP.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      segP.querySelectorAll("button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    });
  });
}

function buildThemeSelect() {
  const themes = listThemes();
  const current = getCurrentThemeId();
  return `
    <select id="theme-select" style="flex:1; padding:6px; background:#1c0f07; color:#f3ead4; border:1px solid #6b4a2a; border-radius:6px;">
      ${themes.map(t =>
        `<option value="${t.id}" ${t.unlocked ? '' : 'disabled'} ${t.id === current ? 'selected' : ''}>${t.name}${t.unlocked ? '' : ' 🔒'}</option>`
      ).join("")}
    </select>
  `;
}

function buildStoryPane() {
  const progress = getStoryProgress();
  return `
    <p class="modal-lead">
      5 つの章を順に攻略する一人旅。クリアすると新たな盤面テーマや実績がアンロックされます。
    </p>
    ${STORY_CHAPTERS.map((ch, i) => {
      const cleared = progress.defeated.includes(ch.id);
      const locked = i > progress.current;
      const cls = ["story-card"];
      if (cleared) cls.push("cleared");
      if (locked) cls.push("locked");
      return `
        <div class="${cls.join(" ")}" data-story-chapter="${i}">
          <h3>${ch.title}</h3>
          <div class="ch-meta">${ch.opponent.name} ・ ${ch.matchLength}ポイント ・ ${diffLabel(ch.difficulty)}</div>
        </div>
      `;
    }).join("")}
  `;
}

function diffLabel(d) {
  return ({ easy: "やさしい", normal: "ふつう", hard: "つよい" })[d] ?? d;
}

function buildAchievementsPane() {
  const list = listAchievements();
  return `
    <p class="modal-lead">
      条件を満たすと解除されます。実績によりテーマやペルソナが解放されることも。
    </p>
    <div class="ach-grid">
      ${list.map(a => `
        <div class="ach-tile ${a.unlocked ? 'unlocked' : 'locked'}">
          <div class="ach-tile-name">${a.name}</div>
          <div class="ach-tile-desc">${a.description}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function populateLessonList() {
  const list = document.getElementById("lesson-list");
  if (!list) return;
  list.innerHTML = `
    <li>レッスン 1: 盤面の見方とコマの進む方向</li>
    <li>レッスン 2: ダイスの使い方とゾロ目</li>
    <li>レッスン 3: ヒットとバーからの復帰</li>
    <li>レッスン 4: ベアオフ (上がり)</li>
    <li>レッスン 5: ダブリングキューブ・ギャモン</li>
  `;
}

export function showStartScreen() { show(document.getElementById("modal-start")); }
export function hideStartScreen() { hide(document.getElementById("modal-start")); }

// ダブル提示モーダル
export function showDoubleModal(stake, onTake, onDrop) {
  const modal = document.getElementById("modal-double");
  document.getElementById("double-stake").textContent = stake;
  show(modal);
  const take = document.getElementById("btn-double-take");
  const drop = document.getElementById("btn-double-drop");
  const handlerTake = () => { hide(modal); cleanup(); onTake?.(); };
  const handlerDrop = () => { hide(modal); cleanup(); onDrop?.(); };
  function cleanup() {
    take.removeEventListener("click", handlerTake);
    drop.removeEventListener("click", handlerDrop);
  }
  take.addEventListener("click", handlerTake);
  drop.addEventListener("click", handlerDrop);
}

// ゲーム結果モーダル
export function showResultModal(title, detail, onNext) {
  const modal = document.getElementById("modal-result");
  document.getElementById("result-title").textContent = title;
  document.getElementById("result-detail").textContent = detail;
  show(modal);
  const btn = document.getElementById("btn-next-game");
  const handler = () => { hide(modal); btn.removeEventListener("click", handler); onNext?.(); };
  btn.addEventListener("click", handler);
}

// マッチ終了モーダル
export function showMatchEndModal(title, detail, onClose) {
  const modal = document.getElementById("modal-match-end");
  document.getElementById("match-end-title").textContent = title;
  document.getElementById("match-end-detail").textContent = detail;
  show(modal);
  const btn = document.getElementById("btn-back-to-menu");
  const handler = () => { hide(modal); btn.removeEventListener("click", handler); onClose?.(); };
  btn.addEventListener("click", handler);
}

// チュートリアル吹き出し
// compact: true で盤面上部に小さく表示 (駒操作を妨げない)
export function showTutorialBubble(title, text, { onNext, onSkip, hideNext, compact } = {}) {
  const overlay = document.getElementById("tutorial-overlay");
  const bubble = overlay.querySelector(".tutorial-bubble");
  document.getElementById("tut-title").textContent = title;
  document.getElementById("tut-text").textContent = text;
  bubble.classList.toggle("compact", !!compact);
  show(overlay);
  const next = document.getElementById("tut-next");
  const skip = document.getElementById("tut-skip");
  next.classList.toggle("hidden", !!hideNext);
  const hN = () => { onNext?.(); next.removeEventListener("click", hN); skip.removeEventListener("click", hS); };
  const hS = () => { onSkip?.(); next.removeEventListener("click", hN); skip.removeEventListener("click", hS); };
  next.addEventListener("click", hN);
  skip.addEventListener("click", hS);
}
export function hideTutorialBubble() { hide(document.getElementById("tutorial-overlay")); }

export function setTurnBanner(text) {
  const b = document.getElementById("turn-banner");
  if (!text) { hide(b); return; }
  b.textContent = text;
  show(b);
}

export function setScore(playerScore, cpuScore, matchLength, opponentName) {
  document.getElementById("score-player").textContent = `あなた: ${playerScore}`;
  document.getElementById("score-cpu").textContent    = `${opponentName ?? "CPU"}: ${cpuScore}`;
  document.getElementById("match-length-label").textContent = matchLength ? `${matchLength} ポイントマッチ` : "";
}

export function setButtonsEnabled({ undo, double, resign }) {
  if (undo !== undefined)   document.getElementById("btn-undo").disabled   = !undo;
  if (double !== undefined) document.getElementById("btn-double").disabled = !double;
  if (resign !== undefined) document.getElementById("btn-resign").disabled = !resign;
}

// ヒントボタンを動的に追加 (1 ゲーム 3 回)
export function ensureHintButton(onClick) {
  let btn = document.getElementById("btn-hint");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "btn-hint";
    btn.className = "btn btn-ghost";
    btn.title = "おすすめ手を表示 (1 ゲーム 3 回)";
    document.querySelector(".topbar-actions").insertBefore(btn, document.getElementById("btn-undo"));
  }
  btn.onclick = onClick;
  return btn;
}
export function setHintButtonRemaining(n) {
  const btn = document.getElementById("btn-hint");
  if (!btn) return;
  btn.textContent = `ヒント (${n})`;
  btn.disabled = n <= 0;
}

function show(el) { el && el.classList.remove("hidden"); }
function hide(el) { el && el.classList.add("hidden"); }
