// バックギャモン局面評価関数 (拡張版)。
// 追加特徴量:
//   - 5/7 ポイント (黄金ポイント) 占有ボーナス
//   - エスケープ確率 (相手前方コマが安全に逃げられる確率)
//   - ベアオフ局面の wastage (オーバーピップで余るピップ数)
//   - コンテイメント (相手のバックチェッカーをホーム盤に閉じ込めている度合い)
//   - フェーズ判定 (コンタクト / レース / ベアオフ) で重み調整

import { WHITE, BLACK, opponent, HOME_RANGE } from "./game.js";

export function pipCount(game, player) {
  let pip = 0;
  for (let i = 0; i < 24; i++) {
    const p = game.points[i];
    if (p.player === player) pip += p.count * pipDistance(player, i);
  }
  pip += game.bar[player] * 25;
  return pip;
}

function pipDistance(player, i) {
  return player === WHITE ? i + 1 : 24 - i;
}

// 36通りのダイス組み合わせから「距離 d で届くダイス数 / 36」のテーブル
const HIT_PROB = (() => {
  const counts = new Array(25).fill(0);
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      const reachable = new Set([a, b, a + b]);
      if (a === b) { reachable.add(a * 3); reachable.add(a * 4); }
      for (const r of reachable) if (r <= 24) counts[r]++;
    }
  }
  return counts.map(c => c / 36);
})();

// メインエントリ
export function evaluate(game, player) {
  const opp = opponent(player);
  const myPip = pipCount(game, player);
  const oppPip = pipCount(game, opp);
  const phase = detectPhase(game, player, opp);

  let score = 0;

  // 1) ピップ差 (フェーズによって重み変える)
  //    レース局面では Effective Pip Count (EPC) で wastage を調整
  if (phase === "race" || phase === "bearoff") {
    const myEpc = effectivePipCount(game, player);
    const oppEpc = effectivePipCount(game, opp);
    const pipWeight = phase === "bearoff" ? 4.8 : 3.8;
    score += (oppEpc - myEpc) * pipWeight;
    // レース勝率近似: 合計ピップが少ないほど勝ちやすい
    const totalPips = myEpc + oppEpc;
    if (totalPips > 0) {
      const myShare = myEpc / totalPips;
      score += (0.5 - myShare) * 60;
    }
  } else {
    score += (oppPip - myPip) * 1.6;
  }

  // 2) ベアオフ済みコマ
  score += game.borneOff[player] * 9;
  score -= game.borneOff[opp] * 9;

  // 3) バー上のコマ
  const barPenalty = phase === "contact" ? 24 : 18;
  score -= game.bar[player] * barPenalty;
  score += game.bar[opp] * barPenalty;

  // 4) 各ポイントの価値
  const [myHomeLo, myHomeHi] = HOME_RANGE[player];
  const [oppHomeLo, oppHomeHi] = HOME_RANGE[opp];
  for (let i = 0; i < 24; i++) {
    const p = game.points[i];
    if (p.count === 0) continue;
    if (p.player === player) {
      if (p.count >= 2) {
        score += 4;
        // ホーム盤メイドポイント
        if (i >= myHomeLo && i <= myHomeHi) score += 4.5;
        // 相手ホーム内アンカー
        if (i >= oppHomeLo && i <= oppHomeHi) score += 6.5;
        // 5/7 ポイント特別ボーナス (黄金ポイント)
        if (player === WHITE) {
          if (i === 4) score += 5; // 5 ポイント
          if (i === 6) score += 3; // 7 ポイント (バーポイント)
        } else {
          if (i === 19) score += 5; // 黒の 5 ポイント
          if (i === 17) score += 3;
        }
        // 過剰なスタック (5 個以上) は wastage
        if (p.count >= 5) score -= (p.count - 4) * 1.2;
      } else if (p.count === 1) {
        // ブロット減点
        if (phase !== "race" && phase !== "bearoff") {
          const dist = blotHitDistance(game, opp, i);
          if (dist > 0 && dist <= 24) {
            const pBlocked = blockingFactor(game, opp, i, dist);
            score -= 22 * HIT_PROB[dist] * pBlocked;
          } else {
            score -= 1;
          }
        } else {
          score -= 0.3; // レースではブロットほぼ無害
        }
      }
    }
  }

  // 5) プライム
  score += primeBonus(game, player) * 3.5;
  score -= primeBonus(game, opp) * 2.0;

  // 6) ホーム到達コマ
  score += homeArrivedCount(game, player) * 1.5;
  score -= homeArrivedCount(game, opp) * 1.5;

  // 7) コンテイメント (相手のバックチェッカーをどれだけ閉じ込めているか)
  score += containmentScore(game, player) * 2;

  // 8) ベアオフ wastage (フェーズが bearoff のとき重要)
  if (phase === "bearoff") {
    score -= bearOffWastage(game, player) * 1.5;
    score += bearOffWastage(game, opp) * 1.5;
  }

  // 9) バックゲーム判定 (相手陣に多数アンカーを持つ自分の状況評価)
  //    相手のホーム盤に 2 つ以上のアンカーを持っている = バックゲーム志向
  //    pip 差が大きく劣勢 (相手の方が 50+ ピップ少ない) なら、相手前線にブロットを残させたい
  const myDeficit = myPip - oppPip;
  if (myDeficit > 50 && phase === "contact") {
    let myAnchorsInOppHome = 0;
    for (let i = oppHomeLo; i <= oppHomeHi; i++) {
      if (game.points[i].player === player && game.points[i].count >= 2) myAnchorsInOppHome++;
    }
    if (myAnchorsInOppHome >= 2) {
      // バックゲーム成立。相手のブロットの数を見て評価
      let oppBlotsInMyArea = 0;
      const myInnerLimit = player === WHITE ? 12 : 11;
      for (let i = 0; i < 24; i++) {
        const p = game.points[i];
        if (p.player === opp && p.count === 1) {
          // 自陣前線に近いブロットほど価値
          if (player === WHITE ? i <= myInnerLimit : i >= myInnerLimit) oppBlotsInMyArea++;
        }
      }
      score += oppBlotsInMyArea * 8;
      // バックゲーム自体に底値ボーナス (見捨てられない)
      score += 12;
    }
  }

  // 10) タイミング: 自陣ホーム盤の充実度 vs 相手バックチェッカー
  //     プライム/ホーム盤が充実しているほど相手をクロージングしやすい
  let myHomePoints = 0;
  for (let i = myHomeLo; i <= myHomeHi; i++) {
    if (game.points[i].player === player && game.points[i].count >= 2) myHomePoints++;
  }
  let oppBackCheckers = 0;
  for (let i = myHomeLo; i <= myHomeHi; i++) {
    if (game.points[i].player === opp) oppBackCheckers += game.points[i].count;
  }
  if (oppBackCheckers > 0 && myHomePoints >= 4) {
    score += myHomePoints * oppBackCheckers * 1.2;
  }

  return score;
}

