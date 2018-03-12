// tslint:disable:interface-name
// tslint:disable:max-classes-per-file

import * as THREE from 'three';

import {DebugSource, expect, Rectangle, RenderGroup} from '../common';
import {Config} from '../Config';

export interface RectangleUpdatePointer {
  a: number;
  b: number;
  c: number;
  d: number;
}

interface ModelLayer extends RenderGroup {
  emitVertex(
      location: THREE.Vector3, color: number,
      normal?: THREE.Vector3): number;
  emitTriangle(a: number, b: number, c: number): void;
  emitRectangle(
      a: number, b: number, c: number, d: number): void;
  emitLine(a: number, b: number): void;
  updateGeometryVisitAmount(rectUpdate: RectangleUpdatePointer, visitAmount: number, maxAmount: number):
      void;

  dispose(): void;

  getVertexCount(): number;

  setOpacity(opacity: number): void;
  setVisible(visible: boolean): void;

  // exportPly(): string;
  // exportObj(): string;
}

const DYNAMIC_INITIAL_LENGTH = 4096;

const VERTEX_SHADER_SOURCE: string =
    require('fs').readFileSync(__dirname + '/shader/model.vert', 'utf8');
const FRAGMENT_SHADER_SOURCE: string =
    require('fs').readFileSync(__dirname + '/shader/model.frag', 'utf8');

type ArrayConstructorType = Float32ArrayConstructor|Uint8ArrayConstructor|
    Uint16ArrayConstructor|Uint32ArrayConstructor;

type ArrayType = Float32Array|Uint8Array|Uint16Array|Uint32Array;

class DynamicArrayBuffer<C extends ArrayConstructorType, A extends ArrayType> {
  private array: A;

  private currentPosition = 0;

  private updatedClient: boolean = false;

  constructor(private arrayConstructor: C, private elementSize: number) {
    this.array =
        new (this.arrayConstructor)(DYNAMIC_INITIAL_LENGTH * elementSize) as A;
  }

  push(...args: number[]): number {
    if (args.length + this.currentPosition > this.array.length) {
      this.expand();
    }

    const lastPosition = this.currentPosition;

    this.array.set(args, this.currentPosition);

    this.currentPosition += args.length;

    return lastPosition;
  }

  set(args: number[], offset: number) {
    this.array.set(args, offset);
  }

  getArray(): A|null {
    if (this.updatedClient) {
      return null;
    } else {
      this.updatedClient = true;
      return this.array;
    }
  }

  count() {
    return this.currentPosition - 1;
  }

  get(idx: number): number {
    return this.array[idx];
  }

  private expand() {
    const newSize = this.array.length * 2;
    const newArray = new (this.arrayConstructor)(newSize);
    newArray.set(this.array, 0);
    this.array = newArray as A;
    this.updatedClient = false;
  }
}

type Float32DynamicArray =
    DynamicArrayBuffer<Float32ArrayConstructor, Float32Array>;
type Uint8DynamicArray = DynamicArrayBuffer<Uint8ArrayConstructor, Uint8Array>;
type Uint16DynamicArray =
    DynamicArrayBuffer<Uint16ArrayConstructor, Uint16Array>;
type Uint32DynamicArray =
    DynamicArrayBuffer<Uint32ArrayConstructor, Uint32Array>;

class BufferGeometryModelLayer implements ModelLayer {
  private buffer: THREE.BufferGeometry;

  private positions: Float32DynamicArray;
  private colorAmount: Float32DynamicArray;
  private visitAmount: Float32DynamicArray;
  private indexes: Uint32DynamicArray;
  private normals: Float32DynamicArray|null = null;

  private lastVertex = 0;

  /**
   * The object that can be placed in the scene.
   */
  private mesh: THREE.Mesh|THREE.Line;

  private group: THREE.Group = new THREE.Group();

  private positionAttribute: THREE.Float32BufferAttribute;
  private colorAmountAttribute: THREE.Float32BufferAttribute;
  private visitAmountAttribute: THREE.Float32BufferAttribute;
  private indexAttribute: THREE.Uint32BufferAttribute;
  private normalAttribute: THREE.Float32BufferAttribute|null = null;

