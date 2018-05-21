import * as acorn from 'acorn';
import * as estree from 'estree';

import {EventBus} from '../EventBus';

import {AbstractDebugger, ScriptLoadedEvent, ScriptStackNotifyEvent, ScriptStepNotifyEvent} from './AbstractDebugger';
import {Interpreter} from './interpreter/interpreter';

interface InterpreterScript {
  name: string;
  text: string;
}

const BUILTIN_SCRIPTS: InterpreterScript[] = [
  {
    name: 'jQuery',
    text: require('fs').readFileSync(
        __dirname + '/interpreter/interpreter_data/jquery-3.2.1.min.js', 'utf8')
  },
  {
    name: 'lodash',
    text: require('fs').readFileSync(
        __dirname + '/interpreter/interpreter_data/lodash.min.js', 'utf8')
  },
  {
    name: 'moment',
    text: require('fs').readFileSync(
        __dirname + '/interpreter/interpreter_data/moment.min.js', 'utf8')
  },
  {
    name: 'underscore',
    text: require('fs').readFileSync(
        __dirname + '/interpreter/interpreter_data/underscore.min.js', 'utf8')
  },
  {
    name: 'underscore_test',
    text: require('fs').readFileSync(
        __dirname + '/interpreter/interpreter_data/underscore_test.js', 'utf8')
  },
  {
    name: 'richards',
    text: require('fs').readFileSync(
        __dirname + '/interpreter/interpreter_data/richards.js', 'utf8')
  }
];

export class InterpreterDebugger extends AbstractDebugger {
  private interpreter: Interpreter|null = null;

  private loadedProgram: estree.Program|null = null;

  constructor(private eventBus: EventBus) {
    super();
  }

  async connect(scriptName: string): Promise<void> {
    const candidateBuiltinScripts =
        BUILTIN_SCRIPTS.filter((scr) => scr.name === scriptName);

    if (candidateBuiltinScripts.length === 0) {
      throw new Error(`Script with name ${scriptName} not found.`);
    }

    const source = candidateBuiltinScripts[0].text;

    const program = acorn.parse(source, {ecmaVersion: 6, locations: true});

    this.loadedProgram = program;

    this.interpreter = new Interpreter(program);

    this.interpreter.setEventCallback((name, ...args) => {
      this.eventBus.emit(`interpreter.${name}`, ...args);
    });

    this.eventBus.emit(
        'script.parsed',
        {dbg: this, program: this.loadedProgram, scriptId: '0'} as
            ScriptLoadedEvent);
  }

  async start(): Promise<never> {
    const stepFunction = () => {
      if (!this.interpreter) {
        return;
      }

      if (!this.interpreter.step()) {
        return;
      }

      const currentNode = this.interpreter.getCurrentNode();

      this.eventBus.emit(
          'script.stepNotify',
          {dbg: this, scriptId: '0', node: currentNode, count: 1} as
              ScriptStepNotifyEvent);

      const currentStack = this.interpreter.getAllNodes();

      this.eventBus.emit(
          'script.stackNotify',
          {dbg: this, scriptId: '0', stack: currentStack} as
              ScriptStackNotifyEvent);

      setImmediate(stepFunction.bind(this));
    };

    stepFunction();

    // Don't return ever.
    while (true) {
      await new Promise(() => {});
    }
  }

  getParsedScript(scriptId: string): estree.Program {
    if (scriptId != '0') {
      throw new Error('Script not Found');
    }

    if (this.loadedProgram === null) {
      throw new Error('No script loaded');
    }

    return this.loadedProgram;
  }

  debug(): void {
    console.groupCollapsed('InterpreterDebugger');
    console.groupEnd();
  }
}