// AI モジュール: 3 段階の難易度。
//   - "easy":   ランダム＋簡易ヒューリスティック
//   - "normal": 1 手先読み (現在のシーケンス候補から評価関数で最良)
//   - "hard":   2 手先読み (Worker で実行)。fallback で 1 手先読み。
//
// AI の手選択は "シーケンス" 単位で行う。シーケンスを 1 手ずつ適用するためには
// controller 側がアニメーション付きで順次 applyMove する想定。

import { legalMoveSequences } from "./rules.js";
import { evaluate } from "./evaluate.js";
import { opponent } from "./game.js";
import { analyse } from "./cube-advisor.js";

// ランダム＋ヒューリスティック (ヒット優先・ブロット回避少々)
function pickEasy(game) {
  const seqs = legalMoveSequences(game, game.dice);
  if (seqs.length === 0 || seqs[0].sequence.length === 0) return [];
  // ヒットがあるシーケンスを優先
  let best = seqs;
  const withHit = seqs.filter(s => s.sequence.some(m => {
    const target = m.to;
    if (target === -1 || target === undefined) return false;
    const p = game.points[target];
    return p.player === opponent(game.turn) && p.count === 1;
  }));
  if (withHit.length > 0) best = withHit;
  // 残りはランダム
  return best[Math.floor(Math.random() * best.length)].sequence;
}

function pickNormal(game) {
  const seqs = legalMoveSequences(game, game.dice);
  if (seqs.length === 0 || seqs[0].sequence.length === 0) return [];
  // 最大ダイス使用フィルタは legalMoveSequences で済んでいるが、念のため filter
  let bestScore = -Infinity;
  let bestSeq = seqs[0].sequence;
  for (const s of seqs) {
    if (s.sequence.length === 0) continue;
    const future = applySequence(game, s.sequence);
    const sc = evaluate(future, game.turn);
    if (sc > bestScore) { bestScore = sc; bestSeq = s.sequence; }
  }
  return bestSeq;
}

function applySequence(game, sequence) {
  const g = game.clone();
  for (const m of sequence) g.applyMove(m);
  return g;
}

// 2 手先読み (Expectiminimax 簡略版)
// Worker がない場合のフォールバック実装。
function pickHardLocal(game) {
  const seqs = legalMoveSequences(game, game.dice);
  if (seqs.length === 0 || seqs[0].sequence.length === 0) return [];

  let bestScore = -Infinity;
  let bestSeq = seqs[0].sequence;
  // ダイスの組み合わせ 21 通り (順序無関係) で期待値を取る
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
    // 相手手番の期待値: 相手が evaluate を最大化する手を選ぶ前提
    let expected = 0;
    for (const c of diceCombos) {
      const dice = c.d1 === c.d2 ? [c.d1, c.d1, c.d1, c.d1] : [c.d1, c.d2];
      after.dice = [...dice];
      const oppSeqs = legalMoveSequences(after, after.dice);
      let oppBest = -Infinity;
      for (const os of oppSeqs) {
        const oppAfter = applySequence(after, os.sequence);
        // 相手から見ての評価
        const sc = evaluate(oppAfter, after.turn);
        if (sc > oppBest) oppBest = sc;
      }
      // 自分から見ての評価 (符号反転)
      expected += -oppBest * c.weight;
    }
    expected /= totalWeight;
    if (expected > bestScore) { bestScore = expected; bestSeq = s.sequence; }
  }
  return bestSeq;
}

// Web Worker ハンドル: 高速化＆UIブロック回避用
let worker = null;
let workerSeq = 0;
const workerCallbacks = new Map();

function ensureWorker() {
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./ai-worker.js", import.meta.url), { type: "module" });
    worker.addEventListener("message", (ev) => {
      const { id, sequence, error } = ev.data;
      const cb = workerCallbacks.get(id);
      if (!cb) return;
      workerCallbacks.delete(id);
      if (error) cb.reject(new Error(error));
      else cb.resolve(sequence);
    });
    worker.addEventListener("error", (ev) => {
      // Worker 側で致命的エラー: フォールバック動作のため壊しておく
      worker = null;
    });
  } catch (err) {
    worker = null;
  }
  return worker;
}

function pickHardViaWorker(game) {
  const w = ensureWorker();
  if (!w) return Promise.resolve(pickHardLocal(game));
  return new Promise((resolve, reject) => {
    const id = ++workerSeq;
    workerCallbacks.set(id, { resolve, reject });
    w.postMessage({
      id,
      points: game.points,
      bar: game.bar,
      borneOff: game.borneOff,
      turn: game.turn,
      dice: game.dice,
      cube: game.cube,
    });
    setTimeout(() => {
      // タイムアウトでフォールバック
      if (workerCallbacks.has(id)) {
        workerCallbacks.delete(id);
        resolve(pickHardLocal(game));
      }
    }, 4000);
  });
}

// 達人 AI: 選択的 3-ply Expectiminimax (Worker)
// 1-ply 評価で上位 K 個の候補シーケンスに絞り込み、それらに対して 2-ply の期待値計算を行う。
// = 実質「選択的 3 手先読み」を擬似的に実現する。
function pickMasterLocal(game) {
  // pickHardLocal と同じロジックだが、候補絞り込み後に追加の探索層を挟む
  const seqs = legalMoveSequences(game, game.dice);
  if (seqs.length === 0 || seqs[0].sequence.length === 0) return [];
  // 1) 1-ply スコアで上位 K 個に絞る
  const K = Math.min(5, seqs.length);
  const scored = seqs
    .filter(s => s.sequence.length > 0)
    .map(s => {
      const after = applySequence(game, s.sequence);
      return { seq: s.sequence, score: evaluate(after, game.turn) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, K);

  // 2) 各候補について 2-ply 期待値計算
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

function pickMasterViaWorker(game) {
  const w = ensureWorker();
  if (!w) return Promise.resolve(pickMasterLocal(game));
  return new Promise((resolve, reject) => {
    const id = ++workerSeq;
    workerCallbacks.set(id, { resolve, reject });
    w.postMessage({
      id,
      mode: "master",
      points: game.points,
      bar: game.bar,
      borneOff: game.borneOff,
      turn: game.turn,
      dice: game.dice,
      cube: game.cube,
    });
    setTimeout(() => {
      if (workerCallbacks.has(id)) {
        workerCallbacks.delete(id);
        resolve(pickMasterLocal(game));
      }
    }, 7000);
  });
}

// 公開: 難易度別の手選択 (非同期)
export async function chooseMove(game, level) {
  if (level === "easy")   return pickEasy(game);
  if (level === "normal") return pickNormal(game);
  if (level === "hard")   return await pickHardViaWorker(game);
  if (level === "master") return await pickMasterViaWorker(game);
  return pickNormal(game);
}

// キューブ判断 (CPU 側)
// 戻り値: { offerDouble, takeIfOffered }
export function chooseCube(game, level) {
  const a = analyse(game, game.turn);
  // CPU がダブル提示を検討するのは:
  //   レース局面で +8 以上 / コンタクトでヒット優位＋ピップ優位
  // 受諾は cube-advisor の recommendTake をそのまま使う。
  // 簡易/通常/強い で多少アグレッシブ度を変える。
  let offerDouble = a.recommendDouble;
  if (level === "easy") {
    // たまにしか提示しない
    offerDouble = offerDouble && Math.random() < 0.3;
  } else if (level === "hard") {
    // ふつうより一段アグレッシブに
    if (a.diff >= 6) offerDouble = true;
  }
  const takeIfOffered = a.recommendTake;
  return { offerDouble, takeIfOffered };
}
