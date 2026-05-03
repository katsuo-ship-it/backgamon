// 合法手生成・着手ルール。
// プレイヤーの進行方向:
//   WHITE: ポイント番号が "減少" する方向 (23 → 0)
//   BLACK: ポイント番号が "増加" する方向 (0 → 23)
// バーから出す場合の入場ポイント:
//   WHITE のバー → 23..18 のいずれか (ダイス目 d なら 24-d)
//   BLACK のバー → 0..5 のいずれか   (ダイス目 d なら d-1)

import { WHITE, BLACK, opponent, HOME_RANGE, pipDistanceToBearOff } from "./game.js";

// 与えられたコマの起点とダイス目から、移動先ポイントを返す。
// 範囲外（ベアオフ方向）の場合は -1 を返す。
export function destinationOf(player, from, die) {
  if (player === WHITE) {
    // from = -1 はバー、入場は 24 - die のインデックス
    if (from === -1) return 24 - die;
    const to = from - die;
    return to < 0 ? -1 : to;
  } else {
    if (from === -1) return die - 1;
    const to = from + die;
    return to > 23 ? -1 : to;
  }
}

// この移動先 (相手のブロックでないか) を判定
function isDestOpen(game, to, player) {
  if (to === -1) return true; // ベアオフ
  const p = game.points[to];
  return !(p.player === opponent(player) && p.count >= 2);
}

// 1 ダイス分の単一移動が合法かを判定
// 戻り値: { from, to, die } or null
// player と die は引数指定 (現在ターン以外でも判定できるよう)
export function singleMoveIfLegal(game, player, from, die) {
  // バーが残っているならバーから出す手しか打てない
  if (game.bar[player] > 0 && from !== -1) return null;
  if (from === -1) {
    if (game.bar[player] === 0) return null;
  } else {
    const src = game.points[from];
    if (src.player !== player || src.count === 0) return null;
  }

  // 通常移動
  const to = destinationOf(player, from, die);
  if (to !== -1) {
    if (!isDestOpen(game, to, player)) return null;
    return { from, to, die };
  }

  // ベアオフの判定
  if (!game.canBearOff(player)) return null;
  if (from === -1) return null;
  const dist = pipDistanceToBearOff(player, from);
  if (dist === die) {
    return { from, to: -1, die };
  }
  if (dist < die) {
    // オーバーピップは「より遠いコマがホーム盤にない」場合のみ可
    const [lo, hi] = HOME_RANGE[player];
    if (player === WHITE) {
      // ホーム 0..5 のうち、from より大きい index にコマが残っているか
      for (let i = from + 1; i <= hi; i++) {
        if (game.points[i].player === player && game.points[i].count > 0) return null;
      }
    } else {
      // ホーム 18..23 のうち、from より小さい index にコマが残っているか
      for (let i = lo; i < from; i++) {
        if (game.points[i].player === player && game.points[i].count > 0) return null;
      }
    }
    return { from, to: -1, die };
  }
  return null;
}

// 全合法シーケンス列挙。
// ダイスを使い切る手が一手でも存在するなら、それのみが合法。
// 使い切れない場合: 「より多くのダイスを使う」手のみが合法。
// それも片方しか使えないなら、可能な限り「大きい方」を使う手のみが合法。
// 戻り値は { sequence: [moves...], finalState: Game } の配列
export function legalMoveSequences(game, dice) {
  const player = game.turn;
  const results = [];
  const maxFound = { count: 0, biggestDie: 0 };

  function recurse(state, remaining, history) {
    // この時点までのシーケンスを候補に加える
    const used = history.length;
    const biggestUsed = history.length > 0 ? Math.max(...history.map(m => m.die)) : 0;
    if (used > maxFound.count
        || (used === maxFound.count && biggestUsed > maxFound.biggestDie)) {
      maxFound.count = used;
      maxFound.biggestDie = biggestUsed;
    }
    results.push({ sequence: [...history], usedCount: used, biggestUsed });

    if (remaining.length === 0) return;

    // 試すダイス目 (重複は除去して効率化)
    const triedDice = new Set();
    for (const d of remaining) {
      if (triedDice.has(d)) continue;
      triedDice.add(d);

      // 起点候補: バー or 自分のコマがあるポイント
      const origins = [];
      if (state.bar[player] > 0) origins.push(-1);
      else {
        for (let i = 0; i < 24; i++) {
          if (state.points[i].player === player && state.points[i].count > 0) origins.push(i);
        }
      }

      for (const from of origins) {
        const move = singleMoveIfLegal(state, player, from, d);
        if (!move) continue;
        const after = state.clone();
        after.dice = [...remaining];
        after.applyMove(move);
        const nextRemaining = [...remaining];
        nextRemaining.splice(nextRemaining.indexOf(d), 1);
        recurse(after, nextRemaining, [...history, move]);
      }
    }
  }

  recurse(game, dice, []);

  // フィルタ: 最大限ダイスを使うものだけ
  let best = results.filter(r =>
    r.usedCount === maxFound.count &&
    (maxFound.count >= 2 || r.biggestUsed === maxFound.biggestDie)
  );

  // 1個もダイスが使えない (パス) ケースは history が空
  if (best.length === 0) best = [{ sequence: [], usedCount: 0, biggestUsed: 0 }];
  return best;
}

// あるコマ起点 (from) から、現在のダイスで届く合法な「単一移動先」を列挙する。
// ヒント表示・ドラッグ&ドロップで使用。
// 「シーケンスとして有効」になる移動先のみ返す (=最大ダイス使用ルールを満たすシーケンスの先頭手)。
export function legalSingleMovesFrom(game, from) {
  const seqs = legalMoveSequences(game, game.dice);
  const moves = new Map(); // key: "from-to" → move
  for (const s of seqs) {
    if (s.sequence.length === 0) continue;
    const head = s.sequence[0];
    if (head.from !== from) continue;
    const key = `${head.from}-${head.to}-${head.die}`;
    moves.set(key, head);
  }
  return [...moves.values()];
}

// 現在のダイスで使える「最初に動かせる起点」一覧
export function legalOrigins(game) {
  const seqs = legalMoveSequences(game, game.dice);
  const set = new Set();
  for (const s of seqs) {
    if (s.sequence.length === 0) continue;
    set.add(s.sequence[0].from);
  }
  return [...set];
}
