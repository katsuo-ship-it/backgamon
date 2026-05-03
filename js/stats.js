// セッション内戦績カウンタ。リロードでリセット (localStorage は使わない)。

export class SessionStats {
  constructor() {
    this.matches = 0;
    this.matchWins = 0;
    this.gameWins = 0;
    this.gameLosses = 0;
  }
  recordGame(playerWon) {
    if (playerWon) this.gameWins += 1;
    else this.gameLosses += 1;
  }
  recordMatch(playerWon) {
    this.matches += 1;
    if (playerWon) this.matchWins += 1;
  }
}
