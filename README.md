# parallax-portal

DOM要素に揃えた複数のThree.js Sceneを、1枚のviewport固定Canvasへscissor描画するローカルnpmパッケージです。現在は未公開で、`private: true` に設定されています。

## 前提条件

- ESMを扱えるビルド環境
- `three` 0.185系（peer dependency）
- `window.matchMedia`、`HTMLElement.getBoundingClientRect`、WebGLを利用できるブラウザ環境
- Canvasがviewport全体を覆い、Canvas左上とviewport左上が一致するレイアウト

## インストール

GitHubからHTTPSのGit dependencyとしてインストールできます。再現可能な依存関係にするため、branch名ではなく完全なcommit SHAへの固定を推奨します。

```json
{
  "dependencies": {
    "parallax-portal": "git+https://github.com/novogrammer/parallax-portal.git#<commit-sha>"
  }
}
```

インストール時に `prepare` scriptがTypeScriptをbuildし、Git管理外の `dist/` をpackageへ含めます。SSH URLは使用しません。

ローカルではパスを指定してインストールすることもできます。

```sh
npm install ../parallax-portal
```

## 最小使用例

```ts
import * as THREE from 'three'
import { PortalRuntime } from 'parallax-portal'

const renderer = new THREE.WebGLRenderer({ alpha: true })
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

function frame() {
  runtime.render({ width: window.innerWidth, height: window.innerHeight })
  requestAnimationFrame(frame)
}

frame()

// 終了時
runtime.dispose()
```

## 所有権と責務

利用側が `WebGLRenderer`、SceneとそのGPUリソース、Canvasの生成・サイズ変更、RAF、フレーム全体のclear、破棄を所有します。`PortalRuntime` はRendererを借用し、Portal領域だけを描画します。描画時に変更するviewport、scissor、scissor test、clear color/alpha、`autoClear`、render targetは、成功時・例外時ともに復元します。

`PortalRuntime.dispose()` が破棄するのは自身のMedia Query listenerと内部参照だけです。Renderer、Scene、Geometry、Material、Textureは破棄しません。

## 開発

```sh
npm install
npm test
npm run build
```

ビルド成果物は `dist/` にESM JavaScript、source map、TypeScript型定義として出力されます。
