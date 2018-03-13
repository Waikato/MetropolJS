import {DebugSource, RenderGroup} from '../common';

export interface RectangleUpdatePointer {
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface ModelLayer extends RenderGroup, DebugSource {
  emitVertex(location: THREE.Vector3, color: number, normal?: THREE.Vector3):
      number;
  emitTriangle(a: number, b: number, c: number): void;
  emitRectangle(a: number, b: number, c: number, d: number): void;
  emitLine(a: number, b: number): void;
  updateGeometryVisitAmount(
      rectUpdate: RectangleUpdatePointer, visitAmount: number): void;

  dispose(): void;

  getVertexCount(): number;

  setOpacity(opacity: number): void;
  setVisible(visible: boolean): void;
  setMaxAmount(maxAmount: number): void;
}