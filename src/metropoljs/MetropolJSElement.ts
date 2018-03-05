import * as THREE from 'three';

import {EventBus} from './EventBus';
import {MetropolJSCameraControls} from './MetropolJSCameraControls';
import {MetropolJSSession} from './MetropolJSSession';

const USE_LIGHTING = true;

/**
 * Base element for MetropolJS. Owns the user interface and renderer. Contains a
 * reference to a MetropolJSSession which controls loaded scripts.
 */
export class MetropolJSElement {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private controls: MetropolJSCameraControls;

  private eventBus: EventBus;

  private session: MetropolJSSession;

  private ownerElement: HTMLDivElement|null = null;

  constructor(private ownerDocument: Document) {
    this.eventBus = new EventBus();

    this.renderer = new THREE.WebGLRenderer();
    this.scene = new THREE.Scene();
    this.controls = new MetropolJSCameraControls(this.eventBus);

    this.session = new MetropolJSSession(this.eventBus);

    this.scene.add(this.session.getRenderGroup());

    if (USE_LIGHTING) {
      // LIGHTS

      const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
      hemiLight.color.setHSL(0.6, 1, 0.6);
      hemiLight.groundColor.setHSL(0.095, 1, 0.75);
      hemiLight.position.set(0, 50, 0);
      this.scene.add(hemiLight);

      const hemiLightHelper = new THREE.HemisphereLightHelper(hemiLight, 10);
      this.scene.add(hemiLightHelper);

      //

      const dirLight = new THREE.DirectionalLight(0xffffff, 1);
      dirLight.color.setHSL(0.1, 1, 0.95);
      dirLight.position.set(-1, 1.75, 1);
      dirLight.position.multiplyScalar(30);
      this.scene.add(dirLight);

      dirLight.castShadow = true;

      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;

      var d = 50;

      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;

      dirLight.shadow.camera.far = 3500;
      dirLight.shadow.bias = -0.0001;

      const dirLightHeper =
          new THREE.DirectionalLightHelper(
                       dirLight, 10) this.scene.add(dirLightHeper);
    }

    this.renderer.setClearColor(new THREE.Color(0xffffff));
  }

  attachTo(target: HTMLDivElement) {
    this.ownerElement = target;

    window.addEventListener('resize', (ev) => {this.onResize()});

    target.appendChild(this.renderer.domElement);
    // this.controls.attach(this.renderer.domElement);

    this.onResize();
    this.update();

    // Bind to controls
  }

  async connect(connectionString: string) {
    await this.session.connectDebugger(connectionString);
  }

  private onResize() {
    if (!this.ownerElement) {
      return;
    }

    this.renderer.setSize(
        this.ownerElement.clientWidth, this.ownerElement.clientHeight);

    this.controls.resize(
        this.ownerElement.clientWidth, this.ownerElement.clientHeight);
  }

  private update() {
    this.renderer.render(this.scene, this.controls.getCamera());

    window.requestAnimationFrame(this.update.bind(this));
  }
}