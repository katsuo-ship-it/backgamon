// エントリポイント。
// 各モジュールを束ねてゲームコントローラを構成する。

import { Game, WHITE, BLACK, opponent, initialBoard } from "./game.js";
import { legalMoveSequences, legalSingleMovesFrom, legalOrigins } from "./rules.js";
import { Renderer } from "./render.js";
import { InputHandler } from "./input.js";
import { Match } from "./match.js";
import { chooseMove, chooseCube } from "./ai.js";
import { analyse } from "./cube-advisor.js";
import * as Sound from "./sound.js";
import { Effects } from "./effects.js";
import { SessionStats } from "./stats.js";
import { PERSONAS, getPersona, speak } from "./personas.js";
import * as UI from "./ui.js";
import { TutorialRunner } from "./tutorial.js";
import { PuzzleRunner } from "./puzzle.js";
import { practiceConfig } from "./practice.js";
import { Storage } from "./storage.js";
import * as Achievements from "./achievements.js";
import { judgeMove, showQualityBadge } from "./move-quality.js";
import { GameReview, showReviewModal } from "./review.js";
import { getVariant } from "./variants.js";
import { STORY_CHAPTERS, getStoryProgress, recordChapterCleared, isStoryComplete } from "./story.js";

class GameController {
  constructor() {
    this.canvas = document.getElementById("board");
    this.renderer = new Renderer(this.canvas);
    this.input = new InputHandler(this.canvas, this.renderer, this);
    this.effects = new Effects(this.renderer, Sound);
    this.stats = new SessionStats();

    this.game = null;
    this.match = null;
    this.mode = "menu";          // "menu" | "match" | "practice" | "tutorial" | "puzzle"
    this.difficulty = "easy";
    this.persona = PERSONAS.easy;
    this.busy = false;            // CPU 思考中・アニメ中など人入力ブロック
    this.cubeJustOffered = false;
    this.hintsRemaining = 3;
    this.tutorialRunner = null;
    this.puzzleRunner = null;
    this.expectedMove = null;
    this.expectedSequenceMatcher = null;
    this.review = null;
    this.preTurnGame = null;
    this.usedUndoThisMatch = false;
    this.variant = "standard";
    this.storyChapter = null;
    const persisted = Storage.getStats();
    this.persistedStats = persisted;

    this.startRenderLoop();
    this.bindMenuButtons();
    UI.bindStartScreen({
      onStartMatch:    (opt) => this.startMatch(opt.matchLength, opt.difficulty, UI.getSelectedVariant?.() ?? "standard"),
      onStartTutorial: ()    => this.startTutorial(),
      onStartPractice: (opt) => this.startPractice(opt.difficulty),
      onStartPuzzle:   ()    => this.startPuzzle(),
      onStartStory:    (idx) => this.startStoryChapter(idx),
    });
    Sound.preloadSounds();
  }

  bindMenuButtons() {
    document.getElementById("btn-menu").addEventListener("click", () => this.returnToMenu());
    document.getElementById("btn-undo").addEventListener("click", () => this.handleUndo());
    document.getElementById("btn-double").addEventListener("click", () => this.offerDouble());
    document.getElementById("btn-resign").addEventListener("click", () => this.resign());
    const btnMusic = document.getElementById("btn-music");
    if (btnMusic) {
      const settings = Storage.getSettings();
      this.musicOn = settings.musicOn ?? false;
      const updateMusicBtn = () => { btnMusic.textContent = this.musicOn ? "♪ ON" : "♪"; btnMusic.classList.toggle("active", this.musicOn); };
      updateMusicBtn();
      btnMusic.addEventListener("click", () => {
        this.musicOn = !this.musicOn;
        Sound.setAmbientEnabled(this.musicOn);
        const s = Storage.getSettings(); s.musicOn = this.musicOn; Storage.setSettings(s);
        updateMusicBtn();
      });
      if (this.musicOn) Sound.startAmbient();
    }
    UI.ensureHintButton(() => this.useHint());
    UI.setHintButtonRemaining(this.hintsRemaining);
  }

