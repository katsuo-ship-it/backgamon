// Canvas 描画モジュール。
// 盤面レイアウト (1000x640):
//   外側パッディング 20、内側 12 個の三角ポイント x 上下、中央バー、右端ベアオフ領域。
// インデックス対応:
//   上段右端=0、上段左端=11、下段左端=12、下段右端=23。
//   上段は左→右に [11,10,9,8,7,6 | bar | 5,4,3,2,1,0]
//   下段は左→右に [12,13,14,15,16,17 | bar | 18,19,20,21,22,23]
// バーは中央 (上下に分けて WHITE/BLACK のコマを置く)。
// ベアオフは右端の縦長エリア。

import { WHITE, BLACK } from "./game.js";
import { getCurrentTheme } from "./themes.js";
import { drawAvatar } from "./avatar.js";

export const BOARD_W = 1000;
export const BOARD_H = 640;
const PAD = 24;
const BEAROFF_W = 60;
const BAR_W = 50;
const INNER_W = BOARD_W - PAD * 2 - BEAROFF_W;
const QUAD_W = (INNER_W - BAR_W) / 2;
const POINT_W = QUAD_W / 6;
const POINT_H = (BOARD_H - PAD * 2) * 0.42;
const CHECKER_R = Math.min(POINT_W, 60) * 0.42;

// 描画時にテーマから動的に取得する
function COLORS() {
  return getCurrentTheme().colors;
}

// 各ポイントの「描画三角形」の頂点と、コマ積みの開始位置を返す
function pointGeometry(i) {
  // i は 0..23
  // 上段 (top half): i=11 が最左、i=0 が最右だが、間に bar
  // 下段 (bottom half): i=12 が最左、i=23 が最右だが、間に bar
  const isTop = i <= 11;
  const yTop = PAD;
  const yBot = BOARD_H - PAD;
  let leftEdge;
  if (isTop) {
    // i=11..6 が左クワドラント、i=5..0 が右クワドラント
    if (i >= 6) {
      const col = 11 - i; // 0..5 (左から)
      leftEdge = PAD + col * POINT_W;
    } else {
      const col = 5 - i;  // 0..5
      leftEdge = PAD + QUAD_W + BAR_W + col * POINT_W;
    }
    return {
      apex:  [leftEdge + POINT_W / 2, yTop + POINT_H],
      base1: [leftEdge, yTop],
      base2: [leftEdge + POINT_W, yTop],
      x: leftEdge + POINT_W / 2,
      yTopOfStack: yTop + CHECKER_R,
      stackDir: 1, // 下方向に積む
      isTop,
    };
  } else {
    // 下段
    if (i <= 17) {
      const col = i - 12;
      leftEdge = PAD + col * POINT_W;
    } else {
      const col = i - 18;
      leftEdge = PAD + QUAD_W + BAR_W + col * POINT_W;
    }
    return {
      apex:  [leftEdge + POINT_W / 2, yBot - POINT_H],
      base1: [leftEdge, yBot],
      base2: [leftEdge + POINT_W, yBot],
      x: leftEdge + POINT_W / 2,
      yTopOfStack: yBot - CHECKER_R,
      stackDir: -1, // 上方向に積む
      isTop,
    };
  }
}

function barGeometry() {
  return {
    x: PAD + QUAD_W + BAR_W / 2,
    yTop: PAD + 30,
    yBottom: BOARD_H - PAD - 30,
    width: BAR_W,
  };
}

function bearOffGeometry() {
  return {
    x: BOARD_W - PAD - BEAROFF_W / 2,
    xLeft: BOARD_W - PAD - BEAROFF_W,
    width: BEAROFF_W,
    yTopBucket: PAD,
    yMid: BOARD_H / 2,
    yBottomBucket: BOARD_H - PAD,
  };
}

