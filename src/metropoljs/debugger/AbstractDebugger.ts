import * as estree from 'estree';
import {EventEmitter} from 'events';

export interface ScriptLoadedEvent {
  dbg: AbstractDebugger;

  scriptId: string;
  program: estree.Program;
}

export interface ScriptStepNotifyEvent {
  dbg: AbstractDebugger;

  scriptId: string;
  node: estree.Node;
  count: number;
}

export abstract class AbstractDebugger {
  constructor() {}

  abstract async start(): Promise<never>;

  abstract getParsedScript(scriptId: string): estree.Program;
}