// 練習モード: 単発ゲームの繰り返し。Undo 自由、ヒント常時、ピップ常時表示。
// 実装は GameController を「練習モード」フラグで制御するスタイル。
// このファイルでは練習モード用の補助関数のみ提供。

export const practiceConfig = {
  freeUndo: true,           // ターン終了後でも巻き戻し可
  alwaysShowHints: true,    // 移動可能起点を常時うっすらハイライト
  alwaysShowPip: true,      // ピップカウントを常時表示
  matchManagement: false,   // マッチではない (キューブはあるが点数管理しない)
};
