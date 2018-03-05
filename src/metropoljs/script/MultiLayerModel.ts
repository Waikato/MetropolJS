// tslint:disable:interface-name
// tslint:disable:max-classes-per-file

import * as THREE from 'three';

import {expect, Rectangle, RenderGroup} from '../common';

interface ModelLayer extends RenderGroup {
  emitVertex(location: THREE.Vector3, color?: THREE.Color): number;
  emitTriangle(a: number, b: number, c: number, color?: THREE.Color): number;
  emitRectangle(
      a: number, b: number, c: number, d: number, color?: THREE.Color): number;
  emitLine(a: number, b: number, color?: THREE.Color): number;
  updateGeometryColor(index: number, color: THREE.Color): void;

  getVertexCount(): number;

  setOpacity(opacity: number): void;
  setVisible(visible: boolean): void;

  // exportPly(): string;
  // exportObj(): string;
}

const USE_LIGHTING = true;

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
  private colors: Uint8DynamicArray;
  private alpha: Float32DynamicArray;
  private indexes: Uint32DynamicArray;
  private faces: number[][] = [];

  private lastVertex = 0;

  /**
   * The object that can be placed in the scene.
   */
  private mesh: THREE.Mesh|THREE.Line;

  private group: THREE.Group = new THREE.Group();

  private positionAttribute: THREE.Float32BufferAttribute;
  private colorAttribute: THREE.Uint8BufferAttribute;
  private alphaAttribute: THREE.Float32BufferAttribute;
  private indexAttribute: THREE.Uint32BufferAttribute;

  constructor(
      private owner: MultiLayerModel, private depth: number,
      private usesLines: boolean, private defaultAlpha: number) {
    if (usesLines) {
      this.mesh = new THREE.LineSegments();
    } else {
      this.mesh = new THREE.Mesh();
    }

    this.mesh.material = owner.getMaterial().clone();

    this.group.add(this.mesh);

    this.mesh.frustumCulled = false;

    this.mesh.position.z = this.depth;

    this.buffer = this.mesh.geometry as THREE.BufferGeometry;

    this.positions = new DynamicArrayBuffer(Float32Array, 3);

    this.positionAttribute =
        new THREE.BufferAttribute(this.positions.getArray() || expect(), 3);

    this.colors = new DynamicArrayBuffer(Uint8Array, 4);

    this.colorAttribute =
        new THREE.BufferAttribute(this.colors.getArray() || expect(), 3);
    this.colorAttribute.normalized = true;
    this.colorAttribute.setDynamic(true);

    this.alpha = new DynamicArrayBuffer(Float32Array, 1);

    this.alphaAttribute =
        new THREE.BufferAttribute(this.alpha.getArray() || expect(), 1);
    this.alphaAttribute.normalized = true;
    this.alphaAttribute.setDynamic(true);

    this.indexes = new DynamicArrayBuffer(Uint32Array, 1);

    this.indexAttribute =
        new THREE.BufferAttribute(this.indexes.getArray() || expect(), 1);

    this.buffer.addAttribute('position', this.positionAttribute);
    this.buffer.addAttribute('color', this.colorAttribute);
    this.buffer.addAttribute('alpha', this.alphaAttribute);
    this.buffer.setIndex(this.indexAttribute);
  }

  emitVertex(location: THREE.Vector3, color?: THREE.Color): number {
    if (color) {
      this.colors.push(color.r * 255, color.g * 255, color.b * 255);

      const newColorArray = this.colors.getArray();
      if (newColorArray) {
        this.colorAttribute.setArray(newColorArray);
      }

      this.colorAttribute.needsUpdate = true;
    } else {
      this.colors.push(255, 255, 255);
    }

    this.alpha.push(this.defaultAlpha);
    this.alphaAttribute.needsUpdate = true;

    const newAlphaArray = this.alpha.getArray();
    if (newAlphaArray) {
      this.alphaAttribute.setArray(newAlphaArray);
    }

    this.positions.push(location.x, location.y, location.z);

    const newPositionArray = this.positions.getArray();
    if (newPositionArray) {
      this.positionAttribute.setArray(newPositionArray);
    }

    this.positionAttribute.needsUpdate = true;

    return this.lastVertex++;
  }

  emitTriangle(a: number, b: number, c: number, color?: THREE.Color): number {
    this.indexes.push(a, b, c);

    const newArray = this.indexes.getArray();
    if (newArray) {
      this.indexAttribute.setArray(newArray);
    }

    this.indexAttribute.needsUpdate = true;

    return this.faces.push([a, b, c]) - 1;
  }

  emitLine(a: number, b: number, color?: THREE.Color): number {
    this.indexes.push(a, b);

    const newArray = this.indexes.getArray();
    if (newArray) {
      this.indexAttribute.setArray(newArray);
    }

    this.indexAttribute.needsUpdate = true;

    return this.faces.push([a, b]) - 1;
  }

  emitRectangle(
      topLeftVert: number, topRightVert: number, bottomLeftVert: number,
      bottomRightVert: number, color?: THREE.Color): number {
    if (this.usesLines) {
      const updateIndex = this.emitLine(topLeftVert, topRightVert, color);
      this.emitLine(topRightVert, bottomRightVert, color);
      this.emitLine(bottomRightVert, bottomLeftVert, color);
      this.emitLine(bottomLeftVert, topLeftVert, color);
      return updateIndex;
    } else {
      const updateIndex =
          this.emitTriangle(topLeftVert, topRightVert, bottomLeftVert, color);
      this.emitTriangle(topRightVert, bottomRightVert, bottomLeftVert, color);
      return updateIndex;
    }
  }

  updateGeometryColor(index: number, color: THREE.Color): void {
    if (this.usesLines) {
      this.updateFaceColor(index + 0, color);
      this.updateFaceColor(index + 1, color);
      this.updateFaceColor(index + 2, color);
      this.updateFaceColor(index + 3, color);
    } else {
      this.updateFaceColor(index + 0, color);
      this.updateFaceColor(index + 1, color);
    }
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

  protected updateFaceColor(index: number, color: THREE.Color): void {
    this.faces[index].forEach((vertexIndex) => {
      this.colors.set([color.r, color.g, color.b], vertexIndex * 3);
      this.alpha.set([1.0], vertexIndex);
    });

    this.colorAttribute.needsUpdate = true;
    this.alphaAttribute.needsUpdate = true;
  }
}

