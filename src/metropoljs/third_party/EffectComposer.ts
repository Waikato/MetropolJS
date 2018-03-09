import * as THREE from 'three';

import {shader as CopyShader} from './CopyShader';
import {Pass} from './Pass';
import {ShaderPass} from './ShaderPass';

/**
 * @author alteredq / http://alteredqualia.com/
 * @author jscarsbrook / Ported to TypeScript http://github.com/Vbitz
 */
export class EffectComposer {
  renderTarget1: THREE.WebGLRenderTarget;
  renderTarget2: THREE.WebGLRenderTarget;

  writeBuffer: THREE.WebGLRenderTarget;
  readBuffer: THREE.WebGLRenderTarget;

  passes: Pass[];

  copyPass: ShaderPass;

  constructor(
      public renderer: THREE.WebGLRenderer,
      renderTarget?: THREE.WebGLRenderTarget) {
    this.renderer = renderer;

    if (renderTarget === undefined) {
      var parameters = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        stencilBuffer: false
      };

      var size = (renderer as any).getDrawingBufferSize();
      renderTarget =
          new THREE.WebGLRenderTarget(size.width, size.height, parameters);
      renderTarget.texture.name = 'EffectComposer.rt1';
    }

    this.renderTarget1 = renderTarget;
    this.renderTarget2 = renderTarget.clone();
    this.renderTarget2.texture.name = 'EffectComposer.rt2';

    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;

    this.passes = [];

    this.copyPass = new ShaderPass(CopyShader);
  }

  swapBuffers() {
    var tmp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = tmp;
  }

  addPass(pass: Pass) {
    this.passes.push(pass);

    var size = (this.renderer as any).getDrawingBufferSize();
    pass.setSize(size.width, size.height);
  }

  insertPass(pass: Pass, index: number) {
    this.passes.splice(index, 0, pass);
  }

  render(delta?: number) {
    var maskActive = false;

    var pass, i, il = this.passes.length;

    for (i = 0; i < il; i++) {
      pass = this.passes[i];

      if (pass.enabled === false) continue;

      pass.render(
          this.renderer, this.writeBuffer, this.readBuffer, delta, maskActive);

      if (pass.needsSwap) {
        if (maskActive) {
          var context = this.renderer.context;

          context.stencilFunc(context.NOTEQUAL, 1, 0xffffffff);

          this.copyPass.render(
              this.renderer, this.writeBuffer, this.readBuffer, delta);

          context.stencilFunc(context.EQUAL, 1, 0xffffffff);
        }

        this.swapBuffers();
      }

      if (THREE.MaskPass !== undefined) {
        if (pass instanceof THREE.MaskPass) {
          maskActive = true;

        } else if (pass instanceof THREE.ClearMaskPass) {
          maskActive = false;
        }
      }
    }
  }

  reset(renderTarget?: THREE.WebGLRenderTarget) {
    if (renderTarget === undefined) {
      var size = (this.renderer as any).getDrawingBufferSize();

      renderTarget = this.renderTarget1.clone();
      renderTarget.setSize(size.width, size.height);
    }

    this.renderTarget1.dispose();
    this.renderTarget2.dispose();
    this.renderTarget1 = renderTarget;
    this.renderTarget2 = renderTarget.clone();

    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;
  }

  setSize(width: number, height: number) {
    this.renderTarget1.setSize(width, height);
    this.renderTarget2.setSize(width, height);

    for (var i = 0; i < this.passes.length; i++) {
      this.passes[i].setSize(width, height);
    }
  }
}