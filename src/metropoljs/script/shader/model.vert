attribute float colorAmount;
attribute float visitAmount;
attribute float poiAmount;

varying float vColorAmount;
varying float vVisitAmount;
varying float vPoiAmount;

// From:
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_custom_attributes.html

void main() {
  vColorAmount = colorAmount;
  vVisitAmount = visitAmount;
  vPoiAmount = poiAmount;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}