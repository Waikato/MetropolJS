import * as THREE from 'three';

enum OrbitControlsState {
  NONE = -1,
  ROTATE = 0,
  DOLLY = 1,
  PAN = 2,
  TOUCH_ROTATE = 3,
  TOUCH_DOLLY = 4,
  TOUCH_PAN = 5
}

/**
 * This set of controls performs orbiting, dollying (zooming), and panning.
 * Unlike TrackballControls, it maintains the "up" direction object.up (+Y by
 * default).
 *   Orbit - left mouse / touch: one finger move
 *   Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
 *   Pan - right mouse, or arrow keys / touch: three finger swipe
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 * @author jscarsbrook / Ported to TypeScript http://github.com/Vbitz
 */
export class OrbitControls extends THREE.EventDispatcher {
  // Set to false to disable this control
  enabled = true;

  // "target" sets the location of focus, where the object orbits around
  target: THREE.Vector3 = new THREE.Vector3();

  // How far you can dolly in and out ( PerspectiveCamera only )
  minDistance = 0;
  maxDistance = Infinity;

  // How far you can zoom in and out ( OrthographicCamera only )
  minZoom = 0;
  maxZoom = Infinity;

  // How far you can orbit vertically, upper and lower limits.
  // Range is 0 to Math.PI radians.
  minPolarAngle = 0;        // radians
  maxPolarAngle = Math.PI;  // radians

  // How far you can orbit horizontally, upper and lower limits.
  // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
  minAzimuthAngle = -Infinity;  // radians
  maxAzimuthAngle = Infinity;   // radians

  // Set to true to enable damping (inertia)
  // If damping is enabled, you must call controls.update() in your animation
  // loop
  enableDamping = false;
  dampingFactor = 0.25;

  // This option actually enables dollying in and out; left as "zoom" for
  // backwards compatibility. Set to false to disable zooming
  enableZoom = true;
  zoomSpeed = 1.0;

  // Set to false to disable rotating
  enableRotate = true;
  rotateSpeed = 1.0;

  // Set to false to disable panning
  enablePan = true;
  keyPanSpeed = 7.0;  // pixels moved per arrow key push

  // Set to true to automatically rotate around the target
  // If auto-rotate is enabled, you must call controls.update() in your
  // animation loop
  autoRotate = false;
  autoRotateSpeed = 2.0;  // 30 seconds per round when fps is 60

  // Set to false to disable use of the keys
  enableKeys = true;

  // The four arrow keys
  keys = {LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40};

  // Mouse buttons
  mouseButtons: {[s: string]: THREE.MOUSE} = {
    ORBIT: THREE.MOUSE.LEFT,
    ZOOM: THREE.MOUSE.MIDDLE,
    PAN: THREE.MOUSE.RIGHT
  };

  // for reset
  target0: THREE.Vector3 = this.target.clone();
  position0: THREE.Vector3 = this.object.position.clone();
  zoom0 = this.object.zoom;

  // Update Private members
  private updateOffset = new THREE.Vector3();

  // so camera.up is the orbit axis
  private updateQuat = new THREE.Quaternion().setFromUnitVectors(
      this.object.up, new THREE.Vector3(0, 1, 0));
  private quatInverse = this.updateQuat.clone().inverse();

  private updateLastPosition = new THREE.Vector3();
  private updateLastQuaternion = new THREE.Quaternion();

  private changeEvent = {type: 'change'};
  private startEvent = {type: 'start'};
  private endEvent = {type: 'end'};

  private state = OrbitControlsState.NONE;

  private EPS = 0.000001;

  // current position in spherical coordinates
  private spherical = new THREE.Spherical();
  private sphericalDelta = new THREE.Spherical();

  private scale = 1;
  private panOffset = new THREE.Vector3();
  private zoomChanged = false;

  private rotateStart = new THREE.Vector2();
  private rotateEnd = new THREE.Vector2();
  private rotateDelta = new THREE.Vector2();

  private panStart = new THREE.Vector2();
  private panEnd = new THREE.Vector2();
  private panDelta = new THREE.Vector2();

  private dollyStart = new THREE.Vector2();
  private dollyEnd = new THREE.Vector2();
  private dollyDelta = new THREE.Vector2();

  private panLeftV = new THREE.Vector3();
  private panUpV = new THREE.Vector3();

  private panFOffset = new THREE.Vector3();

