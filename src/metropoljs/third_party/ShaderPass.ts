import * as THREE from 'three';

import {BaseShader} from './BaseShader';
import {Pass} from './Pass';

/**
 * @author alteredq / http://alteredqualia.com/
 */

export class ShaderPass extends Pass {
  uniforms: {[s: string]: any};
  material: THREE.ShaderMaterial;

  camera: THREE.OrthographicCamera;
  scene: THREE.Scene;
  quad: THREE.Mesh;

  textureID: string;

  constructor(shader: THREE.ShaderMaterial|BaseShader, textureID?: string) {
    super();

    this.textureID = (textureID !== undefined) ? textureID : 'tDiffuse';

    if (shader instanceof THREE.ShaderMaterial) {
      this.uniforms = shader.uniforms;

      this.material = shader;

    } else if (shader) {
      this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);

      this.material = new THREE.ShaderMaterial({

        defines: shader.defines || {},
        uniforms: this.uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader

      });
    } else {
      throw new Error('No shader');
    }

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();

    this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), undefined);
    this.quad.frustumCulled = false;  // Avoid getting clipped
    this.scene.add(this.quad);
  }

  render(
      renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget,
      readBuffer: THREE.WebGLRenderTarget, delta?: number,
      maskActive?: boolean) {
    if (this.uniforms[this.textureID]) {
      this.uniforms[this.textureID].value = readBuffer.texture;
    }

    this.quad.material = this.material;

    if (this.renderToScreen) {
      renderer.render(this.scene, this.camera);

    } else {
      renderer.render(this.scene, this.camera, writeBuffer, this.clear);
    }
  }
}