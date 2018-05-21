import * as estree from 'estree';
import {EventEmitter} from 'events';
import {DebugSource} from '../common';

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

export interface ScriptStackNotifyEvent {
  dbg: AbstractDebugger;

  scriptId: string;
  stack: estree.Node[];
}

export abstract class AbstractDebugger implements DebugSource {
  constructor() {}

  abstract async start(): Promise<never>;

  abstract getParsedScript(scriptId: string): estree.Program;

  abstract debug(): void;
}