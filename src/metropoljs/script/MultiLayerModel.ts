// tslint:disable:interface-name
// tslint:disable:max-classes-per-file

import * as THREE from 'three';

import {DebugSource, expect, Rectangle, RenderGroup} from '../common';
import {Config} from '../Config';

import {BorderedRectangleModelLayer} from './BorderedRectangleModelLayer';
import {ModelLayer, RectangleUpdatePointer} from './ModelLayer';

const VERTEX_SHADER_SOURCE: string =
    require('fs').readFileSync(__dirname + '/shader/model.vert', 'utf8');
const FRAGMENT_SHADER_SOURCE: string =
    require('fs').readFileSync(__dirname + '/shader/model.frag', 'utf8');

/**
 * Container class and abstract interface for a model with a series of different
 * layers.
 */
export class MultiLayerModel implements RenderGroup, DebugSource {
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

  private maxAmount: number = 0;

  constructor() {
    const configObject = Config.getInstance().getConfig();

    if (configObject.quality.enable_lighting) {
      this.material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: THREE.VertexColors,
      });
    } else {
      this.material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER_SOURCE,
        fragmentShader: FRAGMENT_SHADER_SOURCE,
        transparent: true,
        uniforms: {'maxAmount': {value: 100000}}
      });
    }

    this.model = new THREE.Group();
  }

  dispose() {
    this.layers.forEach((layer) => {
      layer.dispose();
    });
    this.material.dispose();
  }

  getMaterial(): THREE.Material {
    return this.material;
  }

  /**
   * Draw a rectangle at a given layer on the model.
   */
  drawRectangle(layer: number, rectangle: Rectangle, color: number):
      RectangleUpdatePointer {
    const modelLayer = this.getLayer(layer);

    const topLeftVert = modelLayer.emitVertex(
        new THREE.Vector3(rectangle.x, rectangle.y, 0), color,
        new THREE.Vector3(-1, -1, -1));
    const topRightVert = modelLayer.emitVertex(
        new THREE.Vector3(rectangle.x + rectangle.w, rectangle.y, 0), color,
        new THREE.Vector3(1, -1, -1));
    const bottomLeftVert = modelLayer.emitVertex(
        new THREE.Vector3(rectangle.x, rectangle.y + rectangle.h, 0), color,
        new THREE.Vector3(-1, 1, -1));
    const bottomRightVert = modelLayer.emitVertex(
        new THREE.Vector3(
            rectangle.x + rectangle.w, rectangle.y + rectangle.h, 0),
        color, new THREE.Vector3(1, 1, -1));

    const updateIndex = modelLayer.emitRectangle(
        topLeftVert, topRightVert, bottomLeftVert, bottomRightVert);

    return {
      a: topLeftVert,
      b: topRightVert,
      c: bottomLeftVert,
      d: bottomRightVert
    };
  }

  updateVisitAmount(
      layer: number, rectUpdate: RectangleUpdatePointer, visitAmount: number,
      maxAmount: number) {
    const modelLayer = this.getLayer(layer);

    this.maxAmount = Math.max(maxAmount, this.maxAmount);

    this.layers.forEach((layer) => {
      layer.setMaxAmount(this.maxAmount);
    });

    modelLayer.updateGeometryVisitAmount(rectUpdate, visitAmount);
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

  debug() {
    console.groupCollapsed('MultiLayerModel');
    console.log('totalVertexes', this.getVertexCount());
    console.log('totalLayers', this.layers.length);
    this.layers.forEach((layer) => {
      layer.debug();
    });
    console.groupEnd();
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
    const configObject = Config.getInstance().getConfig();
    const newLayer = new BorderedRectangleModelLayer(
        this.material, layer, configObject.rendering.render_solid,
        configObject.rendering.render_borders,
        configObject.rendering.render_walls,
        configObject.quality.enable_lighting);
    this.model.add(newLayer.getRenderGroup());
    this.layers.push(newLayer);
  }
}
