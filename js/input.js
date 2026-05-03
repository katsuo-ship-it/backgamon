// ドラッグ&ドロップ入力処理。
// クリックでも操作できるよう、タップ的な扱いも内蔵 (短押しでハイライトのみ)。

import { legalSingleMovesFrom, legalOrigins } from "./rules.js";
import { CHECKER_R } from "./render.js";

export class InputHandler {
  constructor(canvas, renderer, ctrl) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.ctrl = ctrl;   // GameController
    this.boundDown = this.onDown.bind(this);
    this.boundMove = this.onMove.bind(this);
    this.boundUp   = this.onUp.bind(this);
    canvas.addEventListener("mousedown", this.boundDown);
    canvas.addEventListener("touchstart", this.boundDown, { passive: false });
    window.addEventListener("mousemove", this.boundMove);
    window.addEventListener("touchmove", this.boundMove, { passive: false });
    window.addEventListener("mouseup", this.boundUp);
    window.addEventListener("touchend", this.boundUp);
    this.dragValidDests = [];
  }

  destroy() {
    this.canvas.removeEventListener("mousedown", this.boundDown);
    this.canvas.removeEventListener("touchstart", this.boundDown);
    window.removeEventListener("mousemove", this.boundMove);
    window.removeEventListener("touchmove", this.boundMove);
    window.removeEventListener("mouseup", this.boundUp);
    window.removeEventListener("touchend", this.boundUp);
  }

  pointer(e) {
    if (e.touches && e.touches.length > 0) {
      const t = e.touches[0];
      return { clientX: t.clientX, clientY: t.clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      return { clientX: t.clientX, clientY: t.clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  }

  onDown(e) {
    if (!this.ctrl.canHumanInteract()) return;
    e.preventDefault();
    const p = this.pointer(e);
    const { x, y } = this.renderer.clientToBoard(p.clientX, p.clientY);
    const game = this.ctrl.game;
    const origin = this.renderer.pickOrigin(game, x, y);
    if (origin === -2) return;
    // 起点として有効か (合法手があるか) を確認
    const origins = new Set(legalOrigins(game));
    if (!origins.has(origin)) {
      // 起点として無効: 軽い揺らぎ表示などしてもいいが今は無視
      return;
    }
    // ドラッグ開始
    this.renderer.dragging = {
      player: game.turn,
      fromIndex: origin,
      x, y,
    };
    const moves = legalSingleMovesFrom(game, origin);
    this.dragValidDests = moves;
    this.renderer.setHighlights(moves.map(m => m.to), [origin]);
    this.renderer.clearHintMove();
    this.ctrl.onDragStart?.(origin);
  }

  onMove(e) {
    if (!this.renderer.dragging) return;
    e.preventDefault();
    const p = this.pointer(e);
    const { x, y } = this.renderer.clientToBoard(p.clientX, p.clientY);
    this.renderer.dragging.x = x;
    this.renderer.dragging.y = y;
  }

  onUp(e) {
    if (!this.renderer.dragging) return;
    e.preventDefault();
    const p = this.pointer(e);
    const { x, y } = this.renderer.clientToBoard(p.clientX, p.clientY);
    const game = this.ctrl.game;
    const dest = this.renderer.pickDestination(game, x, y);
    const drag = this.renderer.dragging;
    this.renderer.dragging = null;
    this.renderer.clearHighlights();

    // 合法な目的地か?
    const valid = this.dragValidDests.find(m => m.to === dest);
    if (!valid) {
      this.dragValidDests = [];
      this.ctrl.onDragCancel?.();
      return;
    }
    this.dragValidDests = [];
    // 着手を要求
    this.ctrl.requestHumanMove(valid);
  }
}
