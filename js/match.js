// マッチ進行管理。
// ポイントマッチ: 先に matchLength ポイントに到達した側が勝者。
// クロフォードルール: マッチで最初に matchLength - 1 に到達した直後の 1 ゲームはダブル禁止。
// ゲーム終了時に勝者の得点 = キューブ値 × ギャモン倍率 を加算。

import { WHITE, BLACK } from "./game.js";

export class Match {
  constructor(matchLength = 5) {
    this.matchLength = matchLength;
    this.score = { [WHITE]: 0, [BLACK]: 0 };
    this.crawfordTriggered = false;  // 一度 matchLength-1 に達したか
    this.isCrawfordGame = false;     // 現在のゲームがクロフォードゲームか
  }

  // 新ゲームのキューブ可否設定 (game.cube は呼び出し側で初期化)
  startNewGame() {
    // すでに片方が matchLength - 1 に到達しており、かつクロフォードゲーム未消化なら今回が CR ゲーム
    if (this.crawfordTriggered) {
      this.isCrawfordGame = true;
    } else {
      const at = this.score[WHITE] === this.matchLength - 1 || this.score[BLACK] === this.matchLength - 1;
      if (at) {
        this.crawfordTriggered = true;
        this.isCrawfordGame = true;
      } else {
        this.isCrawfordGame = false;
      }
    }
    // 一度クロフォードゲームを消化したら次回は通常 (post-Crawford)
    return this.isCrawfordGame;
  }

  // クロフォード消化 (ゲーム終了時に呼ぶ)
  finalizeGameStart() {
    if (this.isCrawfordGame) {
      // 次回からは post-Crawford のため crawfordTriggered は維持しつつ
      // isCrawfordGame だけ false に戻す
      this.isCrawfordGame = false;
      // crawfordTriggered は意味的にはもう不要だが、再トリガしないため true のまま
    }
  }

  // ゲーム結果を反映 (winner: WHITE|BLACK, type: single/gammon/backgammon, cubeValue: 1/2/4...)
  applyResult(winner, type, cubeValue) {
    let mult = 1;
    if (type === "gammon") mult = 2;
    if (type === "backgammon") mult = 3;
    const points = cubeValue * mult;
    this.score[winner] += points;
    this.finalizeGameStart();
    return points;
  }

  isMatchOver() {
    return this.score[WHITE] >= this.matchLength || this.score[BLACK] >= this.matchLength;
  }
  matchWinner() {
    if (this.score[WHITE] >= this.matchLength) return WHITE;
    if (this.score[BLACK] >= this.matchLength) return BLACK;
    return 0;
  }

  // ダブル提示が許されるか?
  // - 自分がキューブ所有者 or 中央 (cube.owner === 0) のときのみ提示可能
  // - クロフォードゲーム中は禁止
  canOfferDouble(game, player) {
    if (this.isCrawfordGame) return false;
    if (game.cube.value >= 64) return false;
    return game.cube.owner === 0 || game.cube.owner === player;
  }
}
