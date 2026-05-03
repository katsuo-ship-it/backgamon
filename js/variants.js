// バリアントルール定義。
// 各バリアントは「初期配置」(と必要なら追加ルールフック) を提供する。

import { WHITE, BLACK } from "./game.js";

const P = (player, count) => ({ player, count });
const empty = () => Array.from({ length: 24 }, () => ({ player: 0, count: 0 }));

export const VARIANTS = {
  standard: {
    name: "標準バックギャモン",
    description: "国際ルールの標準配置。",
    initialBoard: () => {
      const b = empty();
      b[23] = P(WHITE, 2); b[12] = P(WHITE, 5); b[7] = P(WHITE, 3); b[5] = P(WHITE, 5);
      b[0] = P(BLACK, 2); b[11] = P(BLACK, 5); b[16] = P(BLACK, 3); b[18] = P(BLACK, 5);
      return b;
    },
    rules: { aceyDeucey: false },
  },
  nackgammon: {
    name: "ナックギャモン",
    description: "後方アンカーが分散され、長く濃いコンタクト戦になる。",
    initialBoard: () => {
      const b = empty();
      // White: 24p:2, 23p:2, 13p:4, 8p:3, 6p:4 → index: 23:2, 22:2, 12:4, 7:3, 5:4
      b[23] = P(WHITE, 2); b[22] = P(WHITE, 2);
      b[12] = P(WHITE, 4); b[7]  = P(WHITE, 3); b[5] = P(WHITE, 4);
      b[0]  = P(BLACK, 2); b[1]  = P(BLACK, 2);
      b[11] = P(BLACK, 4); b[16] = P(BLACK, 3); b[18] = P(BLACK, 4);
      return b;
    },
    rules: { aceyDeucey: false },
  },
  hyper: {
    name: "ハイパーギャモン",
    description: "コマ 3 個ずつ。短時間決着で読みが効く。",
    initialBoard: () => {
      const b = empty();
      b[23] = P(WHITE, 1); b[22] = P(WHITE, 1); b[21] = P(WHITE, 1);
      b[0] = P(BLACK, 1); b[1] = P(BLACK, 1); b[2] = P(BLACK, 1);
      return b;
    },
    rules: { aceyDeucey: false, totalCheckers: 3 },
  },
  aceyDeucey: {
    name: "アシー・デューシー",
    description: "コマ無し開始。1-2 が出ると好きなゾロ目を追加で振れる特別ルール。",
    initialBoard: () => empty(),
    rules: { aceyDeucey: true, startEmpty: true },
    note: "簡略実装: 標準ルールで開始 (アシー・デューシー特典は今後対応)",
  },
};

export function getVariant(id) {
  return VARIANTS[id] ?? VARIANTS.standard;
}
