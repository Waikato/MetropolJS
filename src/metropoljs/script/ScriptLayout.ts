import * as THREE from 'three';

export enum LayoutDimension {
  Level1 = 1,    // 32
  Level2 = 2,    // 64
  Level3 = 4,    // 128
  Level4 = 8,    // 256
  Level5 = 16,   // 512
  Level6 = 32,   // 1024
  Level7 = 64,   // 2048
  Level8 = 128,  // 4096
}

const BASE_NODE_SIZE = 16;

export class ScriptLayout {
  private sparseLayoutSet: Set<string> = new Set();

  private lastLayer = 0;

  getNodePosition(level: LayoutDimension): THREE.Vector3 {
    for (let l = this.lastLayer;; l += 1) {
      let foundSingleNode = false;

      if (l === 0) {
        if (this.canFit(0, 0, level)) {
          this.fillNode(0, 0, level);
          return this._getNodePosition(0, 0, level);
        } else {
          foundSingleNode = true;
        }
      } else {
        // x then y
        for (let x = 0; x < l + 1; x++) {
          if (!this.hasNode(x, l)) {
            if (this.canFit(x, l, level)) {
              this.fillNode(x, l, level);
              return this._getNodePosition(x, l, level);
            }
          } else {
            foundSingleNode = true;
          }
        }

        for (let y = 0; y < l; y++) {
          if (!this.hasNode(l, y)) {
            if (this.canFit(l, y, level)) {
              this.fillNode(l, y, level);
              return this._getNodePosition(l, y, level);
            }
          } else {
            foundSingleNode = true;
          }
        }
      }

      // If no free spaces are found on this layer then don't try this layer
      // again.
      if (!foundSingleNode) {
        this.lastLayer += 1;
      }
    }
  }

  getNodeDimension(nodeCount: number): LayoutDimension {
    if (nodeCount < 1024) {
      return LayoutDimension.Level1;
    } else if (nodeCount < 4096) {
      return LayoutDimension.Level2;
    } else if (nodeCount < 16384) {
      return LayoutDimension.Level3;
    } else if (nodeCount < 65536) {
      return LayoutDimension.Level4;
    } else if (nodeCount < 262144) {
      return LayoutDimension.Level5;
    } else if (nodeCount < 1048576) {
      return LayoutDimension.Level6;
    } else if (nodeCount < 4194304) {
      return LayoutDimension.Level7;
    } else {
      return LayoutDimension.Level8;
    }
  }

  getNodeSize(level: LayoutDimension): number {
    if (level === LayoutDimension.Level1) {
      return 16;
    } else if (level === LayoutDimension.Level2) {
      return 32;
    } else if (level === LayoutDimension.Level3) {
      return 64;
    } else if (level === LayoutDimension.Level4) {
      return 128;
    } else if (level === LayoutDimension.Level5) {
      return 256;
    } else if (level === LayoutDimension.Level6) {
      return 512;
    } else if (level === LayoutDimension.Level7) {
      return 1024;
    } else if (level === LayoutDimension.Level8) {
      return 2048;
    } else {
      return 4096;
    }
  }

  private canFit(x: number, y: number, level: LayoutDimension): boolean {
    for (let x1 = x; x1 < x + level; x1++) {
      for (let y1 = y; y1 < y + level; y1++) {
        if (this.hasNode(x1, y1)) {
          return false;
        }
      }
    }

    return true;
  }

  private fillNode(x: number, y: number, level: LayoutDimension) {
    for (let x1 = x; x1 < x + level; x1++) {
      for (let y1 = y; y1 < y + level; y1++) {
        this.sparseLayoutSet.add(this.getKey(x1, y1));
      }
    }
  }

  private hasNode(x: number, y: number): boolean {
    return this.sparseLayoutSet.has(this.getKey(x, y));
  }

  private getKey(x: number, y: number): string {
    return `${x.toString(10)},${y.toString(10)}`;
  }

  private _getNodePosition(x: number, y: number, level: LayoutDimension):
      THREE.Vector3 {
    const size = this.getNodeSize(level) / 2;
    return new THREE.Vector3(
        (x * BASE_NODE_SIZE) + size, (y * BASE_NODE_SIZE) + size, 0);
  }
}