import * as THREE from 'three';

import {Bag} from './common';

export enum RendererColors {
  Rainbow,
  XRay,
  Random,
  Grey
}

export class ScriptColorMap {
  /**
   * A map to convert a node type into a color.
   */
  private colorMap: Map<string, THREE.Color> = new Map();

  /**
   * The color scheme to use for rendering.
   */
  private currentColors: RendererColors = RendererColors.Grey;

  /**
   * Get the current color scheme being used.
   */
  getColorMap(): Bag<number[]> {
    const ret: Bag<number[]> = {};
    this.colorMap.forEach((value, key) => {
      ret[key] = value.toArray();
    });
    return ret;
  }

  /**
   * Set the color scheme being used for rendering.
   * The model needs to be re rendered with refresh() before this will take
   * effect.
   */
  setColors(colors: RendererColors) {
    this.colorMap = new Map();
    this.currentColors = colors;
  }

  /**
   * Gets the saved color for a node type or generates a new color for the
   * current color scheme.
   */
  getColorFromType(typeName: string, layer: number): THREE.Color {
    if (!this.colorMap.has(typeName)) {
      this.colorMap.set(typeName, this.getColor(layer));
    }
    return this.colorMap.get(typeName) || new THREE.Color(0xffffff);
  }

  getHighlightColorFromType(typeName: string, layer: number): THREE.Color|null {
    if (typeName === 'Identifier' || typeName === 'Literal') {
      return new THREE.Color(160, 160, 160);
    } else {
      return null;
    }
  }

  /**
   * Get the color of a node given which layer it's on.
   */
  private getColor(layer: number): THREE.Color {
    if (this.currentColors === RendererColors.XRay) {
      return new THREE.Color('hsl(160,10%,' + (layer * 10).toString(10) + '%)');
    } else if (this.currentColors === RendererColors.Random) {
      return new THREE.Color(Math.random(), Math.random(), Math.random());
    } else if (this.currentColors === RendererColors.Rainbow) {
      return new THREE.Color('hsl(' + (layer * 30).toString(10) + ',90%,50%)');
    } else if (this.currentColors === RendererColors.Grey) {
      return new THREE.Color(0.4, 0.4, 0.4);
    } else {
      return new THREE.Color(0xffffff);
    }
  }
}