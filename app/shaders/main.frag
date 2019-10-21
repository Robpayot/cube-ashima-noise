varying highp vec3 vLighting;

varying highp vec4 vColor;

uniform highp vec3 uColor;

void main(void) {

  // highp vec4 finalColor = vec4(uColor.r, uColor.g, uColor.b, 0.5);

  // gl_FragColor = vec4(finalColor.rgb * vLighting, finalColor.a);

  gl_FragColor = vec4(vColor.rgb * vLighting, vColor.a);
  
}




