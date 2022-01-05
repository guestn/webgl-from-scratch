precision mediump float;

attribute vec3 vertPosition;
attribute vec3 vertColor;

varying vec3 fragColor;

uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;

void main() {
  fragColor = vertColor;
  gl_Position = projection * view * world * vec4(vertPosition, 1.0);
}