  constructor(
      private owner: MultiLayerModel, private depth: number,
      private usesLines: boolean, private defaultAlpha: number,
      private enableNormals: boolean) {
    if (usesLines) {
      this.mesh = new THREE.LineSegments();
    } else {
      this.mesh = new THREE.Mesh();
    }

    this.mesh.material = owner.getMaterial().clone();

    this.group.add(this.mesh);

    this.mesh.frustumCulled = false;

    const configObject = Config.getInstance().getConfig();

    if (configObject.rendering.city_mode) {
      this.mesh.position.z = this.depth;
    } else {
      this.mesh.position.z = this.depth / 10000;
    }

    this.buffer = this.mesh.geometry as THREE.BufferGeometry;

    this.positions = new DynamicArrayBuffer(Float32Array, 3);

    this.positionAttribute =
        new THREE.BufferAttribute(this.positions.getArray() || expect(), 3);

    this.colorAmount = new DynamicArrayBuffer(Float32Array, 1);

    this.colorAmountAttribute =
        new THREE.BufferAttribute(this.colorAmount.getArray() || expect(), 1);
    this.colorAmountAttribute.setDynamic(true);

    this.visitAmount = new DynamicArrayBuffer(Float32Array, 1);

    this.visitAmountAttribute =
        new THREE.BufferAttribute(this.visitAmount.getArray() || expect(), 1);
    this.visitAmountAttribute.normalized = true;
    this.visitAmountAttribute.setDynamic(true);

    this.indexes = new DynamicArrayBuffer(Uint32Array, 1);

    this.indexAttribute =
        new THREE.BufferAttribute(this.indexes.getArray() || expect(), 1);

    this.buffer.addAttribute('position', this.positionAttribute);
    this.buffer.addAttribute('colorAmount', this.colorAmountAttribute);
    this.buffer.addAttribute('visitAmount', this.visitAmountAttribute);
    this.buffer.setIndex(this.indexAttribute);

    if (this.enableNormals) {
      this.normals = new DynamicArrayBuffer(Float32Array, 3);

      this.normalAttribute =
          new THREE.BufferAttribute(this.normals.getArray() || expect(), 3);
      this.normalAttribute.normalized = true;

      this.buffer.addAttribute('normal', this.normalAttribute);
    }
  }

  dispose() {
    this.buffer.dispose();
    this.mesh.material.dispose();
  }

  emitVertex(
      location: THREE.Vector3, color: number,
      normal?: THREE.Vector3): number {
      this.colorAmount.push(color);

      const newColorArray = this.colorAmount.getArray();
      if (newColorArray) {
        this.colorAmountAttribute.setArray(newColorArray);
      }

      this.colorAmountAttribute.needsUpdate = true;

    this.visitAmount.push(0);
    this.visitAmountAttribute.needsUpdate = true;

    const newAlphaArray = this.visitAmount.getArray();
    if (newAlphaArray) {
      this.visitAmountAttribute.setArray(newAlphaArray);
    }

    this.positions.push(location.x, location.y, location.z);

    const newPositionArray = this.positions.getArray();
    if (newPositionArray) {
      this.positionAttribute.setArray(newPositionArray);
    }

    this.positionAttribute.needsUpdate = true;

    if (normal && this.enableNormals && this.normals && this.normalAttribute) {
      this.normals.push(location.x, location.y, location.z);

      const newNormalsArray = this.normals.getArray();
      if (newNormalsArray) {
        this.normalAttribute.setArray(newNormalsArray);
      }

      this.normalAttribute.needsUpdate = true;
    }

    return this.lastVertex++;
  }

  emitTriangle(a: number, b: number, c: number, color?: THREE.Color) {
    this.indexes.push(a, b, c);

    const newArray = this.indexes.getArray();
    if (newArray) {
      this.indexAttribute.setArray(newArray);
    }

    this.indexAttribute.needsUpdate = true;
  }

  emitLine(a: number, b: number, color?: THREE.Color) {
    this.indexes.push(a, b);

    const newArray = this.indexes.getArray();
    if (newArray) {
      this.indexAttribute.setArray(newArray);
    }

    this.indexAttribute.needsUpdate = true;
  }

  emitRectangle(
      topLeftVert: number, topRightVert: number, bottomLeftVert: number,
      bottomRightVert: number, color?: THREE.Color) {
    if (this.usesLines) {
      this.emitLine(topLeftVert, topRightVert, color);
      this.emitLine(topRightVert, bottomRightVert, color);
      this.emitLine(bottomRightVert, bottomLeftVert, color);
      this.emitLine(bottomLeftVert, topLeftVert, color);
    } else {
      this.emitTriangle(topLeftVert, topRightVert, bottomLeftVert, color);
      this.emitTriangle(topRightVert, bottomRightVert, bottomLeftVert, color);
    }
  }

