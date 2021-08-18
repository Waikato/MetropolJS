# MetropolJS

**Contact Email**: jds30@students.waikato.ac.nz

**Paper PDF**: [docs/paper/metropolJS.pdf](docs/paper/metropolJS.pdf)

**Live Demo**: https://waikato.github.io/MetropolJS/

![Header Image](img/headerImage.png)


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
        // The type of debugger to connect to ('v8'|'interpreter').
        'type': 'v8',

        // The connection string to use for the debugger (string).
        // For V8 this will be a websocket URL.
        // For interpreter it will be the script to load
        // - jquery
        // - lodash
        // - moment
        // - richards
        // - underscore
        // - underscore_test
        'connect': 'ws://localhost:9229/',
    },

    // Rendering options
    'rendering': {
        // Should the camera be set for top down pan and zoom or full orbit //
        // controls (true|false).
        '3d_mode': false,

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
        'enable_lighting': false,

        // Should SSAO be enabled (true|false).
        // Warning will negatively impact performance.
        'enable_ssao': false,
    }
});
```

## Citing MetropolJS

https://dl.acm.org/doi/10.1145/3196321.3196368

```bibtex
@inproceedings{10.1145/3196321.3196368,
  author = {Scarsbrook, Joshua D and Ko, Ryan K L and Rogers, Bill and Bainbridge, David},
  title = {MetropolJS: Visualizing and Debugging Large-Scale Javascript Program Structure with Treemaps},
  year = {2018},
  isbn = {9781450357142},
  publisher = {Association for Computing Machinery},
  address = {New York, NY, USA},
  url = {https://doi.org/10.1145/3196321.3196368},
  doi = {10.1145/3196321.3196368},
  booktitle = {Proceedings of the 26th Conference on Program Comprehension},
  pages = {389–392},
  numpages = {4},
  keywords = {treemaps, javascript, debugging},
  location = {Gothenburg, Sweden},
  series = {ICPC '18}
}
```

## Licence

MetropolJS is licensed under the Apache 2.0 License in [LICENSE](LICENSE).
