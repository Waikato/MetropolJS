// tslint:disable:no-any

import Crdp from 'chrome-remote-debug-protocol';
import * as esprima from 'esprima'
import * as estree from 'estree';
import {Client, LikeSocket} from 'noice-json-rpc';

import {Bag, expect, getNodeChildren} from '../common';
import {EventBus} from '../EventBus';

import {AbstractDebugger, ScriptLoadedEvent, ScriptStepNotifyEvent} from './AbstractDebugger';

function createWebsocket(websocketUrl: string): LikeSocket {
  let websocket: WebSocket = new (require('isomorphic-ws'))(websocketUrl);

  const websocketProxy: LikeSocket = {
    on: (ev, cb) => {
      websocket.addEventListener(ev, (ret) => {
        if (ev === 'message') {
          cb((ret as MessageEvent).data);
        } else {
          cb(ret);
        }
      });
    },
    removeListener: (ev, cb) => {
      websocket.removeEventListener(ev, (ret) => {
        cb(ret);
      });
    },
    send: (msg) => {
      websocket.send(msg);
    }
  };
  return websocketProxy;
}

interface V8Script {
  id: string;
  name: string;

  source: string|null;
  program: estree.Program|null;

  loaded: Promise<void>;
}

interface CoverageRange {
  startLineNumber?: number;
  startColumnNumber?: number;

  endLineNumber?: number;
  endColumnNumber?: number;

  startOffset?: number;
  endOffset?: number;

  count: number;
}

export class V8Debugger extends AbstractDebugger {
  private api: Crdp.CrdpClient|null = null;
  private client: Client|null = null;

  private scripts: V8Script[] = [];

  private notifiedSteps = 0;

  constructor(private eventBus: EventBus) {
    super();
  }

  async connect(target: string): Promise<void> {
    this.client = new Client(createWebsocket(target), {});

    this.api = this.client.api();

    if (!this.api) {
      throw new Error('Could not create API proxy');
    }

    await (this.api.Debugger.enable || expect)();

    await (this.api.Profiler.enable || expect)();

    // This should work fine
    await (this.api.Profiler.startPreciseCoverage || expect)(
        {detailed: true, callCount: true} as any);
  }

  async step() {
    if (!this.api) {
      return;
    }

    const results = await (this.api.Profiler.takePreciseCoverage || expect)();

    results.result.forEach((scriptCoverage) => {
      this.getScript(scriptCoverage.scriptId, scriptCoverage.url)
          .then(async (script) => {
            if (!script.program) {
              await script.loaded;
            }

            scriptCoverage.functions.forEach((functionCoverage) => {
              functionCoverage.ranges.forEach((functionRange) => {
                if (!script.program) {
                  throw new Error('Should not happen');
                }

                this.notifyStep(
                    scriptCoverage.scriptId, script.program,
                    (functionRange as any) as CoverageRange);
              });
            });
          });
    });
  }

  async start(): Promise<never> {
    setInterval(() => {
      console.log('notified steps', this.notifiedSteps);
      this.notifiedSteps = 0;
    }, 1000);

    while (true) {
      await this.step();
    }
  }

  getParsedScript(scriptId: string): estree.Program {
    const candidates = this.scripts.filter((scr) => scr.id == scriptId);

    if (candidates[0]) {
      return candidates[0].program || expect();
    } else {
      throw new Error('Script Not loaded');
    }
  }

  private notifyStep(
      scriptId: string, program: estree.Program,
      range: CoverageRange): boolean {
    if (range.count === 0) {
      return false;
    }

    let node: estree.Node|null = null;

    if (range.startLineNumber !== undefined &&
        range.endLineNumber !== undefined &&
        range.startColumnNumber !== undefined &&
        range.endColumnNumber !== undefined) {
      node = this.resolveNodeFromLocation(
          program, range.startLineNumber + 1, range.startColumnNumber,
          range.endLineNumber + 1, range.endColumnNumber);
    } else if (
        range.startOffset !== undefined && range.endOffset !== undefined) {
      node = this.resolveNodeFromRange(
          program, range.startOffset, range.endOffset);
    }

    if (node === null || node.type === 'Program') {
      return false;
    } else {
      this.eventBus.emit(
          'script.stepNotify',
          {dbg: this, scriptId, node, count: range.count} as
              ScriptStepNotifyEvent);
      this.notifiedSteps += 1;
      return true;
    }
  }

