var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var ManualTracingTool;
(function (ManualTracingTool) {
    // Rendering
    var ImageResource = (function () {
        function ImageResource() {
            this.fileName = null;
            this.image = new RenderImage();
            this.loaded = false;
            this.isGLTexture = true;
        }
        ImageResource.prototype.file = function (fileName) {
            this.fileName = fileName;
            return this;
        };
        ImageResource.prototype.tex = function (isGLTexture) {
            this.isGLTexture = isGLTexture;
            return this;
        };
        return ImageResource;
    }());
    ManualTracingTool.ImageResource = ImageResource;
    var ModelResource = (function () {
        function ModelResource() {
            this.modelName = null;
            this.model = new RenderModel();
        }
        return ModelResource;
    }());
    ManualTracingTool.ModelResource = ModelResource;
    var ModelFile = (function () {
        function ModelFile() {
            this.fileName = null;
            this.modelResources = new List();
            this.modelResourceDictionary = new Dictionary();
            this.loaded = false;
        }
        ModelFile.prototype.file = function (fileName) {
            this.fileName = fileName;
            return this;
        };
        return ModelFile;
    }());
    ManualTracingTool.ModelFile = ModelFile;
    var Posing3DView = (function () {
        function Posing3DView() {
            // Posing
            // Rendering
            this.render = null;
            this.pickingWindow = null;
            this.posingFigureShader = new PosingFigureShader();
            this.depthShader = new DepthShader();
            this.imageResurces = new List();
            this.axisModel = null;
            this.zTestShpereModel = null;
            this.zTestShpereEdgeModel = null;
            this.headModel = null;
            this.bodyModel = null;
            this.modelLocation = vec3.create();
            this.eyeLocation = vec3.create();
            this.lookatLocation = vec3.create();
            this.upVector = vec3.create();
            this.modelMatrix = mat4.create();
            this.normalMatrix = mat4.create();
            this.viewMatrix = mat4.create();
            this.modelViewMatrix = mat4.create();
            this.projectionMatrix = mat4.create();
            this.projectionInvMatrix = mat4.create();
            this.cameraMatrix = mat4.create();
            this.tempVec3 = vec3.create();
            this.invProjectedVec3 = vec3.create();
            this.tmpMatrix = mat4.create();
            this.screenLocation = vec3.create();
        }
        Posing3DView.prototype.loadTexture = function (imageResource, url) {
            var _this = this;
            var image = new Image();
            imageResource.image.imageData = image;
            image.addEventListener('load', function () {
                if (imageResource.isGLTexture) {
                    _this.render.initializeImageTexture(imageResource.image);
                }
                imageResource.loaded = true;
            });
            image.src = url;
            this.imageResurces.push(imageResource);
        };
        Posing3DView.prototype.loadModels = function (modelFile, url) {
            var _this = this;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.responseType = 'json';
            xhr.addEventListener('load', function (e) {
                var data;
                if (xhr.responseType == 'json') {
                    data = xhr.response;
                }
                else {
                    data = JSON.parse(xhr.response);
                }
                for (var _i = 0, _a = data.static_models; _i < _a.length; _i++) {
                    var modelData = _a[_i];
                    var modelResource = new ModelResource();
                    modelResource.modelName = modelData.name;
                    _this.render.initializeModelBuffer(modelResource.model, modelData.vertices, modelData.indices, 4 * modelData.vertexStride); // 4 = size of float
                    modelFile.modelResources.push(modelResource);
                    modelFile.modelResourceDictionary[modelData.name] = modelResource;
                }
                modelFile.loaded = true;
            });
            xhr.send();
        };
        Posing3DView.prototype.initialize = function (render, pickingWindow) {
            this.render = render;
            this.pickingWindow = pickingWindow;
            this.render.initializeShader(this.posingFigureShader);
            this.render.initializeShader(this.depthShader);
            this.render.setShader(this.depthShader);
            this.depthShader.setMaxDepth(pickingWindow.maxDepth);
            // Tareget position
            vec3.set(this.modelLocation, 0.0, 0.0, 0.0);
            // Camera position
            vec3.set(this.lookatLocation, -1.0, 0.0, 0.0);
            vec3.set(this.upVector, 0.0, 0.0, 1.0);
            vec3.set(this.eyeLocation, 0.0, 0.0, 0.0);
        };
        Posing3DView.prototype.storeModels = function (modelFile) {
            this.axisModel = modelFile.modelResourceDictionary['Axis'];
            this.zTestShpereModel = modelFile.modelResourceDictionary['ZTestSphere'];
            this.zTestShpereEdgeModel = modelFile.modelResourceDictionary['ZTestSphereEdge'];
            this.headModel = modelFile.modelResourceDictionary['Head'];
            this.bodyModel = modelFile.modelResourceDictionary['Body1'];
        };
        Posing3DView.prototype.drawVisualImage = function (env) {
            var posingData = env.currentPosingData;
            var headLocationInputData = posingData.headLocationInputData;
            var headRotationInputData = posingData.headRotationInputData;
            var bodyLocationInputData = env.currentPosingData.bodyLocationInputData;
            this.render.setDepthTest(true);
            this.render.setCulling(true);
            this.render.clearColorBufferDepthBuffer(0.0, 0.0, 0.0, 0.0);
            this.caluculateCameraMatrix(posingData.real3DViewHalfWidth, env.mainWindow);
            if (this.isHeadDrawable(env)) {
                mat4.copy(this.modelMatrix, headRotationInputData.matrix);
                this.setShaderParameters(this.modelMatrix, this.posingFigureShader);
                this.posingFigureShader.setAlpha(1.0);
                this.drawModel(this.headModel.model, this.imageResurces[0].image);
                //this.render.clearDepthBuffer();
                //this.drawAxis(headRotationInputData.bodyRootMatrix, env);
            }
            if (this.isBodyDrawable(env)) {
                mat4.copy(this.modelMatrix, bodyLocationInputData.matrix);
                this.setShaderParameters(this.modelMatrix, this.posingFigureShader);
                this.posingFigureShader.setAlpha(1.0);
                this.drawModel(this.bodyModel.model, this.imageResurces[0].image);
            }
            if (this.isHeadSphereDrawable(env)) {
                this.render.clearDepthBuffer();
                mat4.copy(this.modelMatrix, headLocationInputData.matrix);
                var scale = env.currentPosingModel.headSphereSize * 1.1;
                mat4.scale(this.modelMatrix, this.modelMatrix, vec3.set(this.tempVec3, scale, scale, scale));
                this.drawZTestSphereVisual(this.modelMatrix, env);
            }
            if (this.isBodySphereDrawable(env)) {
                this.render.clearDepthBuffer();
                ManualTracingTool.Maths.getTranslationMat4(this.tempVec3, headRotationInputData.bodyRootMatrix);
                mat4.identity(this.tmpMatrix);
                mat4.translate(this.modelMatrix, this.tmpMatrix, this.tempVec3);
                var scale = env.currentPosingModel.bodySphereSize;
                mat4.scale(this.modelMatrix, this.modelMatrix, vec3.set(this.tempVec3, scale, scale, scale));
                this.drawZTestSphereVisual(this.modelMatrix, env);
            }
            if (this.isBodyDrawable(env)) {
                //this.render.clearDepthBuffer();
                //this.drawAxis(bodyLocationInputData.matrix, env);
            }
        };
        Posing3DView.prototype.drawPickingImage = function (env) {
            this.render.setDepthTest(true);
            this.render.setCulling(true);
            this.render.clearColorBufferDepthBuffer(0.0, 0.0, 0.0, 0.0);
            this.render.setBlendType(WebGLRenderBlendType.src);
            var posingData = env.currentPosingData;
            var headLocationInputData = posingData.headLocationInputData;
            if (this.isHeadSphereDrawable(env)) {
                mat4.copy(this.modelMatrix, headLocationInputData.matrix);
                var scale = env.currentPosingModel.headSphereSize * 1.1;
                mat4.scale(this.modelMatrix, this.modelMatrix, vec3.set(this.tempVec3, scale, scale, scale));
                this.drawZTestSphere(this.modelMatrix, env);
            }
            if (this.isBodySphereDrawable(env)) {
                mat4.copy(this.modelMatrix, headLocationInputData.matrix);
                mat4.translate(this.modelMatrix, this.modelMatrix, env.currentPosingModel.bodySphereLocation);
                var scale = env.currentPosingModel.bodySphereSize;
                mat4.scale(this.modelMatrix, this.modelMatrix, vec3.set(this.tempVec3, scale, scale, scale));
                this.drawZTestSphere(this.modelMatrix, env);
            }
            this.render.setBlendType(WebGLRenderBlendType.blend);
        };
        Posing3DView.prototype.isHeadSphereDrawable = function (env) {
            return (env.currentPosingData != null
                && env.currentPosingData.headLocationInputData.inputDone
                && (env.subToolIndex == ManualTracingTool.Posing3DSubToolID.locateHead || env.subToolIndex == ManualTracingTool.Posing3DSubToolID.rotateHead));
        };
        Posing3DView.prototype.isHeadDrawable = function (env) {
            return (env.currentPosingData != null
                && env.currentPosingData.headRotationInputData.inputDone);
        };
        Posing3DView.prototype.isBodySphereDrawable = function (env) {
            return (env.currentPosingData != null
                && env.currentPosingData.headLocationInputData.inputDone
                && env.currentPosingData.headRotationInputData.inputDone
                && (env.subToolIndex == ManualTracingTool.Posing3DSubToolID.locateBody || env.subToolIndex == ManualTracingTool.Posing3DSubToolID.rotateBody));
        };
        Posing3DView.prototype.isBodyDrawable = function (env) {
            return (env.currentPosingData != null
                && env.currentPosingData.bodyLocationInputData.inputDone);
        };
        Posing3DView.prototype.setShaderParameters = function (modelMatrix, shader) {
            var gl = this.render.gl;
            mat4.multiply(this.modelViewMatrix, this.viewMatrix, modelMatrix);
            mat4.copy(this.normalMatrix, this.modelViewMatrix);
            this.normalMatrix[12] = 0.0;
            this.normalMatrix[13] = 0.0;
            this.normalMatrix[14] = 0.0;
            this.render.setShader(shader);
            shader.setProjectionMatrix(this.projectionMatrix);
            shader.setModelViewMatrix(this.modelViewMatrix);
            shader.setNormalMatrix(this.normalMatrix);
        };
        Posing3DView.prototype.drawZTestSphereVisual = function (modelMatrix, env) {
            var modelResource = this.zTestShpereModel;
            this.setShaderParameters(this.modelMatrix, this.posingFigureShader);
            if (this.isHeadDrawable(env)) {
                this.posingFigureShader.setAlpha(0.3);
            }
            else {
                this.posingFigureShader.setAlpha(0.8);
            }
            this.drawModel(modelResource.model, this.imageResurces[0].image);
        };
        Posing3DView.prototype.drawZTestSphere = function (modelMatrix, env) {
            this.setShaderParameters(modelMatrix, this.depthShader);
            var modelResource1 = this.zTestShpereModel;
            this.drawModel(this.zTestShpereModel.model, this.imageResurces[0].image);
            var modelResource2 = this.zTestShpereEdgeModel;
            this.drawModel(this.zTestShpereEdgeModel.model, this.imageResurces[0].image);
        };
        Posing3DView.prototype.drawAxis = function (modelMatrix, env) {
            mat4.copy(this.modelMatrix, modelMatrix);
            var scale = 0.1;
            mat4.scale(this.modelMatrix, this.modelMatrix, vec3.set(this.tempVec3, scale, scale, scale));
            this.setShaderParameters(this.modelMatrix, this.posingFigureShader);
            this.posingFigureShader.setAlpha(0.5);
            this.drawModel(this.axisModel.model, this.imageResurces[0].image);
        };
        Posing3DView.prototype.drawModel = function (model, image) {
            var gl = this.render.gl;
            this.render.setBuffers(model, [image]);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, image.texture);
            this.render.drawElements(model);
        };
        Posing3DView.prototype.caluculateCameraMatrix = function (real3DViewHalfWidth, canvasWindow) {
            var viewScale = canvasWindow.viewScale;
            var real2DViewHalfWidth = canvasWindow.width / 2 / viewScale;
            var real2DViewHalfHeight = canvasWindow.height / 2 / viewScale;
            var aspect = canvasWindow.height / canvasWindow.width;
            var orthoWidth = real3DViewHalfWidth / viewScale;
            mat4.ortho(this.projectionMatrix, -orthoWidth, orthoWidth, -orthoWidth, orthoWidth, 0.1, 10.0);
            var viewOffsetX = -(canvasWindow.viewLocation[0]) / real2DViewHalfWidth; // Normalize to fit to ortho matrix range (0.0-1.0)
            var viewOffsetY = (canvasWindow.viewLocation[1]) / real2DViewHalfHeight;
            mat4.identity(this.tmpMatrix);
            mat4.scale(this.tmpMatrix, this.tmpMatrix, vec3.set(this.tempVec3, aspect, 1.0, 1.0));
            mat4.rotateZ(this.tmpMatrix, this.tmpMatrix, -canvasWindow.viewRotation * Math.PI / 180.0);
            mat4.translate(this.tmpMatrix, this.tmpMatrix, vec3.set(this.tempVec3, viewOffsetX / aspect, viewOffsetY, 0.0));
            mat4.multiply(this.projectionMatrix, this.tmpMatrix, this.projectionMatrix);
            mat4.invert(this.projectionInvMatrix, this.projectionMatrix);
            mat4.lookAt(this.viewMatrix, this.eyeLocation, this.lookatLocation, this.upVector);
            mat4.invert(this.cameraMatrix, this.viewMatrix);
        };
        Posing3DView.prototype.calculate3DLocationFrom2DLocation = function (result, real2DLocation, depth, real3DViewHalfWidth, canvasWindow) {
            this.caluculateCameraMatrix(real3DViewHalfWidth, canvasWindow);
            vec3.transformMat4(this.screenLocation, real2DLocation, canvasWindow.transformMatrix);
            var viewHalfWidth = canvasWindow.width / 2;
            var viewHalfHeight = canvasWindow.height / 2;
            this.screenLocation[0] = (this.screenLocation[0] - viewHalfWidth) / viewHalfWidth;
            this.screenLocation[1] = -(this.screenLocation[1] - viewHalfHeight) / viewHalfHeight;
            this.screenLocation[2] = 0.0;
            vec3.transformMat4(this.invProjectedVec3, this.screenLocation, this.projectionInvMatrix);
            this.invProjectedVec3[2] = -depth;
            vec3.transformMat4(result, this.invProjectedVec3, this.cameraMatrix);
        };
        Posing3DView.prototype.pick3DLocationFromDepthImage = function (result, location2d, real3DViewHalfWidth, pickingWindow) {
            vec3.transformMat4(this.tempVec3, location2d, pickingWindow.transformMatrix);
            if (this.tempVec3[0] < 0 || this.tempVec3[0] >= pickingWindow.width
                || this.tempVec3[1] < 0 || this.tempVec3[1] >= pickingWindow.height) {
                return false;
            }
            var imageData = pickingWindow.context.getImageData(Math.floor(this.tempVec3[0]), Math.floor(this.tempVec3[1]), 1, 1);
            var r = imageData.data[0];
            var g = imageData.data[1];
            var b = imageData.data[2];
            var a = imageData.data[3];
            if (r == 0 && g == 0 && b == 0) {
                return false;
            }
            var depth = (r / 255) + (g / Math.pow(255, 2)) + (b / Math.pow(255, 3));
            depth *= pickingWindow.maxDepth;
            this.calculate3DLocationFrom2DLocation(result, location2d, depth, real3DViewHalfWidth, pickingWindow);
            return true;
        };
        return Posing3DView;
    }());
    ManualTracingTool.Posing3DView = Posing3DView;
    var PosingFigureShader = (function (_super) {
        __extends(PosingFigureShader, _super);
        function PosingFigureShader() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.aPosition = -1;
            _this.aNormal = -1;
            _this.aTexCoord = -1;
            _this.uTexture0 = null;
            _this.uNormalMatrix = null;
            _this.uAlpha = null;
            return _this;
        }
        PosingFigureShader.prototype.initializeVertexSourceCode = function () {
            this.vertexShaderSourceCode = ''
                + this.floatPrecisionDefinitionCode
                + 'attribute vec3 aPosition;'
                + 'attribute vec3 aNormal;'
                + 'attribute vec2 aTexCoord;'
                + 'uniform mat4 uPMatrix;'
                + 'uniform mat4 uMVMatrix;'
                + 'uniform mat4 uNormalMatrix;'
                + 'varying vec3 vPosition;'
                + 'varying vec3 vNormal;'
                + 'varying vec2 vTexCoord;'
                + 'void main(void) {'
                + '	   gl_Position = uPMatrix * uMVMatrix * vec4(aPosition, 1.0);'
                + '	   vPosition = (uMVMatrix * vec4(aPosition, 1.0)).xyz;'
                + '    vNormal = (uNormalMatrix * vec4(aNormal, 1.0)).xyz;'
                + '    vTexCoord = aTexCoord;'
                + '}';
        };
        PosingFigureShader.prototype.initializeFragmentSourceCode = function () {
            this.fragmentShaderSourceCode = ''
                + this.floatPrecisionDefinitionCode
                + 'varying vec3 vPosition;'
                + 'varying vec3 vNormal;'
                + 'varying vec2 vTexCoord;'
                + 'uniform sampler2D uTexture0;'
                + 'uniform float uAlpha;'
                + 'void main(void) {'
                + "    vec3  directionalLight = normalize(vec3(0.0, 1.0, 1.0));"
                + "    vec3  nnormal = normalize(vNormal);"
                + "    float directional = clamp(dot(nnormal, directionalLight), 0.0, 1.0);"
                + "    vec3  viewVec = normalize(vPosition);"
                + "    float specular = pow(max(dot(nnormal, normalize(directionalLight - viewVec)), 0.0), 5.0);"
                + "    vec4 texColor = texture2D(uTexture0, vTexCoord);"
                + '    gl_FragColor = vec4(texColor.rgb * 0.2 + texColor.rgb * directional * 0.8, texColor.a * uAlpha);'
                + '}';
        };
        PosingFigureShader.prototype.initializeAttributes = function () {
            this.initializeAttributes_RenderShader();
            this.initializeAttributes_PosingFigureShader();
        };
        PosingFigureShader.prototype.initializeAttributes_PosingFigureShader = function () {
            var gl = this.gl;
            this.aPosition = this.getAttribLocation('aPosition');
            this.aNormal = this.getAttribLocation('aNormal');
            this.aTexCoord = this.getAttribLocation('aTexCoord');
            this.uTexture0 = this.getUniformLocation('uTexture0');
            this.uNormalMatrix = this.getUniformLocation('uNormalMatrix');
            this.uAlpha = this.getUniformLocation('uAlpha');
        };
        PosingFigureShader.prototype.setBuffers = function (model, images) {
            var gl = this.gl;
            gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
            this.enableVertexAttributes();
            this.resetVertexAttribPointerOffset();
            this.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, model.vertexDataStride);
            this.vertexAttribPointer(this.aNormal, 3, gl.FLOAT, model.vertexDataStride);
            this.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, model.vertexDataStride);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, images[0].texture);
            gl.uniform1i(this.uTexture0, 0);
        };
        PosingFigureShader.prototype.setNormalMatrix = function (matrix) {
            this.gl.uniformMatrix4fv(this.uNormalMatrix, false, matrix);
        };
        PosingFigureShader.prototype.setAlpha = function (alpha) {
            this.gl.uniform1f(this.uAlpha, alpha);
        };
        return PosingFigureShader;
    }(RenderShader));
    ManualTracingTool.PosingFigureShader = PosingFigureShader;
    var DepthShader = (function (_super) {
        __extends(DepthShader, _super);
        function DepthShader() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.uMaxDepth = null;
            return _this;
        }
        DepthShader.prototype.initializeFragmentSourceCode = function () {
            this.fragmentShaderSourceCode = ''
                + this.floatPrecisionDefinitionCode
                + 'varying vec3 vPosition;'
                + 'varying vec3 vNormal;'
                + 'varying vec2 vTexCoord;'
                + 'uniform sampler2D uTexture0;'
                + 'uniform float uMaxDepth;'
                + 'uniform float uAlpha;'
                + 'void main(void) {'
                + '    float z1 = (-vPosition.z) / uMaxDepth * 255.0;'
                + '    float z2 = fract(z1) * 255.0;'
                + '    float z3 = fract(z2) * 255.0;'
                + '    float z4 = fract(z3) * 255.0;'
                + '    float r = z1 / 255.0;'
                + '    float g = z2 / 255.0;'
                + '    float b = z3 / 255.0;'
                + '    float a = z4 / 255.0;'
                + '    gl_FragColor = vec4(r, g, b , 1.0);'
                + '}';
        };
        DepthShader.prototype.initializeAttributes = function () {
            this.initializeAttributes_RenderShader();
            this.initializeAttributes_PosingFigureShader();
            this.initializeAttributes_DepthShader();
        };
        DepthShader.prototype.initializeAttributes_DepthShader = function () {
            this.uMaxDepth = this.getUniformLocation('uMaxDepth');
        };
        DepthShader.prototype.setMaxDepth = function (depth) {
            this.gl.uniform1f(this.uMaxDepth, depth);
        };
        return DepthShader;
    }(PosingFigureShader));
    ManualTracingTool.DepthShader = DepthShader;
})(ManualTracingTool || (ManualTracingTool = {}));
