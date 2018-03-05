import * as THREE from 'three';

import {EventBus} from './EventBus';

import {OrbitControls} from './third_party/OrbitControls';

export class MetropolJSCameraControls {
  private camera: THREE.OrthographicCamera|THREE.PerspectiveCamera;

  private orbitControls: OrbitControls;

  constructor(private eventBus: EventBus) {
    const width = 512;
    const height = 512;

    if (false) {
      this.camera = new THREE.OrthographicCamera(-1, 1, -1, 1, 0.1, 2000);
    } else {
      this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
    }
    this.camera.position.z = 50;
    this.camera.zoom = 5;
    this.camera.updateProjectionMatrix();

    this.orbitControls = new OrbitControls(this.camera, document);
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
}