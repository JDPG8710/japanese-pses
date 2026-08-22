# テスト準備状況

**対象**：Japanese PSES Galaxy Engine

**更新日**：2026-08-23
**状態**：実行可能

## 概要

自動テストは、教材データ、学年と教科の対応、問題生成、ゲーム動作、音・視覚フィードバック、複数エージェント契約、知識グラフ、画面要件を検証します。固定値を返すだけの見せかけのテストは使用しません。

## 一括実行

```powershell
node tests/test_e2e_runner.js
```

## 主なテストファイル

- `tests/test_agents.js`：エージェント定義、スキーマ、連携ループ
- `tests/test_audio_fx.js`：音声合成、パーティクル、画面振動、誤答支援
- `tests/test_curriculum_dag.js`：1,026字の漢字、教科データ、知識グラフ
- `tests/test_games.js`：全教科のゲーム、操作領域、報酬
- `tests/test_question_banks.js`：学年別算数・英語などの問題プール
- `tests/test_content_safety.js`：問題文の答え漏えい、絵文字ヒント、画面要件
- `tests/test_curriculum_traceability.js`：学年・教科・テーマ・ゲームの対応
- `tests/test_adversarial_challenger.js`：境界値、不正データ、異常系

## 合格条件

- 全テストが終了コード0で完了する。
- 漢字1,026字に重複・欠損がない。
- 学年に存在しない教科を表示しない。
- 問題と選択肢に重複や答え漏えいがない。
- 全ゲームが有効な結果契約を返す。
- 知識グラフに循環、孤立、不正参照がない。
- 実ブラウザーで画面の重なり、読みにくい配色、操作不能、未捕捉例外がない。

詳細は [TEST_INFRA.md](TEST_INFRA.md) を参照してください。
