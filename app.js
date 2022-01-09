import cube from './primitives/cube.js';
import torus from './primitives/torus.js';
import plane from './primitives/plane.js';

import { quat } from glMatrix;

export const rotate = (obj, axis, r) => {
    const quat = glMatrix.quat.create();
    glMatrix.quat.setAxisAngle(quat, glMatrix.vec3.fromValues(axis[0], axis[1], axis[2]), r);

    const rObj = new Array(obj.position.length / 3).fill({}).reduce((agg, curr, idx) => {
        const p = glMatrix.vec3.fromValues(obj.position[idx * 3], obj.position[idx *3 + 1], obj.position[idx * 3 + 2]);
        const rp = glMatrix.vec3.create();
        glMatrix.vec3.transformQuat(rp, p, quat)

        const n = glMatrix.vec3.fromValues(obj.normal[idx * 3], obj.normal[idx * 3 + 1], obj.normal[idx * 3 + 2]);
        const rn = glMatrix.vec3.create();
        glMatrix.vec3.transformQuat(rn, n, quat)

        return {
            position: agg.position.concat(...rp),
            normal: agg.normal.concat(...rn),
            uv: obj.uv,
            index: obj.index,
        }
    }, { position: [], normal: [], uv: [], index: [] });

    return rObj;
}

export const translate = (obj, v) => {
    return {
        ...obj,
        position: obj.position.map((p, idx) => (p += v[idx % 3])),
    }
}

export const scale = (obj, v) => {
    return {
        ...obj,
        position: obj.position.map((p, idx) => (p *= v[idx % 3])),
    }
}

const initialize = async () => {
    console.log('Initializing');
    const dataVertex = await fetch('./vertex.glsl');
    const vertexText = await dataVertex.text();
    const dataFragment = await fetch('./fragment.glsl');
    const fragmentText = await dataFragment.text();
    // to load image this way we need to decode the binary data actually
    //const image = await fetch('./UV_Grid_Sm.png');
    //const imageData = await image.blob();

    const canvas = document.getElementById('glCanvas');
    /** @type {WebGLRenderingContext} */
    const gl = canvas.getContext('webgl', {antialias: true});

    if (!gl) {
        console.log('WebGL not supported, falling back on experimental-webgl');
        gl = canvas.getContext('experimental-webgl');
    }

    if (!gl) {
        alert('Your browser does not support WebGL');
    }

    //gl.viewport(0, 0, 200, 300);

    console.info(`[Canvas internal rendering] W: ${gl.drawingBufferWidth} | H: ${gl.drawingBufferHeight}`);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.85, 0.85, 0.8, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW); // cull in this order
    gl.cullFace(gl.BACK); // cull backface

    const { program } = createShaders({ gl, vertexText, fragmentText });
    const { index } = createBuffers({ gl, program });
    const { worldMatrix, matWorldLocation, texture } = createTexture({gl, program})
    const { angle } = createEventListeners({ x: 0, y: 0 });
    render({ gl, worldMatrix, matWorldLocation, index, texture, angle });
};

const createShaders = ({ gl, vertexText, fragmentText }) => {
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
    return { program };
};

const createBuffers = ({ gl, program }) => {
    //
    // Create buffer
    //
    const identityMatrix = new Float32Array(9);
    glMatrix.mat3.identity(identityMatrix);

    const sCube = scale(cube, [2, 1, 1]);
    const rCube = rotate(sCube, [0, 0, 1], 1.2);
    const tCube = translate(rCube, [1, 0.5, 0]);

    const sPlane = scale(plane, [5, 5, 5]);
    const rPlane = rotate(sPlane, [1, 0, 0], glMatrix.glMatrix.toRadian(270));
    const tPlane = translate(rPlane, [0, -2, 0]);


    const objects = [torus, tCube, tPlane];

    // aggregate object params to create ultimately one buffer array
    const { position, normal, uv, index } = objects.reduce(
        (agg, o, idx) => {
            return {
                position: [...agg.position, ...o.position],
                normal: [...agg.normal, ...o.normal],
                uv: [...agg.uv, ...o.uv],
                index: [...agg.index, ...o.index.map((i) => (i + agg.position.length / 3))],
            };
        },
        { position: [], normal: [], uv: [], index: [] },
    );

    console.log({ position, normal, uv, index });

    // create single buffer array
    const bufferArray = new Array(position.length / 3).fill(0).reduce((agg, curr, idx) => {
        const i = idx * 3;
        return [
            ...agg,
            position[i],
            position[i + 1],
            position[i + 2],
            uv[idx * 2],
            uv[idx * 2 + 1],
            normal[i],
            normal[i + 1],
            normal[i + 2],
        ];
    }, []);

    const vertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bufferArray), gl.STATIC_DRAW);
    // index buffer (which is ELEMENT_ARRAY_BUFFER)
    const indexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);

    var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
    var texCoordAttribLocation = gl.getAttribLocation(program, 'vertTexCoord');
    var normalAttribLocation = gl.getAttribLocation(program, 'vertNormal');

    gl.vertexAttribPointer(
        positionAttribLocation, // Attribute location
        3, // Number of elements per attribute
        gl.FLOAT, // Type of elements
        gl.FALSE,
        8 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
        0, // Offset from the beginning of a single vertex to this attribute
    );
    gl.vertexAttribPointer(
        texCoordAttribLocation, // Attribute location
        2, // Number of elements per attribute
        gl.FLOAT, // Type of elements
        gl.FALSE,
        8 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
        3 * Float32Array.BYTES_PER_ELEMENT, // Offset from the beginning of a single vertex to this attribute
    );
    gl.vertexAttribPointer(
        normalAttribLocation, // Attribute location
        3, // Number of elements per attribute
        gl.FLOAT, // Type of elements
        gl.FALSE,
        8 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
        5 * Float32Array.BYTES_PER_ELEMENT, // Offset from the beginning of a single vertex to this attribute
    );

    // unbind buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.enableVertexAttribArray(positionAttribLocation);
    gl.enableVertexAttribArray(texCoordAttribLocation);
    gl.enableVertexAttribArray(normalAttribLocation);
    
    return { index };
}

