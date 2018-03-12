import * as estree from 'estree';
import * as THREE from 'three';

import {Bag, clamp, countNodeChildren, Direction, getNodeChildren, Rectangle, RenderGroup} from '../common';
import {ScriptStepNotifyEvent} from '../debugger/AbstractDebugger';
import {EventBus} from '../EventBus';
import {ScriptColorMap} from '../ScriptColorMap';

import {MultiLayerModel} from './MultiLayerModel';
import {RenderTree} from './RenderTree';

interface RenderTask {
  node: estree.Node;
  treeNode: RenderTree;
  rect: Rectangle;
  layer: number;
}

export interface RenderScript {
  scriptId: string;
  program: estree.Program;
  tree: RenderTree|null;
  baseRectangle: Rectangle;
}

export class ScriptModel implements RenderGroup {
  private scriptList: RenderScript[] = [];

  private group: THREE.Group = new THREE.Group();

  private paddingScale = 0.01;

  private model: MultiLayerModel|null = null;

  private renderQueue: RenderTask[] = [];

  private loaded: boolean = false;

  /**
   * A structure mapping AST nodes to the position on the binary tree.
   */
  private nodeRenderMap: Map<estree.Node, RenderTree> = new Map();

  private eventQueue: ScriptStepNotifyEvent[] = [];

  private notifyListener: (ev: ScriptStepNotifyEvent) => void = () => {};

  private maxAmount = 0;

  constructor(private eventBus: EventBus, private colorMap: ScriptColorMap) {
    this.connectBus();
  }

  load(scriptList: RenderScript[]) {
    const renderStep = () => {
      if (this.renderQueue.length > 0) {
        this.renderAllTasks();
        setTimeout(renderStep, 10);
      } else {
        this.loaded = true;
        this.runQueuedEvents();
      }
    };

    this.model = new MultiLayerModel();

    this.group.add(this.model.getRenderGroup());

    scriptList.forEach((script) => {
      this.scriptList.push(script);

      const nodes = countNodeChildren(script.program);

      const rootRectangle = script.baseRectangle;

      script.tree = new RenderTree('Root', rootRectangle, 0);

      this.renderToCanvas(
          script.program, script.tree, getNodeChildren(script.program), nodes,
          0, rootRectangle);
    });

    renderStep();
  }

  fastRenderMergedTree(scriptList: RenderScript[]) {
    this.model = new MultiLayerModel();

    this.group.add(this.model.getRenderGroup());

    scriptList.forEach((script) => {
      this.scriptList.push(script);

      if (!script.tree) {
        throw new Error('Script does not have tree');
      }

      this.fastRenderToCanvas(script.tree);
    });

    this.loaded = true;
  }

  isLoaded() {
    return this.loaded;
  }

  isSingle() {
    return this.scriptList.length === 1;
  }

  getTree(): RenderTree {
    if (this.scriptList.length === 1) {
      const tree = this.scriptList[0].tree;
      if (!tree) {
        throw new Error('Tree not loaded');
      }
      return tree;
    } else {
      throw new Error('Multiple script are loaded.');
    }
  }

  getScripts() {
    return this.scriptList;
  }

  getRenderGroup(): THREE.Group {
    return this.group;
  }

  updateNode(node: RenderTree): void {
    if (!this.model || !this.colorMap) {
      return;
    }

    const pNode = node as RenderTree;
    if (pNode.updateIndex === null) {
      return;
    }

    this.model.updateVisitAmount(pNode.depth, pNode.updateIndex, node.count, this.maxAmount);
  }

  getTreeFromNode(node: estree.Node): RenderTree|null {
    return this.nodeRenderMap.get(node) || null;
  }

  dispose() {
    this.eventBus.removeListener('script.stepNotify', this.notifyListener);
    if (this.model) {
      this.model.dispose();
    }
  }

  getVertexCount(): number {
    if (!this.model) {
      return 0;
    }
    return this.model.getVertexCount();
  }

  debug() {
    console.groupCollapsed('ScriptModel');
    if (this.model) {
      console.log('vertexCount', this.model.getVertexCount());
      this.model.debug();
    }
    this.scriptList.forEach((scr) => {
      console.groupCollapsed('Script', scr.scriptId);
      console.log('totalNodeCount', countNodeChildren(scr.program));
      console.groupEnd();
    });
    console.groupEnd();
  }

