// ゲーム後レビュー: 各ターンの着手品質をまとめて表示。
// 各ターン開始時の盤面 + プレイヤーが打った手 + AI 推奨手 + diff スコアを保持。

export class GameReview {
  constructor() {
    this.entries = [];   // { turn: WHITE|BLACK, sequence, judgement, dice }
  }

  recordHumanTurn(beforeGame, sequence, judgement, dice) {
    this.entries.push({
      side: "player",
      sequence,
      judgement,
      dice: [...dice],
    });
  }

  summarise() {
    const byLabel = { "卓越！": 0, "お見事": 0, "まあまあ": 0, "イマイチ": 0, "ミス": 0 };
    let totalDiff = 0;
    let count = 0;
    for (const e of this.entries) {
      if (!e.judgement) continue;
      byLabel[e.judgement.label] = (byLabel[e.judgement.label] ?? 0) + 1;
      totalDiff += e.judgement.diff;
      count++;
    }
    return {
      byLabel,
      avgDiff: count ? totalDiff / count : 0,
      totalTurns: count,
    };
  }
}

export function showReviewModal(review, onClose) {
  const summary = review.summarise();
  let modal = document.getElementById("modal-review");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-review";
    modal.className = "modal hidden";
    modal.innerHTML = `
      <div class="modal-card">
        <h2>このゲームの振り返り</h2>
        <div id="review-body"></div>
        <div class="modal-actions">
          <button type="button" id="btn-review-close" class="btn btn-primary">閉じる</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  const body = modal.querySelector("#review-body");
  const labels = ["卓越！", "お見事", "まあまあ", "イマイチ", "ミス"];
  const colors = ["#7eff8c", "#a8ff8c", "#ffd764", "#ff9a4c", "#ff5544"];
  body.innerHTML = `
    <p style="margin-top:0; color:#c8b48a;">あなたが打った ${summary.totalTurns} 手の評価:</p>
    <div class="review-bar">
      ${labels.map((l, i) => {
        const c = summary.byLabel[l] ?? 0;
        const w = summary.totalTurns ? (c / summary.totalTurns * 100).toFixed(1) : 0;
        return `<div class="review-seg" style="background:${colors[i]}; flex-basis:${w}%;" title="${l}: ${c}手"></div>`;
      }).join("")}
    </div>
    <ul class="review-list">
      ${labels.map((l, i) => `<li><span style="color:${colors[i]}">●</span> ${l}: <b>${summary.byLabel[l] ?? 0}</b> 手</li>`).join("")}
    </ul>
    <p style="color:#c8b48a;">平均ロス: ${summary.avgDiff.toFixed(1)} 点 (低いほど良い手)</p>
  `;
  modal.classList.remove("hidden");
  const btn = modal.querySelector("#btn-review-close");
  const handler = () => {
    modal.classList.add("hidden");
    btn.removeEventListener("click", handler);
    onClose?.();
  };
  btn.addEventListener("click", handler);
}