  updateGeometryVisitAmount(rectUpdate: RectangleUpdatePointer, visitAmount: number, maxAmount: number) {
    this.updateVertexVisitAmount(rectUpdate.a, visitAmount);
    this.updateVertexVisitAmount(rectUpdate.b, visitAmount);
    this.updateVertexVisitAmount(rectUpdate.c, visitAmount);
    this.updateVertexVisitAmount(rectUpdate.d, visitAmount);

    if (this.mesh.material instanceof THREE.ShaderMaterial) {
      this.mesh.material.uniforms["maxAmount"].value = maxAmount;
    }
    
    this.flagUpdate();
  }

  setOpacity(opacity: number): void {
    if (this.mesh.material instanceof THREE.MeshBasicMaterial) {
      this.mesh.material.opacity = opacity;
    }
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  getRenderGroup(): THREE.Group {
    return this.group;
  }

  getVertexCount(): number {
    return this.positions.count();
  }

  protected updateVertexVisitAmount(vertexIndex: number, visitAmount: number): void {
    this.visitAmount.set([1.0], vertexIndex);
  }

  protected flagUpdate() {
    this.visitAmountAttribute.needsUpdate = true;
  }
}

class WallModelLayer extends BufferGeometryModelLayer {
  constructor(owner: MultiLayerModel, depth: number) {
    super(owner, depth, false, 1.0, true);
  }

  emitVertex(
      location: THREE.Vector3, color: number,
      normal?: THREE.Vector3): number {
    const vertexIndex = super.emitVertex(location, color, normal);
    super.emitVertex(
        location.clone().setZ(-1), color,
        normal ? normal.clone().setZ(1) : undefined);
    return vertexIndex;
  }

  emitRectangle(
      frontLeftVertex: number, frontRightVertex: number, backLeftVertex: number,
      backRightVertex: number) {
    const topFrontLeft = (frontLeftVertex * 2);
    const bottomFrontLeft = topFrontLeft + 1;

    const topFrontRight = (frontRightVertex * 2);
    const bottomFrontRight = topFrontRight + 1;

    const topBackLeft = (backLeftVertex * 2);
    const bottomBackLeft = topBackLeft + 1;

    const topBackRight = (backRightVertex * 2);
    const bottomBackRight = topBackRight + 1;

    // front (topFrontLeft, topFrontRight, bottomFrontRight, bottomFrontLeft)
    this._emitRectangle(
        topFrontLeft, topFrontRight, bottomFrontRight, bottomFrontLeft, true,
        false);

    // back (topBackLeft, topBackRight, bottomBackRight, bottomBackLeft)
    this._emitRectangle(
        topBackLeft, topBackRight, bottomBackRight, bottomBackLeft, false, true);

    // left (topFrontLeft, topBackLeft, bottomBackLeft, bottomFrontLeft)
    this._emitRectangle(
        topFrontLeft, topBackLeft, bottomBackLeft, bottomFrontLeft, false, true);

    // right (topFrontRight, topBackRight, bottomBackRight, bottomFrontRight)
    this._emitRectangle(
        topFrontRight, topBackRight, bottomBackRight, bottomFrontRight, true,
        false);
  }

  updateGeometryVisitAmount(rectUpdate: RectangleUpdatePointer, visitAmount: number, maxAmount: number):
      void {}

  private _emitRectangle(
      topLeftVert: number, topRightVert: number, bottomLeftVert: number,
      bottomRightVert: number, flipOne: boolean, flipTwo: boolean,
      color?: THREE.Color) {
    if (flipOne) {
      super.emitTriangle(bottomLeftVert, topRightVert, topLeftVert, color);
    } else {
      super.emitTriangle(topLeftVert, topRightVert, bottomLeftVert, color);
    }

    if (flipTwo) {
      super.emitTriangle(bottomLeftVert, bottomRightVert, topLeftVert, color);
    } else {
      super.emitTriangle(topLeftVert, bottomRightVert, bottomLeftVert, color);
    }
  }
}

class BorderedRectangleModelLayer implements ModelLayer {
  private group: THREE.Group = new THREE.Group();

  private solidLayer: ModelLayer|null = null;
  private lineLayer: ModelLayer|null = null;
  private wallLayer: WallModelLayer|null = null;

