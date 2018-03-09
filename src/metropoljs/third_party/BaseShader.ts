export interface BaseShader {
  vertexShader: string;
  fragmentShader: string;
  defines?: {[s: string]: any};
  uniforms: {[s: string]: any};
}