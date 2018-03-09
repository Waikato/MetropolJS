import * as THREE from 'three';

import {EventBus} from './EventBus';
import {MetropolJSCameraControls} from './MetropolJSCameraControls';
import {MetropolJSSession} from './MetropolJSSession';
import {EffectComposer} from './third_party/EffectComposer';
import {RenderPass} from './third_party/RenderPass';
import {SSAOPass} from './third_party/SSAOPass';

const USE_LIGHTING = true;
const USE_SSAO = false;

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

  private effectComposer: EffectComposer|null = null;

  constructor(private ownerDocument: Document) {
    this.eventBus = new EventBus();

    this.renderer = new THREE.WebGLRenderer();
    this.scene = new THREE.Scene();
    this.controls = new MetropolJSCameraControls(this.eventBus);

    this.session = new MetropolJSSession(this.eventBus);

    this.scene.add(this.session.getRenderGroup());

    if (USE_LIGHTING) {
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
      this.scene.add(ambientLight);
    }

    if (USE_SSAO) {
      const renderPass = new RenderPass(this.scene, this.controls.getCamera());

      const ssaoPass = new SSAOPass(this.scene, this.controls.getCamera());
      ssaoPass.renderToScreen = true;

      ssaoPass.radius = 32;
      ssaoPass.aoClamp = 0.25;
      ssaoPass.lumInfluence = 0.7;

      this.effectComposer = new EffectComposer(this.renderer);
      this.effectComposer.addPass(renderPass);
      this.effectComposer.addPass(ssaoPass);
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

    if (this.effectComposer && USE_SSAO) {
      this.effectComposer.setSize(
          this.ownerElement.clientWidth, this.ownerElement.clientHeight);
    }

    this.controls.resize(
        this.ownerElement.clientWidth, this.ownerElement.clientHeight);
  }

  private update() {
    if (this.effectComposer && USE_SSAO) {
      this.effectComposer.render();
    } else {
      this.renderer.render(this.scene, this.controls.getCamera());
    }

    window.requestAnimationFrame(this.update.bind(this));
  }
}