// キューブ判断アドバイザ。
// シンプルな経験則: 持ち時間 (相手のピップ - 自ピップ) ベースで判定。
// ベアオフ局面は races 用のテイクポイント概算を使う。

import { WHITE, BLACK, opponent } from "./game.js";
import { pipCount } from "./evaluate.js";

// "ダブル提示すべきか?", "受けるべきか?" の単純判定
// 戻り値: { advicePlayer: text, recommendDouble: bool, recommendTake: bool, pipPlayer, pipOpp, diff }
export function analyse(game, viewPlayer) {
  const opp = opponent(viewPlayer);
  const my = pipCount(game, viewPlayer);
  const op = pipCount(game, opp);
  const diff = op - my;  // プラスなら自分が有利

  let advice = "";
  let recommendDouble = false;
  let recommendTake = true;

  // ベアオフ局面か (両者バーなし、コンタクトほぼ無い)
  const noContact = !hasContact(game);
  if (noContact) {
    // レース: 簡易テイクポイント目安
    //   先手 (turn) は ~10% 不利でもテイク。+4 ピップ近辺がダブルの目安
    if (diff >= 8) recommendDouble = true;
    if (diff >= 14) recommendTake = false;  // ドロップ推奨ライン (相手にダブル提示された場合)
    advice = `レース: ${diff > 0 ? "+" + diff : diff} ピップ`;
  } else {
    // コンタクト局面: ピップ差より相対状況で雑に判定
    if (diff >= 12 && game.bar[opp] >= 1) {
      recommendDouble = true;
      advice = "相手バー上 + ピップ優位 → ダブル検討";
    } else if (diff >= 18) {
      recommendDouble = true;
      advice = "ピップ優位 → ダブル検討";
    } else if (diff <= -22) {
      recommendTake = false;
      advice = "ピップ大幅劣勢";
    } else {
      advice = `${diff > 0 ? "+" + diff : diff} ピップ (拮抗)`;
    }
  }

  return {
    pipPlayer: my,
    pipOpp: op,
    diff,
    advice,
    recommendDouble,
    recommendTake,
  };
}

// コンタクトあるか (両者のコマがすれ違っていない = レースになっていないか)
function hasContact(game) {
  // WHITE の最後尾 (max index) と BLACK の最先頭 (min index) を比較
  let whiteRear = -1;
  let blackFront = 24;
  for (let i = 0; i < 24; i++) {
    if (game.points[i].player === WHITE && game.points[i].count > 0) whiteRear = Math.max(whiteRear, i);
    if (game.points[i].player === BLACK && game.points[i].count > 0) blackFront = Math.min(blackFront, i);
  }
  if (game.bar[WHITE] > 0) whiteRear = 24;
  if (game.bar[BLACK] > 0) blackFront = -1;
  // WHITE のコマが BLACK のコマよりも前 (index 大) にいればコンタクトあり
  return whiteRear > blackFront;
}
