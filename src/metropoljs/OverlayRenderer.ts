import * as THREE from 'three';

import {expect, Rectangle, RenderGroup} from './common';

export class OverlayRenderer implements RenderGroup {
  private renderGroup: THREE.Group = new THREE.Group();

  private stackLine: THREE.Line|null;

  constructor() {
    const newLineMaterial = new THREE.LineBasicMaterial(
        {color: 0x101010, opacity: 0.2, linewidth: 2});

    const newGeometry = new THREE.Geometry();

    this.stackLine = new THREE.Line(newGeometry, newLineMaterial);

    this.stackLine.position.setZ(10);

    this.renderGroup.add(this.stackLine);
  }

  getRenderGroup(): THREE.Group {
    return this.renderGroup;
  }

  renderLine(points: THREE.Vector2[]) {
    if (!this.stackLine) {
      return;
    }
    const newGeometry = new THREE.Geometry();
    newGeometry.vertices.push(
        ...(points.map((pt) => new THREE.Vector3(pt.x, pt.y, 0))));

    this.stackLine.geometry = newGeometry;
  }
}
