// チュートリアルレッスン定義。
// 各レッスンは段階的な step を持ち、説明 → 期待アクション (or AI スクリプト) を順に進む。
//
// step タイプ:
//   "narrate":      説明だけ表示。「次へ」で進む。
//   "rollFixed":    決まったダイスを振る。プレイヤー手番。
//   "expectMove":   プレイヤーが特定の move (from, to) を実行することを期待。違ったら戻して再促。
//                   step 内で複数の move (シーケンス) を期待する場合は moves: [{from,to}] 配列。
//   "cpuScripted":  CPU のターンで決まった手を打たせる (ダイス・手すべて固定)。
//   "endLesson":    レッスン終了。次のレッスンに進む or メニュー。
//
// 盤面: 24 要素配列 [{player, count}]、bar/borneOff も指定可能。

import { WHITE, BLACK } from "./game.js";

function P(player, count) { return { player, count }; }
function emptyBoard() {
  return Array.from({ length: 24 }, () => ({ player: 0, count: 0 }));
}
function standardBoard() {
  const b = emptyBoard();
  b[23] = P(WHITE, 2);
  b[12] = P(WHITE, 5);
  b[7]  = P(WHITE, 3);
  b[5]  = P(WHITE, 5);
  b[0]  = P(BLACK, 2);
  b[11] = P(BLACK, 5);
  b[16] = P(BLACK, 3);
  b[18] = P(BLACK, 5);
  return b;
}

