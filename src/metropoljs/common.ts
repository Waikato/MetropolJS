import * as estree from 'estree';

/**
 * Clamp a number between 2 values.
 */
export function clamp(x: number, min: number, max: number): number {
  if (x < min) {
    return min;
  }
  if (x > max) {
    return max;
  }
  return x;
}

export function expect(): never {
  throw new Error('Expect failed');
}

export type Bag<T> = {
  [s: string]: T
};

export interface Rectangle {
  x: number;
  y: number;
  w: number;
  h: number;
}

export enum Direction {
  X,
  Y,
}

/**
 * Get a list of all child nodes under a given node.
 */
export function getNodeChildren(node: estree.Node): estree.Node[] {
  const ret: estree.Node[] = [];

  // We only care about objects not primitive values.
  const nodeObj = (node as {}) as Bag<estree.Node|estree.Node[]|undefined>;

  Object.keys(nodeObj).forEach((key) => {
    const value = nodeObj[key];

    if (typeof (value) === 'object') {
      if (value instanceof Array) {
        ret.push(...value);
      } else {
        if (value && value.type) {
          ret.push(value);
        }
      }
    }
  });

  return ret.filter((a) => a !== null);
}

/**
 * Count the total number of children a node has recursively.
 */
export function countNodeChildren(node: estree.Node): number {
  if (node === null || node === undefined) {
    return 0;
  }

  let ret = 1;

  getNodeChildren(node).forEach((child) => {
    ret += countNodeChildren(child);
  });

  return ret;
}

export interface RenderGroup { getRenderGroup(): THREE.Group; }