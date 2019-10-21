// https://webglfundamentals.org/webgl/lessons/webgl-shaders-and-glsl.html
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial

import { mat4 } from 'gl-matrix'
import vsSource from '../shaders/main.vert'
import fsSource from '../shaders/main.frag'
import * as dat from 'dat.gui'

class Cube {

	constructor() {

		// bind

		this.render = this.render.bind(this)
		this.handleGUI = this.handleGUI.bind(this)
		this.handleMouseEnter = this.handleMouseEnter.bind(this)
		this.handleMouseLeave = this.handleMouseLeave.bind(this)
		this.handleMouseClick = this.handleMouseClick.bind(this)
		this.afterClick = this.afterClick.bind(this)

		this.cubeRotation = 0
		this.then = 0

		this.ui = {
			overlay: document.querySelector('.overlay'),
			canvas: document.querySelector('.canvas')
		}


		this.initGUI()

		this.color = this.hexToRgbF(this.guiOpts.color)
		this.ui.canvas.style.background = this.guiOpts.bkg_color

		this.distortionCoef = 0.065
		this.distortion = this.distortionTarget = 0

		this.rotationSpeedCoef = 1
		this.rotationSpeed = this.rotationSpeedTarget = 35

		this.init()

	}

	initGUI() {
		const gui = new dat.default.GUI()

		this.guiOpts = {
			distortion: 1.5,
			distortionSpeed: 2,
			rotationSpeed: 25,
			lightIntensity: 0.5,
			color: '#ff0000',
			bkg_color: '#1b1b1b',
		}

		const folder = gui.addFolder('On hover')
		folder.add(this.guiOpts, 'distortion', 0, 1.8).name('amplitude')
		folder.add(this.guiOpts, 'distortionSpeed', 0, 2.5).name('frequency')
		folder.add(this.guiOpts, 'rotationSpeed', 0, 60).name('rotation speed')
		folder.open()
		gui.addColor(this.guiOpts, 'color').onChange(this.handleGUI)
		gui.addColor(this.guiOpts, 'bkg_color').onChange(this.handleGUI).name('bkg color')
	}

	init() {

		this.ui.canvas.width = window.innerWidth * window.devicePixelRatio
		this.ui.canvas.height = window.innerHeight * window.devicePixelRatio
		// Initialize the GL context
		this.gl = this.ui.canvas.getContext('webgl')

		// Only continue if WebGL is available and working
		if (!this.gl) {
			alert('Unable to initialize WebGL. Your browser or machine may not support it.')
			return
		}

		const shaderProgram = this.initShaderProgram(this.gl, vsSource, fsSource) // init basic shaders

		this.programInfo = { // stocks Shaders and uniforms
			program: shaderProgram,
			attribLocations: { // attrib --> fix variables for shaders (attribute) Position, Normals, textCoord
				vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
				vertexNormal: this.gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
				vertexColor: this.gl.getAttribLocation(shaderProgram, 'aVertexColor'),
			},
			uniformLocations: { // uniforms --> variables for shaders (uniforms)
				projectionMatrix: this.gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
				modelViewMatrix: this.gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
				normalMatrix: this.gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
				distortion: this.gl.getUniformLocation(shaderProgram, 'uDistortion'),
				distortionSpeed: this.gl.getUniformLocation(shaderProgram, 'uDistortionSpeed'),
				lightIntensity: this.gl.getUniformLocation(shaderProgram, 'uLightIntensity'),
				color: this.gl.getUniformLocation(shaderProgram, 'uColor'),
				time: this.gl.getUniformLocation(shaderProgram, 'uTime')
			},
		}

		// Buffer = Stocker des valeurs (des matrices). Pour qu'ils soient ensuite lu par un programme (shader)

		this.buffers = []
		this.nbCubes = 3

		for (let i = 0; i < this.nbCubes; i++) {
			this.buffers.push(this.initBuffers(this.gl, i)) // Create my geometry ( cube )
		}

		requestAnimationFrame(this.render)

		this.events()
	}

	events() {
		this.ui.overlay.addEventListener('click', this.handleMouseClick)
		this.ui.overlay.addEventListener('mouseenter', this.handleMouseEnter)
		this.ui.overlay.addEventListener('mouseleave', this.handleMouseLeave)
	}


