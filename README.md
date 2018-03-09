# MetropolJS

**Paper PDF**: `TODO: Put an Open Access link to the paper`

## Introduction

As a result of the large scale and diverse composition of modern compiled JavaScript applications, comprehending
overall program structure for debugging proves difficult. In this paper we present our solution MetropolJS.
By using a Treemap-based visualization it is possible to get a high level view within limited screen real estate.
Previous approaches to Treemaps lacked the fine detail and interactive features to be useful as a debugging tool.
This paper introduces an optimized approach for visualizing complex program structure that enables new debugging
techniques where the execution of programs can be displayed in real time from a bird's-eye view. The approach
facilitates highlighting and visualizing method calls and distinctive code patterns on top of code segments without
a high overhead for navigation. Using this approach enables fast analysis of previously difficult-to-comprehend
code bases.

## Getting Started

1. Clone the repository
  ```bash
  git clone https://github.com/Waikato/MetropolJS/ && cd MetropolJS
  ```
2. Install dependencies with [Yarn](https://yarnpkg.com/)
  ```bash
  yarn
  ```
3. Start either Google Chrome with Remote Debugging or nodejs with the inspector enabled and copy the Websocket URL from the command line.
4. Create a copy of the example config file `dist/config.example.js` and place it in the `dist` directory as `config.js`. Documentation is in the [Config File](#config-file) section.
5. Start the development server and compile the code. This is powered by [Parcel](https://parceljs.org/).
  ```bash
  yarn start:dev
  ```
6. Visit [https://localhost:8080/](https://localhost:8080/) and wait for scripts to be loaded.

## Config File

The example config file in [dist/config.example.js](dist/config.example.js) is reproduced below for reference.

```javascript
// MetropolJS Config File
// This will be loaded when the application starts.

loadMetropolJSConfig({
    // Debugger options
    'debugger': {
        // The type of debugger to connect to ('v8').
        'type': 'v8',

        // The connection string to use for the debugger (string).
        // For V8 this will be a websocket URL.
        'connect': 'ws://localhost:9229/',
    },

    // Rendering options
    'rendering': {
        'camera_mode':

        // Should the layers be extruded so that walls can be added? (true|false).
        'city_mode': false,

        // Should walls be rendered around each AST node for city_mode (true|false)
        'render_walls': false,
        // Should line borders be rendered around each AST node (true|false).
        'render_borders': false,
        // Should solid boxes be rendered for each AST node (true|false).
        'render_solid': true,
    },

    // Quality tuning options
    // Mostly used when city mode is enabled.
    'quality': {
        // Should lighting be enabled and added to the scene (true|false).
        'enable_lighting': true,

        // Should SSAO be enabled (true|false).
        // Warning will negatively impact performance.
        'enable_ssao': true,
    }
});
```

## Citing MetropolJS

    TODO: Put the citation once the paper is published.

Publication is currently pending at ICPC2018.

## Licence

MetropolJS is licensed under the Apache 2.0 License in [LICENSE](LICENSE).