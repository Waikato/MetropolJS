import {MetropolJSElement} from './metropoljs/MetropolJSElement';

document.addEventListener('DOMContentLoaded', () => {
  const mainElement = document.querySelector('#main') as HTMLDivElement;

  if (!mainElement) {
    throw new Error('Could not find main element');
  }

  const metropolJS = new MetropolJSElement(document);

  metropolJS.attachTo(mainElement);

  metropolJS.connect(
      'v8://ws://localhost:9223/devtools/page/6F4F2D21CE07244A2976FB3229BF6ED6');
});