  // -------- レンダーループ --------
  startRenderLoop() {
    const tick = () => {
      const game = this.game;
      const ctxInfo = {};
      if (game && (this.mode === "match" || this.mode === "practice")) {
        const a = analyse(game, WHITE);
        ctxInfo.showPipCount = true;
        ctxInfo.pipPlayer = a.pipPlayer;
        ctxInfo.pipCpu = a.pipOpp;
        ctxInfo.pipDiff = a.diff;   // diff > 0: 自分有利
        if (this.mode === "match" && this.match && !this.match.isCrawfordGame) {
          if (a.recommendDouble && game.cube.owner !== BLACK) {
            ctxInfo.cubeAdvice = "ダブル提示 検討";
          } else if (!a.recommendTake) {
            ctxInfo.cubeAdvice = "相手が提示なら Drop 検討";
          }
        }
      }
      if (game) this.renderer.draw(game, ctxInfo);
      else this.renderer.draw(emptyGameForBackdrop(), {});
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // -------- モード起動 --------
  startMatch(matchLength, difficulty, variant = "standard") {
    this.mode = "match";
    this.difficulty = difficulty;
    this.variant = variant;
    this.persona = PERSONAS[difficulty] ?? PERSONAS.easy;
    this.renderer.setOpponentPersona(this.persona);
    this.match = new Match(matchLength);
    this.usedUndoThisMatch = false;
    this.storyChapter = null;
    this.startNewGame();
  }

  startStoryChapter(idx) {
    const ch = STORY_CHAPTERS[idx];
    if (!ch) return;
    this.mode = "match";
    this.storyChapter = ch;
    this.difficulty = ch.difficulty;
    this.variant = "standard";
    this.persona = { ...getPersona(ch.opponent.personaKey), name: ch.opponent.name };
    this.renderer.setOpponentPersona(this.persona);
    this.match = new Match(ch.matchLength);
    this.usedUndoThisMatch = false;
    UI.showResultModal(ch.title, ch.intro, () => this.startNewGame());
  }

  startPractice(difficulty) {
    this.mode = "practice";
    this.difficulty = difficulty;
    this.persona = PERSONAS[difficulty] ?? PERSONAS.easy;
    this.renderer.setOpponentPersona(this.persona);
    this.match = null;
    this.startNewGame();
  }

  startTutorial() {
    this.mode = "tutorial";
    this.match = null;
    this.tutorialRunner = new TutorialRunner(this);
    this.tutorialRunner.start();
    this.updateTopbarForMode();
  }

  startPuzzle() {
    this.mode = "puzzle";
    this.match = null;
    this.puzzleRunner = new PuzzleRunner(this);
    this.puzzleRunner.start();
    this.updateTopbarForMode();
  }

  exitTutorial() {
    UI.hideTutorialBubble();
    this.tutorialRunner = null;
    this.puzzleRunner = null;
    this.expectedMove = null;
    this.expectedSequenceMatcher = null;
    this.returnToMenu();
  }

  returnToMenu() {
    this.mode = "menu";
    this.match = null;
    this.game = null;
    UI.setTurnBanner("");
    UI.hideTutorialBubble();
    UI.showStartScreen();
    UI.setScore(0, 0, 0, this.persona?.name);
    this.expectedMove = null;
    this.expectedSequenceMatcher = null;
  }

  // -------- 新ゲーム開始 --------
  startNewGame() {
    const variant = getVariant(this.variant ?? "standard");
    this.game = new Game({ points: variant.initialBoard() });
    this.game.cube = { value: 1, owner: 0 };
    this.hintsRemaining = 3;
    UI.setHintButtonRemaining(this.hintsRemaining);
    this.cubeJustOffered = false;
    this.review = new GameReview();
    if (this.match) this.match.startNewGame();
    this.updateTopbarForMode();
    this.openingRoll();
  }

  updateTopbarForMode() {
    const matchLen = this.match?.matchLength ?? 0;
    const playerScore = this.match?.score[WHITE] ?? 0;
    const cpuScore    = this.match?.score[BLACK] ?? 0;
    UI.setScore(playerScore, cpuScore, matchLen, this.persona?.name);
    UI.setButtonsEnabled({
      undo:   this.mode === "match" || this.mode === "practice",
      double: this.mode === "match",
      resign: this.mode === "match",
    });
    const hintBtn = document.getElementById("btn-hint");
    if (hintBtn) {
      hintBtn.classList.toggle("hidden",
        this.mode !== "match" && this.mode !== "practice");
    }
  }

  // -------- オープニングロール --------
  openingRoll() {
    let d1, d2;
    do {
      d1 = 1 + Math.floor(Math.random() * 6);
      d2 = 1 + Math.floor(Math.random() * 6);
    } while (d1 === d2);
    this.busy = true;
    this.renderer.startDiceRoll(WHITE, [d1, d2]);
    Sound.play("dice");
    setTimeout(() => {
      // 大きい目を出した側がそのダイスを使ってスタート
      const playerStarts = d1 > d2 ? WHITE : (d1 < d2 ? BLACK : WHITE);
      const dice = [d1, d2];
      this.game.turn = playerStarts;
      this.game.setRoll(d1, d2);
      this.busy = false;
      UI.setTurnBanner(playerStarts === WHITE ? "あなたのターン" : `${this.persona.name}のターン`);
      if (playerStarts === BLACK) {
        this.scheduleCpuTurn();
      } else {
        this.evaluateCubeOfferOpportunity();
      }
    }, 1200);
  }

  // -------- ターンの開始 (ダイスロール) --------
  startTurn() {
    if (this.game.turn === WHITE) UI.setTurnBanner("あなたのターン");
    else UI.setTurnBanner(`${this.persona.name}のターン`);

    // 既にダイスがある場合(チュートリアル等で固定された場合)はそのまま使う
    if (this.game.dice && this.game.dice.length > 0) {
      this.afterRoll();
      return;
    }
    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    this.busy = true;
    this.renderer.startDiceRoll(this.game.turn, [d1, d2]);
    Sound.play("dice");
    setTimeout(() => {
      this.game.setRoll(d1, d2);
      this.busy = false;
      this.afterRoll();
    }, 1200);
  }

  afterRoll() {
    if (this.game.turn === BLACK) {
      this.scheduleCpuTurn();
    } else {
      // 着手品質評価のため、ターン開始時の状態をスナップショット
      this.preTurnGame = this.game.clone();
      this.preTurnSequence = [];
      // 動かせる手があるかチェック
      const seqs = legalMoveSequences(this.game, this.game.dice);
      const hasMove = seqs.some(s => s.sequence.length > 0);
      if (!hasMove) {
        // パス
        UI.setTurnBanner("動かせる手がありません。パス。");
        setTimeout(() => this.endTurn(), 800);
      }
      this.evaluateCubeOfferOpportunity();
    }
  }

  evaluateCubeOfferOpportunity() {
    if (this.mode !== "match") return;
    const canOffer = this.match.canOfferDouble(this.game, WHITE);
    UI.setButtonsEnabled({ double: canOffer });
  }

  // -------- 人プレイヤーのターン --------
  canHumanInteract() {
    if (this.busy) return false;
    if (!this.game) return false;
    if (this.game.turn !== WHITE) return false;
    if (this.cubeJustOffered) return false;
    return true;
  }

  requestHumanMove(move) {
    // チュートリアル/パズルで期待手チェック
    if (this.expectedMove) {
      const ok = matchesMove(move, this.expectedMove);
      if (!ok) {
        // 期待外れ: 元に戻して再促 (要らないが、適用しない)
        const cb = this.expectedMoveCb;
        this.expectedMove = null;
        this.expectedMoveCb = null;
        this.renderer.clearHintMove();
        cb?.(false);
        return;
      }
      const cb = this.expectedMoveCb;
      this.expectedMove = null;
      this.expectedMoveCb = null;
      this.renderer.clearHintMove();
      this.applyHumanMoveAnim(move, () => cb?.(true));
      return;
    }
    if (this.expectedSequenceMatcher) {
      // 期待シーケンスの先頭に一致するかは集約後にチェックするので、まず全部受け付ける
      this.expectedSequenceMatcher.attempted.push(move);
      this.applyHumanMoveAnim(move, () => {
        // ダイスが残っていればさらに続行
        if (this.game.dice.length > 0 && this.expectedSequenceMatcher.attempted.length < this.expectedSequenceMatcher.maxLen) {
          // 引き続き入力受付
          return;
        }
        this.expectedSequenceMatcher.evaluate();
      });
      return;
    }
    this.preTurnSequence.push(move);
    this.applyHumanMoveAnim(move, () => {
      // ダイスを使い切ったらターン終了 + 着手品質判定
      if (this.game.dice.length === 0) {
        this.judgePlayerTurn();
        this.endTurn();
      } else {
        this.evaluateCubeOfferOpportunity();
      }
    });
  }

  judgePlayerTurn() {
    if (this.mode !== "match" && this.mode !== "practice") return;
    if (!this.preTurnGame || !this.preTurnSequence || this.preTurnSequence.length === 0) return;
    try {
      const j = judgeMove(this.preTurnGame, this.preTurnSequence, WHITE);
      showQualityBadge(j.label, j.color);
      this.review?.recordHumanTurn(this.preTurnGame, this.preTurnSequence, j, this.preTurnGame.dice);
    } catch (e) {
      // 計算失敗時は無視
    }
    this.preTurnGame = null;
    this.preTurnSequence = [];
  }

  applyHumanMoveAnim(move, onDone) {
    this.busy = true;
    this.animateMove(WHITE, move, () => {
      this.game.applyMove(move);
      Sound.play("place");
      if (move.hit) {
        this.effects.hit();
        this.renderer.setOpponentMood("shocked");
      }
      if (move.to === -1) {
        // 最後のコマ判定
        if (this.game.borneOff[WHITE] === 15) this.effects.bearOffLast();
      }
      this.busy = false;
      // 勝敗判定
      if (this.game.isGameOver()) {
        // ターン途中で勝った場合も品質判定
        this.judgePlayerTurn();
        this.handleGameOver();
        return;
      }
      onDone?.();
    });
  }

  animateMove(player, move, onDone) {
    const fromXY = move.from === -1
      ? this.renderer.barCenter(player)
      : this.renderer.pointCenter(player, move.from);
    const toXY = move.to === -1
      ? this.renderer.pointCenter(player, -1)
      : this.renderer.pointCenter(player, move.to);
    // ドラッグ→ドロップで一瞬カーソルを離した後、実際のコマ移動アニメをかける
    this.renderer.startMoveAnim(player, fromXY, toXY, 0.22, onDone);
  }

  // -------- CPU ターン --------
  async scheduleCpuTurn() {
    UI.setButtonsEnabled({ double: false });
    // ダブル提示判断
    if (this.mode === "match" && !this.cubeJustOffered) {
      const canBlackOffer = this.match.canOfferDouble(this.game, BLACK);
      if (canBlackOffer) {
        const cubeDecision = chooseCube(this.game, this.difficulty);
        if (cubeDecision.offerDouble) {
          this.cpuOffersDouble();
          return;
        }
      }
    }
    this.startTurn();
    if (this.busy) {
      // ダイスロールアニメ中。終了後に afterRoll → CPU 動作
      const wait = setInterval(() => {
        if (!this.busy) {
          clearInterval(wait);
          this.cpuPlayMoves();
        }
      }, 50);
    } else {
      this.cpuPlayMoves();
    }
  }

  async cpuPlayMoves() {
    if (this.game.turn !== BLACK) return;
    const sequence = await chooseMove(this.game, this.difficulty);
    if (!sequence || sequence.length === 0) {
      UI.setTurnBanner(`${this.persona.name}: 動かせず`);
      setTimeout(() => this.endTurn(), 600);
      return;
    }
    // たまに台詞を出す
    if (Math.random() < 0.35) {
      const line = speak(this.persona, "roll");
      if (line) UI.setTurnBanner(`${this.persona.name}: ${line}`);
    }
    this.runCpuSequence(sequence, 0);
  }

  runCpuSequence(seq, idx) {
    if (idx >= seq.length) {
      this.endTurn();
      return;
    }
    const move = seq[idx];
    this.busy = true;
    this.animateMove(BLACK, move, () => {
      this.game.applyMove(move);
      Sound.play("place");
      if (move.hit) {
        this.effects.hit();
        const line = speak(this.persona, "hit");
        if (line) UI.setTurnBanner(`${this.persona.name}: ${line}`);
        this.renderer.setOpponentMood("happy");
      }
      if (move.to === -1 && this.game.borneOff[BLACK] === 15) {
        this.effects.bearOffLast();
      }
      this.busy = false;
      if (this.game.isGameOver()) {
        this.handleGameOver();
        return;
      }
      setTimeout(() => this.runCpuSequence(seq, idx + 1), 200);
    });
  }

  cpuOffersDouble() {
    this.cubeJustOffered = true;
    const stake = this.game.cube.value * 2;
    UI.setTurnBanner(`${this.persona.name}: ${speak(this.persona, "offerDouble") ?? "ダブルを提示"}`);
    setTimeout(() => {
      UI.showDoubleModal(stake,
        () => {
          // 受ける
          this.game.cube.value = stake;
          this.game.cube.owner = WHITE;
          this.cubeJustOffered = false;
          this.scheduleCpuTurn();
        },
        () => {
          // 降りる
          this.cubeJustOffered = false;
          // CPU の勝利、現在キューブ値で
          this.match.applyResult(BLACK, "single", this.game.cube.value);
          this.afterMatchPointAdded(BLACK, "single", this.game.cube.value);
        });
    }, 600);
  }

  // 人プレイヤーがダブル提示
  offerDouble() {
    if (this.mode !== "match") return;
    if (!this.match.canOfferDouble(this.game, WHITE)) return;
    if (this.game.turn !== WHITE) return;
    if (this.game.dice.length === 0) return; // ダイスを振る前限定
    this.cubeJustOffered = true;
    const stake = this.game.cube.value * 2;
    setTimeout(() => {
      const dec = chooseCube(this.game, this.difficulty);
      if (dec.takeIfOffered) {
        UI.setTurnBanner(`${this.persona.name}: ${speak(this.persona, "take") ?? "受ける"}`);
        this.game.cube.value = stake;
        this.game.cube.owner = BLACK;
        this.cubeJustOffered = false;
        // ダイスはまだ振っていない想定なので、続けて自分のターン
      } else {
        UI.setTurnBanner(`${this.persona.name}: ${speak(this.persona, "drop") ?? "降りる"}`);
        this.match.applyResult(WHITE, "single", this.game.cube.value);
        this.afterMatchPointAdded(WHITE, "single", this.game.cube.value);
      }
    }, 600);
  }

  resign() {
    if (this.mode !== "match") return;
    // 投了 = ギャモン or 通常の判断は割愛して single 投了とする
    const winner = BLACK;
    this.match.applyResult(winner, "single", this.game.cube.value);
    this.afterMatchPointAdded(winner, "single", this.game.cube.value);
  }

  // -------- ターン終了 --------
  endTurn() {
    if (!this.game) return;
    this.game.endTurn();
    this.startTurn();
  }

  // -------- ゲーム終了処理 --------
  handleGameOver() {
    const wt = this.game.winnerType();
    if (!wt) return;
    const { winner, type } = wt;
    this.effects.win(type);
    this.stats.recordGame(winner === WHITE);
    this.renderer.setOpponentMood(winner === WHITE ? "lose" : "happy");

    // 永続化された統計と実績を更新
    this.recordPersistedGameOver(winner, type);

    setTimeout(() => {
      if (this.mode === "match" && this.match) {
        const points = this.match.applyResult(winner, type, this.game.cube.value);
        this.afterMatchPointAdded(winner, type, points);
      } else if (this.mode === "practice") {
        const showRev = () => {
          if (this.review && this.review.entries.length > 0) {
            showReviewModal(this.review, () => this.startNewGame());
          } else {
            this.startNewGame();
          }
        };
        UI.showResultModal(
          winner === WHITE ? "勝利！" : "敗北",
          `${winnerTypeLabel(type)} (${this.game.cube.value} 倍)`,
          showRev,
        );
      } else if (this.mode === "tutorial" || this.mode === "puzzle") {
        // チュートリアル中の早期終了は何もしない
      }
    }, 3500);
  }

  recordPersistedGameOver(winner, type) {
    const stats = Storage.getStats();
    if (winner === WHITE) {
      stats.gameWins += 1;
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
      if (type === "gammon") stats.gammonWins += 1;
      if (type === "backgammon") stats.backgammonWins += 1;
    } else {
      stats.gameLosses += 1;
      stats.currentStreak = 0;
    }
    Storage.setStats(stats);

    // 実績判定
    if (winner === WHITE) {
      Achievements.unlock("first-win");
      if (type === "gammon") Achievements.unlock("gammon");
      if (type === "backgammon") Achievements.unlock("backgammon");
      if (this.difficulty === "easy")   Achievements.unlock("beat-easy");
      if (this.difficulty === "normal") Achievements.unlock("beat-normal");
      if (this.difficulty === "hard")   Achievements.unlock("beat-hard");
      if (this.difficulty === "master") Achievements.unlock("beat-master");
      if (stats.currentStreak >= 3) Achievements.unlock("streak-3");
      if (stats.currentStreak >= 5) Achievements.unlock("streak-5");
      if (this.game.cube.value >= 2) Achievements.unlock("cube-double");
    }
  }

  afterMatchPointAdded(winner, type, points) {
    this.updateTopbarForMode();
    if (this.match.isMatchOver()) {
      this.stats.recordMatch(this.match.matchWinner() === WHITE);
      const w = this.match.matchWinner();
      // 永続化更新
      const persisted = Storage.getStats();
      persisted.matches += 1;
      if (w === WHITE) {
        persisted.matchWins += 1;
        Achievements.unlock("first-match-win");
        if (!this.usedUndoThisMatch) Achievements.unlock("no-undo-match");
        // ストーリー
        if (this.storyChapter) {
          const ch = recordChapterCleared();
          if (isStoryComplete()) Achievements.unlock("story-all");
        }
      }
      Storage.setStats(persisted);

      this.effects.matchVictory();
      const detail = `スコア: あなた ${this.match.score[WHITE]} - ${this.persona.name} ${this.match.score[BLACK]}\nセッション戦績: ${this.stats.matchWins} / ${this.stats.matches}\n通算: ${persisted.matchWins} / ${persisted.matches} マッチ勝利`;
      const finish = () => {
        // 章クリア時のシナリオテキスト表示
        if (this.storyChapter && w === WHITE) {
          UI.showResultModal(`${this.storyChapter.title} クリア`, this.storyChapter.successText, () => this.returnToMenu());
        } else {
          this.returnToMenu();
        }
      };
      UI.showMatchEndModal(
        w === WHITE ? "マッチ制覇！" : "マッチ敗北",
        detail,
        finish,
      );
    } else {
      const detail = `${winnerTypeLabel(type)} で ${points} ポイント。\n現在 ${this.match.score[WHITE]} - ${this.match.score[BLACK]}`;
      const showRev = () => {
        if (this.review && this.review.entries.length > 0) {
          showReviewModal(this.review, () => this.startNewGame());
        } else {
          this.startNewGame();
        }
      };
      UI.showResultModal(
        winner === WHITE ? "勝利！" : "敗北",
        detail,
        showRev,
      );
    }
  }

  // -------- ヒント・Undo --------
  useHint() {
    if (this.mode !== "match" && this.mode !== "practice") return;
    if (this.hintsRemaining <= 0 && this.mode !== "practice") return;
    if (!this.canHumanInteract()) return;
    if (this.game.dice.length === 0) return;

    chooseMove(this.game, "hard").then((seq) => {
      if (!seq || seq.length === 0) return;
      this.renderer.setHintMove(seq[0]);
      setTimeout(() => this.renderer.clearHintMove(), 3000);
    });

    if (this.mode === "match") {
      this.hintsRemaining -= 1;
      UI.setHintButtonRemaining(this.hintsRemaining);
    }
  }

  handleUndo() {
    if (!this.game) return;
    if (this.game.history.length === 0) return;
    if (this.busy) return;
    if (this.mode === "match") {
      if (this.game.turn !== WHITE) return;
      this.usedUndoThisMatch = true;
    }
    this.game.undoLastMove();
    if (this.preTurnSequence && this.preTurnSequence.length > 0) {
      this.preTurnSequence.pop();
    }
    Sound.play("place");
  }

  // -------- チュートリアル/パズル サポート --------
  setupGameFromLesson(init) {
    this.game = new Game({
      points: init.board.map(p => ({ ...p })),
      bar: { ...init.bar },
      borneOff: { ...init.borneOff },
      turn: init.turn,
      dice: [...(init.dice ?? [])],
    });
    this.game.cube = { value: 1, owner: 0 };
  }

  // チュートリアルの「戻る」で呼ばれる: クローンしたスナップショットでゲーム状態を完全に置き換える
  restoreFromTutorialSnapshot(snapGame) {
    this.game = snapGame;
    this.busy = false;
    this.expectedMove = null;
    this.expectedMoveCb = null;
    this.expectedSequenceMatcher = null;
    // 進行中のドラッグや移動アニメをキャンセル
    this.renderer.dragging = null;
    this.renderer.movingChecker = null;
    this.renderer.diceAnim = null;
    this.renderer.clearHighlights();
    this.renderer.clearHintMove();
  }

  // チュートリアル戻る時に進行中の expect を破棄
  cancelTutorialExpectations() {
    this.expectedMove = null;
    this.expectedMoveCb = null;
    this.expectedSequenceMatcher = null;
    // ダミー: 重複呼び出しの安全のため
    this.busy = false;
  }

  tutorialForceRoll(dice, onDone) {
    const [d1, d2] = dice;
    this.busy = true;
    this.renderer.startDiceRoll(this.game.turn, [d1, d2]);
    Sound.play("dice");
    setTimeout(() => {
      this.game.setRoll(d1, d2);
      this.busy = false;
      onDone?.();
    }, 1200);
  }

  expectPlayerMove(move, onDone) {
    this.expectedMove = move;
    this.expectedMoveCb = onDone;
    // 動かすコマと移動先を視覚的に示す (パルスリング + 矢印)
    this.renderer.setHintMove(move);
  }

  expectAnyMoveSequence(bestMoves, onDone) {
    // bestMoves は最善シーケンス候補リスト [{ moves, comment }]
    this.expectedSequenceMatcher = {
      best: bestMoves,
      attempted: [],
      maxLen: Math.max(...bestMoves.map(b => b.moves.length)),
      evaluate: () => {
        // 試したシーケンスが best のいずれかと一致するか
        const tried = this.expectedSequenceMatcher.attempted;
        const match = bestMoves.find(b => b.moves.length === tried.length
          && b.moves.every((m, i) => matchesMove(tried[i], m)));
        const cb = onDone;
        this.expectedSequenceMatcher = null;
        if (match) cb?.(true, match.comment);
        else cb?.(false);
      },
    };
  }

  tutorialCpuScripted(dice, moves, onDone) {
    this.tutorialForceRoll(dice, () => {
      this.runCpuSequence(moves, 0);
      // runCpuSequence は最後に endTurn を呼んでしまうので、tutorial 用の wrapper は不要かも
      // ここでは onDone の責務を持たせる
      const wait = setInterval(() => {
        if (!this.busy && this.game.turn !== BLACK) {
          clearInterval(wait);
          onDone?.();
        }
      }, 100);
    });
  }
}

function matchesMove(a, b) {
  if (a.from !== b.from) return false;
  if (a.to !== b.to) return false;
  if (b.die !== undefined && a.die !== undefined && a.die !== b.die) return false;
  return true;
}

function winnerTypeLabel(t) {
  if (t === "gammon")     return "ギャモン勝利 (×2)";
  if (t === "backgammon") return "バックギャモン勝利 (×3)";
  return "通常勝利";
}

function emptyGameForBackdrop() {
  return new Game();
}

// 起動
window.addEventListener("DOMContentLoaded", () => {
  new GameController();
});
