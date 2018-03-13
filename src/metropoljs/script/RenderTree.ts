import * as estree from 'estree';
import * as THREE from 'three';

import {MetropolJSNode, Rectangle} from '../common';

import {RectangleUpdatePointer} from './ModelLayer';

/**
 * Represents one node in the binary tree. Contains a bounding box for
 * location.
 */
export class RenderTree {
  /**
   * The left hand node on the binary tree. May be null
   */
  a: RenderTree|null = null;

  /**
   * The right hand node on the binary tree. May be null
   */
  b: RenderTree|null = null;

  /**
   * The node this represents on the Abstract Syntax Tree.
   */
  node: MetropolJSNode|null = null;

  updateIndex: RectangleUpdatePointer|null = null;

  color: number = 0;

  count: number = 0;

  constructor(
      public type: string,
      public location: Rectangle,
      public depth: number,
  ) {}

  /**
   * Does this bounding box contain a given point.RenderTree
   */
  containsPoint(point: THREE.Vector2) {
    return (point.x > this.location.x) && (point.y > this.location.y) &&
        (point.x < this.location.x + this.location.w) &&
        (point.y < this.location.y + this.location.h);
  }

  /**
   * Search the tree to find the node under a point.
   */
  binarySearchTree(point: THREE.Vector2): RenderTree|null {
    if (!this.containsPoint(point)) {
      return null;
    }
    if (this.a && this.a.containsPoint(point)) {
      return this.a.binarySearchTree(point);
    } else if (this.b && this.b.containsPoint(point)) {
      return this.b.binarySearchTree(point);
    } else {
      return this;
    }
  }

  getLocation(): Rectangle {
    return this.location;
  }

  getCenter(): THREE.Vector2 {
    return new THREE.Vector2(
        this.location.x + (this.location.w / 2),
        this.location.y + (this.location.h / 2));
  }

  getDepth(): number {
    return this.depth;
  }

  getNode(): MetropolJSNode|null {
    return this.node;
  }
}