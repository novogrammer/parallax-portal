# parallax-portal 設計概要

## 目的

DOM要素を窓として複数のThree.js Sceneを表示し、Scene内の奥行きによる視差を保ったまま、1枚のviewport固定Canvasへscissor描画するためのRuntimeと幾何計算を提供する。

利用側が所有する既存の `WebGLRenderer` と描画ループへ追加できることを前提とし、RendererやSceneの生成・破棄は行わない。

## 全体構造

```text
Host application
├── WebGLRenderer / Canvas / RAF
├── viewport size
├── Projection Configuration
├── referenceProjectionHeightMeters
└── Portal Definitions
    ├── DOM element
    ├── Three.js Scene
    ├── Scene Configuration
    └── clear color / clipping planes
          |
          v
    PortalRuntime
    ├── responsive Projection selection
    ├── Portal Geometry
    ├── Portal cameras
    └── Portal Render Pass
          |
          v
    borrowed WebGLRenderer
```

各Portalのfull DOM矩形はCamera位置と投影の計算に使い、Portalとviewportの交差矩形はscissorにだけ使う。Portalが部分表示されてもCameraと構図は切り替えず、描画範囲だけを狭める。

## 公開API

公開入口はpackage rootの `parallax-portal` とする。

### Runtime

- `PortalRuntime`
- `PortalRuntimeOptions`
- `PortalDefinition`

### Geometryとresponsive選択

- `calculatePortalIntersection`
- `calculateCenterProgress`
- `calculateReferenceCameraDistance`
- `calculateCameraY`
- `calculateRenderCameraFovY`
- `calculateWebGlScissor`
- `calculatePortalGeometry`
- `validateProjectionProfile`
- `validateReferenceProjectionHeight`
- `validateSceneConfiguration`
- `selectResponsiveProjection`

### 型

- `Rect`
- `ViewportSize`
- `ProjectionProfile`
- `SceneConfiguration`
- `ResponsiveProjectionRule`
- `ProjectionConfiguration`
- `WebGlScissorRect`
- `PortalGeometryResult`

## 設定モデル

### Projection Configuration

`referenceFovY` はRuntimeが管理する全Portalで共有する基準vertical FOVで、単位はradとする。

```ts
interface ProjectionConfiguration {
  referenceFovY: number
  rules?: readonly {
    query: string
    referenceFovY: number
  }[]
}
```

`rules` は記述順に評価し、最初に一致した値を使う。どの条件にも一致しない場合と `rules` を省略した場合は、設定直下の `referenceFovY` を使う。選択結果は全Portalへ同時に適用する。

`PortalRuntime` が `window.matchMedia()` とchange listenerを所有し、純粋関数の `selectResponsiveProjection()` は設定と一致状態だけを受け取る。

### Runtime共通基準投影高

`referenceProjectionHeightMeters` は、`referenceFovY` と組み合わせて基準Camera距離を導出する投影キャリブレーション上の高さである。Runtime内で共有し、Portalやresponsive条件ごとには変更しない。

### Portal Definition

```ts
interface PortalDefinition {
  element: HTMLElement
  scene: THREE.Scene
  clearColor: THREE.ColorRepresentation
  cameraTopY: number
  cameraBottomY: number
  cameraNear?: number
  cameraFar?: number
}
```

`cameraTopY` と `cameraBottomY` はスクロールに応じて観測するScene内の垂直範囲を表す。CSS高との比率は利用側のデザイン入力であり、RuntimeはPortal間で統一または補正しない。

`cameraNear` と `cameraFar` の省略値は `0.1` と `1000` とする。Camera Xは `0`、Camera Zは導出した基準距離とし、回転なしで負のZ方向を見る。

## 座標系と単位

### DOMとviewport

- 原点はviewport左上
- Xは右向き、Yは下向きが正
- 単位はCSS px
- device pixel ratioはPortal Geometryへ含めない

### 3D

- Xは右向き、Yは上向きが正
- Reference Planeは `z = 0`
- `1 world unit = 1m`
- Cameraのupは正のY方向

Portal寸法はCSSが所有する。Runtimeは `getBoundingClientRect()` の実測値だけを使い、px、vw、media queryなど元のCSS単位を解析しない。

## Rendererとリソースの所有権

利用側は次を所有する。

- `WebGLRenderer` とCanvas
- Canvasと描画バッファのサイズ
- requestAnimationFrameとフレーム全体の描画順
- Scene、Geometry、Material、Texture
- フレーム全体のclearとRendererの破棄

`PortalRuntime` はPortal用の `PerspectiveCamera`、Media Query listener、内部参照だけを管理する。`dispose()` はlistenerと内部参照を解放するが、借りたRenderer、Scene、GPUリソースを破棄しない。

## 描画契約

Canvasがviewport全体を覆い、Canvas左上とviewport左上が一致することを前提とする。任意位置・任意サイズCanvasの座標変換は提供しない。

1フレームではPortalごとに次を行う。

1. `getBoundingClientRect()` からfull Portal矩形を取得する。
2. viewportとの交差矩形を求め、交差しなければ描画しない。
3. full Portal矩形と設定からCamera位置とFOVを導出する。
4. WebGL viewportをCanvas全体へ設定する。
5. 交差矩形をWebGL左下原点のscissorへ変換する。
6. scissor内のcolor、depth、stencil bufferをclearしてSceneを描画する。

描画前にRendererのviewport、scissor、scissor test、clear colorとalpha、`autoClear`、render target、cube face、mipmap levelを保存し、成功時と例外時の両方で復元する。Portal領域のフレームバッファは変更されるため、利用側が既存Sceneとの描画順を決める。

## エラー処理

設定値の不正はRuntime生成時に例外とする。resizeやDOM状態による実行時の一時的な不正値では、前回の正常なCamera状態全体を維持する。正常状態が一度もなければ対象Portalを描画せず、同じ不正状態のエラーを毎フレーム繰り返さない。

投影の導出は[垂直投影モデル](./vertical-projection.md)、合格条件は[検証条件](./validation.md)を正本とする。
