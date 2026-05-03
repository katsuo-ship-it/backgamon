// ストーリーモード: 5 章のキャンペーン。各章は固定の対戦相手・マッチ長・難易度。
// クリア毎に次章が解放され、テーマ・ペルソナ・実績がアンロックされる。

import { Storage } from "./storage.js";
import { unlockTheme } from "./themes.js";
import * as Achievements from "./achievements.js";

export const STORY_CHAPTERS = [
  {
    id: "ch1",
    title: "第 1 章: 街角のドージョー",
    intro: "見習いのハルが扉を叩く。「一局どうですか？」",
    opponent: { personaKey: "easy", name: "見習いのハル" },
    matchLength: 3,
    difficulty: "easy",
    rewardAchievement: "story-1",
    rewardTheme: null,
    successText: "ハルは気持ちよく敗北を認めた。次の挑戦者は——",
  },
  {
    id: "ch2",
    title: "第 2 章: 古書の館",
    intro: "ピップ博士が眼鏡を直す。「数字には嘘がない、と思いませんか」",
    opponent: { personaKey: "normal", name: "ピップ博士" },
    matchLength: 5,
    difficulty: "normal",
    rewardAchievement: "story-2",
    rewardTheme: "onyx",
    successText: "博士は本棚の奥からダークな盤面を差し出した。「使ってください」",
  },
  {
    id: "ch3",
    title: "第 3 章: 森の隠者",
    intro: "森の番人がコインを弾く。「サイコロは森の言葉だ」",
    opponent: { personaKey: "normal", name: "森の番人 リーフ" },
    matchLength: 5,
    difficulty: "normal",
    rewardAchievement: "story-3",
    rewardTheme: "forest",
    successText: "リーフは森の盤面をあなたに託した。",
  },
  {
    id: "ch4",
    title: "第 4 章: 王宮の挑戦",
    intro: "王宮筆頭バックギャマー卿が現れる。「我が王の名にかけて」",
    opponent: { personaKey: "hard", name: "バックギャマー卿" },
    matchLength: 7,
    difficulty: "hard",
    rewardAchievement: "story-4",
    rewardTheme: null,
    successText: "卿は深く頭を下げた。「もう一人、上がいます」",
  },
  {
    id: "ch5",
    title: "第 5 章: マスター・ゾロメ",
    intro: "全てを見透かす目があなたを見る。「来たか」",
    opponent: { personaKey: "hard", name: "マスター・ゾロメ" },
    matchLength: 11,
    difficulty: "hard",
    rewardAchievement: "story-5",
    rewardTheme: null,
    successText: "マスター・ゾロメは静かに拍手した。「上には……まだ、いる」",
  },
  {
    id: "ch6",
    title: "最終章: 賢者ヴェルテックス",
    intro: "盤の向こうに賢者がいる。「君が来るのを待っていた」",
    opponent: { personaKey: "master", name: "賢者ヴェルテックス" },
    matchLength: 11,
    difficulty: "master",
    rewardAchievement: "story-all",
    rewardTheme: "royal",
    successText: "賢者は微笑んだ。「君は私と並ぶ存在だ」マスターチャンピオンの称号が贈られた。",
  },
];

export function getStoryProgress() {
  return Storage.getStory();
}

export function nextChapter() {
  const s = getStoryProgress();
  if (s.current >= STORY_CHAPTERS.length) return null;
  return STORY_CHAPTERS[s.current];
}

export function recordChapterCleared() {
  const s = getStoryProgress();
  const ch = STORY_CHAPTERS[s.current];
  if (!ch) return null;
  s.defeated.push(ch.id);
  s.current += 1;
  Storage.setStory(s);
  // 報酬
  if (ch.rewardTheme) unlockTheme(ch.rewardTheme);
  if (ch.rewardAchievement) Achievements.unlock(ch.rewardAchievement);
  return ch;
}

export function isStoryComplete() {
  return getStoryProgress().current >= STORY_CHAPTERS.length;
}
