import * as three from 'three';

import {BufferGeometryModelLayer} from './BufferGeometryModelLayer';
import {RectangleUpdatePointer} from './ModelLayer';

export class WallModelLayer extends BufferGeometryModelLayer {
  constructor(material: THREE.Material, depth: number) {
    super(material, depth, false, 1.0, true);
  }

  emitVertex(location: THREE.Vector3, color: number, normal?: THREE.Vector3):
      number {
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
        topBackLeft, topBackRight, bottomBackRight, bottomBackLeft, false,
        true);

    // left (topFrontLeft, topBackLeft, bottomBackLeft, bottomFrontLeft)
    this._emitRectangle(
        topFrontLeft, topBackLeft, bottomBackLeft, bottomFrontLeft, false,
        true);

    // right (topFrontRight, topBackRight, bottomBackRight, bottomFrontRight)
    this._emitRectangle(
        topFrontRight, topBackRight, bottomBackRight, bottomFrontRight, true,
        false);
  }

  updateGeometryVisitAmount(
      rectUpdate: RectangleUpdatePointer, visitAmount: number): void {}

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