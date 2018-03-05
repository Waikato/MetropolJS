import {EventEmitter} from 'events';

export class EventBus extends EventEmitter {
  constructor() {
    super();
  }
}