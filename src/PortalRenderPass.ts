import * as THREE from 'three'
import type { WebGPURenderer } from 'three/webgpu'
import {
  calculateWebGlScissor,
  calculateWebGpuScissor,
} from './geometry.js'
import type { ViewportSize } from './types.js'
import type { PortalRenderData } from './PortalInstance.js'

export type PortalRenderer = THREE.WebGLRenderer | WebGPURenderer

function isWebGpuRenderer(renderer: PortalRenderer): renderer is WebGPURenderer {
  return 'isWebGPURenderer' in renderer && renderer.isWebGPURenderer === true
}

interface PortalRenderable {
  getRenderData: (viewport: ViewportSize) => PortalRenderData | null
}

interface RendererState {
  viewport: THREE.Vector4
  scissor: THREE.Vector4
  scissorTest: boolean
  clearColor: THREE.Color
  clearAlpha: number
  autoClear: boolean
  renderTarget: THREE.RenderTarget | null
  activeCubeFace: number
  activeMipmapLevel: number
}

export class PortalRenderPass {
  private readonly renderer: PortalRenderer
  private readonly portals: readonly PortalRenderable[]

  constructor(renderer: PortalRenderer, portals: readonly PortalRenderable[]) {
    this.renderer = renderer
    this.portals = portals
  }

  render(viewport: ViewportSize): void {
    if (viewport.width <= 0 || viewport.height <= 0) {
      return
    }

    const state = this.captureRendererState()

    try {
      this.renderer.setRenderTarget(null)
      this.renderer.autoClear = false
      this.renderer.setScissorTest(true)

      for (const portal of this.portals) {
        const renderData = portal.getRenderData(viewport)

        if (!renderData) {
          continue
        }

        const scissor = isWebGpuRenderer(this.renderer)
          ? calculateWebGpuScissor(renderData.intersection)
          : calculateWebGlScissor(renderData.intersection, viewport.height)
        this.renderer.setViewport(0, 0, viewport.width, viewport.height)
        this.renderer.setScissor(scissor.x, scissor.y, scissor.width, scissor.height)
        this.renderer.setClearColor(renderData.clearColor, 1)
        this.renderer.clear(true, true, true)
        this.renderer.render(renderData.scene, renderData.camera)
      }
    } finally {
      this.restoreRendererState(state)
    }
  }

  private captureRendererState(): RendererState {
    return {
      viewport: this.renderer.getViewport(new THREE.Vector4()),
      scissor: this.renderer.getScissor(new THREE.Vector4()),
      scissorTest: this.renderer.getScissorTest(),
      clearColor: this.renderer.getClearColor(new THREE.Color()),
      clearAlpha: this.renderer.getClearAlpha(),
      autoClear: this.renderer.autoClear,
      renderTarget: this.renderer.getRenderTarget(),
      activeCubeFace: this.renderer.getActiveCubeFace(),
      activeMipmapLevel: this.renderer.getActiveMipmapLevel(),
    }
  }

  private restoreRendererState(state: RendererState): void {
    if (isWebGpuRenderer(this.renderer)) {
      this.renderer.setRenderTarget(state.renderTarget, state.activeCubeFace, state.activeMipmapLevel)
    } else {
      this.renderer.setRenderTarget(
        state.renderTarget as THREE.WebGLRenderTarget | null,
        state.activeCubeFace,
        state.activeMipmapLevel,
      )
    }
    this.renderer.setViewport(state.viewport)
    this.renderer.setScissor(state.scissor)
    this.renderer.setScissorTest(state.scissorTest)
    this.renderer.setClearColor(state.clearColor, state.clearAlpha)
    this.renderer.autoClear = state.autoClear
  }
}
