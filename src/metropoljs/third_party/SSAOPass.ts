import * as THREE from 'three';

import {ShaderPass} from './ShaderPass';

import {shader as SSAOShader} from './SSAOShader';

/**
 * Screen-space ambient occlusion pass.
 *
 * Has the following parameters
 *  - radius
 *  	- Ambient occlusion shadow radius (numeric value).
 *  - onlyAO
 *  	- Display only ambient occlusion result (boolean value).
 *  - aoClamp
 *  	- Ambient occlusion clamp (numeric value).
 *  - lumInfluence
 *  	- Pixel luminosity influence in AO calculation (numeric value).
 *
 * To output to screen set renderToScreens true
 *
 * @author alteredq / http://alteredqualia.com/
 * @author tentone
 * @class SSAOPass
 */
export class SSAOPass extends ShaderPass {
  camera2: THREE.Camera;
  scene2: THREE.Scene;

  width: number;
  height: number;

  depthMaterial: THREE.MeshDepthMaterial;
  depthRenderTarget: THREE.WebGLRenderTarget;

  constructor(
      scene: THREE.Scene, camera: THREE.Camera, width?: number,
      height?: number) {
    super(SSAOShader);

    this.width = (width !== undefined) ? width : 512;
    this.height = (height !== undefined) ? height : 256;

    this.renderToScreen = false;

    this.camera2 = camera;
    this.scene2 = scene;

    // Depth material
    this.depthMaterial = new THREE.MeshDepthMaterial();
    (this.depthMaterial as any).depthPacking = THREE.RGBADepthPacking;
    this.depthMaterial.blending = THREE.NoBlending;

    // Depth render target
    this.depthRenderTarget = new THREE.WebGLRenderTarget(
        this.width, this.height,
        {minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter});
    // this.depthRenderTarget.texture.name = 'SSAOShader.rt';

    // Shader uniforms
    this.uniforms['tDepth'].value = this.depthRenderTarget.texture;
    this.uniforms['size'].value.set(this.width, this.height);
    this.uniforms['cameraNear'].value = (this.camera2 as any).near;
    this.uniforms['cameraFar'].value = (this.camera2 as any).far;

    this.uniforms['radius'].value = 4;
    this.uniforms['onlyAO'].value = false;
    this.uniforms['aoClamp'].value = 0.25;
    this.uniforms['lumInfluence'].value = 0.7;
  }

  get radius(): number {
    return this.uniforms['radius'].value;
  }
  set radius(value: number) {
    this.uniforms['radius'].value = value;
  }

  get onlyAO(): boolean {
    return this.uniforms['onlyAO'].value;
  }
  set onlyAO(value: boolean) {
    this.uniforms['onlyAO'].value = value;
  }

  get aoClamp(): number {
    return this.uniforms['aoClamp'].value;
  }
  set aoClamp(value: number) {
    this.uniforms['aoClamp'].value = value;
  }

  get lumInfluence(): number {
    return this.uniforms['lumInfluence'].value;
  }
  set lumInfluence(value: number) {
    this.uniforms['lumInfluence'].value = value;
  }

  /**
   * Render using this pass.
   *
   * @method render
   * @param {WebGLRenderer} renderer
   * @param {WebGLRenderTarget} writeBuffer Buffer to write output.
   * @param {WebGLRenderTarget} readBuffer Input buffer.
   * @param {Number} delta Delta time in milliseconds.
   * @param {Boolean} maskActive Not used in this pass.
   */
  render(
      renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget,
      readBuffer: THREE.WebGLRenderTarget, delta?: number,
      maskActive?: boolean) {
    // Render depth into depthRenderTarget
    this.scene2.overrideMaterial = this.depthMaterial;

    renderer.render(this.scene2, this.camera2, this.depthRenderTarget, true);

    (this.scene2 as any).overrideMaterial = null;


    // SSAO shaderPass
    super.render(renderer, writeBuffer, readBuffer, delta, maskActive);
  };

  /**
   * Change scene to be renderer by this render pass.
   *
   * @method setScene
   * @param {Scene} scene
   */
  setScene(scene: THREE.Scene) {
    this.scene2 = scene;
  };

  /**
   * Set camera used by this render pass.
   *
   * @method setCamera
   * @param {Camera} camera
   */
  setCamera(camera: THREE.Camera) {
    this.camera2 = camera;

    this.uniforms['cameraNear'].value = (this.camera2 as any).near;
    this.uniforms['cameraFar'].value = (this.camera2 as any).far;
  };

  /**
   * Set resolution of this render pass.
   *
   * @method setSize
   * @param {Number} width
   * @param {Number} height
   */
  setSize(width: number, height: number) {
    this.width = width;
    this.height = height;

    this.uniforms['size'].value.set(this.width, this.height);
    this.depthRenderTarget.setSize(this.width, this.height);
  }
}