
const initialize = async () => {
  console.log('Initializing');
  const dataVertex = await fetch('./vertex.glsl');
  const vertexText = await dataVertex.text();
  const dataFragment = await fetch('./fragment.glsl');
  const fragmentText = await dataFragment.text();


  const canvas = document.getElementById('glCanvas');
	const gl = canvas.getContext('webgl');

	if (!gl) {
		console.log('WebGL not supported, falling back on experimental-webgl');
		gl = canvas.getContext('experimental-webgl');
	}

	if (!gl) {
		alert('Your browser does not support WebGL');
	}

  //gl.viewport(0, 0, 200, 300);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);


  console.log(`[Canvas internal rendering] W: ${gl.drawingBufferWidth} | H: ${gl.drawingBufferHeight}`);


	gl.clearColor(0.85, 0.85, 0.8, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const program = createShaders({gl, vertexText, fragmentText});
  const { worldMatrix, matWorldLocation } = createBuffers({gl, program});
  render({gl, worldMatrix, matWorldLocation});
	
  
}

const createShaders = ({gl, vertexText, fragmentText}) => {
  //
	// Create shaders
	// 
	const vertexShader = gl.createShader(gl.VERTEX_SHADER);
	const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

	gl.shaderSource(vertexShader, vertexText);
	gl.shaderSource(fragmentShader, fragmentText);

	gl.compileShader(vertexShader);
	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		console.error('ERROR compiling vertex shader!', gl.getShaderInfoLog(vertexShader));
		return;
	}

	gl.compileShader(fragmentShader);
	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		console.error('ERROR compiling fragment shader!', gl.getShaderInfoLog(fragmentShader));
		return;
	}

	const program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('ERROR linking program!', gl.getProgramInfoLog(program));
		return;
	}
  // validation for debug only since slightly expensive
	gl.validateProgram(program);
	if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
		console.error('ERROR validating program!', gl.getProgramInfoLog(program));
		return;
	}
  return program;
}

const createBuffers = ({gl, program}) => {
  //
	// Create buffer
	//
	const triangleVertices = 
	[ // X, Y, Z       R, G, B
		0.0, 0.5, 0.0,    1.0, 1.0, 1.0,
		-0.5, -0.5, 0.0,  0.7, 0.0, 1.0,
		0.5, -0.5, 0.0,   0.1, 1.0, 0.6
	];

	const triangleVertexBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBufferObject);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);

	var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
	var colorAttribLocation = gl.getAttribLocation(program, 'vertColor');
	gl.vertexAttribPointer(
		positionAttribLocation, // Attribute location
		3, // Number of elements per attribute
		gl.FLOAT, // Type of elements
		gl.FALSE,
		6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
		0 // Offset from the beginning of a single vertex to this attribute
	);
	gl.vertexAttribPointer(
		colorAttribLocation, // Attribute location
		3, // Number of elements per attribute
		gl.FLOAT, // Type of elements
		gl.FALSE,
		6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
		3 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
	);

	gl.enableVertexAttribArray(positionAttribLocation);
	gl.enableVertexAttribArray(colorAttribLocation);

  // tell state which program is active
	gl.useProgram(program);


  const matWorldLocation = gl.getUniformLocation(program, 'world');
  const matViewLocation = gl.getUniformLocation(program, 'view');
  const matProjectionLocation = gl.getUniformLocation(program, 'projection');

  const worldMatrix = new Float32Array(16);
  const viewMatrix = new Float32Array(16);
  const projectionMatrix = new Float32Array(16);
  glMatrix.mat4.identity(worldMatrix);
  glMatrix.mat4.lookAt(viewMatrix, [3, 0, -3], [0, 0, 0], [0, 1, 0]);
  glMatrix.mat4.perspective(projectionMatrix, glMatrix.glMatrix.toRadian(45), gl.canvas.width / gl.canvas.height, 0.1, 1000);
  // send uniforms to context
  gl.uniformMatrix4fv(matWorldLocation, gl.FALSE, worldMatrix);
  gl.uniformMatrix4fv(matViewLocation, gl.FALSE, viewMatrix);
  gl.uniformMatrix4fv(matProjectionLocation, gl.FALSE, projectionMatrix);

  return { worldMatrix, matWorldLocation }
}

const render = ({gl, worldMatrix, matWorldLocation }) => {
  //
	// Main render loop
	//
  const identityMatrix = new Float32Array(16);
  glMatrix.mat4.identity(identityMatrix);
  let angle = 0;

  const animate = () => {
    angle = performance.now() / 1000 / 6 * glMatrix.glMatrix.toRadian(360);
    //console.log(angle);
    
    glMatrix.mat4.rotate(worldMatrix, identityMatrix, angle, [0, 1, 0]);
    gl.uniformMatrix4fv(matWorldLocation, gl.FALSE, worldMatrix);    

    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}