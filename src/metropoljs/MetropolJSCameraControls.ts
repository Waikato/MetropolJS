import * as THREE from 'three';

import {DebugSource} from './common';
import {Config} from './Config';
import {EventBus} from './EventBus';
import {OrbitControls} from './third_party/OrbitControls';

export class MetropolJSCameraControls implements DebugSource {
  private camera: THREE.OrthographicCamera|THREE.PerspectiveCamera;

  private orbitControls: OrbitControls;

  constructor(private eventBus: EventBus, private element: HTMLCanvasElement) {
    const width = 512;
    const height = 512;

    const configObject = Config.getInstance().getConfig();

    if (!configObject.rendering['3d_mode']) {
      this.camera = new THREE.OrthographicCamera(-1, 1, -1, 1, 0.01, 2000);
    } else {
      this.camera = new THREE.PerspectiveCamera(50, 1, 0.01, 2000);
    }

    this.camera.position.z = 50;
    this.camera.zoom = 5;
    this.camera.updateProjectionMatrix();

    this.orbitControls = new OrbitControls(
        this.camera, element, configObject.rendering['3d_mode']);

    if (!configObject.rendering['3d_mode']) {
      this.orbitControls.enableRotate = false;

      this.orbitControls.mouseButtons = {
        ORBIT: THREE.MOUSE.RIGHT,
        ZOOM: THREE.MOUSE.MIDDLE,
        PAN: THREE.MOUSE.LEFT
      };

      this.orbitControls.touchControls = {ORBIT: 3, ZOOM: 2, PAN: 1};
    }
  }

  resize(width: number, height: number) {
    if (this.camera instanceof THREE.OrthographicCamera) {
      this.camera.left = width / -2;
      this.camera.right = width / 2;
      this.camera.top = height / 2;
      this.camera.bottom = height / -2;
    } else if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = width / height;
    }
    this.camera.updateProjectionMatrix();
  }

  getCamera(): THREE.OrthographicCamera|THREE.PerspectiveCamera {
    return this.camera;
  }

  debug(): void {
    console.groupCollapsed('MetropolJSCameraControls');
    console.groupEnd();
  }
}