  private resolveNodeFromRange(node: estree.Node, start: number, end: number):
      estree.Node|null {
    // Chrome dev 66 does not support location information in coverage yet. It's
    // in node but not chrome. This function will resolve using range instead.

    if (!node.range) {
      return null;
    }

    const nodeStart = node.range[0];
    const nodeEnd = node.range[1];

    if (nodeStart === start && nodeEnd === end) {
      return node;
    }

    if (!(start >= nodeStart && end <= nodeEnd)) {
      return null;
    }

    const children = getNodeChildren(node);

    for (let i = 0; i < children.length; i++) {
      const resolvedNode = this.resolveNodeFromRange(children[i], start, end);
      if (resolvedNode !== null) {
        return resolvedNode;
      }
    }

    return node;
  }

  private resolveNodeFromLocation(
      node: estree.Node, startLine: number, startCol: number, endLine: number,
      endCol: number): estree.Node|null {
    if (!node.loc) {
      return null;
    }

    if (startLine == node.loc.start.line && startCol == node.loc.start.column &&
        endLine === node.loc.end.line && endCol == node.loc.end.column) {
      return node;
    }

    if (!(startLine >= node.loc.start.line && endLine <= node.loc.end.line)) {
      return null;
    }

    const children = getNodeChildren(node);

    for (let i = 0; i < children.length; i++) {
      const resolvedNode = this.resolveNodeFromLocation(
          children[i], startLine, startCol, endLine, endCol);
      if (resolvedNode !== null) {
        return resolvedNode;
      }
    }

    return node;
  }

  private async loadScript(scriptId: string, scriptUrl: string): Promise<void> {
    if (!this.api) {
      throw new Error('onScriptParsed called without an initialized API Proxy');
    }

    let loadComplete: () => void = () => {};

    const newScript: V8Script = {
      id: scriptId,
      name: scriptUrl,
      source: null,
      program: null,
      loaded: new Promise((resolve, reject) => {
        loadComplete = resolve;
      })
    };

    this.scripts.push(newScript);

    const scriptSource = await (this.api.Debugger.getScriptSource || expect)(
        {scriptId: scriptId});

    const program = esprima.parseScript(
        scriptSource.scriptSource, {loc: true, range: true});

    newScript.source = scriptSource.scriptSource;
    newScript.program = program;

    loadComplete();

    this.eventBus.emit(
        'script.loaded', {dbg: this, scriptId, program} as ScriptLoadedEvent);
  }

  private async getScript(scriptId: string, scriptUrl: string):
      Promise<V8Script> {
    const candidates = this.scripts.filter((scr) => scr.id == scriptId);

    if (candidates[0]) {
      return candidates[0];
    } else {
      await this.loadScript(scriptId, scriptUrl);
      return await this.getScript(scriptId, scriptUrl);
    }
  }
}

async function nodeMain(args: string[]): Promise<number> {
  const newEventBus = new EventBus();

  newEventBus.addListener('script.loaded', (scr: ScriptLoadedEvent) => {
    console.log(scr);
  });

  newEventBus.addListener(
      'script.stepNotify', (step: ScriptStepNotifyEvent) => {
        console.log(step.node.type, step.count);
      });

  const dbg = new V8Debugger(newEventBus);

  await dbg.connect(process.argv[2]);

  await dbg.start();

  return 0;
}

if (process && process.mainModule === module) {
  nodeMain(process.argv)
      .then((err) => {
        process.exit(err);
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
}