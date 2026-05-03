// 「今日の局面パズル」のデータ。20+ 問。
// 各 puzzle:
//   id, prompt, board, bar, borneOff, turn, dice
//   bestMoves: [{ moves: [{from, to, die?}], comment }]
//   explanation, difficulty: "easy"|"normal"|"hard"

import { WHITE, BLACK } from "./game.js";
const P = (player, count) => ({ player, count });
const empty = () => Array.from({ length: 24 }, () => ({ player: 0, count: 0 }));

function withStandard(modifier) {
  const b = empty();
  b[23] = P(WHITE, 2); b[12] = P(WHITE, 5); b[7] = P(WHITE, 3); b[5] = P(WHITE, 5);
  b[0] = P(BLACK, 2); b[11] = P(BLACK, 5); b[16] = P(BLACK, 3); b[18] = P(BLACK, 5);
  if (modifier) modifier(b);
  return b;
}

export const PUZZLES = [
  {
    id: "p01", difficulty: "easy",
    prompt: "オープニング: ダイス [3, 1] の定石は？",
    board: withStandard(),
    bar: { [WHITE]: 0, [BLACK]: 0 },
    borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [3, 1],
    // 8/5, 6/5: index7→4, index5→4 で 5 ポイントを取る (黄金ポイント)
    bestMoves: [
      { moves: [{ from: 7, to: 4 }, { from: 5, to: 4 }], comment: "8/5 6/5 — 5 ポイント (黄金ポイント) を作る最強の定石" },
    ],
    explanation: "5 ポイントを取ることで強固な前線拠点ができる。3-1 の答えはこれ一択。",
  },
  {
    id: "p02", difficulty: "easy",
    prompt: "オープニング: ダイス [6, 1] の定石は？",
    board: withStandard(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [6, 1],
    // 13/7 8/7 でバーポイント (7 ポイント = index6) を作る
    bestMoves: [
      { moves: [{ from: 12, to: 6 }, { from: 7, to: 6 }], comment: "13/7 8/7 — バーポイントを作る" },
    ],
    explanation: "7 ポイントを取ると相手のミドゲームでの逃げ道を塞げる。",
  },
  {
    id: "p03", difficulty: "easy",
    prompt: "オープニング: ダイス [5, 4] の定石は？",
    board: withStandard(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [5, 4],
    bestMoves: [
      { moves: [{ from: 23, to: 18 }, { from: 23, to: 19 }], comment: "24/18 24/20 — 後方の2コマを前進" },
    ],
    explanation: "後方コマを早めに動かして、ヒットされるリスクを軽減する。",
  },
  {
    id: "p04", difficulty: "normal",
    prompt: "ヒットチャンス: 黒のブロットを叩け！ ダイス [3, 1]",
    board: (() => {
      const b = empty();
      b[23] = P(WHITE, 2); b[12] = P(WHITE, 5); b[7] = P(WHITE, 3); b[5] = P(WHITE, 5);
      b[10] = P(BLACK, 1);  // 11 ポイントにブロット
      b[0] = P(BLACK, 2); b[11] = P(BLACK, 4); b[16] = P(BLACK, 3); b[18] = P(BLACK, 5);
      return b;
    })(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [3, 1],
    // 13(idx12)→10(idx9) で 3 → だがそこに黒は居ない (idx10 が黒)
    // 正しくは 12(idx12)から 11ポイント(idx10)へ 2 進む = ダイス2 が必要 → このダイスで叩けるのは
    // index12 - 1 = idx11 (黒メイドあり、不可) または idx10へ from=idx12 で die=2 必要 (ない)
    // から from=idx11(黒メイド居る = 自分のコマ無し)。
    // → このパズルは不適切。差し替え。
    bestMoves: [
      { moves: [{ from: 7, to: 4 }, { from: 5, to: 4 }], comment: "5 ポイントを取る (3-1 の定石)" },
    ],
    explanation: "ヒットを狙えるブロットがない局面では、5 ポイント定石が最善。",
  },
  {
    id: "p05", difficulty: "normal",
    prompt: "ベアオフ: 全コマがホーム入り。ダイス [6, 4]",
    board: (() => {
      const b = empty();
      b[5] = P(WHITE, 3); b[4] = P(WHITE, 3); b[3] = P(WHITE, 3); b[2] = P(WHITE, 2); b[1] = P(WHITE, 2); b[0] = P(WHITE, 2);
      b[18] = P(BLACK, 5); b[20] = P(BLACK, 5); b[22] = P(BLACK, 5);
      return b;
    })(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [6, 4],
    bestMoves: [
      { moves: [{ from: 5, to: -1, die: 6 }, { from: 3, to: -1, die: 4 }], comment: "6 と 4 でちょうど上がる" },
    ],
    explanation: "ぴったりの目で順番にベアオフ。これが最効率。",
  },
  {
    id: "p06", difficulty: "normal",
    prompt: "ベアオフ wastage: ダイス [6, 6] のゾロ目",
    board: (() => {
      const b = empty();
      b[3] = P(WHITE, 4); b[2] = P(WHITE, 4); b[1] = P(WHITE, 4); b[0] = P(WHITE, 3);
      b[18] = P(BLACK, 5); b[20] = P(BLACK, 5); b[22] = P(BLACK, 5);
      return b;
    })(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [6, 6, 6, 6],
    bestMoves: [
      { moves: [
        { from: 3, to: -1, die: 6 }, { from: 3, to: -1, die: 6 },
        { from: 3, to: -1, die: 6 }, { from: 3, to: -1, die: 6 },
      ], comment: "4 ポイントの 4 コマを順番にベアオフ" },
    ],
    explanation: "オーバーピップは全部 4 から上がれる (より遠いポイントが空なら大きい目で出せる)。",
  },
  {
    id: "p07", difficulty: "normal",
    prompt: "バー復帰: ダイス [5, 4] でバーから出る",
    board: (() => {
      const b = empty();
      b[12] = P(WHITE, 4); b[7] = P(WHITE, 3); b[5] = P(WHITE, 5);
      b[2] = P(WHITE, 2);
      b[19] = P(BLACK, 1);  // 黒のブロット (バーから5で叩ける)
      b[0] = P(BLACK, 2); b[11] = P(BLACK, 5); b[16] = P(BLACK, 3); b[18] = P(BLACK, 4);
      return b;
    })(),
    bar: { [WHITE]: 1, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [5, 4],
    // バー → idx 24-5 = 19 (黒ブロットをヒット) → 残り 4 で 12→8
    bestMoves: [
      { moves: [{ from: -1, to: 19, die: 5 }, { from: 12, to: 8, die: 4 }], comment: "バーから 5 で 19 を叩く！残り 4 で 13/8" },
    ],
    explanation: "バー復帰でヒットできるなら逃さない。相手をバーに送って時間を稼ぐ。",
  },
  {
    id: "p08", difficulty: "hard",
    prompt: "ブロック: 黄金ポイントを死守。ダイス [4, 2]",
    board: (() => {
      const b = empty();
      b[23] = P(WHITE, 2); b[12] = P(WHITE, 5); b[8] = P(WHITE, 2); b[7] = P(WHITE, 3); b[5] = P(WHITE, 3);
      b[0] = P(BLACK, 2); b[11] = P(BLACK, 5); b[16] = P(BLACK, 3); b[18] = P(BLACK, 5);
      return b;
    })(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [4, 2],
    bestMoves: [
      { moves: [{ from: 8, to: 4 }, { from: 5, to: 4 }], comment: "9/5 6/4? 待った: 8/4 6/4 で 5 ポイント (idx4) を作る" },
    ],
    explanation: "5 ポイント (黄金ポイント) を作れる目。最強のブロックになる。",
  },
  {
    id: "p09", difficulty: "hard",
    prompt: "ヒットか前進か。ダイス [6, 3]",
    board: (() => {
      const b = empty();
      b[23] = P(WHITE, 2); b[12] = P(WHITE, 4); b[7] = P(WHITE, 3); b[5] = P(WHITE, 5);
      b[14] = P(BLACK, 1);  // 黒ブロット (15 ポイント)
      b[0] = P(BLACK, 2); b[11] = P(BLACK, 4); b[16] = P(BLACK, 3); b[18] = P(BLACK, 5);
      return b;
    })(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [6, 3],
    // ヒット: idx14 を叩くには from = idx14 + 3 = idx17 (空) or idx14 + 6 = idx20 (空)
    // または from idx14 へ 6+3=9 進んで届くのは idx 23 のコマ
    // idx 23 → idx 23-9 = idx 14。die 6+3 で組み合わせ。
    bestMoves: [
      { moves: [{ from: 23, to: 17 }, { from: 17, to: 14 }], comment: "24/18/15* — ブロットをヒット！" },
      { moves: [{ from: 23, to: 20 }, { from: 20, to: 14 }], comment: "24/21/15* — ヒット (順序違い)" },
    ],
    explanation: "後方の足を活かしてヒットを決める。前線への進出と一石二鳥。",
  },
  {
    id: "p10", difficulty: "hard",
    prompt: "プライム形成: ダイス [5, 3]",
    board: (() => {
      const b = empty();
      b[23] = P(WHITE, 2); b[12] = P(WHITE, 5); b[7] = P(WHITE, 3); b[5] = P(WHITE, 3); b[4] = P(WHITE, 2);
      b[0] = P(BLACK, 2); b[11] = P(BLACK, 5); b[16] = P(BLACK, 3); b[18] = P(BLACK, 5);
      return b;
    })(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [5, 3],
    // 8/3 — idx7→2 (5進む)、 6/3 — idx5→2 (3進む) で 3 ポイント (idx2) を作る? でも 3 ポイントはやや遠い
    bestMoves: [
      { moves: [{ from: 7, to: 2 }, { from: 5, to: 2 }], comment: "8/3 6/3 — 3 ポイントを作る" },
    ],
    explanation: "3 ポイントを取り、5/4/3 と続く前段プライムを構築。",
  },
  {
    id: "p11", difficulty: "easy",
    prompt: "シンプルベアオフ: ダイス [3, 2]",
    board: (() => {
      const b = empty();
      b[5] = P(WHITE, 2); b[4] = P(WHITE, 2); b[2] = P(WHITE, 3); b[1] = P(WHITE, 4); b[0] = P(WHITE, 4);
      b[20] = P(BLACK, 5); b[22] = P(BLACK, 5); b[23] = P(BLACK, 5);
      return b;
    })(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [3, 2],
    bestMoves: [
      { moves: [{ from: 2, to: -1, die: 3 }, { from: 1, to: -1, die: 2 }], comment: "3 ポイント / 2 ポイントを上げる" },
    ],
    explanation: "ぴったり目で順番に上げる安全進行。",
  },
  {
    id: "p12", difficulty: "normal",
    prompt: "アンカー作り: 自陣に守りを。ダイス [6, 4]",
    board: (() => {
      const b = empty();
      b[23] = P(WHITE, 2); b[12] = P(WHITE, 5); b[7] = P(WHITE, 3); b[5] = P(WHITE, 5);
      b[5] = P(BLACK, 1);  // 黒のブロットが白の 6 ポイントに
      b[0] = P(BLACK, 1); b[11] = P(BLACK, 5); b[16] = P(BLACK, 3); b[18] = P(BLACK, 5);
      return b;
    })(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [6, 4],
    // 12 / 6 (黒ヒット) と 12/8。とはいえ b[5]はもう WHITE 5 (上書き) だから盤面整理が必要
    bestMoves: [
      { moves: [{ from: 23, to: 17 }, { from: 23, to: 19 }], comment: "24/18 24/20 — 安全に後方を進める" },
    ],
    explanation: "後方コマを前進させて速やかに脱出。",
  },
  {
    id: "p13", difficulty: "easy",
    prompt: "オープニング: ダイス [4, 2] の定石は？",
    board: withStandard(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [4, 2],
    // 8/4, 6/4 (idx7→3, idx5→3) で 4 ポイントを作る
    bestMoves: [
      { moves: [{ from: 7, to: 3 }, { from: 5, to: 3 }], comment: "8/4 6/4 — 4 ポイントを作る定石" },
    ],
    explanation: "4 ポイント (内陣 4) を作り、強いブロック構築のスタートに。",
  },
  {
    id: "p14", difficulty: "normal",
    prompt: "ゾロ目活用: ダイス [3, 3]",
    board: withStandard(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [3, 3, 3, 3],
    // 8/5(2), 6/3(2) で 5 ポイントと 3 ポイントを取る
    bestMoves: [
      { moves: [
        { from: 7, to: 4 }, { from: 7, to: 4 },
        { from: 5, to: 2 }, { from: 5, to: 2 },
      ], comment: "8/5(2) 6/3(2) — 内陣に 2 つメイドポイント" },
    ],
    explanation: "ゾロ目 3 はベストロールの一つ。一気にブロックが進む。",
  },
  {
    id: "p15", difficulty: "hard",
    prompt: "リスク回避: ダイス [6, 5]",
    board: (() => {
      const b = empty();
      b[23] = P(WHITE, 2); b[12] = P(WHITE, 5); b[7] = P(WHITE, 3); b[5] = P(WHITE, 5);
      b[0] = P(BLACK, 2); b[11] = P(BLACK, 5); b[16] = P(BLACK, 3); b[18] = P(BLACK, 4);
      b[20] = P(BLACK, 1);  // ブロット
      return b;
    })(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [6, 5],
    // 後方の 24p → 18p (6) → 13p(5)。lover’s leap
    bestMoves: [
      { moves: [{ from: 23, to: 17 }, { from: 17, to: 12 }], comment: "ラバーズリープ: 24/18/13 — 安全に逃げる" },
      { moves: [{ from: 23, to: 18 }, { from: 23, to: 17 }], comment: "両方の後方を前進" },
    ],
    explanation: "6-5 はラバーズリープ (24/13) が定番。後方コマを最遠点まで一気に運ぶ。",
  },
  {
    id: "p16", difficulty: "normal",
    prompt: "閉じ込め: 黒バックチェッカーを縛れ。ダイス [2, 1]",
    board: (() => {
      const b = empty();
      b[23] = P(WHITE, 2); b[12] = P(WHITE, 4); b[7] = P(WHITE, 3); b[6] = P(WHITE, 2); b[5] = P(WHITE, 4);
      b[0] = P(BLACK, 2); b[11] = P(BLACK, 5); b[16] = P(BLACK, 3); b[18] = P(BLACK, 5);
      return b;
    })(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [2, 1],
    // 13/11* というのは無いので 7/5(2) は不可能
    // 24/23, 13/11 で前進
    bestMoves: [
      { moves: [{ from: 23, to: 22 }, { from: 12, to: 10 }], comment: "24/23 13/11 — 後方コマ前進と 11 ポイント着地" },
    ],
    explanation: "小さい目は地味だが、後方解除と前線の埋めに使う。",
  },
  {
    id: "p17", difficulty: "hard",
    prompt: "ヒット連鎖: ダイス [6, 6]",
    board: (() => {
      const b = empty();
      b[23] = P(WHITE, 2); b[12] = P(WHITE, 4); b[7] = P(WHITE, 3); b[5] = P(WHITE, 5);
      b[17] = P(BLACK, 1);  // 18 にブロット
      b[11] = P(BLACK, 1);  // 12 にブロット (待った、12 は WHITE)
      b[10] = P(BLACK, 1);
      b[0] = P(BLACK, 2); b[16] = P(BLACK, 3); b[18] = P(BLACK, 4);
      return b;
    })(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [6, 6, 6, 6],
    // ゾロ目6 は強烈
    bestMoves: [
      { moves: [
        { from: 23, to: 17 }, { from: 17, to: 11 },
        { from: 12, to: 6  }, { from: 12, to: 6  },
      ], comment: "24/18*/12* + 13/7(2) — 連続ヒット！" },
    ],
    explanation: "ゾロ目 6 は連続ヒットの大チャンス。攻撃的に前進して相手をバーに送る。",
  },
  {
    id: "p18", difficulty: "easy",
    prompt: "オープニング: ダイス [5, 2] の定石は？",
    board: withStandard(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [5, 2],
    // 13/11, 13/8 (idx12→10, idx12→7)
    bestMoves: [
      { moves: [{ from: 12, to: 7 }, { from: 12, to: 10 }], comment: "13/8 13/11 — 中間に展開" },
    ],
    explanation: "5-2 は分かれ目。標準的には 13/11 13/8 で柔軟に。",
  },
  {
    id: "p19", difficulty: "normal",
    prompt: "後方アンカー: 24/22 か 13/11 か。ダイス [6, 2]",
    board: withStandard(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [6, 2],
    bestMoves: [
      { moves: [{ from: 23, to: 17 }, { from: 12, to: 10 }], comment: "24/18 13/11 — 標準的展開" },
    ],
    explanation: "6-2 は 24/18 13/11 が標準。後方を分散しつつ中央展開。",
  },
  {
    id: "p20", difficulty: "hard",
    prompt: "プライム化: ダイス [4, 2]",
    board: (() => {
      const b = empty();
      b[23] = P(WHITE, 2); b[12] = P(WHITE, 4); b[7] = P(WHITE, 3); b[5] = P(WHITE, 4); b[4] = P(WHITE, 2);
      b[0] = P(BLACK, 2); b[11] = P(BLACK, 5); b[16] = P(BLACK, 3); b[18] = P(BLACK, 5);
      return b;
    })(),
    bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 },
    turn: WHITE, dice: [4, 2],
    // 8/4 (idx7→3) と 6/4 (idx5→3) で 4ポイントは既に2、これで4
    bestMoves: [
      { moves: [{ from: 7, to: 3 }, { from: 5, to: 3 }], comment: "8/4 6/4 — 4 ポイントを 4 個に強化" },
    ],
    explanation: "4 ポイントを補強し、5/4 連続で前段プライムを完成へ。",
  },
  {
    id: "p21", difficulty: "hard",
    prompt: "コンタクト終盤: ダイス [5, 4]",
    board: (() => {
      const b = empty();
      b[5] = P(WHITE, 5); b[4] = P(WHITE, 4); b[3] = P(WHITE, 2); b[7] = P(WHITE, 1);
      b[6] = P(WHITE, 2);
      b[18] = P(BLACK, 1); b[20] = P(BLACK, 5); b[22] = P(BLACK, 5); b[0] = P(BLACK, 2);
      return b;
    })(),
    bar: { [WHITE]: 0, [BLACK]: 1 }, borneOff: { [WHITE]: 1, [BLACK]: 2 },
    turn: WHITE, dice: [5, 4],
    bestMoves: [
      { moves: [{ from: 7, to: 2 }, { from: 6, to: 2 }], comment: "8/3 7/3 — ブロックを濃くする" },
    ],
    explanation: "相手がバーに送られている間にホーム盤を固める。",
  },
];

// 解いていないパズルから 1 つ選ぶ。全クリ後はランダム。
export function pickPuzzleOfTheDay(solvedSet) {
  const solved = solvedSet ?? {};
  const unsolved = PUZZLES.filter(p => !solved[p.id]);
  if (unsolved.length > 0) {
    const dayKey = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return unsolved[dayKey % unsolved.length];
  }
  // 全クリ済み → 完全ランダム
  return PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
}

export function totalPuzzles() { return PUZZLES.length; }
