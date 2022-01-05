precision mediump float;

struct DirectionalLight
{
	vec3 direction;
	vec3 color;
};

varying vec2 fragTexCoord;
varying vec3 fragNormal;

uniform vec3 ambientLightIntensity;
uniform DirectionalLight dirLight;
uniform sampler2D sampler;

void main() {
  vec3 surfaceNormal = normalize(fragNormal); // apparently rasterize process can undo normalization
  vec3 normalLightDir = normalize(dirLight.direction);
  vec4 texel = texture2D(sampler, fragTexCoord);

  vec3 totalLightIntensity = ambientLightIntensity +
       dirLight.color * max(dot(fragNormal, normalLightDir), 0.0);
  //gl_FragColor = vec4(0.2, 0.5, 0.6, 1.0);
  //gl_FragColor = texture2D(sampler, fragTexCoord);
  gl_FragColor = vec4(texel.rgb * totalLightIntensity, 1.0);
  //gl_FragColor = vec4(vec3(0.2, 0.5, 0.6) * totalLightIntensity, 1.0);

}
