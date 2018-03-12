varying float vColorAmount;
varying float vVisitAmount;

uniform float maxAmount;

// From: http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// From:
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_custom_attributes.html

void main() {
  vec3 hsvBase = hsv2rgb(vec3(0.5, 0.1, vColorAmount));
  
  float amountFraction = vVisitAmount / (maxAmount + 1.0);
  
  vec3 hsvAdd = hsv2rgb(vec3(amountFraction, 0.8, 0.6));

  vec3 finalColor = (vVisitAmount < 1.0) ? hsvBase : normalize(hsvBase + hsvAdd);

  gl_FragColor = vec4(finalColor, 0.5);
}