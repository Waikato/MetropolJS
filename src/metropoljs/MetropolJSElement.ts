import * as THREE from 'three';

import {EventBus} from './EventBus';
import {MetropolJSCameraControls} from './MetropolJSCameraControls';
import {MetropolJSSession} from './MetropolJSSession';

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