	handleMouseEnter() {
		this.distortionCoef = 0.4
		this.distortionTarget = this.guiOpts.distortion
		this.rotationSpeedTarget = this.guiOpts.rotationSpeed
	}

	handleMouseLeave() {
		clearTimeout(this.timeout)
		this.distortionCoef = 0.05
		this.distortionTarget = 0
		this.rotationSpeedTarget = 5
	}

	handleMouseClick() {

		this.distortionTarget = this.distortion = Math.min(3, this.distortion + 1)
		this.rotationSpeedTarget = this.rotationSpeed = Math.min(100, this.rotationSpeed + 30)

		// throttle func
		clearTimeout(this.timeout)
		this.timeout = setTimeout(this.afterClick, 500)
	}

	afterClick() {
		this.distortionCoef = 0.05
		this.distortionTarget = this.guiOpts.distortion
		this.rotationSpeedTarget = this.guiOpts.rotationSpeed
	}

	//
	// Initialize a shader program, so WebGL knows how to draw our data
	//
	initShaderProgram(gl, vsSource, fsSource) {
		const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource)
		const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource)

		// Create the shader program

		const shaderProgram = gl.createProgram()
		gl.attachShader(shaderProgram, vertexShader)
		gl.attachShader(shaderProgram, fragmentShader)
		gl.linkProgram(shaderProgram)

		// If creating the shader program failed, alert

		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			// alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram))
			return null
		}

		return shaderProgram
	}

	//
	// creates a shader of the given type, uploads the source and
	// compiles it.
	//
	loadShader(gl, type, source) {
		const shader = gl.createShader(type)

		// Send the source to the shader object

		gl.shaderSource(shader, source)

		// Compile the shader program

		gl.compileShader(shader)

		// See if it compiled successfully

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			// alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader))
			gl.deleteShader(shader)
			return null
		}

		return shader
	}

	// Create a Geometry
	initBuffers(gl, index) {


		// Now create an array of positions for the square.
		// 4 vertices = 1 square Face
		// 1 vertices here need 3 positions (x,y,z) for a face, so 8 in total

		// 24 vertices (4 per side)

		const offset = index * 3

		const x1 = -1.0 + offset
		const x2 = 1.0 + offset

		const z1 = -1.0
		const z2 = 1.0

		const positions = [
			// Front face
			x1, -1.0, z2, // x, y, z
			x2, -1.0, z2,
			x2, 1.0, z2,
			x1, 1.0, z2,

			// Back face
			x1, -1.0, z1,
			x1, 1.0, z1,
			x2, 1.0, z1,
			x2, -1.0, z1,

			// Top face
			x1, 1.0, z1,
			x1, 1.0, z2,
			x2, 1.0, z2,
			x2, 1.0, z1,

			// Bottom face
			x1, -1.0, z1,
			x2, -1.0, z1,
			x2, -1.0, z2,
			x1, -1.0, z2,

			// Right face
			x2, -1.0, z1,
			x2, 1.0, z1,
			x2, 1.0, z2,
			x2, -1.0, z2,

			// Left face
			x1, -1.0, z1,
			x1, -1.0, z2,
			x1, 1.0, z2,
			x1, 1.0, z1,
		]

		// Create a buffer for the square's positions.

		// Select the positionBuffer as the one to apply buffer
		// operations to from here out.

		// Now pass the list of positions into WebGL to build the
		// shape. We do this by creating a Float32Array from the
		// JavaScript array, then use it to fill the current buffer.

		const positionBuffer = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

		// Color different for each faces

		const r = index / 3
		const g = 0
		const b = 1

		// 24 vertices (4 per side)

		const colors = [
			// Front face
			r, g, b, 0.4,
			r, g, b, 0.4,
			r, g, b, 0.4,
			r, g, b, 0.4,
			// Back face
			r, g, b, 0.4,
			r, g, b, 0.4,
			r, g, b, 0.4,
			r, g, b, 0.4,
			// Top face
			r, g, b, 0.4,
			r, g, b, 0.4,
			r, g, b, 0.4,
			r, g, b, 0.4,
			// Bottom face
			r, g, b, 0.4,
			r, g, b, 0.4,
			r, g, b, 0.4,
			r, g, b, 0.4,
			// Right face
			r, g, b, 0.4,
			r, g, b, 0.4,
			r, g, b, 0.4,
			r, g, b, 0.4,
			// Left face
			r, g, b, 0.4,
			r, g, b, 0.4,
			r, g, b, 0.4,
			r, g, b, 0.4
		]

		// Create a buffer for the square's positions.

		// Select the positionBuffer as the one to apply buffer
		// operations to from here out.

		// Now pass the list of positions into WebGL to build the
		// shape. We do this by creating a Float32Array from the
		// JavaScript array, then use it to fill the current buffer.

		const colorBuffer = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW)

		// Create normals
		const vertexNormals = [
			// Front
			0.0, 0.0, 1.0,
			0.0, 0.0, 1.0,
			0.0, 0.0, 1.0,
			0.0, 0.0, 1.0,

			// Back
			0.0, 0.0, -1.0,
			0.0, 0.0, -1.0,
			0.0, 0.0, -1.0,
			0.0, 0.0, -1.0,

			// Top
			0.0, 1.0, 0.0,
			0.0, 1.0, 0.0,
			0.0, 1.0, 0.0,
			0.0, 1.0, 0.0,

			// Bottom
			0.0, -1.0, 0.0,
			0.0, -1.0, 0.0,
			0.0, -1.0, 0.0,
			0.0, -1.0, 0.0,

			// Right
			1.0, 0.0, 0.0,
			1.0, 0.0, 0.0,
			1.0, 0.0, 0.0,
			1.0, 0.0, 0.0,

			// Left
			-1.0, 0.0, 0.0,
			-1.0, 0.0, 0.0,
			-1.0, 0.0, 0.0,
			-1.0, 0.0, 0.0
		]

		const normalBuffer = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW)

		// This array defines each face as two triangles, using the
		// indices into the vertex array to specify each triangle's
		// position.
		const indices = [
			0, 1, 2, 0, 2, 3, // front
			4, 5, 6, 4, 6, 7, // back
			8, 9, 10, 8, 10, 11, // top
			12, 13, 14, 12, 14, 15, // bottom
			16, 17, 18, 16, 18, 19, // right
			20, 21, 22, 20, 22, 23, // left
		]

		// Now send the element array to GL
		const indexBuffer = gl.createBuffer()
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)

		const indexBuffer2 = gl.createBuffer()
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer2)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)

		return {
			position: positionBuffer,
			indices: indexBuffer,
			indices2: indexBuffer2,
			normal: normalBuffer,
			color: colorBuffer
		}

	}

	drawScene(gl, programInfo, buffers, time ) {
		gl.clearColor(0, 0, 0, 0) // Clear color to transparent
		gl.clearDepth(1.0) // Clear depth
		gl.enable(gl.DEPTH_TEST) // Enable depth testing

		// Enables blending
		gl.enable(gl.BLEND)
		//Blending function for transparencies
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

		// Enable culling
		gl.enable(gl.CULL_FACE)


		///////
		// Tell WebGL to use our program when drawing
		//////

		gl.useProgram(programInfo.program)


		/////////
		// Camera
		/////////

		// Create a perspective matrix, a special matrix that is
		// used to simulate the distortion of perspective in a camera.
		// Our field of view is 45 degrees, with a width/height
		// ratio that matches the display size of the canvas
		// and we only want to see objects between 0.1 units
		// and 100 units away from the camera.

		const fieldOfView = 45 * Math.PI / 180 // in radians
		const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
		const zNear = 0.1
		const zFar = 100.0
		const projectionMatrix = mat4.create()

		// note: glmatrix.js always has the first argument
		// as the destination to receive the result.
		mat4.perspective(projectionMatrix,
			fieldOfView,
			aspect,
			zNear,
			zFar)


		let modelViewMatrix = mat4.create()

		let normalMatrix = mat4.create()

		const offsetMat = -3.0


		///////////
		// Rendering
		///////////

		// vNormals Coordinates

		// Tell WebGL how to pull out the normals from
		// the normal buffer into the vertexNormal attribute.
		// Normals will be the same
		const num = 3
		const type = gl.FLOAT
		const normalize = false
		const stride = 0
		const offset = 0

		gl.bindBuffer(gl.ARRAY_BUFFER, buffers[0].normal)
		gl.vertexAttribPointer(
			programInfo.attribLocations.vertexNormal,
			num,
			type,
			normalize,
			stride,
			offset)
		gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal)

		// Draw multiples cubes with the buffers data we have

		for (let i = 0; i < buffers.length; i++) {
			// Set the drawing position to the "identity" point, which is
			// the center of the scene.
			// Different camera rotation and translation to draw the cubes and make them rotate on different rotation point
			modelViewMatrix = mat4.create()

			mat4.translate(modelViewMatrix, // destination matrix
				modelViewMatrix, // matrix to translate
				[0.0, 0.0, -20.0]) // amount to translate

			if (i === 2) {
				// Camera position
				mat4.translate(modelViewMatrix, // destination matrix
					modelViewMatrix, // matrix to translate
					[6.0 + offsetMat, 0.0, 0.0]) // amount to translate
			} else if (i === 1) {
				// Camera position
				mat4.translate(modelViewMatrix, // destination matrix
					modelViewMatrix, // matrix to translate
					[3.0 + offsetMat, 0.0, 0.0]) // amount to translate
			} else {
				// Camera position
				mat4.translate(modelViewMatrix, // destination matrix
					modelViewMatrix, // matrix to translate
					[0.0 + offsetMat, 0.0, 0.0]) // amount to translate
			}

			// Rotate Geometry
			mat4.rotate(modelViewMatrix, // destination matrix
				modelViewMatrix, // matrix to rotate
				this.cubeRotation + i * 10, // amount to rotate  in radians
				[0, 1, 1]) // axis to rotate around

			if (i === 2) {
				// Camera position
				mat4.translate(modelViewMatrix, // destination matrix
					modelViewMatrix, // matrix to translate
					[-6.0, 0.0, 0.0]) // amount to translate
			} else if (i === 1) {
				// Camera position
				mat4.translate(modelViewMatrix, // destination matrix
					modelViewMatrix, // matrix to translate
					[-3.0, 0.0, 0.0]) // amount to translate
			} else {
				mat4.translate(modelViewMatrix, // destination matrix
					modelViewMatrix, // matrix to translate
					[0.0, 0.0, 0.0]) // amount to translate
			}


			// Normals
			mat4.invert(normalMatrix, modelViewMatrix)
			mat4.transpose(normalMatrix, normalMatrix)


			gl.uniformMatrix4fv(
				programInfo.uniformLocations.modelViewMatrix,
				false,
				modelViewMatrix)
			// normals
			gl.uniformMatrix4fv(
				programInfo.uniformLocations.normalMatrix,
				false,
				normalMatrix)

			// Vertex Position

			// Tell WebGL how to pull out the positions from the position
			// buffer into the vertexPosition attribute.

			// "ca va lire le bufferPosition qu'on a et lui demander de lire toutes les 3 valeurs"
			// tout ça pour au final mettre ses valeurs dans l'attribut aVertexPosition

			let num = 3 // --> Toutes les 3 valeurs dans le buffer, ont créer une vertices
			let type = gl.FLOAT // the data in the buffer is 32bit floats
			let normalize = false // don't normalize
			let stride = 0 // how many bytes to get from one set of values to the next
			// 0 = use type and num above
			let offset = 0 // how many bytes inside the buffer to start from

			// Vertex Position
			gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i].position)
			gl.vertexAttribPointer(
				programInfo.attribLocations.vertexPosition,
				num,
				type,
				normalize,
				stride,
				offset)
			gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition)


			// Color different pour chaque faces

			num = 4 // --> Toutes les 3 valeurs dans le buffer, ont créer une vertices
			type = gl.FLOAT // the data in the buffer is 32bit floats
			normalize = false // don't normalize
			stride = 0 // how many bytes to get from one set of values to the next
			// 0 = use type and num above
			offset = 0 // how many bytes inside the buffer to start from
			gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i].color)
			gl.vertexAttribPointer(
				programInfo.attribLocations.vertexColor,
				num,
				type,
				normalize,
				stride,
				offset)
			gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor)

			// Draw vertex
			let vertexCount = 36 // Each face of the cube composed by 2 triangles. so 6 vertices per face
			type = gl.UNSIGNED_SHORT
			offset = 0

			// Tell WebGL which indices to use to index the vertices
			// Draw triangles (2 for each faces, 12, with 3 vertices, 36)

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[i].indices) // indices 2
			gl.cullFace(gl.FRONT)
			gl.drawElements(gl.TRIANGLES, vertexCount, type, offset)


			// TEST : duplicate Material to do like in Three.js with face Culling
			// // vNormals Coordinates

			// // Tell WebGL how to pull out the normals from
			// // the normal buffer into the vertexNormal attribute.
			// // Normals will be the same
			// num = 3
			// type = gl.FLOAT
			// normalize = false
			// stride = 0
			// offset = 0

			// gl.bindBuffer(gl.ARRAY_BUFFER, buffers[0].normal)
			// gl.vertexAttribPointer(
			// 	programInfo.attribLocations.vertexNormal,
			// 	num,
			// 	type,
			// 	normalize,
			// 	stride,
			// 	offset)
			// gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal)

			// // Vertex Position

			// // Tell WebGL how to pull out the positions from the position
			// // buffer into the vertexPosition attribute.

			// // "ca va lire le bufferPosition qu'on a et lui demander de lire toutes les 3 valeurs"
			// // tout ça pour au final mettre ses valeurs dans l'attribut aVertexPosition

			// num = 3 // --> Toutes les 3 valeurs dans le buffer, ont créer une vertices
			// type = gl.FLOAT // the data in the buffer is 32bit floats
			// normalize = false // don't normalize
			// stride = 0 // how many bytes to get from one set of values to the next
			// // 0 = use type and num above
			// offset = 0 // how many bytes inside the buffer to start from

			// // Vertex Position
			// gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i].position)
			// gl.vertexAttribPointer(
			// 	programInfo.attribLocations.vertexPosition,
			// 	num,
			// 	type,
			// 	normalize,
			// 	stride,
			// 	offset)
			// gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition)


			// // Color different pour chaque faces

			// num = 4 // --> Toutes les 3 valeurs dans le buffer, ont créer une vertices
			// type = gl.FLOAT // the data in the buffer is 32bit floats
			// normalize = false // don't normalize
			// stride = 0 // how many bytes to get from one set of values to the next
			// // 0 = use type and num above
			// offset = 0 // how many bytes inside the buffer to start from
			// gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i].color)
			// gl.vertexAttribPointer(
			// 	programInfo.attribLocations.vertexColor,
			// 	num,
			// 	type,
			// 	normalize,
			// 	stride,
			// 	offset)
			// gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor)

			// // Draw vertex
			// vertexCount = 36 // Each face of the cube composed by 2 triangles. so 6 vertices per face
			// type = gl.UNSIGNED_SHORT
			// offset = 0

			// Tell WebGL which indices to use to index the vertices
			// Draw triangles (2 for each faces, 12, with 3 vertices, 36)

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[i].indices)
			gl.cullFace(gl.BACK)
			gl.drawElements(gl.TRIANGLES, vertexCount, type, offset)
		}

		///////
		// Uniforms
		///////

		// Camera
		gl.uniformMatrix4fv(
			programInfo.uniformLocations.projectionMatrix,
			false,
			projectionMatrix)
		// distortion
		gl.uniform1f(
			programInfo.uniformLocations.distortion,
			this.distortion)
		// distortion speed
		gl.uniform1f(
			programInfo.uniformLocations.distortionSpeed,
			this.guiOpts.distortionSpeed)
		// light intensity
		gl.uniform1f(
			programInfo.uniformLocations.lightIntensity,
			this.guiOpts.lightIntensity)
		// color
		gl.uniform3fv(
			programInfo.uniformLocations.color,
			[this.color.r, this.color.g, this.color.b])
		// time
		gl.uniform1f(
			programInfo.uniformLocations.time,
			time)

	}

	render(now) {
		now *= 0.001 // convert to seconds
		this.then = now

		// smooth deceleration
		this.distortion += (this.distortionTarget - this.distortion) * this.distortionCoef
		this.rotationSpeed += (this.rotationSpeedTarget - this.rotationSpeed) * this.rotationSpeedCoef

		this.drawScene(this.gl, this.programInfo, this.buffers, this.then)

		this.cubeRotation += this.rotationSpeed / 2000 // update rotate var

		requestAnimationFrame(this.render)
	}

	hexToRgbF(hex) {
		let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
		return result ? {
			r: parseInt(result[1], 16) / 255,
			g: parseInt(result[2], 16) / 255,
			b: parseInt(result[3], 16) / 255,
		} : null
	}

	/// GUI

	handleGUI() {

		this.color = this.hexToRgbF(this.guiOpts.color)
		this.ui.canvas.style.background = this.guiOpts.bkg_color

	}

}

export default new Cube()
