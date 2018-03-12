import * as THREE from 'three';

import {Bag, DebugSource} from './common';

export enum RendererColors {
  Rainbow,
  XRay,
  Random,
  Grey
}

// const defaultColorMap: Bag<string> = {
//   'ExpressionStatement': 0,
//   'undefined': '000000',
//   'Literal': '161c1a',
//   'FunctionExpression': '161c1a',
//   'Identifier': '2d3834',
//   'BlockStatement': '2d3834',
//   'FunctionDeclaration': '44544f',
//   'VariableDeclaration': '44544f',
//   'IfStatement': '44544f',
//   'ClassDeclaration': '44544f',
//   'VariableDeclarator': '5b7069',
//   'AssignmentExpression': '5b7069',
//   'MemberExpression': '5b7069',
//   'CallExpression': '5b7069',
//   'ClassBody': '5b7069',
//   'RestElement': '5b7069',
//   'UnaryExpression': '5b7069',
//   'ForOfStatement': '728c83',
//   'ReturnStatement': '728c83',
//   'ForStatement': '728c83',
//   'TryStatement': '728c83',
//   'ObjectExpression': '728c83',
//   'ArrayExpression': '728c83',
//   'WhileStatement': '728c83',
//   'ArrowFunctionExpression': '728c83',
//   'ObjectPattern': '728c83',
//   'MethodDefinition': '728c83',
//   'BinaryExpression': '728c83',
//   'LogicalExpression': '728c83',
//   'ConditionalExpression': '728c83',
//   'SwitchStatement': '728c83',
//   'ThrowStatement': '728c83',
//   'ForInStatement': '728c83',
//   'NewExpression': '728c83',
//   'TemplateLiteral': '728c83',
//   'UpdateExpression': '8ea39c',
//   'Property': '8ea39c',
//   'SequenceExpression': '8ea39c',
//   'CatchClause': '5b7069',
//   'SwitchCase': '8ea39c',
//   'ClassExpression': '8ea39c',
//   'TemplateElement': '8ea39c',
//   'ThisExpression': 'aabab5',
//   'ArrayPattern': 'aabab5',
//   'BreakStatement': 'aabab5',
//   'AssignmentPattern': 'aabab5',
//   'DoWhileStatement': 'aabab5',
//   'ContinueStatement': 'c6d1cd',
//   'EmptyStatement': '8ea39c',
//   'MetaProperty': 'c6d1cd',
//   'Super': 'ffffff',
//   'SpreadElement': 'ffffff'
// };

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
    // Object.keys(defaultColorMap).forEach((key) => {
    //   this.colorMap.set(key, new THREE.Color('#' + defaultColorMap[key]));
    // });
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