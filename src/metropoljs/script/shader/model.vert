attribute float alpha;

varying float vAlpha;
varying vec3 vColor;

// From:
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_custom_attributes.html

void main() {
  vAlpha = alpha;
  vColor = color;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}