class WallModelLayer extends BufferGeometryModelLayer {
  constructor(owner: MultiLayerModel, depth: number) {
    super(owner, depth, false, 1.0);
  }

  emitVertex(location: THREE.Vector3, color?: THREE.Color): number {
    const vertexIndex = super.emitVertex(location, color);
    super.emitVertex(location.clone().setZ(-1), color);
    return vertexIndex;
  }

  emitRectangle(
      frontLeftVertex: number, frontRightVertex: number, backLeftVertex: number,
      backRightVertex: number, color?: THREE.Color): number {
    const topFrontLeft = (frontLeftVertex * 2);
    const bottomFrontLeft = topFrontLeft + 1;

    const topFrontRight = (frontRightVertex * 2);
    const bottomFrontRight = topFrontRight + 1;

    const topBackLeft = (backLeftVertex * 2);
    const bottomBackLeft = topBackLeft + 1;

    const topBackRight = (backRightVertex * 2);
    const bottomBackRight = topBackRight + 1;

    // front (topFrontLeft, topFrontRight, bottomFrontRight, bottomFrontLeft)
    const updateIndex = this._emitRectangle(
        topFrontLeft, topFrontRight, bottomFrontRight, bottomFrontLeft, true,
        false, color);

    // back (topBackLeft, topBackRight, bottomBackRight, bottomBackLeft)
    this._emitRectangle(
        topBackLeft, topBackRight, bottomBackRight, bottomBackLeft, false, true,
        color);

    // left (topFrontLeft, topBackLeft, bottomBackLeft, bottomFrontLeft)
    this._emitRectangle(
        topFrontLeft, topBackLeft, bottomBackLeft, bottomFrontLeft, false, true,
        color);

    // right (topFrontRight, topBackRight, bottomBackRight, bottomFrontRight)
    this._emitRectangle(
        topFrontRight, topBackRight, bottomBackRight, bottomFrontRight, true,
        false, color);

    return updateIndex;
  }

  updateGeometryColor(index: number, color: THREE.Color): void {}

  private _emitRectangle(
      topLeftVert: number, topRightVert: number, bottomLeftVert: number,
      bottomRightVert: number, flipOne: boolean, flipTwo: boolean,
      color?: THREE.Color): number {
    let updateIndex = 0;

    if (flipOne) {
      updateIndex =
          super.emitTriangle(bottomLeftVert, topRightVert, topLeftVert, color);
    } else {
      updateIndex =
          super.emitTriangle(topLeftVert, topRightVert, bottomLeftVert, color);
    }

    if (flipTwo) {
      super.emitTriangle(bottomLeftVert, bottomRightVert, topLeftVert, color);
    } else {
      super.emitTriangle(topLeftVert, bottomRightVert, bottomLeftVert, color);
    }

    return updateIndex;
  }
}

