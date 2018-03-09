import {EventEmitter} from 'events';
import {DebugSource} from './common';

export class EventBus extends EventEmitter implements DebugSource {
  constructor() {
    super();
  }

  debug(): void {
    console.groupCollapsed('EventBus');
    console.groupEnd();
  }
}