import * as THREE from 'three';

import {expect} from '../common';
import {Config} from '../Config';

import {DynamicArrayBuffer, Float32DynamicArray, Uint32DynamicArray} from './DynamicArrayBuffer';
import {ModelLayer, RectangleUpdatePointer} from './ModelLayer';

export class BufferGeometryModelLayer implements ModelLayer {
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
      material: THREE.Material, private depth: number,
      private usesLines: boolean, private defaultAlpha: number,
      private enableNormals: boolean) {
    if (usesLines) {
      this.mesh = new THREE.LineSegments();
    } else {
      this.mesh = new THREE.Mesh();
    }

    this.mesh.material = material.clone();

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

    this.visitAmount = new DynamicArrayBuffer(Float32Array, 1);

    this.visitAmountAttribute =
        new THREE.BufferAttribute(this.visitAmount.getArray() || expect(), 1);
    this.visitAmountAttribute.normalized = false;
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

  debug() {
    console.groupCollapsed('BufferGeometryModelLayer');
    console.log('pos', this.mesh.position);
    console.groupEnd();
  }

  dispose() {
    this.buffer.dispose();
    this.mesh.material.dispose();
  }

  emitVertex(location: THREE.Vector3, color: number, normal?: THREE.Vector3):
      number {
    this.colorAmount.push(color);

    const newColorArray = this.colorAmount.getArray();
    if (newColorArray) {
      this.colorAmountAttribute.setArray(newColorArray);
    }

    this.colorAmountAttribute.needsUpdate = true;

    this.visitAmount.push(0);

    const newAlphaArray = this.visitAmount.getArray();
    if (newAlphaArray) {
      this.visitAmountAttribute.setArray(newAlphaArray);
    }

    this.visitAmountAttribute.needsUpdate = true;

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

  updateGeometryVisitAmount(
      rectUpdate: RectangleUpdatePointer, visitAmount: number) {
    this.updateVertexVisitAmount(rectUpdate.a, visitAmount);
    this.updateVertexVisitAmount(rectUpdate.b, visitAmount);
    this.updateVertexVisitAmount(rectUpdate.c, visitAmount);
    this.updateVertexVisitAmount(rectUpdate.d, visitAmount);

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

  setMaxAmount(maxAmount: number): void {
    if (this.mesh.material instanceof THREE.ShaderMaterial) {
      this.mesh.material.uniforms['maxAmount'].value = maxAmount;
    }
  }

  protected updateVertexVisitAmount(vertexIndex: number, visitAmount: number):
      void {
    this.visitAmount.set([visitAmount], vertexIndex);
  }

  protected flagUpdate() {
    this.visitAmountAttribute.needsUpdate = true;
  }
}