  /**
   * The main rendering function. Given a node and a list of the children lay
   * them out and render them using Binary Space Partitioning.
   */
  private renderToCanvas(
      node: estree.Node, treeNode: RenderTree, children: estree.Node[],
      size: number, layer: number, rect: Rectangle) {
    if (!this.model) {
      return;
    }

    if (!this.colorMap) {
      throw new Error('No color map defined');
    }

    const count = children.length;

    if (count === 0) {
      console.log(
          'error', node, treeNode, getNodeChildren(node), children,
          countNodeChildren(node));
      throw new Error('Count == 0');
    }

    if (count === 1) {
      const currentNode = children[0];

      if (currentNode === null || currentNode === undefined) {
        return;
      }

      const paddingScale = this.getPaddingForNode(currentNode);

      const paddingX = clamp(rect.w * paddingScale, 0.001, 0.3);
      const paddingY = clamp(rect.h * paddingScale, 0.001, 0.3);

      const newRect = Object.assign({}, rect);

      newRect.x += paddingX;
      newRect.y += paddingY;
      newRect.w -= (paddingX * 2);
      newRect.h -= (paddingY * 2);

      treeNode.updateIndex = this.model.drawRectangle(
          layer, newRect,
          this.colorMap.getColorFromType(currentNode.type, layer));

      treeNode.type = currentNode.type;
      treeNode.location = newRect;
      treeNode.node = currentNode;
      treeNode.depth = layer;

      this.nodeRenderMap.set(currentNode, treeNode);

      this.addRenderTask(
          {node: currentNode, treeNode, layer: layer + 1, rect: newRect});
    } else {
      // Step 1: Split the Array in half
      const halfwayTarget = Math.round(size / 2);

      let currentTotal = 0;

      let halfwayPoint = 0;

      // If there are exactly 2 nodes then just set the half way point in the
      // exact middle and set the current total

      if (count === 2) {
        currentTotal = countNodeChildren(children[0]);
        halfwayPoint = 1;
      } else {
        let currentCount = count;
        while (currentTotal < halfwayTarget) {
          if (currentCount === 1) {
            break;
          }
          currentTotal += countNodeChildren(children[halfwayPoint]);
          halfwayPoint += 1;
          currentCount--;
        }
      }

      const dist = clamp(currentTotal / size, 0.01, 0.99);

      const splitOptions = this.splitRect(rect, dist);

      const splitRects = rect.w > rect.h ? splitOptions[0] : splitOptions[1];

      treeNode.a = new RenderTree(treeNode.type, splitRects[0], layer);

      this.renderToCanvas(
          node, treeNode.a, children.slice(0, halfwayPoint), currentTotal,
          layer, splitRects[0]);

      treeNode.b = new RenderTree(treeNode.type, splitRects[1], layer);

      this.renderToCanvas(
          node, treeNode.b, children.slice(halfwayPoint), size - currentTotal,
          layer, splitRects[1]);
    }
  }

  private fastRenderToCanvas(tree: RenderTree) {
    if (!this.model) {
      return;
    }

    if (tree.location && tree.node && tree.updateIndex !== null) {
      tree.updateIndex = this.model.drawRectangle(
          tree.depth, tree.location,
          this.colorMap.getColorFromType(tree.type, tree.depth));

      if (tree.count > 0) {
        this.updateNode(tree);
      }

      this.nodeRenderMap.set(tree.node, tree);
    }

    if (tree.a) {
      this.fastRenderToCanvas(tree.a);
    }

    if (tree.b) {
      this.fastRenderToCanvas(tree.b);
    }
  }

  private renderTaskToCanvas(task: RenderTask) {
    const children = getNodeChildren(task.node);
    if (children.length > 0) {
      this.renderToCanvas(
          task.node, task.treeNode, getNodeChildren(task.node),
          countNodeChildren(task.node), task.layer, task.rect);
    }
  }

  private runQueuedEvents() {
    this.eventQueue.forEach((ev) => {
      this.onStepNotify(ev);
    });

    this.eventQueue = [];
  }

  private addRenderTask(task: RenderTask) {
    this.renderQueue.push(task);
  }

  private renderAllTasks() {
    const oldQueue = this.renderQueue;
    this.renderQueue = [];
    oldQueue.forEach((task) => this.renderTaskToCanvas(task));
  }

  private connectBus() {
    this.notifyListener = (ev: ScriptStepNotifyEvent) => {
      if (!this.ownsScript(ev.scriptId)) {
        return;
      }
      if (this.loaded) {
        this.onStepNotify(ev);
      } else {
        this.eventQueue.push(ev);
      }
    };
    this.eventBus.addListener('script.stepNotify', this.notifyListener);
  }

  private ownsScript(scriptId: string) {
    return this.scriptList.filter((scr) => scr.scriptId === scriptId).length >
        0;
  }

  private onStepNotify(ev: ScriptStepNotifyEvent) {
    const node = this.getTreeFromNode(ev.node);
    if (node) {
      node.count += ev.count;
      this.maxAmount = Math.max(node.count, this.maxAmount);
      this.updateNode(node);
    }
  }

  /**
   * Split a rectangle down an axis at a given point.
   * Returns the 2 split rectangles.
   */
  private splitRectWithDirection(
      rect: Rectangle, dist: number, dir: Direction) {
    if (dir === Direction.X) {
      const point = rect.w * dist;
      const a: Rectangle = {x: rect.x, y: rect.y, w: point, h: rect.h};
      const b: Rectangle =
          {x: rect.x + point, y: rect.y, w: rect.w - point, h: rect.h};
      ''
      return [a, b];
    } else {
      const point = rect.h * dist;
      const a: Rectangle = {x: rect.x, y: rect.y, w: rect.w, h: point};
      const b: Rectangle =
          {x: rect.x, y: rect.y + point, w: rect.w, h: rect.h - point};
      return [a, b];
    }
  }

  /**
   * Split a rectangle in both directions with splitRectWithDirection.
   */
  private splitRect(rect: Rectangle, dist: number) {
    return [
      this.splitRectWithDirection(rect, dist, Direction.X),
      this.splitRectWithDirection(rect, dist, Direction.Y),
    ];
  }

  private getPaddingForNode(node: estree.Node) {
    if (node.type === 'FunctionDeclaration') {
      return this.paddingScale * 5;
    } else if (node.type === 'BlockStatement') {
      return this.paddingScale * 3;
    } else {
      return this.paddingScale;
    }
  }
}