class BorderedRectangleModelLayer implements ModelLayer {
  private group: THREE.Group = new THREE.Group();

  private solidLayer: ModelLayer;
  private lineLayer: ModelLayer;
  private wallLayer: WallModelLayer;

  constructor(private owner: MultiLayerModel, private depth: number) {
    this.solidLayer =
        new BufferGeometryModelLayer(this.owner, this.depth, false, 1.0);

    const solidGroup = this.solidLayer.getRenderGroup();
    solidGroup.position.z = -0.00001;

    this.group.add(solidGroup);

    this.lineLayer =
        new BufferGeometryModelLayer(this.owner, this.depth, true, 1.0);
    this.group.add(this.lineLayer.getRenderGroup());

    this.wallLayer = new WallModelLayer(this.owner, this.depth);
    this.group.add(this.wallLayer.getRenderGroup());
  }

  emitVertex(location: THREE.Vector3, color?: THREE.Color): number {
    this.solidLayer.emitVertex(location, color);
    this.wallLayer.emitVertex(location, color);
    return this.lineLayer.emitVertex(location, color);
  }

  emitTriangle(a: number, b: number, c: number, color?: THREE.Color): number {
    throw new Error('Not Implemented');
  }

  emitRectangle(
      a: number, b: number, c: number, d: number, color?: THREE.Color): number {
    this.solidLayer.emitRectangle(a, b, c, d, color);
    this.wallLayer.emitRectangle(a, b, c, d, color);
    return this.lineLayer.emitRectangle(a, b, c, d, color);
  }

  emitLine(a: number, b: number, color?: THREE.Color): number {
    throw new Error('Not Implemented');
  }

  updateGeometryColor(index: number, color: THREE.Color): void {
    this.lineLayer.updateGeometryColor(index, color);
    this.wallLayer.updateGeometryColor(index, color);
    this.solidLayer.updateGeometryColor(index / 2, color);
  }

  getRenderGroup(): THREE.Group {
    return this.group;
  }

  setOpacity(opacity: number): void {
    this.lineLayer.setOpacity(opacity);
    this.wallLayer.setOpacity(opacity);
    this.solidLayer.setOpacity(opacity);
  }

  setVisible(visible: boolean): void {
    this.lineLayer.setVisible(visible);
    this.wallLayer.setVisible(visible);
    this.solidLayer.setVisible(visible);
  }

  getVertexCount(): number {
    return this.lineLayer.getVertexCount() + this.wallLayer.getVertexCount() +
        this.solidLayer.getVertexCount();
  }
}

/**
 * Container class and abstract interface for a model with a series of different
 * layers.
 */
export class MultiLayerModel implements RenderGroup {
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
    if (USE_LIGHTING) {
      this.material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        vertexColors: THREE.VertexColors,
      });
    } else {
      this.material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER_SOURCE,
        fragmentShader: FRAGMENT_SHADER_SOURCE,
        transparent: true,
        vertexColors: THREE.VertexColors,
        opacity: 0.5,
        uniforms: {}
      });
    }

    this.model = new THREE.Group();
  }

  getMaterial(): THREE.Material {
    return this.material;
  }

  /**
   * Draw a rectangle at a given layer on the model.
   */
  drawRectangle(layer: number, rectangle: Rectangle, color: THREE.Color):
      number {
    const modelLayer = this.getLayer(layer);

    const topLeftVert = modelLayer.emitVertex(
        new THREE.Vector3(rectangle.x, rectangle.y, 0), color);
    const topRightVert = modelLayer.emitVertex(
        new THREE.Vector3(rectangle.x + rectangle.w, rectangle.y, 0), color);
    const bottomLeftVert = modelLayer.emitVertex(
        new THREE.Vector3(rectangle.x, rectangle.y + rectangle.h, 0), color);
    const bottomRightVert = modelLayer.emitVertex(
        new THREE.Vector3(
            rectangle.x + rectangle.w, rectangle.y + rectangle.h, 0),
        color);

    const updateIndex = modelLayer.emitRectangle(
        topLeftVert, topRightVert, bottomLeftVert, bottomRightVert, color);

    return updateIndex;
  }

  updateColor(layer: number, index: number, color: THREE.Color) {
    const modelLayer = this.getLayer(layer);

    modelLayer.updateGeometryColor(index, color);
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
    const newLayer = new BorderedRectangleModelLayer(this, layer);
    this.model.add(newLayer.getRenderGroup());
    this.layers.push(newLayer);
  }
}
