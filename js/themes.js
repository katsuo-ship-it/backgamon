// 盤面テーマ (色配色)。
// 一部はデフォルトでアンロック、一部はストーリー進行・実績で解禁。

import { Storage } from "./storage.js";

export const THEMES = {
  classic: {
    name: "クラシック",
    description: "伝統的な木目調",
    locked: false,
    colors: {
      woodBase:  "#3a2616",
      woodLight: "#5a3c20",
      woodDark:  "#1a0e06",
      frame:     "#2a1d12",
      frameEdge: "#7a5430",
      pointA:    "#c79b50",
      pointB:    "#5a2a18",
      bar:       "#2a1a0c",
      bearOff:   "#241612",
      white:     "#f3ead4",
      whiteEdge: "#a89870",
      black:     "#1a120a",
      blackEdge: "#5a4a30",
      highlight: "rgba(255, 215, 100, 0.55)",
      highlightStroke: "#ffd764",
      textGold:  "#f1d79b",
    },
  },
  onyx: {
    name: "オニキス",
    description: "重厚なダークテーマ。ストーリー第 2 章で解放。",
    unlockBy: "story-2",
    colors: {
      woodBase:  "#1a1a22",
      woodLight: "#2c2c38",
      woodDark:  "#0a0a10",
      frame:     "#15151c",
      frameEdge: "#5a5a70",
      pointA:    "#9a9aae",
      pointB:    "#3a3a4c",
      bar:       "#0a0a14",
      bearOff:   "#15151c",
      white:     "#e8e8f0",
      whiteEdge: "#9a9ab0",
      black:     "#1a1a22",
      blackEdge: "#5a5a70",
      highlight: "rgba(180, 220, 255, 0.5)",
      highlightStroke: "#a0c8ff",
      textGold:  "#c8c8e0",
    },
  },
  forest: {
    name: "フォレスト",
    description: "森の盤面。ストーリー第 3 章で解放。",
    unlockBy: "story-3",
    colors: {
      woodBase:  "#1a3018",
      woodLight: "#2c4a26",
      woodDark:  "#0a1808",
      frame:     "#152018",
      frameEdge: "#5a7c48",
      pointA:    "#a8c068",
      pointB:    "#3a5024",
      bar:       "#142010",
      bearOff:   "#1a2818",
      white:     "#f0e8c8",
      whiteEdge: "#a89870",
      black:     "#1a200c",
      blackEdge: "#5a6c40",
      highlight: "rgba(220, 255, 100, 0.5)",
      highlightStroke: "#d8ff80",
      textGold:  "#d8e8a0",
    },
  },
  royal: {
    name: "ロイヤル",
    description: "宮廷風の紫盤。ストーリー全章クリアで解放。",
    unlockBy: "story-all",
    colors: {
      woodBase:  "#2a1838",
      woodLight: "#42285a",
      woodDark:  "#180a26",
      frame:     "#1a0e26",
      frameEdge: "#8a5cb0",
      pointA:    "#dcc870",
      pointB:    "#5a2c70",
      bar:       "#180a26",
      bearOff:   "#1c1230",
      white:     "#f4ecd0",
      whiteEdge: "#a89c6c",
      black:     "#1c0e2c",
      blackEdge: "#5a3c70",
      highlight: "rgba(255, 200, 220, 0.5)",
      highlightStroke: "#ffc8d8",
      textGold:  "#f4d878",
    },
  },
};

export function getCurrentTheme() {
  const t = Storage.getThemes();
  return THEMES[t.current] ?? THEMES.classic;
}
export function getCurrentThemeId() {
  return Storage.getThemes().current;
}
export function setCurrentTheme(id) {
  if (!THEMES[id]) return false;
  const t = Storage.getThemes();
  if (!t.unlocked.includes(id)) return false;
  t.current = id;
  Storage.setThemes(t);
  return true;
}
export function unlockTheme(id) {
  if (!THEMES[id]) return false;
  return Storage.unlockTheme(id);
}
export function listThemes() {
  const t = Storage.getThemes();
  return Object.entries(THEMES).map(([id, theme]) => ({
    id,
    name: theme.name,
    description: theme.description,
    unlocked: t.unlocked.includes(id),
  }));
}
