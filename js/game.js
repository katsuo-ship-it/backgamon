// ゲーム状態と着手ロジック。
// ボードは 24 ポイント。視覚配置は以下を採用する:
//   - 上段右端を 0、上段左端を 11、下段左端を 12、下段右端を 23
//   - プレイヤー (WHITE) は上向き = 23 → 0 方向 (インデックス減少)
//   - CPU (BLACK)       は下向き = 0  → 23 方向 (インデックス増加)
// "進行方向" の概念を吸収するため、各処理は player の symbol に応じて方向を切替える。

export const WHITE = 1;   // 人プレイヤー
export const BLACK = -1;  // CPU

export const opponent = (p) => -p;

// 視覚的な「ホーム盤」インデックス
//   WHITE のホームは 0..5 (上段右側)
//   BLACK のホームは 18..23 (下段右側)
export const HOME_RANGE = {
  [WHITE]: [0, 5],
  [BLACK]: [18, 23],
};

// プレイヤーから見た「ゴール手前のポイント」(ベアオフ計算用基準)
//   WHITE は 0 番ポイントの先がゴール → from を「6 - i」に変換
//   BLACK は 23 の先がゴール → from を「i - 17」に変換
export function pipDistanceToBearOff(player, pointIndex) {
  if (player === WHITE) return pointIndex + 1;       // 0→1, 5→6
  return 24 - pointIndex;                            // 23→1, 18→6
}

// 標準初期配置 (各ポイントの { player, count } )
export function initialBoard() {
  const points = Array.from({ length: 24 }, () => ({ player: 0, count: 0 }));
  // WHITE (人)
  points[23] = { player: WHITE, count: 2 };
  points[12] = { player: WHITE, count: 5 };
  points[7]  = { player: WHITE, count: 3 };
  points[5]  = { player: WHITE, count: 5 };
  // BLACK (CPU)
  points[0]  = { player: BLACK, count: 2 };
  points[11] = { player: BLACK, count: 5 };
  points[16] = { player: BLACK, count: 3 };
  points[18] = { player: BLACK, count: 5 };
  return points;
}

export class Game {
  constructor(opts = {}) {
    this.points    = opts.points    ?? initialBoard();
    this.bar       = opts.bar       ?? { [WHITE]: 0, [BLACK]: 0 };
    this.borneOff  = opts.borneOff  ?? { [WHITE]: 0, [BLACK]: 0 };
    this.turn      = opts.turn      ?? WHITE;
    this.dice      = opts.dice      ?? [];   // 残ピップ ([3,5] や ゾロ目で [4,4,4,4])
    this.history   = [];                     // ターン内の Undo 用 (ターン開始時にリセット)
    this.cube      = opts.cube      ?? { value: 1, owner: 0 }; // owner: 0=中央, WHITE, BLACK
  }

  clone() {
    const g = new Game({
      points:   this.points.map(p => ({ ...p })),
      bar:      { ...this.bar },
      borneOff: { ...this.borneOff },
      turn:     this.turn,
      dice:     [...this.dice],
      cube:     { ...this.cube },
    });
    return g;
  }

  // 「全コマがホーム盤＋ベアオフ済み」かを判定
  canBearOff(player) {
    if (this.bar[player] > 0) return false;
    const [lo, hi] = HOME_RANGE[player];
    for (let i = 0; i < 24; i++) {
      if (i < lo || i > hi) {
        if (this.points[i].player === player && this.points[i].count > 0) return false;
      }
    }
    return true;
  }

  // 着手を適用する。move = { from, to, hit }
  //   from = -1 (バー), to = -1 (ベアオフ)
  applyMove(move) {
    const player = this.turn;
    const opp = opponent(player);

    // バーから出す
    if (move.from === -1) {
      this.bar[player] -= 1;
    } else {
      this.points[move.from].count -= 1;
      if (this.points[move.from].count === 0) this.points[move.from].player = 0;
    }

    // ベアオフ
    if (move.to === -1) {
      this.borneOff[player] += 1;
    } else {
      const target = this.points[move.to];
      if (target.player === opp && target.count === 1) {
        // ヒット
        target.player = 0;
        target.count = 0;
        this.bar[opp] += 1;
        move.hit = true;
      }
      target.player = player;
      target.count += 1;
    }

    // ダイス消費
    const usedIndex = this.dice.indexOf(move.die);
    if (usedIndex >= 0) this.dice.splice(usedIndex, 1);

    this.history.push(move);
  }

  // ターン内 Undo: 直近の着手を取り消す
  undoLastMove() {
    const move = this.history.pop();
    if (!move) return false;
    const player = this.turn;
    const opp = opponent(player);

    // ダイス目を戻す
    this.dice.push(move.die);

    // 移動先を戻す
    if (move.to === -1) {
      this.borneOff[player] -= 1;
    } else {
      const target = this.points[move.to];
      target.count -= 1;
      if (target.count === 0) target.player = 0;
      // ヒットを巻き戻す
      if (move.hit) {
        target.player = opp;
        target.count = 1;
        this.bar[opp] -= 1;
      }
    }

    // 移動元に戻す
    if (move.from === -1) {
      this.bar[player] += 1;
    } else {
      const src = this.points[move.from];
      src.player = player;
      src.count += 1;
    }
    return true;
  }

  // ダイス目をセット (ロール後に呼ぶ)。ゾロ目は 4 個に展開。
  setRoll(d1, d2) {
    this.dice = (d1 === d2) ? [d1, d1, d1, d1] : [d1, d2];
    this.history = [];
  }

  // ターン交代
  endTurn() {
    this.turn = opponent(this.turn);
    this.dice = [];
    this.history = [];
  }

  // 勝者と種類 (single/gammon/backgammon)
  winnerType() {
    for (const winner of [WHITE, BLACK]) {
      if (this.borneOff[winner] === 15) {
        const loser = opponent(winner);
        const loserBorne = this.borneOff[loser];
        if (loserBorne > 0) return { winner, type: "single" };
        // ギャモン or バックギャモン
        // 敗者のコマがバー or 勝者のホーム盤にいる → バックギャモン
        const [winLo, winHi] = HOME_RANGE[winner];
        let inWinnerHome = false;
        for (let i = winLo; i <= winHi; i++) {
          if (this.points[i].player === loser && this.points[i].count > 0) inWinnerHome = true;
        }
        if (this.bar[loser] > 0 || inWinnerHome) return { winner, type: "backgammon" };
        return { winner, type: "gammon" };
      }
    }
    return null;
  }

  isGameOver() {
    return this.winnerType() !== null;
  }
}
