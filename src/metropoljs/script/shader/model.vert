attribute float colorAmount;
attribute float visitAmount;

varying float vColorAmount;
varying float vVisitAmount;

// From:
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_custom_attributes.html

void main() {
  vColorAmount = colorAmount;
  vVisitAmount = visitAmount;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}