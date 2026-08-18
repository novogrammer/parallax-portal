# parallax-portal

DOM要素に揃えた複数のThree.js Sceneを、1枚のviewport固定Canvasへscissor描画するローカルnpmパッケージです。`WebGLRenderer` と `WebGPURenderer` に対応します。現在は未公開で、`private: true` に設定されています。

## 前提条件

- ESMを扱えるビルド環境
- 利用側のThree.jsを使用します。ライブラリ開発時は0.185系で検証していますが、将来版との互換性を保証するものではありません
- `window.matchMedia`、`HTMLElement.getBoundingClientRect`、WebGL 2またはWebGPUを利用できるブラウザ環境
- Canvasがviewport全体を覆い、Canvas左上とviewport左上が一致するレイアウト

## インストール

GitHub shorthandのGit dependencyとしてインストールできます。再現可能な依存関係にするため、branch名ではなく完全なcommit SHAへの固定を推奨します。

```json
{
  "dependencies": {
    "parallax-portal": "github:novogrammer/parallax-portal#<commit-sha>"
  }
}
```

インストール時に `prepare` scriptがTypeScriptをbuildし、Git管理外の `dist/` をpackageへ含めます。GitHub shorthandからnpmが選択するtransportは環境やnpmの挙動によりHTTPSまたはSSHとなり、lockfileにも選択されたURLが記録されます。このパッケージはいずれのtransportも許容します。

ローカルではパスを指定してインストールすることもできます。

```sh
npm install ../parallax-portal
```

## ドキュメント

[設計概要](docs/overview.md) / [垂直投影モデル](docs/vertical-projection.md) / [検証条件](docs/validation.md)

## 最小使用例

```ts
import * as THREE from 'three/webgpu'
import { PortalRuntime } from 'parallax-portal'

const renderer = new THREE.WebGPURenderer({ alpha: true })
const scene = new THREE.Scene()
const element = document.querySelector<HTMLElement>('[data-portal]')!

const runtime = new PortalRuntime({
  renderer,
  projection: {
    referenceFovY: THREE.MathUtils.degToRad(42),
    rules: [
      { query: '(max-width: 767px)', referenceFovY: THREE.MathUtils.degToRad(50) },
    ],
  },
  referenceProjectionHeightMeters: 3,
  portals: [{
    element,
    scene,
    clearColor: 0x000000,
    cameraTopY: 3,
    cameraBottomY: 0,
  }],
})

function frame(): void {
  runtime.render({ width: window.innerWidth, height: window.innerHeight })
}

await renderer.setAnimationLoop(frame)

// 終了時
await renderer.setAnimationLoop(null)
runtime.dispose()
```

`WebGPURenderer.setAnimationLoop()` は、必要な非同期初期化を完了してから描画ループを開始します。手動の `requestAnimationFrame()` を使うホストは、最初の描画前に自身で `await renderer.init()` を実行します。`WebGLRenderer` も同じ `PortalRuntime` へ渡せます。

## 所有権と責務

利用側がRenderer、SceneとそのGPUリソース、Canvasの生成・サイズ変更、描画ループ、Renderer初期化、フレーム全体のclear、破棄を所有します。`PortalRuntime` はRendererを借用し、Portal領域だけを描画します。描画時に変更するviewport、scissor、scissor test、clear color/alpha、`autoClear`、render targetは、成功時・例外時ともに復元します。

`PortalRuntime.dispose()` が破棄するのは自身のMedia Query listenerと内部参照だけです。Renderer、Scene、Geometry、Material、Textureは破棄しません。

## 開発

```sh
npm install
npm test
npm run build
```

ビルド成果物は `dist/` にESM JavaScript、source map、TypeScript型定義として出力されます。