// Effective Pip Count: ホーム盤での wastage を加味した実効ピップ
function effectivePipCount(game, player) {
  const base = pipCount(game, player);
  const [lo, hi] = HOME_RANGE[player];
  let waste = 0;
  for (let i = lo; i <= hi; i++) {
    const p = game.points[i];
    if (p.player !== player || p.count === 0) continue;
    const dist = pipDistance(player, i);  // 1..6
    // 1 ポイントに 1 個以上ある場合、ベアオフ時に小さい目を消費する wastage
    // 経験則: 過剰スタック (count > 2) と低ピップ (dist <= 2) が wastage を増やす
    if (dist <= 2 && p.count >= 3) waste += (p.count - 2) * 0.7;
    if (p.count >= 5) waste += (p.count - 4) * 0.4;
  }
  return base + waste;
}

function detectPhase(game, player, opp) {
  // コンタクトの判定 (両者がすれ違っていない)
  const hasC = hasContact(game);
  if (!hasC) {
    // レース or ベアオフ
    const allInHome = game.borneOff[player] > 0 || allCheckersInHome(game, player);
    if (allInHome) return "bearoff";
    return "race";
  }
  return "contact";
}

function hasContact(game) {
  let whiteRear = -1;
  let blackFront = 24;
  for (let i = 0; i < 24; i++) {
    if (game.points[i].player === WHITE && game.points[i].count > 0) whiteRear = Math.max(whiteRear, i);
    if (game.points[i].player === BLACK && game.points[i].count > 0) blackFront = Math.min(blackFront, i);
  }
  if (game.bar[WHITE] > 0) whiteRear = 24;
  if (game.bar[BLACK] > 0) blackFront = -1;
  return whiteRear > blackFront;
}

