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
        'enable_lighting': true,

        // Should SSAO be enabled (true|false).
        // Warning will negatively impact performance.
        'enable_ssao': true,
    }
});