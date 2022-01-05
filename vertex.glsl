precision mediump float;

attribute vec3 vertPosition;
attribute vec2 vertTexCoord;
attribute vec3 vertNormal;

varying vec2 fragTexCoord;
varying vec3 fragNormal;

uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;

void main() {
  fragTexCoord = vertTexCoord;
  fragNormal = (world * vec4(vertNormal, 0.0)).xyz;
  gl_Position = projection * view * world * vec4(vertPosition, 1.0);
}