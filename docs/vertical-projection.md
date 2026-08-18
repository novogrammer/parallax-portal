# 垂直投影モデル

## 目的

Projection Configurationで指定する基準FOV、Runtimeで共有する基準投影高、PortalごとのCamera Y範囲、viewport全体のCanvasで使う描画CameraのFOVを分離して定義する。

設定値の `referenceFovY` は基準投影領域とCamera距離を定義する設計用FOVであり、描画Cameraへ直接適用しない。実際の描画ではPortalのCSS実測高とviewport高の比を反映した `renderCameraFovY` を導出し、固定Canvas上でDOMと3Dの垂直スケールを対応させる。

## 記号

| 記号 | 正式名称 | 意味 | 単位 |
| --- | --- | --- | --- |
| `Vh` | viewport height | viewport全体を覆うCanvasの高さ | CSS px |
| `y` | portal top | full Portal矩形の上端 | CSS px |
| `h` | portal height | full Portal矩形の高さ | CSS px |
| `phiR` | `referenceFovY` | 構図設計上の基準vertical FOV | rad |
| `Hp` | `referenceProjectionHeightMeters` | Reference Plane上で基準FOVに収める高さ | m |
| `Ty` | `cameraTopY` | Portal上端がviewport中央に来たときのCamera Y | m |
| `By` | `cameraBottomY` | Portal下端がviewport中央に来たときのCamera Y | m |

前提条件は次のとおり。

- `Vh > 0`
- `h > 0`
- `Hp > 0`
- `0 < phiR < PI`
- `abs(Ty - By) > 0`

数式中の三角関数はradを使う。

## Reference Projection

`referenceFovY` と `referenceProjectionHeightMeters` から、Reference Planeまでの基準Camera距離を導出する。

```text
referenceCameraDistance = Hp / (2 * tan(phiR / 2))
```

両者は独立した入力値であり、FOVを1m当たりの換算値として扱わない。

## Camera Y Motion

clip前のfull Portal矩形からスクロール進行値を求める。

```text
centerProgress = (Vh / 2 - y) / h
```

- Portal上端がviewport中央に来たとき `0`
- Portal下端がviewport中央に来たとき `1`
- 範囲外では0未満または1超の値を維持する

Camera Yは上下端を補間して求める。

```text
cameraY = Ty + (By - Ty) * centerProgress
```

`centerProgress` はclampせず、Portalがviewportへ出入りする範囲でも線形補間または線形外挿する。

Camera移動高は重複して設定せず、上下端から導出する。

```text
cameraTravelHeightMeters = abs(Ty - By)
```

`Ty` と `By` の順序は移動方向に使い、FOV変換では絶対差を使う。両者が等しい場合は設定例外とする。

## Render Projection

PortalのDOM高に対するCamera移動高から垂直スケールを求める。

```text
cameraMetersPerCssPixel = cameraTravelHeightMeters / h
renderProjectionHeightMeters = Vh * cameraMetersPerCssPixel
```

CSS高とCamera移動高は利用側のデザイン入力である。Portalごとに比率が異なる場合も正常とし、Runtimeは統一または補正しない。

基準Camera距離を維持したまま、Canvas全体へ `renderProjectionHeightMeters` を収めるFOVを導出する。

```text
renderCameraFovY =
  2 * atan(
    tan(referenceFovY / 2)
    * viewportHeight / portalHeight
    * cameraTravelHeightMeters / referenceProjectionHeightMeters
  )
```

`renderCameraFovY` は設定ではなく導出値である。Portalの現在Y位置はCamera Yにだけ使い、FOV変換には含めない。

導出値は有限かつ次の範囲でなければならない。

```text
0 < renderCameraFovY < PI
```

Three.jsのCameraへ適用する境界でdegreeへ変換し、`0 < fov < 180` であることも確認する。

## 基準投影高とCamera移動高

`referenceProjectionHeightMeters` と `cameraTravelHeightMeters` は常に個別の値として指定または導出し、一致モードのような分岐を設けない。

同値の場合は一般式中の高さ比が1になり、異なる場合はその比率を投影へ反映する。どちらも正常な設定である。

## DOM寸法と交差矩形

Portalの寸法はCSSだけが所有する。

- CSSではpx、vw、media queryなどを自由に使える。
- Runtimeは `getBoundingClientRect()` の結果をCSS pxとして扱う。
- style文字列や `getComputedStyle()` を幾何入力として解析しない。
- device pixel ratioを幾何計算へ含めない。

Camera YとFOVにはclip前のfull Portal矩形を使う。viewportとの交差矩形はscissorだけに使い、部分表示高を投影計算へ代入しない。