// チェッカー描画 (グラデーションで立体感)
function drawChecker(ctx, x, y, player, opts = {}) {
  const r = CHECKER_R * (opts.scale ?? 1);
  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  if (player === WHITE) {
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.6, COLORS().white);
    grad.addColorStop(1, COLORS().whiteEdge);
  } else {
    grad.addColorStop(0, "#3a2614");
    grad.addColorStop(0.6, COLORS().black);
    grad.addColorStop(1, COLORS().blackEdge);
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // 縁
  ctx.strokeStyle = player === WHITE ? COLORS().whiteEdge : COLORS().blackEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 内側の輪 (装飾)
  ctx.strokeStyle = player === WHITE ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawDie(ctx, x, y, value, size = 44, opts = {}) {
  ctx.save();
  if (opts.rotation) {
    ctx.translate(x, y);
    ctx.rotate(opts.rotation);
    ctx.translate(-x, -y);
  }
  // 影
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  roundRect(ctx, x - size/2 + 2, y - size/2 + 3, size, size, 8);
  ctx.fill();
  // 本体
  const grad = ctx.createLinearGradient(x - size/2, y - size/2, x + size/2, y + size/2);
  grad.addColorStop(0, "#fffdf2");
  grad.addColorStop(1, "#d6cca0");
  ctx.fillStyle = grad;
  roundRect(ctx, x - size/2, y - size/2, size, size, 8);
  ctx.fill();
  ctx.strokeStyle = "#8a7340";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // ピップ
  const pipR = size * 0.07;
  ctx.fillStyle = "#1a1208";
  const offsets = pipPositions(value);
  for (const [ox, oy] of offsets) {
    ctx.beginPath();
    ctx.arc(x + ox * size * 0.28, y + oy * size * 0.28, pipR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function pipPositions(v) {
  const c = [0, 0];
  const tl = [-1, -1], tr = [1, -1];
  const ml = [-1, 0],  mr = [1, 0];
  const bl = [-1, 1],  br = [1, 1];
  switch (v) {
    case 1: return [c];
    case 2: return [tl, br];
    case 3: return [tl, c, br];
    case 4: return [tl, tr, bl, br];
    case 5: return [tl, tr, c, bl, br];
    case 6: return [tl, tr, ml, mr, bl, br];
  }
  return [];
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dragging = null;          // { player, fromIndex, x, y }
    this.highlight = new Set();    // 移動可能な目的地ポイント番号 (-1 = ベアオフ)
    this.highlightOrigins = new Set(); // ヒント: 動かせる起点 (-1 = バー)
    this.hintMove = null;          // ヒントボタンで提示中の手 { from, to }
    this.diceAnim = null;          // { startTime, duration, finalDice: [d1,d2], roller: WHITE|BLACK }
    this.movingChecker = null;     // { player, fromXY, toXY, t, duration, onDone }
    this.flashAlpha = 0;           // ヒット演出
    this.flashColor = "#ff5544";
    this.gammonOverlay = null;     // { text, alpha, t }
    this.confetti = [];
    this.lastFrame = performance.now();
    this.opponentPersona = null;
    this.opponentMood = "neutral";
    this.dprScale();
  }

  setOpponentPersona(persona) { this.opponentPersona = persona; }
  setOpponentMood(mood) {
    this.opponentMood = mood;
    if (mood !== "neutral") {
      // 一定時間で neutral に戻す
      clearTimeout(this._moodTimer);
      this._moodTimer = setTimeout(() => { this.opponentMood = "neutral"; }, 2200);
    }
  }

  dprScale() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = BOARD_W * dpr;
    this.canvas.height = BOARD_H * dpr;
    this.canvas.style.width = BOARD_W + "px";
    this.canvas.style.height = BOARD_H + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // 与えた client 座標 (CSS px) を盤面ローカル座標に変換
  clientToBoard(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * BOARD_W / rect.width,
      y: (clientY - rect.top) * BOARD_H / rect.height,
    };
  }

  // 盤面座標がどの「拾える起点」にあたるかを返す。-1=バー, -2=該当なし
  pickOrigin(game, x, y) {
    // バー判定
    const barG = barGeometry();
    if (x >= PAD + QUAD_W && x <= PAD + QUAD_W + BAR_W) {
      if (game.bar[game.turn] > 0) return -1;
    }
    // ポイント判定
    for (let i = 0; i < 24; i++) {
      const g = pointGeometry(i);
      const inX = x >= g.base1[0] && x <= g.base2[0];
      const inY = g.isTop ? (y >= PAD && y <= PAD + POINT_H) : (y <= BOARD_H - PAD && y >= BOARD_H - PAD - POINT_H);
      if (inX && inY) {
        if (game.points[i].player === game.turn && game.points[i].count > 0) return i;
      }
    }
    return -2;
  }

  // 盤面座標がどの目的地ポイントに近いか (ドロップ判定)。-1=ベアオフ
  pickDestination(game, x, y) {
    // ベアオフ領域
    const bo = bearOffGeometry();
    if (x >= bo.xLeft) {
      // プレイヤーごとにベアオフ位置の上下が違うが、領域全体に乗っていれば判定
      return -1;
    }
    for (let i = 0; i < 24; i++) {
      const g = pointGeometry(i);
      const inX = x >= g.base1[0] && x <= g.base2[0];
      const inY = g.isTop ? (y >= PAD && y <= PAD + POINT_H + 80) : (y <= BOARD_H - PAD && y >= BOARD_H - PAD - POINT_H - 80);
      if (inX && inY) return i;
    }
    return -2;
  }

  setHighlights(destSet, originSet) {
    this.highlight = new Set(destSet);
    this.highlightOrigins = new Set(originSet);
  }
  clearHighlights() {
    this.highlight.clear();
    this.highlightOrigins.clear();
  }
  setHintMove(move) { this.hintMove = move; }
  clearHintMove() { this.hintMove = null; }

  startDiceRoll(roller, finalDice, duration = 700) {
    this.diceAnim = {
      startTime: performance.now(),
      duration,
      finalDice,
      roller,
    };
  }

  startMoveAnim(player, fromXY, toXY, duration, onDone) {
    this.movingChecker = {
      player,
      fromXY,
      toXY,
      t: 0,
      duration,
      onDone,
    };
  }

  triggerHitFlash(color = "#ff5544") {
    this.flashAlpha = 0.5;
    this.flashColor = color;
  }
  triggerGammonOverlay(text) {
    this.gammonOverlay = { text, alpha: 0, t: 0 };
  }
  triggerConfetti() {
    for (let i = 0; i < 120; i++) {
      this.confetti.push({
        x: BOARD_W / 2,
        y: BOARD_H / 2,
        vx: (Math.random() - 0.5) * 9,
        vy: -Math.random() * 8 - 2,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.3,
        life: 1,
        color: ["#c79b50", "#f1d79b", "#7c4a20", "#ffd764", "#fff"][Math.floor(Math.random()*5)],
      });
    }
  }

  // メインループから呼ばれる描画 (game = 現在のゲーム状態)
  draw(game, ctxInfo = {}) {
    const ctx = this.ctx;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    // 背景
    ctx.fillStyle = COLORS().frame;
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);

    // ターン中のグロー (現在の手番側のクワドラントを淡く光らせる)
    if (game && game.turn) {
      const isWhiteTurn = game.turn === WHITE;
      const glowX = isWhiteTurn
        ? PAD + QUAD_W + BAR_W
        : PAD;
      const glowGrad = ctx.createLinearGradient(glowX, 0, glowX + QUAD_W, 0);
      const glowColor = isWhiteTurn ? "rgba(255,215,100,0.10)" : "rgba(180,160,255,0.08)";
      glowGrad.addColorStop(0, glowColor);
      glowGrad.addColorStop(0.5, glowColor.replace(/0\.\d+\)/, "0.18)"));
      glowGrad.addColorStop(1, glowColor);
      ctx.fillStyle = glowGrad;
      ctx.fillRect(glowX, PAD, QUAD_W, BOARD_H - PAD * 2);
    }

    // 木目盤面ベース (左右クワドラント)
    this.drawBoardBase(ctx);

    // 24 ポイントの三角
    for (let i = 0; i < 24; i++) {
      this.drawPointTriangle(ctx, i);
    }

    // ハイライト (移動可能起点)
    for (const o of this.highlightOrigins) {
      if (o === -1) {
        // バーをハイライト
        const barG = barGeometry();
        ctx.save();
        ctx.strokeStyle = COLORS().highlightStroke;
        ctx.lineWidth = 3;
        ctx.strokeRect(PAD + QUAD_W + 4, barG.yTop - 4, BAR_W - 8, (barG.yBottom - barG.yTop) + 8);
        ctx.restore();
      } else {
        const g = pointGeometry(o);
        ctx.save();
        ctx.strokeStyle = COLORS().highlightStroke;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(g.base1[0], g.base1[1]);
        ctx.lineTo(g.base2[0], g.base2[1]);
        ctx.lineTo(g.apex[0], g.apex[1]);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
    }

    // ハイライト (移動可能先 — 目立たせる)
    for (const d of this.highlight) {
      if (d === -1) {
        const bo = bearOffGeometry();
        const yMid = game.turn === WHITE ? PAD + 80 : BOARD_H - PAD - 80;
        ctx.save();
        ctx.fillStyle = COLORS().highlight;
        ctx.fillRect(bo.xLeft, PAD, bo.width, BOARD_H - PAD * 2);
        ctx.restore();
      } else {
        const g = pointGeometry(d);
        ctx.save();
        ctx.fillStyle = COLORS().highlight;
        ctx.beginPath();
        ctx.moveTo(g.base1[0], g.base1[1]);
        ctx.lineTo(g.base2[0], g.base2[1]);
        ctx.lineTo(g.apex[0], g.apex[1]);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // ヒントムーブ表示 (矢印)
    if (this.hintMove) {
      this.drawHintArrow(ctx, this.hintMove);
    }

    // バー部分
    this.drawBar(ctx, game);

    // ベアオフエリア
    this.drawBearOff(ctx, game);

    // 24 ポイント上のコマ
    for (let i = 0; i < 24; i++) {
      const p = game.points[i];
      if (p.count === 0) continue;
      // ドラッグ中のコマは 1 つ抜く
      let count = p.count;
      if (this.dragging && this.dragging.fromIndex === i) count -= 1;
      this.drawStack(ctx, i, p.player, count);
    }
    // バー上のコマ
    this.drawBarStacks(ctx, game);

    // ドラッグ中のコマ (カーソル追従)
    if (this.dragging) {
      drawChecker(ctx, this.dragging.x, this.dragging.y, this.dragging.player, { alpha: 0.95 });
    }

    // 移動アニメーション (軌跡付き)
    if (this.movingChecker) {
      const m = this.movingChecker;
      m.t += dt;
      const progress = Math.min(1, m.t / m.duration);
      const e = 1 - Math.pow(1 - progress, 3);
      const x = m.fromXY[0] + (m.toXY[0] - m.fromXY[0]) * e;
      const y = m.fromXY[1] + (m.toXY[1] - m.fromXY[1]) * e;
      // 軌跡を蓄積
      if (!m.trail) m.trail = [];
      m.trail.push({ x, y, alpha: 0.55 });
      if (m.trail.length > 14) m.trail.shift();
      // 軌跡描画 (フェード)
      ctx.save();
      for (let i = 0; i < m.trail.length; i++) {
        const t = m.trail[i];
        const a = (i / m.trail.length) * 0.5;
        ctx.globalAlpha = a;
        const r = CHECKER_R * (0.55 + 0.45 * (i / m.trail.length));
        const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, r);
        grad.addColorStop(0, m.player === WHITE ? "#fff" : "#7a5430");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      drawChecker(ctx, x, y, m.player);
      if (progress >= 1) {
        const cb = m.onDone;
        this.movingChecker = null;
        if (cb) cb();
      }
    }

    // ダイス
    this.drawDice(ctx, game);

    // キューブ
    this.drawCube(ctx, game);

    // ピップカウント表示
    if (ctxInfo.showPipCount) {
      this.drawPipPanel(ctx, ctxInfo);
    }

    // 対戦相手のアバター
    if (this.opponentPersona) {
      drawAvatar(ctx, BOARD_W - PAD - BEAROFF_W - 70, PAD + 36, 56, this.opponentPersona, this.opponentMood);
      const c = COLORS();
      ctx.fillStyle = c.textGold;
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.opponentPersona.name, BOARD_W - PAD - BEAROFF_W - 70, PAD + 80);
    }

    // ヒット演出フラッシュ
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, BOARD_W, BOARD_H);
      ctx.restore();
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.5);
    }

    // ギャモンオーバーレイ
    if (this.gammonOverlay) {
      const ov = this.gammonOverlay;
      ov.t += dt;
      if (ov.t < 0.4) ov.alpha = ov.t / 0.4;
      else if (ov.t > 2.5) ov.alpha = Math.max(0, 1 - (ov.t - 2.5) / 0.6);
      else ov.alpha = 1;
      ctx.save();
      ctx.globalAlpha = ov.alpha;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, BOARD_H/2 - 80, BOARD_W, 160);
      ctx.fillStyle = COLORS().textGold;
      ctx.font = "bold 60px 'Yu Gothic UI', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ov.text, BOARD_W/2, BOARD_H/2);
      ctx.restore();
      if (ov.t > 3.2) this.gammonOverlay = null;
    }

    // コンフェッティ
    if (this.confetti.length > 0) {
      ctx.save();
      for (const c of this.confetti) {
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.25;
        c.rot += c.vrot;
        c.life -= dt * 0.3;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.globalAlpha = Math.max(0, c.life);
        ctx.fillStyle = c.color;
        ctx.fillRect(-5, -2, 10, 4);
        ctx.restore();
      }
      this.confetti = this.confetti.filter(c => c.life > 0 && c.y < BOARD_H + 30);
      ctx.restore();
    }
  }

  drawBoardBase(ctx) {
    // 木目調パターン (シンプルに重ね塗り)
    const grad = ctx.createLinearGradient(0, 0, 0, BOARD_H);
    grad.addColorStop(0, COLORS().woodLight);
    grad.addColorStop(0.5, COLORS().woodBase);
    grad.addColorStop(1, COLORS().woodDark);
    ctx.fillStyle = grad;
    ctx.fillRect(PAD, PAD, BOARD_W - PAD * 2 - BEAROFF_W, BOARD_H - PAD * 2);
    // フレーム
    ctx.strokeStyle = COLORS().frameEdge;
    ctx.lineWidth = 4;
    ctx.strokeRect(PAD, PAD, BOARD_W - PAD * 2 - BEAROFF_W, BOARD_H - PAD * 2);
    // 木目線 (装飾)
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#000";
    for (let y = PAD + 8; y < BOARD_H - PAD; y += 7) {
      ctx.beginPath();
      ctx.moveTo(PAD, y + Math.sin(y * 0.1) * 3);
      ctx.lineTo(BOARD_W - PAD - BEAROFF_W, y + Math.cos(y * 0.07) * 3);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPointTriangle(ctx, i) {
    const g = pointGeometry(i);
    const isLight = (i % 2 === 0);
    ctx.fillStyle = isLight ? COLORS().pointA : COLORS().pointB;
    ctx.beginPath();
    ctx.moveTo(g.base1[0], g.base1[1]);
    ctx.lineTo(g.base2[0], g.base2[1]);
    ctx.lineTo(g.apex[0], g.apex[1]);
    ctx.closePath();
    ctx.fill();
    // ハイライトライン
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // ポイント番号 (デバッグ・学習補助)
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    const labelY = g.isTop ? PAD - 4 : BOARD_H - PAD + 12;
    ctx.fillText(String(i + 1), g.x, labelY);
    ctx.restore();
  }

  drawBar(ctx, game) {
    ctx.fillStyle = COLORS().bar;
    ctx.fillRect(PAD + QUAD_W, PAD, BAR_W, BOARD_H - PAD * 2);
    ctx.strokeStyle = COLORS().frameEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(PAD + QUAD_W, PAD, BAR_W, BOARD_H - PAD * 2);
  }

  drawBarStacks(ctx, game) {
    const barG = barGeometry();
    // WHITE (人) はバー下半分
    const whiteCount = game.bar[WHITE];
    let y = BOARD_H / 2 + 10;
    for (let i = 0; i < whiteCount; i++) {
      drawChecker(ctx, barG.x, y + i * CHECKER_R * 1.5, WHITE);
    }
    // BLACK (CPU) はバー上半分
    const blackCount = game.bar[BLACK];
    y = BOARD_H / 2 - 10;
    for (let i = 0; i < blackCount; i++) {
      drawChecker(ctx, barG.x, y - i * CHECKER_R * 1.5, BLACK);
    }
  }

  drawBearOff(ctx, game) {
    const bo = bearOffGeometry();
    ctx.fillStyle = COLORS().bearOff;
    ctx.fillRect(bo.xLeft, PAD, bo.width, BOARD_H - PAD * 2);
    ctx.strokeStyle = COLORS().frameEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(bo.xLeft, PAD, bo.width, BOARD_H - PAD * 2);

    // WHITE のベアオフコマ (上半分)
    const wb = game.borneOff[WHITE];
    for (let i = 0; i < wb; i++) {
      const y = PAD + 10 + i * 8;
      ctx.fillStyle = COLORS().white;
      ctx.fillRect(bo.xLeft + 8, y, bo.width - 16, 6);
      ctx.strokeStyle = COLORS().whiteEdge;
      ctx.strokeRect(bo.xLeft + 8, y, bo.width - 16, 6);
    }
    // BLACK のベアオフコマ (下半分)
    const bb = game.borneOff[BLACK];
    for (let i = 0; i < bb; i++) {
      const y = BOARD_H - PAD - 16 - i * 8;
      ctx.fillStyle = COLORS().black;
      ctx.fillRect(bo.xLeft + 8, y, bo.width - 16, 6);
      ctx.strokeStyle = COLORS().blackEdge;
      ctx.strokeRect(bo.xLeft + 8, y, bo.width - 16, 6);
    }
    // ラベル
    ctx.save();
    ctx.fillStyle = COLORS().textGold;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ベアオフ", bo.x, BOARD_H / 2);
    ctx.fillText(`白 ${wb} / 15`, bo.x, BOARD_H / 2 + 16);
    ctx.fillText(`黒 ${bb} / 15`, bo.x, BOARD_H / 2 + 30);
    ctx.restore();
  }

  drawStack(ctx, i, player, count) {
    if (count === 0) return;
    const g = pointGeometry(i);
    // 5 個までは普通の積み方、6 個以上は均等圧縮
    if (count <= 5) {
      for (let s = 0; s < count; s++) {
        const y = g.yTopOfStack + g.stackDir * s * CHECKER_R * 2;
        drawChecker(ctx, g.x, y, player);
      }
    } else {
      // すべてのコマを少し小さく+間隔詰めて視認性を保つ
      const maxHeight = POINT_H - CHECKER_R;
      const spacing = Math.min(CHECKER_R * 2, maxHeight / (count - 1));
      for (let s = 0; s < count; s++) {
        const y = g.yTopOfStack + g.stackDir * s * spacing;
        drawChecker(ctx, g.x, y, player, { scale: 0.92 });
      }
    }
    // コマ数 4 以上で常にバッジを表示 (視認性)
    if (count >= 4) {
      // バッジは積みのトップ (apex 側) に配置
      const yBadge = g.yTopOfStack + g.stackDir * (count <= 5 ? (count - 1) * CHECKER_R * 2 : POINT_H - CHECKER_R * 1.5);
      ctx.save();
      ctx.fillStyle = "rgba(20,12,6,0.85)";
      ctx.strokeStyle = COLORS().highlightStroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(g.x, yBadge, CHECKER_R * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = COLORS().textGold;
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(count), g.x, yBadge);
      ctx.restore();
    }
  }

  drawDice(ctx, game) {
    const dice = game.dice;
    const isAnim = !!this.diceAnim;
    let visibleDice = dice;
    let animProgress = 1;
    if (isAnim) {
      const t = (performance.now() - this.diceAnim.startTime) / this.diceAnim.duration;
      animProgress = Math.min(1, t);
      if (animProgress < 1) {
        // ランダムな目をシャッフル
        visibleDice = [
          1 + Math.floor(Math.random() * 6),
          1 + Math.floor(Math.random() * 6),
        ];
      } else {
        visibleDice = this.diceAnim.finalDice;
        // アニメ終了 → 公式ダイスは setRoll で別途設定済み
        this.diceAnim = null;
      }
    }
    if (!visibleDice || visibleDice.length === 0) return;

    // ダイス位置 (現プレイヤー側のクワドラント中央)
    const player = isAnim ? this.diceAnim?.roller ?? game.turn : game.turn;
    const isWhite = player === WHITE;
    const cx = isWhite
      ? PAD + QUAD_W + BAR_W + QUAD_W * 0.5
      : PAD + QUAD_W * 0.5;
    const cy = BOARD_H / 2;
    // ゾロ目だと 4 個表示
    const diceToShow = (visibleDice.length >= 2 && visibleDice[0] === visibleDice[1])
      ? (game.dice.length === 4 ? game.dice : [visibleDice[0], visibleDice[0]])
      : visibleDice;
    const spacing = 50;
    const totalW = (diceToShow.length - 1) * spacing;
    diceToShow.forEach((v, i) => {
      drawDie(ctx, cx - totalW/2 + i * spacing, cy, v, 44, {
        rotation: isAnim ? Math.sin((performance.now() / 50) + i) * 0.3 : 0,
      });
    });
  }

  drawCube(ctx, game) {
    const cx = BOARD_W - PAD - BEAROFF_W - 38;
    let cy;
    if (game.cube.owner === WHITE) cy = BOARD_H - PAD - 30;
    else if (game.cube.owner === BLACK) cy = PAD + 30;
    else cy = BOARD_H / 2 - POINT_H - 14;

    const size = 42;
    ctx.save();
    // 影
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRect(ctx, cx - size/2 + 2, cy - size/2 + 2, size, size, 6);
    ctx.fill();
    // 本体
    const grad = ctx.createLinearGradient(cx - size/2, cy - size/2, cx + size/2, cy + size/2);
    grad.addColorStop(0, "#f1d79b");
    grad.addColorStop(1, "#a8843a");
    ctx.fillStyle = grad;
    roundRect(ctx, cx - size/2, cy - size/2, size, size, 6);
    ctx.fill();
    ctx.strokeStyle = "#5a3c20";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 数字
    ctx.fillStyle = "#1c0f07";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(game.cube.value), cx, cy);
    ctx.restore();
  }

  drawPipPanel(ctx, info) {
    const x = BOARD_W - PAD - BEAROFF_W - 130;
    const y = PAD + 110;
    const w = 110;
    const h = 90;
    ctx.save();
    ctx.fillStyle = "rgba(20,12,6,0.78)";
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = "#7a5430";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = COLORS().textGold;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("ピップ差", x + 8, y + 18);
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(`あなた: ${info.pipPlayer}`, x + 8, y + 38);
    ctx.fillText(`CPU:    ${info.pipCpu}`, x + 8, y + 56);
    ctx.fillStyle = info.pipDiff < 0 ? "#7eff8c" : (info.pipDiff > 0 ? "#ff8c8c" : "#fff");
    ctx.fillText(`差:     ${info.pipDiff > 0 ? "+" : ""}${info.pipDiff}`, x + 8, y + 76);
    if (info.cubeAdvice) {
      ctx.fillStyle = "#ffd764";
      ctx.font = "11px sans-serif";
      ctx.fillText(info.cubeAdvice, x + 8, y + h + 14);
    }
    ctx.restore();
  }

  drawHintArrow(ctx, move) {
    let from, to;
    if (move.from === -1) {
      const barG = barGeometry();
      from = [barG.x, BOARD_H / 2];
    } else {
      const g = pointGeometry(move.from);
      from = [g.x, g.yTopOfStack];
    }
    if (move.to === -1) {
      const bo = bearOffGeometry();
      to = [bo.x, BOARD_H / 2];
    } else {
      const g = pointGeometry(move.to);
      to = [g.x, g.yTopOfStack];
    }
    ctx.save();
    ctx.strokeStyle = "#ffd764";
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
    ctx.setLineDash([]);
    // 矢印先端
    const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
    ctx.fillStyle = "#ffd764";
    ctx.beginPath();
    ctx.moveTo(to[0], to[1]);
    ctx.lineTo(to[0] - Math.cos(ang - 0.4) * 14, to[1] - Math.sin(ang - 0.4) * 14);
    ctx.lineTo(to[0] - Math.cos(ang + 0.4) * 14, to[1] - Math.sin(ang + 0.4) * 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ポイントの中心座標 (移動アニメ用)
  pointCenter(player, index) {
    if (index === -1) {
      // ベアオフ
      const bo = bearOffGeometry();
      return [bo.x, player === WHITE ? PAD + 20 : BOARD_H - PAD - 20];
    }
    const g = pointGeometry(index);
    return [g.x, g.yTopOfStack];
  }

  barCenter(player) {
    const barG = barGeometry();
    return [barG.x, player === WHITE ? BOARD_H / 2 + 30 : BOARD_H / 2 - 30];
  }
}

export { pointGeometry, barGeometry, bearOffGeometry, CHECKER_R, POINT_W };