function allCheckersInHome(game, player) {
  if (game.bar[player] > 0) return false;
  const [lo, hi] = HOME_RANGE[player];
  for (let i = 0; i < 24; i++) {
    if (i < lo || i > hi) {
      if (game.points[i].player === player && game.points[i].count > 0) return false;
    }
  }
  return true;
}

function homeArrivedCount(game, player) {
  const [lo, hi] = HOME_RANGE[player];
  let n = 0;
  for (let i = lo; i <= hi; i++) {
    if (game.points[i].player === player) n += game.points[i].count;
  }
  return n + game.borneOff[player];
}

function primeBonus(game, player) {
  let best = 0, run = 0;
  for (let i = 0; i < 24; i++) {
    const p = game.points[i];
    if (p.player === player && p.count >= 2) run++;
    else { if (run > best) best = run; run = 0; }
  }
  if (run > best) best = run;
  if (best >= 6) return 35;
  if (best >= 5) return 16;
  if (best >= 4) return 7;
  if (best >= 3) return 2.5;
  return 0;
}

function blotHitDistance(game, opp, i) {
  if (opp === BLACK) {
    let best = 25;
    if (game.bar[BLACK] > 0) best = Math.min(best, i + 1);
    for (let j = 0; j < i; j++) {
      if (game.points[j].player === BLACK && game.points[j].count > 0) {
        const d = i - j;
        if (d > 0 && d < best) best = d;
      }
    }
    return best === 25 ? -1 : best;
  } else {
    let best = 25;
    if (game.bar[WHITE] > 0) best = Math.min(best, 24 - i);
    for (let j = 23; j > i; j--) {
      if (game.points[j].player === WHITE && game.points[j].count > 0) {
        const d = j - i;
        if (d > 0 && d < best) best = d;
      }
    }
    return best === 25 ? -1 : best;
  }
}

// シンプルなブロック度ファクタ (1.0 でフル、間に相手メイドポイントがあれば下げる)
function blockingFactor(game, opp, i, dist) {
  // 中間ポイントに自分のメイドがあるとヒットしづらい (近似 0.7)
  const player = opponent(opp);
  let blocks = 0;
  if (opp === BLACK) {
    for (let j = i - dist + 1; j < i; j++) {
      if (j < 0) continue;
      if (game.points[j].player === player && game.points[j].count >= 2) blocks++;
    }
  } else {
    for (let j = i + 1; j < i + dist; j++) {
      if (j > 23) continue;
      if (game.points[j].player === player && game.points[j].count >= 2) blocks++;
    }
  }
  return Math.max(0.4, 1 - 0.18 * blocks);
}

// 相手のバックチェッカー (自分の最遠陣のコマ) を自陣に閉じ込めている度合い
function containmentScore(game, player) {
  const opp = opponent(player);
  // 相手のバックチェッカー: opp の "進行方向" 後方
  // opp = BLACK なら opp は 0 → 23 方向。後方は index が小さい範囲、つまり player = WHITE のホーム盤付近
  const [myHomeLo, myHomeHi] = HOME_RANGE[player];
  let oppCheckersBack = 0;
  for (let i = myHomeLo; i <= myHomeHi; i++) {
    if (game.points[i].player === opp) oppCheckersBack += game.points[i].count;
  }
  if (oppCheckersBack === 0) return 0;
  // 相手から見たエスケープ難度: 自分がホーム盤に作っているメイドポイント数
  let myMadeInHome = 0;
  for (let i = myHomeLo; i <= myHomeHi; i++) {
    if (game.points[i].player === player && game.points[i].count >= 2) myMadeInHome++;
  }
  // バーポイント (player の 7 ポイント)
  const barPoint = player === WHITE ? 6 : 17;
  if (game.points[barPoint].player === player && game.points[barPoint].count >= 2) myMadeInHome += 1;
  return oppCheckersBack * (myMadeInHome / 6);
}

// ベアオフ局面の wastage: ホーム盤 6 ポイントを 1 ピップとしたときの「無駄になるピップ」
function bearOffWastage(game, player) {
  const [lo, hi] = HOME_RANGE[player];
  let waste = 0;
  // 6 ポイント (最遠) を超えるコマがいなければ、各ポイントの分布で wastage を概算
  for (let i = lo; i <= hi; i++) {
    if (game.points[i].player === player) {
      const d = pipDistance(player, i); // 1..6
      // d が小さいほど wastage が増える (ダイス目はだいたい 3.5 平均)
      if (d < 4) waste += game.points[i].count * (4 - d) * 0.3;
    }
  }
  return waste;
}