  constructor(
      public object: THREE.PerspectiveCamera|THREE.OrthographicCamera,
      public domElement: HTMLElement|Document) {
    super();

    this.domElement.addEventListener(
        'contextmenu', this.onContextMenu.bind(this), false);

    this.domElement.addEventListener(
        'mousedown', this.onMouseDown.bind(this), false);
    this.domElement.addEventListener(
        'wheel', this.onMouseWheel.bind(this), false);

    this.domElement.addEventListener(
        'touchstart', this.onTouchStart.bind(this), false);
    this.domElement.addEventListener(
        'touchend', this.onTouchEnd.bind(this), false);
    this.domElement.addEventListener(
        'touchmove', this.onTouchMove.bind(this), false);

    window.addEventListener('keydown', this.onKeyDown.bind(this), false);

    this.update();
  }

  getPolarAngle() {
    return this.spherical.phi;
  };

  getAzimuthalAngle() {
    return this.spherical.theta;
  };

  saveState() {
    this.target0.copy(this.target);
    this.position0.copy(this.object.position);
    this.zoom0 = this.object.zoom;
  };

  reset() {
    this.target.copy(this.target0);
    this.object.position.copy(this.position0);
    this.object.zoom = this.zoom0;

    this.object.updateProjectionMatrix();
    this.dispatchEvent(this.changeEvent);

    this.update();

    this.state = OrbitControlsState.NONE;
  };


  // this method is exposed, but perhaps it would be better if we can make it
  // private...
  update() {
    var position = this.object.position;

    this.updateOffset.copy(position).sub(this.target);

    // rotate offset to "y-axis-is-up" space
    this.updateOffset.applyQuaternion(this.updateQuat);

    // angle from z-axis around y-axis
    this.spherical.setFromVector3(this.updateOffset);

    if (this.autoRotate && this.state === OrbitControlsState.NONE) {
      this.rotateLeft(this.getAutoRotationAngle());
    }

    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;

    // restrict theta to be between desired limits
    this.spherical.theta = Math.max(
        this.minAzimuthAngle,
        Math.min(this.maxAzimuthAngle, this.spherical.theta));

    // restrict phi to be between desired limits
    this.spherical.phi = Math.max(
        this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));

    this.spherical.makeSafe();

    this.spherical.radius *= this.scale;

    // restrict radius to be between desired limits
    this.spherical.radius = Math.max(
        this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    // move target to panned location
    this.target.add(this.panOffset);

    this.updateOffset.setFromSpherical(this.spherical);

    // rotate offset back to "camera-up-vector-is-up" space
    this.updateOffset.applyQuaternion(this.quatInverse);

    position.copy(this.target).add(this.updateOffset);

    this.object.lookAt(this.target);

    if (this.enableDamping === true) {
      this.sphericalDelta.theta *= (1 - this.dampingFactor);
      this.sphericalDelta.phi *= (1 - this.dampingFactor);

    } else {
      this.sphericalDelta.set(0, 0, 0);
    }

    this.scale = 1;
    this.panOffset.set(0, 0, 0);

    // update condition is:
    // min(camera displacement, camera rotation in radians)^2 > EPS
    // using small-angle approximation cos(x/2) = 1 - x^2 / 8

    if (this.zoomChanged ||
        this.updateLastPosition.distanceToSquared(this.object.position) >
            this.EPS ||
        8 * (1 - this.updateLastQuaternion.dot(this.object.quaternion)) >
            this.EPS) {
      this.dispatchEvent(this.changeEvent);

      this.updateLastPosition.copy(this.object.position);
      this.updateLastQuaternion.copy(this.object.quaternion);
      this.zoomChanged = false;

      return true;
    }

    return false;
  }

  dispose() {
    this.domElement.removeEventListener(
        'contextmenu', this.onContextMenu.bind(this), false);
    this.domElement.removeEventListener(
        'mousedown', this.onMouseDown.bind(this), false);
    this.domElement.removeEventListener(
        'wheel', this.onMouseWheel.bind(this), false);

    this.domElement.removeEventListener(
        'touchstart', this.onTouchStart.bind(this), false);
    this.domElement.removeEventListener(
        'touchend', this.onTouchEnd.bind(this), false);
    this.domElement.removeEventListener(
        'touchmove', this.onTouchMove.bind(this), false);

    document.removeEventListener(
        'mousemove', this.onMouseMove.bind(this), false);
    document.removeEventListener('mouseup', this.onMouseUp.bind(this), false);

    window.removeEventListener('keydown', this.onKeyDown.bind(this), false);

    // this.dispatchEvent( { type: 'dispose' } ); // should this be added here?
  };

  private getAutoRotationAngle() {
    return 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
  }

  private getZoomScale() {
    return Math.pow(0.95, this.zoomSpeed);
  }

