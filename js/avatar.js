// AI ペルソナのアバター描画。
// 専用画像は持たず、Canvas に SVG ライクな顔を描く。
// mood: "neutral" | "happy" | "thinking" | "shocked" | "lose"

export function drawAvatar(ctx, x, y, size, persona, mood = "neutral") {
  ctx.save();
  // 顔の輪郭 (ペルソナ別の色)
  const skin = persona.skinColor ?? "#f1d79b";
  const hair = persona.hairColor ?? "#3a2614";
  const accent = persona.accentColor ?? "#c79b50";

  // 影
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(x + 2, y + size * 0.55, size * 0.45, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // 顔 (楕円)
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.42, size * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1c0f07";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 髪 (上部の半月)
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.05, size * 0.43, Math.PI, 0, false);
  ctx.lineTo(x + size * 0.43, y - size * 0.15);
  ctx.lineTo(x - size * 0.43, y - size * 0.15);
  ctx.closePath();
  ctx.fill();
  // ペルソナ装飾 (帽子・ヒゲなど)
  if (persona.deco === "scholar") {
    // 眼鏡
    ctx.strokeStyle = "#1c0f07";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x - size * 0.16, y, size * 0.1, 0, Math.PI * 2);
    ctx.arc(x + size * 0.16, y, size * 0.1, 0, Math.PI * 2);
    ctx.moveTo(x - size * 0.06, y);
    ctx.lineTo(x + size * 0.06, y);
    ctx.stroke();
  } else if (persona.deco === "master") {
    // モノクル + 顎ヒゲ
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + size * 0.15, y, size * 0.11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.32, size * 0.15, size * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (persona.deco === "knight") {
    // 王冠
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.3, y - size * 0.32);
    ctx.lineTo(x - size * 0.3, y - size * 0.5);
    ctx.lineTo(x - size * 0.15, y - size * 0.4);
    ctx.lineTo(x, y - size * 0.55);
    ctx.lineTo(x + size * 0.15, y - size * 0.4);
    ctx.lineTo(x + size * 0.3, y - size * 0.5);
    ctx.lineTo(x + size * 0.3, y - size * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1c0f07";
    ctx.stroke();
  } else if (persona.deco === "ranger") {
    // 葉冠
    ctx.fillStyle = "#5a8c2c";
    ctx.beginPath();
    ctx.ellipse(x - size * 0.25, y - size * 0.3, size * 0.12, size * 0.06, -0.3, 0, Math.PI * 2);
    ctx.ellipse(x + size * 0.25, y - size * 0.3, size * 0.12, size * 0.06, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 目
  const eyeY = y - size * 0.05;
  ctx.fillStyle = "#1c0f07";
  if (mood === "shocked") {
    ctx.beginPath();
    ctx.arc(x - size * 0.16, eyeY, size * 0.06, 0, Math.PI * 2);
    ctx.arc(x + size * 0.16, eyeY, size * 0.06, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === "thinking" || mood === "lose") {
    // 細目
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1c0f07";
    ctx.beginPath();
    ctx.moveTo(x - size * 0.22, eyeY);
    ctx.lineTo(x - size * 0.10, eyeY);
    ctx.moveTo(x + size * 0.10, eyeY);
    ctx.lineTo(x + size * 0.22, eyeY);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x - size * 0.16, eyeY, size * 0.04, 0, Math.PI * 2);
    ctx.arc(x + size * 0.16, eyeY, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }

  // 口
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#1c0f07";
  ctx.beginPath();
  const mouthY = y + size * 0.18;
  if (mood === "happy") {
    ctx.arc(x, mouthY - size * 0.05, size * 0.14, 0, Math.PI);
  } else if (mood === "lose") {
    ctx.arc(x, mouthY + size * 0.08, size * 0.14, Math.PI, 0);
  } else if (mood === "shocked") {
    ctx.arc(x, mouthY, size * 0.06, 0, Math.PI * 2);
  } else {
    ctx.moveTo(x - size * 0.1, mouthY);
    ctx.lineTo(x + size * 0.1, mouthY);
  }
  ctx.stroke();

  ctx.restore();
}
