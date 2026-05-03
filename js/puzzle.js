// 「今日の局面パズル」ランナー。
// 1 問固定盤面で、プレイヤーがベストムーブを当てるまで挑戦する。

import { pickPuzzleOfTheDay, totalPuzzles } from "./puzzles-data.js";
import { showTutorialBubble, hideTutorialBubble } from "./ui.js";
import { Storage } from "./storage.js";
import * as Achievements from "./achievements.js";

export class PuzzleRunner {
  constructor(controller) {
    this.controller = controller;
    this.puzzle = pickPuzzleOfTheDay(Storage.getPuzzleSolved());
    this.solvedSequence = [];
    this.targetSequence = null;
  }
  start() {
    const init = {
      board: this.puzzle.board,
      bar: this.puzzle.bar,
      borneOff: this.puzzle.borneOff,
      turn: this.puzzle.turn,
      dice: this.puzzle.dice,
    };
    this.controller.setupGameFromLesson(init);
    this.controller.game.setRoll(this.puzzle.dice[0], this.puzzle.dice[1]);
    showTutorialBubble("今日の局面", this.puzzle.prompt, {
      hideNext: true,
      onSkip: () => this.controller.exitTutorial(),
    });
    this.solvedSequence = [];
    this.controller.expectAnyMoveSequence(this.puzzle.bestMoves, (success, comment) => {
      if (success) {
        // 解いた記録
        Storage.markPuzzleSolved(this.puzzle.id);
        const solvedCount = Object.keys(Storage.getPuzzleSolved()).length;
        if (solvedCount >= 3)  Achievements.unlock("puzzle-3");
        if (solvedCount >= 10) Achievements.unlock("puzzle-10");
        if (solvedCount >= totalPuzzles()) Achievements.unlock("puzzle-all");
        showTutorialBubble("正解！", `${comment ?? ""}\n\n${this.puzzle.explanation}\n\n解いた数: ${solvedCount} / ${totalPuzzles()}`, {
          onNext: () => this.controller.exitTutorial(),
          onSkip: () => this.controller.exitTutorial(),
        });
      } else {
        showTutorialBubble("もう一度", "正解の手ではないようです。\n別の手を試してみましょう。", {
          hideNext: true,
          onSkip: () => this.controller.exitTutorial(),
        });
        // 盤面をリセットして再挑戦
        setTimeout(() => this.start(), 800);
      }
    });
  }
}
