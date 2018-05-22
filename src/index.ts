// tslint:disable:no-any

require('babel-core/register');
require('babel-polyfill');

import {Config} from './metropoljs/Config';
import {MetropolJSElement} from './metropoljs/MetropolJSElement';
import {ScriptLoadedEvent, DebuggerConnectedEvent} from './metropoljs/debugger/AbstractDebugger';
import {expect} from './metropoljs/common';

let metropolJS: MetropolJSElement|null = null;

function onLoadedConfig() {
  const mainElement = document.querySelector('#main') as HTMLDivElement;

  if (!mainElement) {
    throw new Error('Could not find main element');
  }

  metropolJS = new MetropolJSElement(document);

  metropolJS.getEventBus().addListener(
      'script.loaded', (ev: ScriptLoadedEvent) => {
        const loadedScriptList =
            document.querySelector('#loadedScriptList') || expect();
        const newElement = document.createElement('li');
        newElement.innerText = ev.filename;
        loadedScriptList.appendChild(newElement);
      });

  metropolJS.getEventBus().addListener(
      'debugger.connected', (ev: DebuggerConnectedEvent) => {
        if (ev.type === 'v8') {
          return;
        }

        const interpreterControls: HTMLDivElement =
            document.querySelector('#interpreterControls') || expect();

        interpreterControls.style.display = 'block';
      });

  const controlsElement = document.querySelector('#controlsToggle') || expect();

  controlsElement.addEventListener('click', () => {
    toggleControls();
  });

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

function toggleControls() {
  const controls: HTMLDivElement =
      document.querySelector('#controls') || expect();
  const controlsElement: HTMLAnchorElement =
      document.querySelector('#controlsToggle') || expect();
  if (controls.style.visibility === 'hidden') {
    controlsElement.innerText = 'Hide Controls';
    controls.style.visibility = 'visible';
  } else {
    controlsElement.innerText = 'Show Controls';
    controls.style.visibility = 'hidden';
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
          return '';
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