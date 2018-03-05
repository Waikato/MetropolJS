import {MetropolJSElement} from './metropoljs/MetropolJSElement';

document.addEventListener('DOMContentLoaded', () => {
  const mainElement = document.querySelector('#main') as HTMLDivElement;

  if (!mainElement) {
    throw new Error('Could not find main element');
  }

  const metropolJS = new MetropolJSElement(document);

  metropolJS.attachTo(mainElement);

  metropolJS.connect(
      'v8://ws://localhost:9229/devtools/page/(5B90636744045C2E1E78CFBFCEC37ACB)');
});