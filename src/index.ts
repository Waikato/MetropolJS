// tslint:disable:no-any

import {Config} from './metropoljs/Config';
import {MetropolJSElement} from './metropoljs/MetropolJSElement';

let metropolJS: MetropolJSElement|null = null;

function onLoadedConfig() {
  const mainElement = document.querySelector('#main') as HTMLDivElement;

  if (!mainElement) {
    throw new Error('Could not find main element');
  }

  metropolJS = new MetropolJSElement(document);

  metropolJS.attachTo(mainElement);

  if (Config.getInstance().getConfig().debugger.type === 'v8') {
    metropolJS.connect(
        'v8://' + Config.getInstance().getConfig().debugger.connect);
  } else {
    throw new Error('Debugger type not found');
  }
}

(window as any).loadMetropolJSConfig = function(obj: any) {
  Config.getInstance().setConfig(obj);
  onLoadedConfig();
};

document.addEventListener('DOMContentLoaded', () => {
  console.log('Loading Config');
  fetch('/dist/config.js').then((resp) => resp.text()).then((config) => {
    eval(config);
  });
});