const createTexture = ({ gl, program }) => {
    // create the tex:
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    // void gl.texImage2D(target, level, internalformat, width, height, border, format, type, ImageData source);

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        document.getElementById('image1'), //mageData,
    );
    gl.bindTexture(gl.TEXTURE_2D, null);

    // tell state which program is active
    gl.useProgram(program);

    const matWorldLocation = gl.getUniformLocation(program, 'world');
    const matViewLocation = gl.getUniformLocation(program, 'view');
    const matProjectionLocation = gl.getUniformLocation(program, 'projection');

    const worldMatrix = new Float32Array(16);
    const viewMatrix = new Float32Array(16);
    const projectionMatrix = new Float32Array(16);
    glMatrix.mat4.identity(worldMatrix);
    glMatrix.mat4.lookAt(viewMatrix, [0, 2, -10], [0, 0, 0], [0, 1, 0]);
    glMatrix.mat4.perspective(
        projectionMatrix,
        glMatrix.glMatrix.toRadian(45),
        gl.canvas.width / gl.canvas.height,
        0.1,
        1000,
    );
    // send uniforms to context
    gl.uniformMatrix4fv(matWorldLocation, gl.FALSE, worldMatrix);
    gl.uniformMatrix4fv(matViewLocation, gl.FALSE, viewMatrix);
    gl.uniformMatrix4fv(matProjectionLocation, gl.FALSE, projectionMatrix);

    //
    // Lighting information
    //
    gl.useProgram(program);

    var ambientUniformLocation = gl.getUniformLocation(program, 'ambientLightIntensity');
    var dirLightDirUniformLocation = gl.getUniformLocation(program, 'dirLight.direction');
    var dirLightIntUniformLocation = gl.getUniformLocation(program, 'dirLight.color');

    gl.uniform3f(ambientUniformLocation, 0.2, 0.2, 0.2);
    gl.uniform3f(dirLightDirUniformLocation, 0.0, 0.0, -5.0);
    gl.uniform3f(dirLightIntUniformLocation, 0.9, 0.9, 0.9);

    return { worldMatrix, matWorldLocation, texture };
};

const render = ({ gl, worldMatrix, matWorldLocation, index, texture, angle }) => {
    //
    // Main render loop
    //
    const xRotationMatrix = new Float32Array(16);
    const yRotationMatrix = new Float32Array(16);

    const identityMatrix = new Float32Array(16);
    glMatrix.mat4.identity(identityMatrix);

    const animate = () => {
        //angle = (performance.now() / 1000 / 6) * glMatrix.glMatrix.toRadian(360);
        //console.log(angle);

        glMatrix.mat4.rotate(xRotationMatrix, identityMatrix, angle.x, [1, 0, 0]);
        glMatrix.mat4.rotate(yRotationMatrix, identityMatrix, angle.y, [0, 1, 0]);
        glMatrix.mat4.mul(worldMatrix, xRotationMatrix, yRotationMatrix);

        gl.uniformMatrix4fv(matWorldLocation, gl.FALSE, worldMatrix);

        gl.clearColor(0.75, 0.85, 0.8, 1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.activeTexture(gl.TEXTURE0);

        gl.clearColor(0.9, 0.9, 0.9, 1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
        //gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
};

const createEventListeners = (angle) => {
    document.addEventListener('keypress', (e) => {
        if (e.key === 'a') {
            angle.y -= 0.05;
        }
        if (e.key === 'd') {
            angle.y += +0.05;
        }
        if (e.key === 'w') {
            angle.x += 0.05;
        }
        if (e.key === 's') {
            angle.x -= 0.05;
        }
    });
    return { angle };
};

initialize();
