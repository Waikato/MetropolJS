import * as esprima from 'esprima';
import {readFileSync, writeFileSync} from 'fs';
import {Vector3} from 'three';

import {Rectangle} from '../common';
import {EventBus} from '../EventBus';
import {RenderTree} from '../script/RenderTree';
import {RenderScript, ScriptModel} from '../script/ScriptModel';
import {ScriptColorMap} from '../ScriptColorMap';

import {STLFile} from './STLFile';

interface FlatTree {
  depth: number;
  rect: Rectangle;
  baseRect: Rectangle|null;
}

/**
 * # Explanation
 * Current STL exporting is different from exporting in the previous codebase.
 * Rather then exporting geometry from each layer the goal is to produce an
 * airtight mesh suitable for computer graphics or 3D printing.
 */
export class STLExport {
  static exportModel(model: ScriptModel): STLFile {
    const file = new STLFile();

    const baseLayer = model.getTree();

    const flatTree = this.flattenTree(baseLayer, null);

    for (const tree of flatTree) {
      this.exportLayer(file, tree);
    }

    // Create base on model

    this.addBaseLayer(file, baseLayer.getLocation());

    return file;
  }

  private static exportLayer(file: STLFile, tree: FlatTree) {
    // Inner rectangle on current layer.
    const [a0, a1, a2, a3] =
        this.rectangleToVertexes(tree.rect, this.getZ(tree.depth));

    if (tree.baseRect !== null) {
      // Inner rectangle on previous layer.
      const [b0, b1, b2, b3] =
          this.rectangleToVertexes(tree.rect, this.getZ(tree.depth - 1));

      // Base rectangle on previous layer.
      const [c0, c1, c2, c3] =
          this.rectangleToVertexes(tree.baseRect, this.getZ(tree.depth - 1));

      // Inner ring rectangles

      // Front
      file.addRectangle(a1, a0, b1, b0, new Vector3(0, 1, 0));
      // Back
      file.addRectangle(a2, a3, b2, b3, new Vector3(0, -1, 0));
      // Left
      file.addRectangle(a0, a2, b0, b2, new Vector3(-1, 0, 0));
      // Right
      file.addRectangle(a3, a1, b3, b1, new Vector3(1, 0, 0));

      // Outer ring rectangles

      // Front
      file.addRectangle(b1, b0, c1, c0, new Vector3(0, 0, 1));
      // Back
      file.addRectangle(b2, b3, c2, c3, new Vector3(0, 0, 1));
      // Left
      file.addRectangle(b0, b2, c0, c2, new Vector3(0, 0, 1));
      // Right
      file.addRectangle(b3, b1, c3, c1, new Vector3(0, 0, 1));

    } else {
      file.addRectangle(a0, a1, a2, a3, new Vector3(0, 0, 1));
    }
  }

  private static addBaseLayer(file: STLFile, rect: Rectangle) {
    const [a0, a1, a2, a3] = this.rectangleToVertexes(rect, this.getZ(0));
    const [b0, b1, b2, b3] = this.rectangleToVertexes(rect, this.getZ(-1));

    // Front
    file.addRectangle(a0, a1, b0, b1, new Vector3(1, 0, 0));
    // Back
    file.addRectangle(a2, a3, b2, b3, new Vector3(-1, 0, 0));
    // Left
    file.addRectangle(a0, a2, b0, b2, new Vector3(0, -1, 0));
    // Right
    file.addRectangle(a1, a3, b1, b3, new Vector3(0, 1, 0));

    // Bottom
    file.addRectangle(b3, b2, b1, b0, new Vector3(0, 0, -1));
  }

  private static getZ(depth: number) {
    return depth * 0.1;
  }

  private static flattenTree(tree: RenderTree, parent: RenderTree|null):
      FlatTree[] {
    let ret: FlatTree[] = [];

    if (parent !== null && this.isDrawn(tree)) {
      const leafNode = (tree.a === null && tree.b === null);
      if (leafNode) {
        ret.push(
            {depth: tree.depth - 1, rect: tree.baseRectangle, baseRect: null});
      } else {
        ret.push({
          depth: tree.depth,
          rect: tree.location,
          baseRect: tree.baseRectangle
        });
      }
    }

    if (tree.a !== null) {
      ret = ret.concat(this.flattenTree(tree.a, tree));
    }

    if (tree.b !== null) {
      ret = ret.concat(this.flattenTree(tree.b, tree));
    }

    return ret;
  }

  private static isDrawn(tree: RenderTree): boolean {
    return tree.updateIndex !== null;
  }

  private static rectangleToVertexes(rect: Rectangle, height: number):
      [Vector3, Vector3, Vector3, Vector3] {
    return [
      new Vector3(rect.x, rect.y, height),
      new Vector3(rect.x + rect.w, rect.y, height),
      new Vector3(rect.x, rect.y + rect.h, height),
      new Vector3(rect.x + rect.w, rect.y + rect.h, height)
    ];
  }
}

function printTree(tree: RenderTree) {
  let s = '';

  for (let i = 0; i < tree.depth; i++) {
    s += '  ';
  }

  s += `render=${tree.updateIndex !== null ? 'true ' : 'false'} type=${
      tree.type}`;

  console.log(s);

  if (tree.a !== null) {
    printTree(tree.a);
  }

  if (tree.b !== null) {
    printTree(tree.b);
  }
}

function main(args: string[]) {
  const eventBus = new EventBus();
  const colorMap = new ScriptColorMap();

  const model = new ScriptModel(eventBus, colorMap);

  const sourceContent = readFileSync(args[2], 'utf8');

  console.log(new Date().toISOString(), 'Parsing script');

  const program = esprima.parseScript(sourceContent);

  console.log(new Date().toISOString(), 'Finished parsing');

  const modelScript: RenderScript = {
    scriptId: '0',
    tree: null,
    baseRectangle: {x: -20, y: -20, w: 40, h: 40},
    program: program
  };

  console.log(new Date().toISOString(), 'Loading script');

  model.load([modelScript], true);

  console.log(new Date().toISOString(), 'Finished loading');

  console.log(new Date().toISOString(), 'Exporting model');

  const stlFile = STLExport.exportModel(model);

  console.log(new Date().toISOString(), 'Finished exporting');

  // printTree(model.getTree());

  console.log(new Date().toISOString(), 'Saving model');

  writeFileSync('out.stl', stlFile.export());

  console.log(new Date().toISOString(), 'Finished saving');
}

if (process.mainModule === module) {
  main(process.argv);
}