import * as THREE from 'three';

import {Bag, DebugSource} from './common';

export enum RendererColors {
  Rainbow,
  XRay,
  Random,
  Grey
}

const defaultColorMap: Bag<number> = {
  'Program': 0.00,
  'ExpressionStatement': 0.01,
  'VariableDeclaration': 0.02,
  'IfStatement': 0.03,
  'EmptyStatement': 0.04,
  'CallExpression': 0.05,
  'AssignmentExpression': 0.06,
  'VariableDeclarator': 0.07,
  'BinaryExpression': 0.08,
  'BlockStatement': 0.09,
  'TryStatement': 0.10,
  'FunctionExpression': 0.11,
  'MemberExpression': 0.12,
  'ThisExpression': 0.13,
  'ObjectExpression': 0.14,
  'Identifier': 0.40,
  'Literal': 0.50,
  'CatchClause': 0.17,
  'LogicalExpression': 0.18,
  'LabeledStatement': 0.19,
  'ReturnStatement': 0.20,
  'ConditionalExpression': 0.21,
  'UnaryExpression': 0.22,
  'UpdateExpression': 0.23,
  'FunctionDeclaration': 0.24,
  'ArrayExpression': 0.25,
  'NewExpression': 0.26,
  'SequenceExpression': 0.27,
  'Property': 0.28,
  'ForStatement': 0.29,
  'ForInStatement': 0.30,
  'SwitchStatement': 0.31,
  'ThrowStatement': 0.32,
  'DoWhileStatement': 0.33,
  'SwitchCase': 0.34,
  'BreakStatement': 0.35,
  'ContinueStatement': 0.36
};

export class ScriptColorMap implements DebugSource {
  /**
   * A map to convert a node type into a color.
   */
  private colorMap: Map<string, number> = new Map();

  /**
   * The color scheme to use for rendering.
   */
  private currentColors: RendererColors = RendererColors.XRay;

  constructor() {
    Object.keys(defaultColorMap).forEach((key) => {
      this.colorMap.set(key, defaultColorMap[key]);
    });
  }

  /**
   * Get the current color scheme being used.
   */
  getColorMap(): Bag<number> {
    const ret: Bag<number> = {};
    this.colorMap.forEach((value, key) => {
      ret[key] = value;
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
  getColorFromType(typeName: string, layer: number): number {
    if (typeName === undefined) {
      throw new Error('Attempt to get color for undefined type');
    }
    if (!this.colorMap.has(typeName)) {
      this.colorMap.set(typeName, this.getColor(layer));
    }
    return this.colorMap.get(typeName) || 1.0;
  }

  debug() {
    console.groupCollapsed('ScriptColorMap');
    console.log('colorMap', this.getColorMap());
    console.groupEnd();
  }

  /**
   * Get the color of a node given which layer it's on.
   */
  private getColor(layer: number): number {
    return layer / 100;
  }
}