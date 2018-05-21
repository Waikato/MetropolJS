import * as estree from 'estree';
import * as THREE from 'three';

import {Bag, clamp, countNodeChildren, Direction, getNodeChildren, MetropolJSNode, MetropolJSRootNode, Rectangle, RenderGroup} from '../common';
import {ScriptStackNotifyEvent, ScriptStepNotifyEvent} from '../debugger/AbstractDebugger';
import {EventBus} from '../EventBus';
import {OverlayRenderer} from '../OverlayRenderer';
import {ScriptColorMap} from '../ScriptColorMap';

import {MultiLayerModel} from './MultiLayerModel';
import {RenderTree} from './RenderTree';

interface RenderTask {
  node: MetropolJSNode;
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
  private nodeRenderMap: Map<MetropolJSNode, RenderTree> = new Map();

  private eventQueue: ScriptStepNotifyEvent[] = [];

  private notifyListener: (ev: ScriptStepNotifyEvent) => void = () => {};
  private stackListener: (ev: ScriptStackNotifyEvent) => void = () => {};

  private maxAmount = 0;

  private overlayRenderer: OverlayRenderer = new OverlayRenderer();

  constructor(private eventBus: EventBus, private colorMap: ScriptColorMap) {
    this.connectBus();

    this.group.add(this.overlayRenderer.getRenderGroup());
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

      const rootRectangle = script.baseRectangle;

      script.tree = new RenderTree('Root', rootRectangle, 0);

      const rootNode:
          MetropolJSRootNode = {type: 'Root', program: script.program};

      const nodes = countNodeChildren(rootNode);

      this.renderToCanvas(
          rootNode, script.tree, getNodeChildren(rootNode), nodes, 0,
          rootRectangle);
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

      this.validateTree(script.tree, 0);

      this.fastRenderToCanvas(script.tree);
    });

    // this.loaded = true;
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

    this.model.updateVisitAmount(
        pNode.depth, pNode.updateIndex, node.count, this.maxAmount);
  }

  getTreeFromNode(node: estree.Node): RenderTree|null {
    return this.nodeRenderMap.get(node) || null;
  }

  getNodeLocation(node: estree.Node): THREE.Vector2|null {
    const tree = this.nodeRenderMap.get(node);

    if (tree === undefined) {
      return null;
    }

    return tree.getCenter();
  }

  dispose() {
    this.eventBus.removeListener('script.stepNotify', this.notifyListener);
    this.eventBus.removeListener('script.stackNotify', this.stackListener);
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

  private drawTreeNode(tree: RenderTree) {
    if (!this.model) {
      throw new Error('Should not happen');
    }

    if (tree.updateIndex !== null) {
      tree.updateIndex =
          this.model.drawRectangle(tree.depth, tree.location, tree.color);

      if (tree.count > 0) {
        this.updateNode(tree);
      }

      if (tree.node) {
        this.nodeRenderMap.set(tree.node, tree);
      }
    }
  }

  /**
   * The main rendering function. Given a node and a list of the children lay
   * them out and render them using Binary Space Partitioning.
   */
  private renderToCanvas(
      node: MetropolJSNode, treeNode: RenderTree, children: MetropolJSNode[],
      size: number, depth: number, location: Rectangle) {
    if (!this.model) {
      throw new Error('Should not happen');
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
        throw new Error('currentNode is null|undefined');
      }

      const paddingScale = this.getPaddingForNode(currentNode);

      const paddingX = clamp(location.w * paddingScale, 0.001, 0.3);
      const paddingY = clamp(location.h * paddingScale, 0.001, 0.3);

      const newLocation = Object.assign({}, location);

      newLocation.x += paddingX;
      newLocation.y += paddingY;
      newLocation.w -= (paddingX * 2);
      newLocation.h -= (paddingY * 2);

      if (treeNode.updateIndex !== null) {
        console.error('Node already drawn', node);
        throw new Error('Node already drawn');
      }

      treeNode.type = currentNode.type;
      treeNode.color = this.colorMap.getColorFromType(treeNode.type, depth);
      treeNode.location = newLocation;
      treeNode.node = currentNode;
      treeNode.depth = depth;

      treeNode.updateIndex = {a: 0, b: 0, c: 0, d: 0};

      this.drawTreeNode(treeNode);

      const childCount = getNodeChildren(currentNode).length;

      if (childCount === 0) {
        return;
      } else if (childCount > 1) {
        this.addRenderTask(
            {node: currentNode, treeNode, layer: depth + 1, rect: newLocation});
      } else if (childCount === 1) {
        const newTreeNode = new RenderTree(treeNode.type, newLocation, depth);
        treeNode.a = newTreeNode;
        this.addRenderTask({
          node: currentNode,
          treeNode: newTreeNode,
          layer: depth + 1,
          rect: newLocation
        });
      }
    } else {
      // Update the current type of this treenode to the type of the node.
      treeNode.type = node.type;

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

      const splitOptions = this.splitRect(location, dist);

      const splitRects =
          location.w > location.h ? splitOptions[0] : splitOptions[1];

      treeNode.a = new RenderTree(treeNode.type, splitRects[0], depth);

      this.renderToCanvas(
          node, treeNode.a, children.slice(0, halfwayPoint), currentTotal,
          depth, splitRects[0]);

      treeNode.b = new RenderTree(treeNode.type, splitRects[1], depth);

      this.renderToCanvas(
          node, treeNode.b, children.slice(halfwayPoint), size - currentTotal,
          depth, splitRects[1]);
    }
  }

  private fastRenderToCanvas(tree: RenderTree) {
    if (!this.model) {
      throw new Error('Should not happen');
    }

    this.drawTreeNode(tree);

    if (tree.a !== null) {
      this.fastRenderToCanvas(tree.a);
    }

    if (tree.b !== null) {
      this.fastRenderToCanvas(tree.b);
    }
  }

  private validateTree(tree: RenderTree, depth: number) {
    if (tree.depth !== depth) {
      console.error('depth validation failed', tree, depth);
      throw new Error(`Tree Validation Failed tree.depth{${
          tree.depth}} !== depth{${depth}}`);
    }

    if (tree.updateIndex) {
      depth += 1;
      if (tree.color === undefined || tree.color === null || tree.color < 0 ||
          tree.color > 1) {
        console.error('color validation failed', tree, depth);
        throw new Error(`Tree Validation Failed tree.color{${tree.color}}`);
      }
    }

    if (tree.a !== null) {
      this.validateTree(tree.a, depth);
    }

    if (tree.b !== null) {
      this.validateTree(tree.b, depth);
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

    this.stackListener = (ev: ScriptStackNotifyEvent) => {
      if (!this.ownsScript(ev.scriptId)) {
        return;
      }
      if (this.loaded) {
        this.onStackNotify(ev);
      }
    };
    this.eventBus.addListener('script.stackNotify', this.stackListener);
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

  private onStackNotify(ev: ScriptStackNotifyEvent) {
    const points = ev.stack.map((node) => this.getNodeLocation(node))
                       .filter((point) => (point !== null)) as THREE.Vector2[];

    this.overlayRenderer.renderLine(points);
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

  private getPaddingForNode(node: MetropolJSNode) {
    if (node.type === 'FunctionDeclaration') {
      return this.paddingScale * 5;
    } else if (node.type === 'BlockStatement') {
      return this.paddingScale * 3;
    } else {
      return this.paddingScale;
    }
  }
}