export interface ConfigObject {
  // Debugger options
  debugger: {
    // The type of debugger to connect to ('v8').
    'type': 'v8'|'interpreter';

    // The connection string to use for the debugger (string).
    // For V8 this will be a websocket URL.
    // For interpreter it will be the script to load
    // - jquery
    // - lodash
    // - moment
    // - richards
    // - underscore
    // - underscore_test
    'connect': string;
  };

  // Rendering options
  rendering: {
    // Should the camera be set for top down pan and zoom or full orbit controls
    // (true|false).
    '3d_mode': boolean,

    // Should the layers be extruded so that walls can be added?
    // (true|false).
    'city_mode': boolean;

    // Should walls be rendered around each AST node for city_mode
    // (true|false)
    'render_walls': boolean;
    // Should line borders be rendered around each AST node (true|false).
    'render_borders': boolean;
    // Should solid boxes be rendered for each AST node (true|false).
    'render_solid': boolean;
  };

  // Quality tuning options
  // Mostly used when city mode is enabled.
  quality: {
    // Should lighting be enabled and added to the scene (true|false).
    'enable_lighting': boolean;

    // Should SSAO be enabled (true|false).
    // Warning will negatively impact performance.
    'enable_ssao': boolean;
  };
}

export class Config {
  private obj: ConfigObject = {
    'debugger': {
      'type': 'interpreter',
      'connect': 'underscore_test',
    },
    'rendering': {
      '3d_mode': false,
      'city_mode': false,
      'render_walls': false,
      'render_borders': false,
      'render_solid': true,
    },

    'quality': {
      'enable_lighting': false,
      'enable_ssao': false,
    }
  };

  setConfig(obj: ConfigObject) {
    this.obj = obj;
  }

  getConfig(): ConfigObject {
    return this.obj;
  }

  static getInstance() {
    return configInstance;
  }
}

const configInstance = new Config();