// tslint:disable:no-any

require('babel-core/register');
require('babel-polyfill');

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

  const configObject = Config.getInstance().getConfig();

  if (configObject.debugger.type === 'v8') {
    metropolJS.connect('v8', configObject.debugger.connect);
  } else if (configObject.debugger.type === 'interpreter') {
    metropolJS.connect('interpreter', configObject.debugger.connect);
  } else {
    throw new Error('Debugger type not found');
  }
}

function loadDefaultConfig() {
  onLoadedConfig();
}

(window as any).loadMetropolJSConfig = function(obj: any) {
  Config.getInstance().setConfig(obj);
  onLoadedConfig();
};

(window as any).metropolJSDebug = function() {
  if (!metropolJS) {
    throw new Error('Not initialized');
  }
  metropolJS.debug();
};

document.addEventListener('DOMContentLoaded', () => {
  console.log('Loading Config');
  fetch('/dist/config.js')
      .then((resp) => {
        if (resp.status === 404) {
        console.error('loading default config');
        loadDefaultConfig();
        return "";
        }
        return resp.text()
      })
      .then((config) => {
        eval(config);
      })
      .catch((err) => {
        console.error(err, 'loading default config');
        loadDefaultConfig();
      });
});