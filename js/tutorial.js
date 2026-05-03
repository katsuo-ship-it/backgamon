// チュートリアル進行管理。
// LESSONS のステップを順次処理し、controller の手を介してプレイヤー操作を誘導する。

import { LESSONS } from "./lessons.js";
import { Game, WHITE, BLACK } from "./game.js";
import { showTutorialBubble, hideTutorialBubble } from "./ui.js";
import * as Achievements from "./achievements.js";

export class TutorialRunner {
  constructor(controller) {
    this.controller = controller;
    this.lessonIndex = 0;
    this.stepIndex = 0;
  }

  start() {
    this.lessonIndex = 0;
    this.stepIndex = 0;
    this.loadCurrentLesson();
    this.runStep();
  }

  loadCurrentLesson() {
    const L = LESSONS[this.lessonIndex];
    if (!L) return;
    const init = typeof L.initial === "function" ? L.initial() : L.initial;
    this.controller.setupGameFromLesson(init);
  }

  runStep() {
    const L = LESSONS[this.lessonIndex];
    if (!L) {
      hideTutorialBubble();
      this.controller.exitTutorial();
      return;
    }
    const step = L.steps[this.stepIndex];
    if (!step) {
      this.advanceLesson();
      return;
    }

    switch (step.type) {
      case "narrate": {
        showTutorialBubble(L.title, step.text, {
          onNext: () => { this.stepIndex++; this.runStep(); },
          onSkip: () => this.controller.exitTutorial(),
        });
        break;
      }
      case "rollFixed": {
        showTutorialBubble(L.title, step.narration ?? "サイコロを振ります...", {
          hideNext: true,
          onSkip: () => this.controller.exitTutorial(),
        });
        // 強制ダイスを振る
        this.controller.tutorialForceRoll(step.dice, () => {
          this.stepIndex++;
          setTimeout(() => this.runStep(), 250);
        });
        break;
      }
      case "expectMove": {
        showTutorialBubble(L.title, step.hint, {
          hideNext: true,
          onSkip: () => this.controller.exitTutorial(),
        });
        this.controller.expectPlayerMove(step.move, (success) => {
          if (success) {
            this.stepIndex++;
            setTimeout(() => this.runStep(), 200);
          } else {
            // 戻したのでもう一度
            setTimeout(() => this.runStep(), 200);
          }
        });
        break;
      }
      case "cpuScripted": {
        showTutorialBubble(L.title, step.narration ?? "CPUが手を進めます...", {
          hideNext: true,
          onSkip: () => this.controller.exitTutorial(),
        });
        this.controller.tutorialCpuScripted(step.dice, step.moves, () => {
          this.stepIndex++;
          setTimeout(() => this.runStep(), 250);
        });
        break;
      }
      case "endLesson": {
        // 最後のレッスンならフィニッシュ。それ以外は次レッスンへ
        if (this.lessonIndex >= LESSONS.length - 1) {
          Achievements.unlock("tutorial-done");
          showTutorialBubble("修了", "チュートリアルはここまで。\n練習モードか対局で実戦に挑みましょう！", {
            onNext: () => this.controller.exitTutorial(),
            onSkip: () => this.controller.exitTutorial(),
          });
        } else {
          showTutorialBubble(L.title, `${L.name} 完了！\n次のレッスンへ進みます。`, {
            onNext: () => { this.advanceLesson(); },
            onSkip: () => this.controller.exitTutorial(),
          });
        }
        break;
      }
      default:
        this.stepIndex++;
        this.runStep();
    }
  }

  advanceLesson() {
    this.lessonIndex++;
    this.stepIndex = 0;
    if (this.lessonIndex >= LESSONS.length) {
      hideTutorialBubble();
      this.controller.exitTutorial();
      return;
    }
    this.loadCurrentLesson();
    this.runStep();
  }
}
