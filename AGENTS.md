# parallax-portal

## 正本

- 公開API、依存方向、所有権は `docs/overview.md` を参照する。
- 投影の数式は `docs/vertical-projection.md`、合格条件は `docs/validation.md` を参照する。
- `README.md` は導入の入口として簡潔に保ち、詳細仕様を重複させない。
- 文書には現時点で有効な仕様を記述し、検討過程や特定の利用プロジェクトの設定値を持ち込まない。

## 境界

- 公開APIの変更は、利用側への影響を確認したうえで意図的に行う。
- `PortalRuntime` はRenderer、Scene、Canvas、RAF、GPUリソースの所有権を取得しない。
- Portal Geometryとresponsive選択の純粋関数へ、DOM、Three.js、ブラウザAPIへの依存を持ち込まない。

## 変更と検証

- 変更は依頼範囲に限定し、依存パッケージを必要最小限に保つ。
- コード変更後は `npm test` と `npm run build` を実行する。
- `dist/`、`node_modules/`、一時生成物は管理対象に含めない。
