import * as estree from 'estree';
import * as THREE from 'three';

import {countNodeChildren, DebugSource, expect, RenderGroup} from '../common';
import {Config} from '../Config';
import {ScriptLoadedEvent, ScriptStepNotifyEvent} from '../debugger/AbstractDebugger';
import {EventBus} from '../EventBus';
import {ScriptColorMap} from '../ScriptColorMap';

import {ScriptLayout} from './ScriptLayout';
import {RenderScript, ScriptModel} from './ScriptModel';

export class ScriptGroup implements RenderGroup, DebugSource {
  private loadedScripts: Map<string, ScriptModel> = new Map();

  private group: THREE.Group = new THREE.Group();

  private loadedScriptCount = 0;

  private layout: ScriptLayout = new ScriptLayout();

  private colorMap: ScriptColorMap = new ScriptColorMap();

  constructor(private eventBus: EventBus) {
    setInterval(() => {
      this.mergeScripts();
    }, 5000);

    if (Config.getInstance().getConfig().rendering['3d_mode']) {
      this.group.rotation.x = -(Math.PI / 2);
    }
  }

  connectBus() {
    // console.log('ScriptGroup', 'connectBus');

    this.eventBus.addListener('script.loaded', (ev: ScriptLoadedEvent) => {
      this.onScriptLoaded(ev);
    });

    this.eventBus.addListener(
        'script.stepNotify', (ev: ScriptStepNotifyEvent) => {
          this.onStepNotify(ev);
        });
  }

  getRenderGroup(): THREE.Group {
    return this.group;
  }

  getVertexCount() {
    let total = 0;
    const uniqueScripts: Set<ScriptModel> = new Set();
    this.loadedScripts.forEach((scr) => {
      if (!uniqueScripts.has(scr)) {
        total += scr.getVertexCount();
        uniqueScripts.add(scr);
      }
    });
    return total;
  }

  debug(): void {
    console.groupCollapsed('ScriptGroup');
    console.log('loadedScriptCount', this.loadedScriptCount);
    console.log('totalVertexCount', this.getVertexCount());
    this.colorMap.debug();
    const uniqueScripts: Set<ScriptModel> = new Set();
    this.loadedScripts.forEach((scr) => {
      if (!uniqueScripts.has(scr)) {
        scr.debug();
        uniqueScripts.add(scr);
      }
    });
    console.groupEnd();
  }

  private onScriptLoaded(ev: ScriptLoadedEvent) {
    this.addScript(ev.scriptId, ev.program);
  }

  private onStepNotify(ev: ScriptStepNotifyEvent) {
    if (!this.loadedScripts.has(ev.scriptId)) {
      this.addScript(ev.scriptId, ev.dbg.getParsedScript(ev.scriptId));
    }

    const model = this.loadedScripts.get(ev.scriptId) || expect();

    const tree = model.getTreeFromNode(ev.node);

    if (!tree) {
      return;
    }

    const offset = model.getRenderGroup().position;

    const position = new THREE.Vector2()
                         .copy(tree.getCenter())
                         .add(new THREE.Vector2(offset.x, offset.y));

    this.eventBus.emit('script.newPOI', {position});
  }

  private addScript(scriptId: string, program: estree.Program) {
    // console.log('ScriptGroup', 'addScript', scriptId);

    const scriptSize = countNodeChildren(program);

    const nodeLevel = this.layout.getNodeDimension(scriptSize);

    const nodeSize = this.layout.getNodeSize(nodeLevel);

    const pos = this.layout.getNodePosition(nodeLevel);

    const newModel = new ScriptModel(this.eventBus, this.colorMap);

    newModel.load([{
      program,
      scriptId,
      tree: null,
      baseRectangle: {
        x: pos.x - (nodeSize / 2),
        y: pos.y - (nodeSize / 2),
        w: nodeSize,
        h: nodeSize
      }
    }]);

    this.loadedScripts.set(scriptId, newModel);

    const newGroup = newModel.getRenderGroup();

    this.loadedScriptCount += 1;

    this.group.add(newGroup);
  }

  private mergeScripts() {
    const scripts: RenderScript[] = [];

    this.loadedScripts.forEach((script, scriptId) => {
      if (script.isLoaded() && script.isSingle()) {
        this.group.remove(script.getRenderGroup());

        scripts.push(...script.getScripts());

        script.dispose();
      }
    });

    scripts.forEach((script) => {
      this.loadedScripts.delete(script.scriptId);
    });

    const newModel = new ScriptModel(this.eventBus, this.colorMap);

    newModel.fastRenderMergedTree(scripts);

    scripts.forEach((script) => {
      this.loadedScripts.set(script.scriptId, newModel);
    });

    const newGroup = newModel.getRenderGroup();

    this.group.add(newGroup);
  }
}