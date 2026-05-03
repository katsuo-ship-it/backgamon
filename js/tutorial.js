// チュートリアル進行管理。
// LESSONS のステップを順次処理し、controller の手を介してプレイヤー操作を誘導する。
// 各ステップ開始時に game の clone を保存しておき、「戻る」ボタンで前ステップに復元できる。

import { LESSONS } from "./lessons.js";
import { Game, WHITE, BLACK } from "./game.js";
import { showTutorialBubble, hideTutorialBubble } from "./ui.js";
import * as Achievements from "./achievements.js";

export class TutorialRunner {
  constructor(controller) {
    this.controller = controller;
    this.lessonIndex = 0;
    this.stepIndex = 0;
    // snapshots[i] = clone of game state right BEFORE step i was run
    this.snapshots = [];
  }

  start() {
    this.lessonIndex = 0;
    this.stepIndex = 0;
    this.snapshots = [];
    this.loadCurrentLesson();
    this.runStep();
  }

  loadCurrentLesson() {
    const L = LESSONS[this.lessonIndex];
    if (!L) return;
    const init = typeof L.initial === "function" ? L.initial() : L.initial;
    this.controller.setupGameFromLesson(init);
    // レッスンが切り替わるとスナップショットも初期化 (レッスン跨ぎの戻るは非対応)
    this.snapshots = [];
    // キューブ表示はレッスン側の showCube フラグで決定。指定なければ非表示。
    this.controller.renderer.setShowCube(!!L.showCube);
  }

  // 現在のステップ開始時の state をスナップショットする (未保存ならば)
  saveSnapshotIfNeeded() {
    if (!this.snapshots[this.stepIndex]) {
      this.snapshots[this.stepIndex] = this.controller.game.clone();
    }
  }

  // 戻るボタンが有効か (同レッスン内で前ステップが存在する)
  canGoBack() {
    return this.stepIndex > 0;
  }

  goBack() {
    if (!this.canGoBack()) return;
    // 現在ステップで進行中の expect/animation/demo などを停止
    this.controller.cancelTutorialExpectations();
    this.controller.cancelTutorialDemo?.();
    // ひとつ前のステップへ
    this.stepIndex--;
    const snap = this.snapshots[this.stepIndex];
    if (snap) {
      this.controller.restoreFromTutorialSnapshot(snap.clone());
    }
    // この先のスナップショットは破棄 (再進行時に取り直す)
    this.snapshots.length = this.stepIndex + 1;
    this.runStep();
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

    // ステップ開始時の状態を記録 (戻る用)
    this.saveSnapshotIfNeeded();
    const onBack = this.canGoBack() ? () => this.goBack() : null;
    // ステップが要求するキューブハイライト
    this.controller.renderer.setCubeFocus(!!step.focusCube);

    switch (step.type) {
      case "narrate": {
        showTutorialBubble(L.title, step.text, {
          onNext: () => { this.stepIndex++; this.runStep(); },
          onSkip: () => this.controller.exitTutorial(),
          onBack,
        });
        break;
      }
      case "rollFixed": {
        showTutorialBubble(L.title, step.narration ?? "サイコロを振ります...", {
          hideNext: true,
          onSkip: () => this.controller.exitTutorial(),
          onBack,
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
          onBack,
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
          onBack,
        });
        this.controller.tutorialCpuScripted(step.dice, step.moves, () => {
          this.stepIndex++;
          setTimeout(() => this.runStep(), 250);
        });
        break;
      }
      case "autoBearOff": {
        showTutorialBubble(L.title, step.narration ?? "AIが代わりに最後まで上がっていきます...", {
          hideNext: true,
          onSkip: () => { this.controller.cancelTutorialDemo(); this.controller.exitTutorial(); },
          onBack,
        });
        this.controller.tutorialAutoBearOff(() => {
          this.stepIndex++;
          setTimeout(() => this.runStep(), 400);
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
            onBack,
          });
        } else {
          showTutorialBubble(L.title, `${L.name} 完了！\n次のレッスンへ進みます。`, {
            onNext: () => { this.advanceLesson(); },
            onSkip: () => this.controller.exitTutorial(),
            onBack,
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
