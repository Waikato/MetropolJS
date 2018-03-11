import * as estree from 'estree';

declare class Interpreter {
  constructor(code: estree.Program|string, opt_initFunc?: () => void);

  step(): boolean;
  run(): boolean;

  getCurrentNode(depth?: number): estree.Node|null;
  getAllNodes(): Array<estree.Node|null>;

  setEventCallback(cb: (name: string, ...args: any[]) => void): void;
}