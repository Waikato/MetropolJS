varying float vAlpha;

varying vec3 vColor;

uniform float opacity;

// From:
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_custom_attributes.html

void main() { gl_FragColor = vec4(vColor, vAlpha); }