export const LESSONS = [
  // -------- レッスン 1: 盤面の見方 --------
  {
    title: "レッスン 1 / 5",
    name: "盤面の見方とコマの進む方向",
    initial: { board: standardBoard(), bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 }, turn: WHITE, dice: [] },
    steps: [
      { type: "narrate", text: "ようこそ。バックギャモンは2人用のボードゲームです。\n白いコマがあなた、黒いコマがCPUです。" },
      { type: "narrate", text: "ボードには24個の三角形(ポイント)があります。\nあなたの白コマは右下から始まり、反時計回りに右上へ進みます。\nCPUの黒コマは逆方向です。" },
      { type: "narrate", text: "目的は自分のコマを全て自陣のホーム(あなたの右上の6ポイント)に集め、最終的にすべて盤外へ出し切ること(ベアオフ)。\n先に上がりきった方の勝ちです。" },
      { type: "narrate", text: "次のレッスンでは、サイコロを振って実際にコマを動かしてみましょう！" },
      { type: "endLesson" },
    ],
  },

  // -------- レッスン 2: ダイスの使い方 --------
  {
    title: "レッスン 2 / 5",
    name: "ダイスの使い方とゾロ目",
    initial: { board: standardBoard(), bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 }, turn: WHITE, dice: [] },
    steps: [
      { type: "narrate", text: "毎ターン、サイコロを2個振ります。\n出た目の数だけコマを進めます。2個の目はそれぞれ別のコマに使ってもOKです。" },
      { type: "rollFixed", dice: [3, 1], narration: "3 と 1 が出ました。\n次のステップで、ヒント矢印が示すコマを動かします。" },
      // 8 ポイント (index 7) のコマを 5 ポイント (index 4 ?) ... White は 23→0 方向
      // 8(index7) → 5 (3進む = index4)
      { type: "expectMove", move: { from: 7, to: 4 }, hint: "8ポイントのコマを5ポイントへ動かしましょう (ダイス目: 3)" },
      // 6(index5) → 5(index4): 1 進む
      { type: "expectMove", move: { from: 5, to: 4 }, hint: "6ポイントのコマを5ポイントへ動かしましょう (ダイス目: 1)" },
      { type: "narrate", text: "5ポイントに2個のコマを置けました。\n2個以上のコマを置いたポイントは『メイドポイント』と呼ばれ、相手はそこに止まれません。" },
      { type: "narrate", text: "ゾロ目(同じ目)の場合は4回動かせます。これは大きなチャンス！\n次のレッスンではヒットを学びます。" },
      { type: "endLesson" },
    ],
  },

  // -------- レッスン 3: ヒット & バー --------
  {
    title: "レッスン 3 / 5",
    name: "ヒットとバーからの復帰",
    initial: (() => {
      const b = emptyBoard();
      b[23] = P(WHITE, 2);
      b[12] = P(WHITE, 4);
      b[7]  = P(WHITE, 3);
      b[5]  = P(WHITE, 5);
      // 黒のブロット (1コマ) を相手前線に置く
      b[8]  = P(BLACK, 1);   // 白が叩けるブロット
      b[0]  = P(BLACK, 2);
      b[11] = P(BLACK, 4);
      b[16] = P(BLACK, 3);
      b[18] = P(BLACK, 4);
      return { board: b, bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 }, turn: WHITE, dice: [] };
    })(),
    steps: [
      { type: "narrate", text: "あるポイントに相手のコマが1個だけある状態を『ブロット』と呼びます。\nそのポイントに自分のコマで止まるとヒット成功！相手のコマはバー(中央)へ送り返されます。" },
      { type: "rollFixed", dice: [4, 1], narration: "4 と 1 が出ました。\n13ポイントの白コマで、9ポイントにいる黒のブロットをヒットしましょう。" },
      // 13(index12) → 9(index8): WHITE 進行 = index 減少 だから差 4 (ポイント番号 = index + 1)
      { type: "expectMove", move: { from: 12, to: 8 }, hint: "13ポイント白 → 9ポイント (ダイス4)。黒コマをヒット！" },
      // 残りの 1 を 24 → 23 など。23(index23) → 22(index22)
      { type: "expectMove", move: { from: 23, to: 22 }, hint: "余ったダイス1で 24ポイントから23ポイントへ動かしましょう" },
      { type: "narrate", text: "ヒットされた相手のコマは『バー』に置かれます。\nバーにコマがある間、その人は他のどのコマも動かせません。\nまず相手陣のホーム(黒なら白の右下、白なら黒の右上)に再進入する必要があります。" },
      { type: "narrate", text: "ヒットは強力な攻撃手段です。\nただし自分のブロットを残すと逆にヒットされてしまうので注意！" },
      { type: "endLesson" },
    ],
  },

  // -------- レッスン 4: ベアオフ --------
  {
    title: "レッスン 4 / 5",
    name: "ベアオフ (上がり)",
    initial: (() => {
      const b = emptyBoard();
      // 全コマがホーム盤 (0..5) に集結
      b[5] = P(WHITE, 4);
      b[4] = P(WHITE, 4);
      b[3] = P(WHITE, 3);
      b[2] = P(WHITE, 2);
      b[1] = P(WHITE, 1);
      b[0] = P(WHITE, 1);
      // 黒は遠くにいるとして簡略化
      b[18] = P(BLACK, 5);
      b[20] = P(BLACK, 5);
      b[22] = P(BLACK, 5);
      return { board: b, bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 }, turn: WHITE, dice: [] };
    })(),
    steps: [
      { type: "narrate", text: "全コマが自陣ホーム(1〜6ポイント)に揃ったら、いよいよベアオフ(上がり)です。\nダイス目とちょうど一致するポイントのコマを盤外に出せます。" },
      { type: "rollFixed", dice: [6, 5], narration: "6 と 5 が出ました。\n6ポイントのコマで6を使ってベアオフ。続いて5ポイントでベアオフ。" },
      // 6 ポイント = index 5。to=-1 がベアオフ
      { type: "expectMove", move: { from: 5, to: -1, die: 6 }, hint: "6ポイントのコマを盤外へ (ダイス6)。" },
      { type: "expectMove", move: { from: 4, to: -1, die: 5 }, hint: "5ポイントのコマを盤外へ (ダイス5)。" },
      { type: "narrate", text: "ダイス目より遠いコマがいない場合は、より小さなポイントのコマを使って大きなダイス目で上がれます。\n例: 6が出て、6ポイントにコマがなければ、5や4のコマを6で上がれます。" },
      { type: "narrate", text: "あと少し。15個全部出し切れば勝利です！" },
      { type: "endLesson" },
    ],
  },

  // -------- レッスン 5: ダブリングキューブ --------
  {
    title: "レッスン 5 / 5",
    name: "ダブリングキューブ・ギャモン",
    initial: { board: standardBoard(), bar: { [WHITE]: 0, [BLACK]: 0 }, borneOff: { [WHITE]: 0, [BLACK]: 0 }, turn: WHITE, dice: [] },
    steps: [
      { type: "narrate", focusCube: true, text: "盤面中央(バー)に光っているキューブが『ダブリングキューブ』です。\n自分が有利な局面でダブルを提示すると、賭け金が2倍に。\n相手は受ける(テイク)か降りる(ドロップ)を選びます。" },
      { type: "narrate", focusCube: true, text: "ドロップすると相手は現在のキューブ値分のポイントを失いますが、それ以上の損は防げます。\nテイクすると以後の賭け金は2倍になりますが、自分が次にダブル提示できる権利を得ます。" },
      { type: "narrate", text: "勝ち方にも種類があります:\n  - 通常勝利: 1倍\n  - ギャモン (相手がコマを1つも上げ切れずに負ける): 2倍\n  - バックギャモン (相手のコマがバー or 自陣にいる状態でギャモン): 3倍" },
      { type: "narrate", text: "マッチが指定ポイントに到達した側の勝ち。\n基本ルールはこれで全部。あとは実戦で磨きましょう！" },
      { type: "endLesson" },
    ],
  },
];