  constructor(
      private owner: MultiLayerModel, private depth: number,
      private enableSolidLayer: boolean, private enableLineLayer: boolean,
      private enableWallLayer: boolean, private enableNormals: boolean) {
    if (this.enableSolidLayer) {
      if (this.enableLineLayer) {
        this.solidLayer = new BufferGeometryModelLayer(
            this.owner, this.depth, false, 0.0, this.enableNormals);
      } else {
        this.solidLayer = new BufferGeometryModelLayer(
            this.owner, this.depth, false, 1.0, this.enableNormals);
      }

      const solidGroup = this.solidLayer.getRenderGroup();
      solidGroup.position.z = -0.00001;

      this.group.add(solidGroup);
    }

    if (this.enableLineLayer) {
      this.lineLayer = new BufferGeometryModelLayer(
          this.owner, this.depth, true, 1.0, false);
      this.group.add(this.lineLayer.getRenderGroup());
    }

    if (this.enableWallLayer) {
      this.wallLayer = new WallModelLayer(this.owner, this.depth);
      this.group.add(this.wallLayer.getRenderGroup());
    }
  }

  dispose() {
    if (this.solidLayer) {
      this.solidLayer.dispose();
    }
    if (this.lineLayer) {
      this.lineLayer.dispose();
    }
    if (this.wallLayer) {
      this.wallLayer.dispose();
    }
  }

  emitVertex(
      location: THREE.Vector3, color: number,
      normal?: THREE.Vector3): number {
    let solidIndex = 0;

    if (this.enableSolidLayer && this.solidLayer) {
      solidIndex = this.solidLayer.emitVertex(location, color, normal);
    }

    if (this.enableWallLayer && this.wallLayer) {
      this.wallLayer.emitVertex(location, color, normal);
    }

    if (this.enableLineLayer && this.lineLayer) {
      return this.lineLayer.emitVertex(location, color, normal);
    } else if (this.enableSolidLayer) {
      return solidIndex;
    }

    throw new Error('Vertex index not implemented');
  }

  emitTriangle(a: number, b: number, c: number): number {
    throw new Error('Not Implemented');
  }

  emitRectangle(
      a: number, b: number, c: number, d: number): void {
    let solidIndex = 0;

    if (this.enableSolidLayer && this.solidLayer) {
      this.solidLayer.emitRectangle(a, b, c, d);
    }

    if (this.enableWallLayer && this.wallLayer) {
      this.wallLayer.emitRectangle(a, b, c, d);
    }

    if (this.enableLineLayer && this.lineLayer) {
      this.lineLayer.emitRectangle(a, b, c, d);
    }
  }

  emitLine(a: number, b: number): number {
    throw new Error('Not Implemented');
  }

  updateGeometryVisitAmount(rectUpdate: RectangleUpdatePointer, visitAmount: number, maxAmount: number):
      void {
    if (this.enableLineLayer && this.lineLayer) {
      this.lineLayer.updateGeometryVisitAmount(rectUpdate, visitAmount, maxAmount);
    }

    if (this.enableWallLayer && this.wallLayer) {
      this.wallLayer.updateGeometryVisitAmount(rectUpdate, visitAmount, maxAmount);
    }

    if (this.enableSolidLayer && this.solidLayer) {
      this.solidLayer.updateGeometryVisitAmount(rectUpdate, visitAmount, maxAmount);
    }
  }

  getRenderGroup(): THREE.Group {
    return this.group;
  }

  setOpacity(opacity: number): void {
    if (this.enableLineLayer && this.lineLayer) {
      this.lineLayer.setOpacity(opacity);
    }

    if (this.enableWallLayer && this.wallLayer) {
      this.wallLayer.setOpacity(opacity);
    }

    if (this.enableSolidLayer && this.solidLayer) {
      this.solidLayer.setOpacity(opacity);
    }
  }

  setVisible(visible: boolean): void {
    if (this.enableLineLayer && this.lineLayer) {
      this.lineLayer.setVisible(visible);
    }

    if (this.enableWallLayer && this.wallLayer) {
      this.wallLayer.setVisible(visible);
    }

    if (this.enableSolidLayer && this.solidLayer) {
      this.solidLayer.setVisible(visible);
    }
  }