  private rotateLeft(angle: number) {
    this.sphericalDelta.theta -= angle;
  }

  private rotateUp(angle: number) {
    this.sphericalDelta.phi -= angle;
  }

  private panLeft(distance: number, objectMatrix: THREE.Matrix4) {
    this.panLeftV.setFromMatrixColumn(
        objectMatrix, 0);  // get X column of objectMatrix
    this.panLeftV.multiplyScalar(-distance);

    this.panOffset.add(this.panLeftV);
  }

  private panUp(distance: number, objectMatrix: THREE.Matrix4) {
    this.panUpV.setFromMatrixColumn(
        objectMatrix, 1);  // get Y column of objectMatrix
    this.panUpV.multiplyScalar(distance);

    this.panOffset.add(this.panUpV);
  }


  // deltaX and deltaY are in pixels; right and down are positive
  private pan(deltaX: number, deltaY: number) {
    const element = this.domElement instanceof Document ? this.domElement.body :
                                                          this.domElement;

    if (this.object instanceof THREE.PerspectiveCamera) {
      // perspective
      var position = this.object.position;
      this.panFOffset.copy(position).sub(this.target);
      var targetDistance = this.panFOffset.length();

      // half of the fov is center to top of screen
      targetDistance *= Math.tan((this.object.fov / 2) * Math.PI / 180.0);

      // we actually don't use screenWidth, since perspective camera is fixed
      // to screen height
      this.panLeft(
          2 * deltaX * targetDistance / element.clientHeight,
          this.object.matrix);
      this.panUp(
          2 * deltaY * targetDistance / element.clientHeight,
          this.object.matrix);

    } else if (this.object instanceof THREE.OrthographicCamera) {
      // orthographic
      this.panLeft(
          deltaX * (this.object.right - this.object.left) / this.object.zoom /
              element.clientWidth,
          this.object.matrix);
      this.panUp(
          deltaY * (this.object.top - this.object.bottom) / this.object.zoom /
              element.clientHeight,
          this.object.matrix);

    } else {
      // camera neither orthographic nor perspective
      console.warn(
          'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
      this.enablePan = false;
    }
  }

  private dollyIn(dollyScale: number) {
    if (this.object instanceof THREE.PerspectiveCamera) {
      this.scale /= dollyScale;

    } else if (this.object instanceof THREE.OrthographicCamera) {
      this.object.zoom = Math.max(
          this.minZoom, Math.min(this.maxZoom, this.object.zoom * dollyScale));
      this.object.updateProjectionMatrix();
      this.zoomChanged = true;

    } else {
      console.warn(
          'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      this.enableZoom = false;
    }
  }

  private dollyOut(dollyScale: number) {
    if (this.object instanceof THREE.PerspectiveCamera) {
      this.scale *= dollyScale;

    } else if (this.object instanceof THREE.OrthographicCamera) {
      this.object.zoom = Math.max(
          this.minZoom, Math.min(this.maxZoom, this.object.zoom / dollyScale));
      this.object.updateProjectionMatrix();
      this.zoomChanged = true;

    } else {
      console.warn(
          'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      this.enableZoom = false;
    }
  }

  private handleMouseDownRotate(event: MouseEvent) {
    // console.log( 'handleMouseDownRotate' );

    this.rotateStart.set(event.clientX, event.clientY);
  }

  private handleMouseDownDolly(event: MouseEvent) {
    // console.log( 'handleMouseDownDolly' );

    this.dollyStart.set(event.clientX, event.clientY);
  }

  private handleMouseDownPan(event: MouseEvent) {
    // console.log( 'handleMouseDownPan' );

    this.panStart.set(event.clientX, event.clientY);
  }

  private handleMouseMoveRotate(event: MouseEvent) {
    // console.log( 'handleMouseMoveRotate' );

    this.rotateEnd.set(event.clientX, event.clientY);
    this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);

    var element = this.domElement instanceof Document ? this.domElement.body :
                                                        this.domElement;

    // rotating across whole screen goes 360 degrees around
    this.rotateLeft(
        2 * Math.PI * this.rotateDelta.x / element.clientWidth *
        this.rotateSpeed);

    // rotating up and down along whole screen attempts to go 360, but limited
    // to 180
    this.rotateUp(
        2 * Math.PI * this.rotateDelta.y / element.clientHeight *
        this.rotateSpeed);

    this.rotateStart.copy(this.rotateEnd);

    this.update();
  }

  private handleMouseMoveDolly(event: MouseEvent) {
    // console.log( 'handleMouseMoveDolly' );

    this.dollyEnd.set(event.clientX, event.clientY);

    this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);

    if (this.dollyDelta.y > 0) {
      this.dollyIn(this.getZoomScale());

    } else if (this.dollyDelta.y < 0) {
      this.dollyOut(this.getZoomScale());
    }

    this.dollyStart.copy(this.dollyEnd);

    this.update();
  }

  private handleMouseMovePan(event: MouseEvent) {
    // console.log( 'handleMouseMovePan' );

    this.panEnd.set(event.clientX, event.clientY);

    this.panDelta.subVectors(this.panEnd, this.panStart);

    this.pan(this.panDelta.x, this.panDelta.y);

    this.panStart.copy(this.panEnd);

    this.update();
  }

  private handleMouseUp(event: MouseEvent) {
    // console.log( 'handleMouseUp' );
  }

  private handleMouseWheel(event: MouseWheelEvent) {
    // console.log( 'handleMouseWheel' );

    if (event.deltaY < 0) {
      this.dollyOut(this.getZoomScale());

    } else if (event.deltaY > 0) {
      this.dollyIn(this.getZoomScale());
    }

    this.update();
  }

  private handleKeyDown(event: KeyboardEvent) {
    // console.log( 'handleKeyDown' );

    switch (event.keyCode) {
      case this.keys.UP:
        this.pan(0, this.keyPanSpeed);
        this.update();
        break;

      case this.keys.BOTTOM:
        this.pan(0, -this.keyPanSpeed);
        this.update();
        break;

      case this.keys.LEFT:
        this.pan(this.keyPanSpeed, 0);
        this.update();
        break;

      case this.keys.RIGHT:
        this.pan(-this.keyPanSpeed, 0);
        this.update();
        break;
    }
  }

  private handleTouchStartRotate(event: TouchEvent) {
    // console.log( 'handleTouchStartRotate' );

    this.rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
  }

  private handleTouchStartDolly(event: TouchEvent) {
    // console.log( 'handleTouchStartDolly' );

    var dx = event.touches[0].pageX - event.touches[1].pageX;
    var dy = event.touches[0].pageY - event.touches[1].pageY;

    var distance = Math.sqrt(dx * dx + dy * dy);

    this.dollyStart.set(0, distance);
  }

  private handleTouchStartPan(event: TouchEvent) {
    // console.log( 'handleTouchStartPan' );

    this.panStart.set(event.touches[0].pageX, event.touches[0].pageY);
  }

  private handleTouchMoveRotate(event: TouchEvent) {
    // console.log( 'handleTouchMoveRotate' );

    this.rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
    this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);

    var element = this.domElement instanceof Document ? this.domElement.body :
                                                        this.domElement;

    // rotating across whole screen goes 360 degrees around
    this.rotateLeft(
        2 * Math.PI * this.rotateDelta.x / element.clientWidth *
        this.rotateSpeed);

    // rotating up and down along whole screen attempts to go 360, but limited
    // to 180
    this.rotateUp(
        2 * Math.PI * this.rotateDelta.y / element.clientHeight *
        this.rotateSpeed);

    this.rotateStart.copy(this.rotateEnd);

    this.update();
  }

