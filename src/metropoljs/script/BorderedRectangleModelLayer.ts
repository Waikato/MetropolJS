import * as THREE from 'three';

import {BufferGeometryModelLayer} from './BufferGeometryModelLayer';
import {ModelLayer, RectangleUpdatePointer} from './ModelLayer';
import {WallModelLayer} from './WallModelLayer';

export class BorderedRectangleModelLayer implements ModelLayer {
  private group: THREE.Group = new THREE.Group();

  private solidLayer: ModelLayer|null = null;
  private lineLayer: ModelLayer|null = null;
  private wallLayer: WallModelLayer|null = null;

  constructor(
      material: THREE.Material, private depth: number,
      private enableSolidLayer: boolean, private enableLineLayer: boolean,
      private enableWallLayer: boolean, private enableNormals: boolean) {
    if (this.enableSolidLayer) {
      if (this.enableLineLayer) {
        this.solidLayer = new BufferGeometryModelLayer(
            material, this.depth, false, 0.0, this.enableNormals);
      } else {
        this.solidLayer = new BufferGeometryModelLayer(
            material, this.depth, false, 1.0, this.enableNormals);
      }

      const solidGroup = this.solidLayer.getRenderGroup();
      solidGroup.position.z = -0.00001;

      this.group.add(solidGroup);
    }

    if (this.enableLineLayer) {
      this.lineLayer =
          new BufferGeometryModelLayer(material, this.depth, true, 1.0, false);
      this.group.add(this.lineLayer.getRenderGroup());
    }

    if (this.enableWallLayer) {
      this.wallLayer = new WallModelLayer(material, this.depth);
      this.group.add(this.wallLayer.getRenderGroup());
    }
  }

  debug() {
    if (this.enableSolidLayer && this.solidLayer) {
      this.solidLayer.debug();
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

  emitVertex(location: THREE.Vector3, color: number, normal?: THREE.Vector3):
      number {
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

  emitRectangle(a: number, b: number, c: number, d: number): void {
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

  updateGeometryVisitAmount(
      rectUpdate: RectangleUpdatePointer, visitAmount: number,
      poiAmount: number): void {
    if (this.enableLineLayer && this.lineLayer) {
      this.lineLayer.updateGeometryVisitAmount(
          rectUpdate, visitAmount, poiAmount);
    }

    if (this.enableWallLayer && this.wallLayer) {
      this.wallLayer.updateGeometryVisitAmount(
          rectUpdate, visitAmount, poiAmount);
    }

    if (this.enableSolidLayer && this.solidLayer) {
      this.solidLayer.updateGeometryVisitAmount(
          rectUpdate, visitAmount, poiAmount);
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

  setMaxAmount(maxAmount: number) {
    if (this.enableLineLayer && this.lineLayer) {
      this.lineLayer.setMaxAmount(maxAmount);
    }

    if (this.enableWallLayer && this.wallLayer) {
      this.wallLayer.setMaxAmount(maxAmount);
    }

    if (this.enableSolidLayer && this.solidLayer) {
      this.solidLayer.setMaxAmount(maxAmount);
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