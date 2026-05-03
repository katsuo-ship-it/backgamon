// 着手品質評価。
// プレイヤーの着手シーケンスを、AI 最善シーケンスと比較してラベル付け。
//   "卓越" Excellent: 最善と同等
//   "お見事" Good:    最善との差 < 5
//   "まあまあ" Okay:  差 < 12
//   "イマイチ" Inaccurate: 差 < 25
//   "ミス" Mistake:   差 >= 25

import { evaluate } from "./evaluate.js";
import { legalMoveSequences } from "./rules.js";
import { Game } from "./game.js";

export function judgeMove(beforeGame, playerSequence, viewPlayer) {
  // beforeGame は手番開始時の状態。playerSequence は実際に打った手のリスト。
  // AI が最善と考える評価値 (= 全合法シーケンスの max evaluate)
  const seqs = legalMoveSequences(beforeGame, beforeGame.dice);
  let bestScore = -Infinity;
  let bestSeq = null;
  for (const s of seqs) {
    const after = applySeq(beforeGame, s.sequence);
    const sc = evaluate(after, viewPlayer);
    if (sc > bestScore) { bestScore = sc; bestSeq = s.sequence; }
  }
  const playedAfter = applySeq(beforeGame, playerSequence);
  const playedScore = evaluate(playedAfter, viewPlayer);
  const diff = bestScore - playedScore;

  let label, color;
  if (diff <= 0.5)      { label = "卓越！";   color = "#7eff8c"; }
  else if (diff < 5)    { label = "お見事";   color = "#a8ff8c"; }
  else if (diff < 12)   { label = "まあまあ"; color = "#ffd764"; }
  else if (diff < 25)   { label = "イマイチ"; color = "#ff9a4c"; }
  else                  { label = "ミス";    color = "#ff5544"; }

  return { label, color, diff, bestSequence: bestSeq, playedScore, bestScore };
}

function applySeq(game, sequence) {
  const g = game.clone();
  for (const m of sequence) g.applyMove(m);
  return g;
}

// 画面上にバッジ風に短時間表示する
export function showQualityBadge(label, color) {
  let badge = document.getElementById("quality-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "quality-badge";
    badge.className = "quality-badge";
    document.body.appendChild(badge);
  }
  badge.textContent = label;
  badge.style.color = color;
  badge.style.borderColor = color;
  badge.classList.remove("show");
  // restart animation
  void badge.offsetWidth;
  badge.classList.add("show");
}
