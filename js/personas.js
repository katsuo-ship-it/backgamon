// AI 人格データ。難易度ごとに名前・台詞・アバター描画パラメータ。

export const PERSONAS = {
  easy: {
    id: "easy",
    name: "見習いのハル",
    voice: "気さく",
    skinColor: "#f1d79b",
    hairColor: "#7a4a1c",
    accentColor: "#c79b50",
    deco: null,
    lines: {
      roll:    ["お、こんなもんかな", "えーい！", "やっ"],
      hit:     ["やったー！", "ラッキー！"],
      hitten:  ["うわっ", "そんなぁ…"],
      bigDouble: ["ぞろ目だ！"],
      win:     ["勝てた！うれしい！"],
      lose:    ["まいった〜"],
      offerDouble: ["ダブル、いってみよう！"],
      take:    ["受けます！"],
      drop:    ["降りますね"],
    },
  },
  normal: {
    id: "normal",
    name: "ピップ博士",
    voice: "落ち着いた",
    skinColor: "#e8d8a8",
    hairColor: "#3a3026",
    accentColor: "#5a3c20",
    deco: "scholar",
    lines: {
      roll:    ["ふむ", "なるほど", "では…"],
      hit:     ["これでよし", "ヒット"],
      hitten:  ["ふむ…", "やられた"],
      bigDouble: ["ゾロ目とは幸運な"],
      win:     ["お見事な勝負でした"],
      lose:    ["参りました"],
      offerDouble: ["この局面、ダブルを進呈"],
      take:    ["受けて立ちましょう"],
      drop:    ["撤退が賢明か"],
    },
  },
  ranger: {
    id: "ranger",
    name: "森の番人 リーフ",
    voice: "穏やか",
    skinColor: "#d6b878",
    hairColor: "#4a3a1c",
    accentColor: "#5a8c2c",
    deco: "ranger",
    lines: {
      roll:    ["風が見える", "森は急がない", "次へ…"],
      hit:     ["獲物は逃さない", "巡り合わせだ"],
      hitten:  ["……森も時に荒れる"],
      bigDouble: ["大地が踊る"],
      win:     ["森に祝福を"],
      lose:    ["敗北もまた糧"],
      offerDouble: ["ダブル。ご決断を"],
      take:    ["受ける"],
      drop:    ["ここは引く"],
    },
  },
  knight: {
    id: "knight",
    name: "バックギャマー卿",
    voice: "格式高い",
    skinColor: "#ead0a8",
    hairColor: "#2c1c10",
    accentColor: "#dcc870",
    deco: "knight",
    lines: {
      roll:    ["王国の名にかけて", "御覧あれ", "ふふ"],
      hit:     ["卿の盤上に隙なし", "その通り"],
      hitten:  ["むっ、無礼な", "やるではないか"],
      bigDouble: ["神は我に味方せり"],
      win:     ["勝利は当然のこと"],
      lose:    ["……見事だ。完敗"],
      offerDouble: ["ダブル。お受けあれ"],
      take:    ["受けて立とう"],
      drop:    ["これは退散"],
    },
  },
  master: {
    id: "master",
    name: "賢者ヴェルテックス",
    voice: "深淵",
    skinColor: "#cdb38c",
    hairColor: "#0a0a14",
    accentColor: "#9a7cff",
    deco: "master",
    lines: {
      roll:    ["……すべて読めている", "盤上に乱れなし", "ふっ"],
      hit:     ["想定の範囲", "詰みは近い"],
      hitten:  ["……一手譲ろう", "盲点だ"],
      bigDouble: ["賽の意志は私と共に"],
      win:     ["敗北なき道は無い。次回も期待する"],
      lose:    ["……完敗。あなたは強い"],
      offerDouble: ["ダブル。あなたの勇気を試そう"],
      take:    ["受けよう。望むところ"],
      drop:    ["勝負あり、降りる"],
    },
  },
  hard: {
    id: "hard",
    name: "マスター・ゾロメ",
    voice: "鋭い",
    skinColor: "#d8b890",
    hairColor: "#1a120a",
    accentColor: "#c79b50",
    deco: "master",
    lines: {
      roll:    ["…", "計算通り", "選択肢は限られる"],
      hit:     ["読み通り", "そこは取らせていただく"],
      hitten:  ["ぐっ", "誤算だ"],
      bigDouble: ["ぞろ目。最大限活用する"],
      win:     ["お見事と言いたいが、私の勝ちだ"],
      lose:    ["……敗北を認めよう"],
      offerDouble: ["ダブル。テイクできるか?"],
      take:    ["受けるしかあるまい"],
      drop:    ["潔く降りる"],
    },
  },
};

export function speak(persona, eventKey) {
  if (!persona) return null;
  const lines = persona.lines[eventKey];
  if (!lines || lines.length === 0) return null;
  return lines[Math.floor(Math.random() * lines.length)];
}

// 名前から persona を取得 (ストーリーの opponent.personaKey 用)
export function getPersona(key) {
  return PERSONAS[key] ?? PERSONAS.easy;
}