  private handleTouchMoveDolly(event: TouchEvent) {
    // console.log( 'handleTouchMoveDolly' );

    var dx = event.touches[0].pageX - event.touches[1].pageX;
    var dy = event.touches[0].pageY - event.touches[1].pageY;

    var distance = Math.sqrt(dx * dx + dy * dy);

    this.dollyEnd.set(0, distance);

    this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);

    if (this.dollyDelta.y > 0) {
      this.dollyOut(this.getZoomScale());

    } else if (this.dollyDelta.y < 0) {
      this.dollyIn(this.getZoomScale());
    }

    this.dollyStart.copy(this.dollyEnd);

    this.update();
  }

  private handleTouchMovePan(event: TouchEvent) {
    // console.log( 'handleTouchMovePan' );

    this.panEnd.set(event.touches[0].pageX, event.touches[0].pageY);

    this.panDelta.subVectors(this.panEnd, this.panStart);

    this.pan(this.panDelta.x, this.panDelta.y);

    this.panStart.copy(this.panEnd);

    this.update();
  }

  private handleTouchEnd(event: TouchEvent) {
    // console.log( 'handleTouchEnd' );
  }

  //
  // event handlers - FSM: listen for events and reset state
  //

  private onMouseDown(event: MouseEvent) {
    if (this.enabled === false) return;

    event.preventDefault();

    switch (event.button) {
      case this.mouseButtons.ORBIT:

        if (this.enableRotate === false) return;

        this.handleMouseDownRotate(event);

        this.state = OrbitControlsState.ROTATE;

        break;

      case this.mouseButtons.ZOOM:

        if (this.enableZoom === false) return;

        this.handleMouseDownDolly(event);

        this.state = OrbitControlsState.DOLLY;

        break;

      case this.mouseButtons.PAN:

        if (this.enablePan === false) return;

        this.handleMouseDownPan(event);

        this.state = OrbitControlsState.PAN;

        break;
    }

    if (this.state !== OrbitControlsState.NONE) {
      document.addEventListener(
          'mousemove', this.onMouseMove.bind(this), false);
      document.addEventListener('mouseup', this.onMouseUp.bind(this), false);

      this.dispatchEvent(this.startEvent);
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (this.enabled === false) return;

    event.preventDefault();

    switch (this.state) {
      case OrbitControlsState.ROTATE:

        if (this.enableRotate === false) return;

        this.handleMouseMoveRotate(event);

        break;

      case OrbitControlsState.DOLLY:

        if (this.enableZoom === false) return;

        this.handleMouseMoveDolly(event);

        break;

      case OrbitControlsState.PAN:

        if (this.enablePan === false) return;

        this.handleMouseMovePan(event);

        break;
    }
  }

  private onMouseUp(event: MouseEvent) {
    if (this.enabled === false) return;

    this.handleMouseUp(event);

    document.removeEventListener('mousemove', this.onMouseMove, false);
    document.removeEventListener('mouseup', this.onMouseUp, false);

    this.dispatchEvent(this.endEvent);

    this.state = OrbitControlsState.NONE;
  }

  private onMouseWheel(event: MouseWheelEvent) {
    if (this.enabled === false || this.enableZoom === false ||
        (this.state !== OrbitControlsState.NONE &&
         this.state !== OrbitControlsState.ROTATE))
      return;

    event.preventDefault();
    event.stopPropagation();

    this.dispatchEvent(this.startEvent);

    this.handleMouseWheel(event);

    this.dispatchEvent(this.endEvent);
  }

  private onKeyDown(event: KeyboardEvent) {
    if (this.enabled === false || this.enableKeys === false ||
        this.enablePan === false)
      return;

    this.handleKeyDown(event);
  }

  private onTouchStart(event: TouchEvent) {
    if (this.enabled === false) return;

    switch (event.touches.length) {
      case 1:  // one-fingered touch: rotate

        if (this.enableRotate === false) return;

        this.handleTouchStartRotate(event);

        this.state = OrbitControlsState.TOUCH_ROTATE;

        break;

      case 2:  // two-fingered touch: dolly

        if (this.enableZoom === false) return;

        this.handleTouchStartDolly(event);

        this.state = OrbitControlsState.TOUCH_DOLLY;

        break;

      case 3:  // three-fingered touch: pan

        if (this.enablePan === false) return;

        this.handleTouchStartPan(event);

        this.state = OrbitControlsState.TOUCH_PAN;

        break;

      default:

        this.state = OrbitControlsState.NONE;
    }

    if (this.state !== OrbitControlsState.NONE) {
      this.dispatchEvent(this.startEvent);
    }
  }

  private onTouchMove(event: TouchEvent) {
    if (this.enabled === false) return;

    event.preventDefault();
    event.stopPropagation();

    switch (event.touches.length) {
      case 1:  // one-fingered touch: rotate

        if (this.enableRotate === false) return;
        if (this.state !== OrbitControlsState.TOUCH_ROTATE)
          return;  // is this needed?...

        this.handleTouchMoveRotate(event);

        break;

      case 2:  // two-fingered touch: dolly

        if (this.enableZoom === false) return;
        if (this.state !== OrbitControlsState.TOUCH_DOLLY)
          return;  // is this needed?...

        this.handleTouchMoveDolly(event);

        break;

      case 3:  // three-fingered touch: pan

        if (this.enablePan === false) return;
        if (this.state !== OrbitControlsState.TOUCH_PAN)
          return;  // is this needed?...

        this.handleTouchMovePan(event);

        break;

      default:

        this.state = OrbitControlsState.NONE;
    }
  }

  private onTouchEnd(event: TouchEvent) {
    if (this.enabled === false) return;

    this.handleTouchEnd(event);

    this.dispatchEvent(this.endEvent);

    this.state = OrbitControlsState.NONE;
  }

  private onContextMenu(event: Event) {
    if (this.enabled === false) return;

    event.preventDefault();
  }
}