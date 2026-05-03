// ドラマチック演出モジュール。Renderer の演出機能をラップして場面別に呼ぶ。

export class Effects {
  constructor(renderer, sound) {
    this.renderer = renderer;
    this.sound = sound;
  }
  hit() {
    this.renderer.triggerHitFlash("#ff5544");
    this.sound.play("hit");
  }
  place() { this.sound.play("place"); }
  diceRoll() { this.sound.play("dice"); }
  bearOffLast() {
    this.renderer.triggerHitFlash("rgba(255,215,100,0.55)");
    this.sound.play("bearoff");
  }
  win(type) {
    if (type === "backgammon") {
      this.renderer.triggerGammonOverlay("バックギャモン勝利！");
      this.sound.play("backgammon");
    } else if (type === "gammon") {
      this.renderer.triggerGammonOverlay("ギャモン勝利！");
      this.sound.play("gammon");
    } else {
      this.renderer.triggerGammonOverlay("勝利！");
      this.sound.play("win");
    }
    this.renderer.triggerConfetti();
  }
  matchVictory() {
    this.renderer.triggerGammonOverlay("マッチ制覇！");
    this.renderer.triggerConfetti();
    this.sound.play("backgammon");
  }
}
