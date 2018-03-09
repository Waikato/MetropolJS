import * as THREE from 'three';
import {Color, Material} from 'three';

import {Pass} from './Pass';

/**
 * @author alteredq / http://alteredqualia.com/
 */

export class RenderPass extends Pass {
  clearDepth = false;

  constructor(
      public scene: THREE.Scene, public camera: THREE.Camera,
      public overrideMaterial?: Material, public clearColor?: Color,
      public clearAlpha?: number) {
    super();

    this.clearAlpha = (clearAlpha !== undefined) ? clearAlpha : 0;

    this.clear = true;
    this.needsSwap = false;
  }

  render(
      renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget,
      readBuffer: THREE.WebGLRenderTarget, delta?: number,
      maskActive?: boolean) {
    var oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    this.scene.overrideMaterial = (this.overrideMaterial as THREE.Material);

    var oldClearColor, oldClearAlpha;

    if (this.clearColor) {
      oldClearColor = renderer.getClearColor().getHex();
      oldClearAlpha = renderer.getClearAlpha();

      renderer.setClearColor(this.clearColor, this.clearAlpha);
    }

    if (this.clearDepth) {
      renderer.clearDepth();
    }

    renderer.render(
        this.scene, this.camera, this.renderToScreen ? undefined : readBuffer,
        this.clear);

    if (this.clearColor) {
      renderer.setClearColor(new THREE.Color(oldClearColor), oldClearAlpha);
    }

    (this.scene as any).overrideMaterial = null;
    renderer.autoClear = oldAutoClear;
  }
};