import {RenderGroup} from './common';
import {AbstractDebugger} from './debugger/AbstractDebugger';
import {V8Debugger} from './debugger/V8Debugger';
import {EventBus} from './EventBus';
import {ScriptGroup} from './script/ScriptGroup';

/**
 * A debugging session. Contains a reference to a ScriptGroup and
 * owns the Debugger instance.
 */
export class MetropolJSSession implements RenderGroup {
  private debugInstance: AbstractDebugger|null = null;
  private scriptGroup: ScriptGroup;

  constructor(private eventBus: EventBus) {
    this.scriptGroup = new ScriptGroup(this.eventBus);
  }

  getRenderGroup(): THREE.Group {
    return this.scriptGroup.getRenderGroup();
  }

  async connectDebugger(target: string) {
    if (target.startsWith('v8://')) {
      const newDebugger = new V8Debugger(this.eventBus);

      this.debugInstance = newDebugger;

      await newDebugger.connect(target.slice(5));

      // Just leave running
      newDebugger.start();

      this.scriptGroup.connectBus();
    } else {
      throw new Error('Debugger connection string not recognized');
    }
  }
}