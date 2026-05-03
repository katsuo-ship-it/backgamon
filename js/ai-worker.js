// Web Worker: 2 手先読み (Expectiminimax) の重い計算を別スレッドで実行する。
// game.js / rules.js / evaluate.js の関数を再利用するため、ES Module Worker として読み込む。

import { Game, WHITE, BLACK, opponent } from "./game.js";
import { legalMoveSequences } from "./rules.js";
import { evaluate } from "./evaluate.js";

self.addEventListener("message", (ev) => {
  const { id, mode, points, bar, borneOff, turn, dice, cube } = ev.data;
  try {
    const g = new Game({
      points: points.map(p => ({ ...p })),
      bar: { ...bar },
      borneOff: { ...borneOff },
      turn,
      dice: [...dice],
      cube: { ...cube },
    });
    const sequence = mode === "master" ? pickMaster(g) : pickHard(g);
    self.postMessage({ id, sequence });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
});

// 達人: 1-ply で上位 K 個に絞り、それらに対して完全 2-ply
function pickMaster(game) {
  const seqs = legalMoveSequences(game, game.dice);
  if (seqs.length === 0 || seqs[0].sequence.length === 0) return [];
  const K = Math.min(5, seqs.length);
  const scored = seqs
    .filter(s => s.sequence.length > 0)
    .map(s => {
      const after = applySequence(game, s.sequence);
      return { seq: s.sequence, score: evaluate(after, game.turn) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, K);

  const diceCombos = [];
  for (let a = 1; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      diceCombos.push({ d1: a, d2: b, weight: a === b ? 1 : 2 });
    }
  }
  const totalWeight = 36;

  let bestScore = -Infinity;
  let bestSeq = scored[0].seq;
  for (const cand of scored) {
    const after = applySequence(game, cand.seq);
    after.endTurn();
    let expected = 0;
    for (const c of diceCombos) {
      const dice = c.d1 === c.d2 ? [c.d1, c.d1, c.d1, c.d1] : [c.d1, c.d2];
      after.dice = [...dice];
      const oppSeqs = legalMoveSequences(after, after.dice);
      let oppBest = -Infinity;
      for (const os of oppSeqs) {
        const oppAfter = applySequence(after, os.sequence);
        const sc = evaluate(oppAfter, after.turn);
        if (sc > oppBest) oppBest = sc;
      }
      if (!isFinite(oppBest)) oppBest = -evaluate(after, opponent(after.turn));
      expected += -oppBest * c.weight;
    }
    expected /= totalWeight;
    if (expected > bestScore) { bestScore = expected; bestSeq = cand.seq; }
  }
  return bestSeq;
}

function applySequence(game, sequence) {
  const g = game.clone();
  for (const m of sequence) g.applyMove(m);
  return g;
}

function pickHard(game) {
  const seqs = legalMoveSequences(game, game.dice);
  if (seqs.length === 0 || seqs[0].sequence.length === 0) return [];

  let bestScore = -Infinity;
  let bestSeq = seqs[0].sequence;
  const diceCombos = [];
  for (let a = 1; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      diceCombos.push({ d1: a, d2: b, weight: a === b ? 1 : 2 });
    }
  }
  const totalWeight = 36;

  for (const s of seqs) {
    if (s.sequence.length === 0) continue;
    const after = applySequence(game, s.sequence);
    after.endTurn();
    let expected = 0;
    for (const c of diceCombos) {
      const dice = c.d1 === c.d2 ? [c.d1, c.d1, c.d1, c.d1] : [c.d1, c.d2];
      after.dice = [...dice];
      const oppSeqs = legalMoveSequences(after, after.dice);
      let oppBest = -Infinity;
      for (const os of oppSeqs) {
        const oppAfter = applySequence(after, os.sequence);
        const sc = evaluate(oppAfter, after.turn);
        if (sc > oppBest) oppBest = sc;
      }
      // 探索木の枝刈り: 相手手番がパス状態の場合 -Infinity になるので 0 評価で代替
      if (!isFinite(oppBest)) oppBest = -evaluate(after, opponent(after.turn));
      expected += -oppBest * c.weight;
    }
    expected /= totalWeight;
    if (expected > bestScore) { bestScore = expected; bestSeq = s.sequence; }
  }
  return bestSeq;
}
