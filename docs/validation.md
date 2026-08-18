# 検証条件

## Geometry

| ケース | 期待結果 |
| --- | --- |
| `centerProgress = 0` | `cameraY = cameraTopY` |
| `centerProgress = 1` | `cameraY = cameraBottomY` |
| progressが範囲外 | clampせずCamera Yを線形外挿する |
| Reference FOVと基準投影高 | 基準Camera距離を一意に導出する |
| Camera移動高と基準投影高が同じ | FOV変換の高さ比が1になる |
| Camera移動高と基準投影高が異なる | 高さ比をRender Camera FOVへ反映する |
| Portalが部分表示 | full Portal矩形によるCamera計算を維持する |
| Portalがviewport外 | 交差なしとして描画対象から外す |
| Portalがviewportより大きい | viewportとの交差矩形を返す |
| scissorに端数がある | 左・下をfloor、右・上をceilして外側へ丸める |
| WebGL scissorへ変換 | viewport左上原点からWebGL左下原点へ変換する |

## Responsive Projection

| ケース | 期待結果 |
| --- | --- |
| `rules`を省略 | 設定直下の `referenceFovY` を使う |
| 複数ruleが一致 | 最初に一致したruleを使う |
| どのruleにも一致しない | 設定直下の `referenceFovY` へ戻る |
| rule数と一致状態数が異なる | 設定例外を投げる |
| Media Queryが変化 | 選択結果を全Portalへ適用する |
| Runtimeを破棄 | change listenerを解除する |

## RuntimeとCamera

| ケース | 期待結果 |
| --- | --- |
| Portalごとの描画 | viewportはCanvas全体、scissorは交差矩形になる |
| Portal描画前 | 対象scissor内のcolor、depth、stencil bufferをclearする |
| 同じSceneを複数Portalへ渡す | Portalごとに独立したCamera状態を持つ |
| Camera Yが移動 | Camera X、Z、回転の規則を維持する |
| clipping planeを省略 | `near = 0.1`、`far = 1000` を使う |
| clipping planeを指定 | 対象PortalのCameraへ適用する |
| clipping planeが不正 | Runtime生成時に設定例外を投げる |
| 初期設定が不正 | Runtime生成時に設定例外を投げる |
| 実行時入力が一時的に不正 | 前回の正常なCamera状態全体を維持する |
| 初回から実行時入力が不正 | 対象Portalを描画しない |
| 不正状態が継続 | 同じエラーを毎フレーム出力しない |
| dispose後にrender | 例外を投げる |

## Renderer所有権

| ケース | 期待結果 |
| --- | --- |
| Portal描画が成功 | 借りたRenderer状態を復元する |
| Portal描画が例外 | Renderer状態を復元してから例外を伝播する |
| Portal外の領域 | フレームバッファを変更しない |
| Runtimeを破棄 | Renderer、Scene、GPUリソースを破棄しない |

復元対象はviewport、scissor、scissor test、clear colorとalpha、`autoClear`、render target、cube face、mipmap levelとする。

## 自動検証

```sh
npm test
npm run build
```

単体テストはGeometry、responsive選択、Camera clipping plane、Portal Render Passの正常系と例外系を対象とする。本物のブラウザとWebGLコンテキストを必要とする見た目・スクロール・Canvas配置の検証は、利用側アプリケーションで行う。