  getVertexCount(): number {
    let vertexCount = 0;

    if (this.enableLineLayer && this.lineLayer) {
      vertexCount += this.lineLayer.getVertexCount();
    }

    if (this.enableWallLayer && this.wallLayer) {
      vertexCount += this.wallLayer.getVertexCount();
    }

    if (this.enableSolidLayer && this.solidLayer) {
      vertexCount += this.solidLayer.getVertexCount();
    }

    return vertexCount;
  }
}

/**
 * Container class and abstract interface for a model with a series of different
 * layers.
 */
export class MultiLayerModel implements RenderGroup, DebugSource {
  /**
   * The list of layers currently in this model.
   */
  private layers: ModelLayer[] = [];

  /**
   * The render group all layers will be added to.
   */
  private model: THREE.Group;

  /**
   * The material used to render all the layers in the group.
   */
  private material: THREE.Material;

  constructor() {
    const configObject = Config.getInstance().getConfig();

    if (configObject.quality.enable_lighting) {
      this.material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: THREE.VertexColors,
      });
    } else {
      this.material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER_SOURCE,
        fragmentShader: FRAGMENT_SHADER_SOURCE,
        transparent: true,
        uniforms: {
          "maxAmount": {value: 100000}
        }
      });
    }

    this.model = new THREE.Group();
  }

  dispose() {
    this.layers.forEach((layer) => {
      layer.dispose();
    });
    this.material.dispose();
  }

  getMaterial(): THREE.Material {
    return this.material;
  }

  /**
   * Draw a rectangle at a given layer on the model.
   */
  drawRectangle(layer: number, rectangle: Rectangle, color: number):
      RectangleUpdatePointer {
    const modelLayer = this.getLayer(layer);

    const topLeftVert = modelLayer.emitVertex(
        new THREE.Vector3(rectangle.x, rectangle.y, 0), color,
        new THREE.Vector3(-1, -1, -1));
    const topRightVert = modelLayer.emitVertex(
        new THREE.Vector3(rectangle.x + rectangle.w, rectangle.y, 0), color,
        new THREE.Vector3(1, -1, -1));
    const bottomLeftVert = modelLayer.emitVertex(
        new THREE.Vector3(rectangle.x, rectangle.y + rectangle.h, 0), color,
        new THREE.Vector3(-1, 1, -1));
    const bottomRightVert = modelLayer.emitVertex(
        new THREE.Vector3(
            rectangle.x + rectangle.w, rectangle.y + rectangle.h, 0),
        color, new THREE.Vector3(1, 1, -1));

    const updateIndex = modelLayer.emitRectangle(
        topLeftVert, topRightVert, bottomLeftVert, bottomRightVert);

    return {
      a: topLeftVert,
      b: topRightVert,
      c: bottomLeftVert,
      d: bottomRightVert
    };
  }

  updateVisitAmount(
      layer: number, rectUpdate: RectangleUpdatePointer, visitAmount: number, maxAmount: number) {
    const modelLayer = this.getLayer(layer);

    modelLayer.updateGeometryVisitAmount(rectUpdate, visitAmount, maxAmount);
  }

  /**
   * Compile and return an object that can be rendered.
   */
  getRenderGroup(): THREE.Group {
    return this.model;
  }

  getVertexCount(): number {
    return this.layers
        .map((a) => {
          return a.getVertexCount();
        })
        .reduce((a, b) => {
          return a + b;
        }, 0);
  }

  /**
   * Set the alpha for all the layers in the model.
   */
  setAlpha(alpha: number) {
    this.layers.forEach((layer) => {
      layer.setOpacity(alpha);
    });
  }

  /**
   * Get the total number of layers currently in this model.
   */
  getLayerCount(): number {
    return this.layers.length;
  }

  /**
   * Set the maximum layer that may be rendered.
   */
  setMaxLayer(layer: number) {
    for (let i = 0; i < this.layers.length; i++) {
      this.layers[i].setVisible(i < layer);
    }
  }

  debug() {
    console.groupCollapsed('MultiLayerModel');
    console.log('totalVertexes', this.getVertexCount());
    console.groupEnd();
  }

  /**
   * Internally get a layer to render a rectangle onto.
   */
  private getLayer(layer: number): ModelLayer {
    while (this.layers.length < (layer + 1)) {
      this.addLayer(this.layers.length);
    }
    return this.layers[layer];
  }

  private addLayer(layer: number) {
    const configObject = Config.getInstance().getConfig();
    const newLayer = new BorderedRectangleModelLayer(
        this, layer, configObject.rendering.render_solid,
        configObject.rendering.render_borders,
        configObject.rendering.render_walls,
        configObject.quality.enable_lighting);
    this.model.add(newLayer.getRenderGroup());
    this.layers.push(newLayer);
  }
}
