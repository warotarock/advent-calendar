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
    var Main = (function () {
        function Main() {
            this.mainWindow = new ManualTracingTool.CanvasWindow();
            this.editorWindow = new ManualTracingTool.CanvasWindow();
            this.layerWindow = new LayerWindow();
            this.webglWindow = new ManualTracingTool.CanvasWindow();
            this.pickingWindow = new PickingWindow();
            this.canvasRender = new ManualTracingTool.CanvasRender();
            this.webGLRender = new WebGLRender();
            // Integrated tool system
            this.mainTools = new List();
            this.toolContext = null;
            this.toolEnv = null;
            this.toolMouseEvent = new ManualTracingTool.ToolMouseEvent();
            this.systemImage = null;
            this.subToolImages = new List();
            // Drawing tools
            this.currentTool = null;
            this.tool_DrawLine = new ManualTracingTool.Tool_DrawLine();
            this.tool_AddPoint = new ManualTracingTool.Tool_AddPoint();
            this.tool_ScratchLine = new ManualTracingTool.Tool_ScratchLine();
            this.currentSelectTool = null;
            this.tool_BrushSelect = new ManualTracingTool.Tool_Select_BrushSelet();
            this.selector_LineClosingHitTest = new ManualTracingTool.Selector_LinePoint_LineClosingHitTest();
            // Posing tools
            this.posing3dView = new ManualTracingTool.Posing3DView();
            this.posing3DLogic = new ManualTracingTool.Posing3DLogic();
            this.tool_Posing3d_LocateHead = new ManualTracingTool.Tool_Posing3d_LocateHead();
            this.tool_Posing3d_RotateHead = new ManualTracingTool.Tool_Posing3d_RotateHead();
            this.tool_Posing3d_TwistHead = new ManualTracingTool.Tool_Posing3d_TwistHead();
            this.tool_Posing3d_LocateBody = new ManualTracingTool.Tool_Posing3d_LocateBody();
            this.tool_Posing3d_RatateBody = new ManualTracingTool.Tool_Posing3d_RatateBody();
            this.tool_Posing3d_LocateLeftArm1 = new ManualTracingTool.Tool_Posing3d_LocateLeftArm1();
            this.tool_Posing3d_LocateLeftArm2 = new ManualTracingTool.Tool_Posing3d_LocateLeftArm2();
            this.tool_Posing3d_LocateRightArm1 = new ManualTracingTool.Tool_Posing3d_LocateRightArm1();
            this.tool_Posing3d_LocateRightArm2 = new ManualTracingTool.Tool_Posing3d_LocateRightArm2();
            this.tool_Posing3d_LocateLeftLeg1 = new ManualTracingTool.Tool_Posing3d_LocateLeftLeg1();
            this.tool_Posing3d_LocateLeftLeg2 = new ManualTracingTool.Tool_Posing3d_LocateLeftLeg2();
            this.tool_Posing3d_LocateRightLeg1 = new ManualTracingTool.Tool_Posing3d_LocateRightLeg1();
            this.tool_Posing3d_LocateRightLeg2 = new ManualTracingTool.Tool_Posing3d_LocateRightLeg2();
            this.imageResurces = new List();
            this.modelFile = new ManualTracingTool.ModelFile();
            this.modelResources = new List();
            // Document data
            this.document = null;
            this.tempFileName = 'Manual tracing tool save data';
            // Work variable
            this.view2DMatrix = mat4.create();
            this.invView2DMatrix = mat4.create();
            this.tempVec3 = vec3.create();
            this.linePointColor = vec3.fromValues(0.0, 0.0, 0.0);
            this.testColor = vec3.fromValues(0.0, 0.7, 0.0);
            this.sampleColor = vec3.fromValues(0.0, 0.5, 1.0);
            this.extColor = vec3.fromValues(0.0, 0.0, 0.0);
            this.isLoaded = false;
            // Main window drawing
            this.dragBeforeTransformMatrix = mat4.create();
            this.dragBeforeViewLocation = vec3.create();
            // Editor window drawing
            this.tool_ScratchLine_EditLine_Visible = true;
            this.tool_ScratchLine_TargetLine_Visible = true;
            this.tool_ScratchLine_SampledLine_Visible = true;
            this.tool_ScratchLine_CandidatePoints_Visible = false;
            // Layer window drawing
            this.layerWindowItems = null;
            this.layerWindowBackgroundColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
            this.layerWindowItemSelectedColor = vec4.fromValues(0.9, 0.9, 1.0, 1.0);
            this.subToolViewItems = null;
            this.subToolItemSelectedColor = vec4.fromValues(0.9, 0.9, 1.0, 1.0);
            this.subToolItemSeperatorLineColor = vec4.fromValues(0.0, 0.0, 0.0, 0.5);
            // Footer window drawing
            this.footerText = '';
            this.footerTextBefore = '';
        }
        // Loading
        Main.prototype.startLoading = function () {
            this.resizeWindows();
            this.mainWindow.context = this.mainWindow.canvas.getContext('2d');
            this.editorWindow.context = this.editorWindow.canvas.getContext('2d');
            this.layerWindow.context = this.layerWindow.canvas.getContext('2d');
            this.pickingWindow.context = this.pickingWindow.canvas.getContext('2d');
            this.canvasRender.setContext(this.layerWindow);
            this.canvasRender.setFontSize(18.0);
            if (this.webGLRender.initializeWebGL(this.webglWindow.canvas)) {
                throw ('３Ｄ機能を初期化できませんでした。');
            }
            this.posing3dView.initialize(this.webGLRender, this.pickingWindow);
            // Start loading
            this.modelFile.file('models.json');
            this.imageResurces.push(new ManualTracingTool.ImageResource().file('texture01.png'));
            this.imageResurces.push(new ManualTracingTool.ImageResource().file('system_image01.png').tex(false));
            this.imageResurces.push(new ManualTracingTool.ImageResource().file('toolbar_image01.png').tex(false));
            this.loadModels(this.modelFile, './res/' + this.modelFile.fileName);
            for (var _i = 0, _a = this.imageResurces; _i < _a.length; _i++) {
                var imageResource = _a[_i];
                this.loadTexture(imageResource, './res/' + imageResource.fileName);
            }
        };
        Main.prototype.processLoading = function () {
            if (!this.modelFile.loaded) {
                return;
            }
            for (var _i = 0, _a = this.imageResurces; _i < _a.length; _i++) {
                var imageResource = _a[_i];
                if (!imageResource.loaded) {
                    return;
                }
            }
            // Loading finished
            this.start();
        };
        Main.prototype.loadTexture = function (imageResource, url) {
            var _this = this;
            var image = new Image();
            imageResource.image.imageData = image;
            image.addEventListener('load', function () {
                if (imageResource.isGLTexture) {
                    _this.webGLRender.initializeImageTexture(imageResource.image);
                }
                imageResource.loaded = true;
            });
            image.src = url;
        };
        Main.prototype.loadModels = function (modelFile, url) {
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
                    var modelResource = new ManualTracingTool.ModelResource();
                    modelResource.modelName = modelData.name;
                    _this.webGLRender.initializeModelBuffer(modelResource.model, modelData.vertices, modelData.indices, 4 * modelData.vertexStride); // 4 = size of float
                    modelFile.modelResources.push(modelResource);
                    modelFile.modelResourceDictionary[modelData.name] = modelResource;
                }
                modelFile.loaded = true;
            });
            xhr.send();
        };
        // Starting ups
        Main.prototype.start = function () {
            this.initializeDocument();
            this.initializeContext();
            this.initializeTools();
            this.initializeViews();
            this.isLoaded = true;
            this.toolEnv.setRedrawMainWindowEditorWindow();
            this.toolEnv.setRedrawLayerWindow();
            this.updateFooterMessage();
            this.setEvents();
            // debug
            this.setCurrentLayer(this.document.layers[3]);
            this.toolEnv.updateContext();
            this.posing3dView.buildDrawingStructures(this.toolEnv);
        };
        Main.prototype.initializeDocument = function () {
            var saveData = window.localStorage.getItem(this.tempFileName);
            if (saveData) {
                this.document = JSON.parse(saveData);
                return;
            }
            this.document = new ManualTracingTool.DocumentData();
            {
                var layer1 = new ManualTracingTool.VectorLayer();
                layer1.name = 'layer1';
                this.document.layers.push(layer1);
                var group1 = new ManualTracingTool.VectorGroup();
                layer1.groups.push(group1);
            }
            {
                var layer1 = new ManualTracingTool.GroupLayer();
                layer1.name = 'group1';
                this.document.layers.push(layer1);
                var layer2 = new ManualTracingTool.VectorLayer();
                layer2.name = 'child1';
                layer1.childLayers.push(layer2);
                var group2 = new ManualTracingTool.VectorGroup();
                layer2.groups.push(group2);
            }
            {
                var layer1 = new ManualTracingTool.VectorLayer();
                layer1.name = 'background';
                this.document.layers.push(layer1);
                var group1 = new ManualTracingTool.VectorGroup();
                layer1.groups.push(group1);
            }
            {
                var layer1 = new ManualTracingTool.PosingLayer();
                layer1.name = 'posing1';
                this.document.layers.push(layer1);
            }
        };
        Main.prototype.initializeContext = function () {
            this.toolContext = new ManualTracingTool.ToolContext();
            this.toolContext.mainWindow = this.mainWindow;
            this.toolContext.pickingWindow = this.pickingWindow;
            this.toolContext.posing3DView = this.posing3dView;
            this.toolContext.posing3DLogic = this.posing3DLogic;
            this.toolContext.document = this.document;
            this.toolContext.commandHistory = new ManualTracingTool.CommandHistory();
        };
        Main.prototype.initializeViews = function () {
            this.collectLayerWindowItems();
            this.mainWindow.centerLocationRate[0] = 0.5;
            this.mainWindow.centerLocationRate[1] = 0.5;
        };
        Main.prototype.initializeTools = function () {
            // Constructs main tools and sub tools structure
            this.mainTools.push(new ManualTracingTool.MainTool().id(ManualTracingTool.MainToolID.none));
            this.mainTools.push(new ManualTracingTool.MainTool().id(ManualTracingTool.MainToolID.drawLine)
                .subTool(this.tool_DrawLine));
            this.mainTools.push(new ManualTracingTool.MainTool().id(ManualTracingTool.MainToolID.scratchLine)
                .subTool(this.tool_ScratchLine));
            this.mainTools.push(new ManualTracingTool.MainTool().id(ManualTracingTool.MainToolID.posing)
                .subTool(this.tool_Posing3d_LocateHead)
                .subTool(this.tool_Posing3d_RotateHead)
                .subTool(this.tool_Posing3d_LocateBody)
                .subTool(this.tool_Posing3d_RatateBody)
                .subTool(this.tool_Posing3d_LocateRightArm1)
                .subTool(this.tool_Posing3d_LocateRightArm2)
                .subTool(this.tool_Posing3d_LocateLeftArm1)
                .subTool(this.tool_Posing3d_LocateLeftArm2)
                .subTool(this.tool_Posing3d_LocateRightLeg1)
                .subTool(this.tool_Posing3d_LocateRightLeg2)
                .subTool(this.tool_Posing3d_LocateLeftLeg1)
                .subTool(this.tool_Posing3d_LocateLeftLeg2)
                .subTool(this.tool_Posing3d_TwistHead));
            // Constructs current tool states
            this.toolEnv = new ManualTracingTool.ToolEnvironment(this.toolContext);
            //this.currentTool = this.tool_DrawLine;
            //this.currentTool = this.tool_AddPoint;
            //this.currentTool = this.tool_ScratchLine;
            this.currentTool = this.tool_Posing3d_LocateHead;
            this.currentSelectTool = this.tool_BrushSelect;
            this.systemImage = this.imageResurces[1];
            this.subToolImages.push(this.imageResurces[2]);
            this.posing3dView.storeResources(this.modelFile, this.imageResurces);
        };
        Main.prototype.setEvents = function () {
            var _this = this;
            this.editorWindow.canvas.addEventListener('mousedown', function (e) {
                _this.mainWindow_mousedown(e);
            });
            this.editorWindow.canvas.addEventListener('mousemove', function (e) {
                _this.mainWindow_mousemove(e);
            });
            this.editorWindow.canvas.addEventListener('mouseup', function (e) {
                _this.mainWindow_mouseup(e);
            });
            this.editorWindow.canvas.addEventListener('mousewheel', function (e) {
                _this.editorWindow_mousewheel(e);
            });
            this.layerWindow.canvas.addEventListener('mousedown', function (e) {
                _this.layerWindow_mousedown(e);
            });
            document.addEventListener('keydown', function (e) {
                _this.document_keydown(e);
            });
            document.addEventListener('keyup', function (e) {
                _this.document_keyup(e);
            });
            window.addEventListener('resize', function (e) {
                _this.htmlWindow_resize(e);
            });
            window.addEventListener('contextmenu', function (e) {
                return _this.htmlWindow_contextmenu(e);
            });
        };
        // Continuous processes
        Main.prototype.run = function () {
        };
        // Events
        Main.prototype.mainWindow_mousedown = function (e) {
            if (!this.isLoaded) {
                return;
            }
            this.getMouseInfo(e, this.mainWindow);
            var context = this.toolContext;
            this.toolEnv.updateContext();
            // Draw mode
            if (context.editMode == ManualTracingTool.EditModeID.drawMode) {
                this.currentTool.mouseDown(this.toolMouseEvent, this.toolEnv);
            }
            else if (context.editMode == ManualTracingTool.EditModeID.selectMode) {
                this.currentSelectTool.mouseDown(this.toolMouseEvent, this.toolEnv);
            }
            // View operation
            if (this.toolMouseEvent.isRightButtonPressing()) {
                this.mainWindow_MouseViewOperationStart();
            }
            else {
                this.mainWindow_MouseViewOperationEnd();
            }
            e.preventDefault();
        };
        Main.prototype.mainWindow_MouseViewOperationStart = function () {
            this.toolMouseEvent.isMouseDragging = true;
            mat4.copy(this.dragBeforeTransformMatrix, this.invView2DMatrix);
            vec3.copy(this.dragBeforeViewLocation, this.mainWindow.viewLocation);
            vec3.copy(this.toolMouseEvent.mouseDownLocation, this.toolMouseEvent.location);
            vec3.set(this.toolMouseEvent.mouseMovedVector, 0.0, 0.0, 0.0);
        };
        Main.prototype.mainWindow_MouseViewOperationEnd = function () {
            this.toolMouseEvent.isMouseDragging = false;
        };
        Main.prototype.mainWindow_mousemove = function (e) {
            if (!this.isLoaded) {
                return;
            }
            this.getMouseInfo(e, this.mainWindow);
            var context = this.toolContext;
            this.toolEnv.updateContext();
            // Draw mode
            if (context.editMode == ManualTracingTool.EditModeID.drawMode) {
                this.currentTool.mouseMove(this.toolMouseEvent, this.toolEnv);
            }
            else if (context.editMode == ManualTracingTool.EditModeID.selectMode) {
                var isSelectionChanged = this.mousemoveHittest(this.toolMouseEvent.location[0], this.toolMouseEvent.location[1], this.toolContext.mouseCursorRadius);
                if (isSelectionChanged) {
                    this.toolEnv.setRedrawMainWindow();
                }
                this.currentSelectTool.mouseMove(this.toolMouseEvent, this.toolEnv);
            }
            // View operation
            if (this.toolMouseEvent.isMouseDragging) {
                vec3.set(this.tempVec3, this.toolMouseEvent.offsetX, this.toolMouseEvent.offsetY, 0.0);
                vec3.transformMat4(this.tempVec3, this.tempVec3, this.dragBeforeTransformMatrix);
                vec3.subtract(this.toolMouseEvent.mouseMovedVector, this.toolMouseEvent.mouseDownLocation, this.tempVec3);
                vec3.add(this.mainWindow.viewLocation, this.dragBeforeViewLocation, this.toolMouseEvent.mouseMovedVector);
                this.toolEnv.setRedrawMainWindowEditorWindow();
                this.toolEnv.setRedrawWebGLWindow();
            }
        };
        Main.prototype.mainWindow_mouseup = function (e) {
            if (!this.isLoaded) {
                return;
            }
            this.getMouseInfo(e, this.mainWindow);
            var context = this.toolContext;
            this.toolEnv.updateContext();
            // Draw mode
            if (context.editMode == ManualTracingTool.EditModeID.drawMode) {
                this.currentTool.mouseUp(this.toolMouseEvent, this.toolEnv);
            }
            else if (context.editMode == ManualTracingTool.EditModeID.selectMode) {
                this.currentSelectTool.mouseUp(this.toolMouseEvent, this.toolEnv);
            }
            this.mainWindow_MouseViewOperationEnd();
            e.preventDefault();
        };
        Main.prototype.layerWindow_mousedown = function (e) {
            if (!this.isLoaded) {
                return;
            }
            var context = this.toolContext;
            var layerWindow = this.layerWindow;
            this.getMouseInfo(e, layerWindow);
            this.toolEnv.updateContext();
            var clickedX = this.toolMouseEvent.location[0];
            var clickedY = this.toolMouseEvent.location[1];
            if (this.toolMouseEvent.location[1] < layerWindow.layerWindowPainY) {
                // Layer window item click
                var selectedIndex = Math.floor(clickedY / layerWindow.itemHeight);
                if (selectedIndex < this.layerWindowItems.length) {
                    var selectedItem = this.layerWindowItems[selectedIndex];
                    var selectedLayer = selectedItem.layer;
                    // Select layer content
                    this.setCurrentLayer(selectedLayer);
                }
                this.toolEnv.setRedrawLayerWindow();
            }
            else {
                // Sub tool click
                if (context.mainToolID == ManualTracingTool.MainToolID.none) {
                    return;
                }
                var selectedIndex = Math.floor((clickedY - layerWindow.layerWindowPainY) / (layerWindow.subToolItemUnitHeight * layerWindow.subToolItemScale));
                if (selectedIndex < this.subToolViewItems.length) {
                    var viewItem = this.subToolViewItems[selectedIndex];
                    var tool = viewItem.tool;
                    if (tool.isAvailable(this.toolEnv)) {
                        // Change current sub tool
                        this.setCurrentSubTool(selectedIndex);
                        this.updateFooterMessage();
                        this.toolEnv.setRedrawMainWindowEditorWindow();
                        this.toolEnv.setRedrawLayerWindow();
                        // Option button click
                        for (var _i = 0, _a = viewItem.buttons; _i < _a.length; _i++) {
                            var button = _a[_i];
                            if (clickedX >= button.left && clickedX <= button.right
                                && clickedY >= button.top && clickedY <= button.bottom) {
                                var inpuSideID = tool.getInputSideID(button.index, this.toolEnv);
                                if (tool.setInputSide(button.index, inpuSideID, this.toolEnv)) {
                                    this.toolEnv.setRedrawMainWindowEditorWindow();
                                    this.toolEnv.setRedrawLayerWindow();
                                }
                            }
                        }
                    }
                }
            }
            e.preventDefault();
        };
        Main.prototype.editorWindow_mousewheel = function (e) {
            if (!this.isLoaded) {
                return;
            }
            this.getWheelInfo(e);
            // View operation
            if (this.toolMouseEvent.wheelDelta != 0.0
                && !this.toolMouseEvent.isMouseDragging) {
                this.mainWindow.addViewScale(this.toolMouseEvent.wheelDelta * 0.1);
                this.toolEnv.setRedrawMainWindowEditorWindow();
                this.toolEnv.setRedrawWebGLWindow();
            }
            e.preventDefault();
        };
        Main.prototype.document_keydown = function (e) {
            if (!this.isLoaded) {
                return;
            }
            var context = this.toolContext;
            this.toolContext.shiftKey = e.shiftKey;
            this.toolContext.altKey = e.altKey;
            this.toolContext.ctrlKey = e.ctrlKey;
            if (e.key == 'Tab') {
                // Change mode
                if (context.editMode == ManualTracingTool.EditModeID.drawMode) {
                    context.editMode = ManualTracingTool.EditModeID.selectMode;
                }
                else {
                    context.editMode = ManualTracingTool.EditModeID.drawMode;
                }
                /// Update footer message
                this.updateFooterMessage();
                this.toolEnv.setRedrawMainWindowEditorWindow();
                return e.preventDefault();
            }
            if (e.key == 'e') {
                if (context.editMode == ManualTracingTool.EditModeID.drawMode) {
                    this.currentTool = this.tool_ScratchLine;
                    this.updateFooterMessage();
                    this.toolEnv.setRedrawMainWindow();
                }
                return;
            }
            if (e.key == 'b') {
                if (context.editMode == ManualTracingTool.EditModeID.drawMode) {
                    this.currentTool = this.tool_DrawLine;
                    this.updateFooterMessage();
                    this.toolEnv.setRedrawMainWindow();
                }
                return;
            }
            if (e.key == 'p') {
                if (context.editMode == ManualTracingTool.EditModeID.drawMode) {
                    if (this.currentTool == this.tool_Posing3d_LocateHead) {
                        this.currentTool = this.tool_Posing3d_RotateHead;
                    }
                    else {
                        this.currentTool = this.tool_Posing3d_LocateHead;
                    }
                    this.updateFooterMessage();
                    this.toolEnv.setRedrawMainWindow();
                    this.toolEnv.setRedrawLayerWindow();
                }
                return;
            }
            if (e.key == 'z') {
                this.toolContext.commandHistory.undo();
                this.toolEnv.setRedrawMainWindow();
                return;
            }
            if (e.key == 'y') {
                this.toolContext.commandHistory.redo();
                this.toolEnv.setRedrawMainWindow();
                return;
            }
            if (e.key == 'Delete') {
                if (context.editMode == ManualTracingTool.EditModeID.selectMode) {
                    if (this.toolContext.currentLayer != null
                        && this.toolContext.currentLayer.type == ManualTracingTool.LayerTypeID.vectorLayer) {
                        var command = new ManualTracingTool.Command_DeletePoints();
                        if (command.collectEditTargets((this.toolContext.currentLayer))) {
                            command.execute();
                            this.toolContext.commandHistory.addCommand(command);
                        }
                        this.toolEnv.setRedrawMainWindow();
                    }
                }
                return;
            }
            if (e.key == 's' && this.toolEnv.isCtrlKeyPressing()) {
                window.localStorage.setItem(this.tempFileName, JSON.stringify(this.document));
                e.preventDefault();
                return;
            }
            if (e.key == 'Home' || e.key == 'q') {
                this.mainWindow.viewLocation[0] = 0.0;
                this.mainWindow.viewLocation[1] = 0.0;
                this.mainWindow.viewScale = 1.0;
                this.mainWindow.viewRotation = 0.0;
                this.toolEnv.setRedrawMainWindowEditorWindow();
                e.preventDefault();
                return;
            }
            if (e.key == 't' || e.key == 'r') {
                var rot = 10.0;
                if (e.key == 'r') {
                    rot = -rot;
                }
                this.mainWindow.viewRotation += rot;
                if (this.mainWindow.viewRotation >= 360.0) {
                    this.mainWindow.viewRotation -= 360.0;
                }
                if (this.mainWindow.viewRotation <= 0.0) {
                    this.mainWindow.viewRotation += 360.0;
                }
                this.toolEnv.setRedrawMainWindowEditorWindow();
                e.preventDefault();
                return;
            }
            if (e.key == 'f' || e.key == 'd') {
                var addScale = 0.1;
                if (e.key == 'd') {
                    addScale = -addScale;
                }
                this.mainWindow.addViewScale(addScale);
                this.toolEnv.setRedrawMainWindowEditorWindow();
                e.preventDefault();
                return;
            }
            if (e.key == 'ArrowLeft' || e.key == 'ArrowRight' || e.key == 'ArrowUp' || e.key == 'ArrowDown') {
                var x = 0.0;
                var y = 0.0;
                if (e.key == 'ArrowLeft') {
                    x = -10.0;
                }
                if (e.key == 'ArrowRight') {
                    x = 10.0;
                }
                if (e.key == 'ArrowUp') {
                    y = -10.0;
                }
                if (e.key == 'ArrowDown') {
                    y = 10.0;
                }
                this.mainWindow.calculateViewUnitMatrix(this.view2DMatrix);
                mat4.invert(this.invView2DMatrix, this.view2DMatrix);
                vec3.set(this.tempVec3, x, y, 0.0);
                vec3.transformMat4(this.tempVec3, this.tempVec3, this.invView2DMatrix);
                vec3.add(this.mainWindow.viewLocation, this.mainWindow.viewLocation, this.tempVec3);
                var leftLimit = this.mainWindow.width * (-0.5);
                var rightLimit = this.mainWindow.width * 1.5;
                var topLimit = this.mainWindow.height * (-0.5);
                var bottomLimit = this.mainWindow.height * 1.5;
                if (this.mainWindow.viewLocation[0] < leftLimit) {
                    this.mainWindow.viewLocation[0] = leftLimit;
                }
                if (this.mainWindow.viewLocation[0] > rightLimit) {
                    this.mainWindow.viewLocation[0] = rightLimit;
                }
                if (this.mainWindow.viewLocation[1] < topLimit) {
                    this.mainWindow.viewLocation[1] = topLimit;
                }
                if (this.mainWindow.viewLocation[1] > bottomLimit) {
                    this.mainWindow.viewLocation[1] = bottomLimit;
                }
                this.toolEnv.setRedrawMainWindowEditorWindow();
                e.preventDefault();
                return;
            }
            if (e.key == ' ') {
                this.mainWindow_MouseViewOperationStart();
                e.preventDefault();
                return;
            }
        };
        Main.prototype.document_keyup = function (e) {
            this.toolContext.shiftKey = e.shiftKey;
            this.toolContext.altKey = e.altKey;
            this.toolContext.ctrlKey = e.ctrlKey;
            if (e.key == ' ') {
                this.mainWindow_MouseViewOperationEnd();
            }
        };
        Main.prototype.htmlWindow_resize = function (e) {
            this.resizeWindows();
            this.toolEnv.setRedrawMainWindowEditorWindow();
            this.toolEnv.setRedrawLayerWindow();
        };
        Main.prototype.htmlWindow_contextmenu = function (e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            else if (e.returnValue) {
                e.returnValue = false;
            }
            return false;
        };
        // Tools and context operations
        Main.prototype.getCurrentMainTool = function () {
            return this.mainTools[this.toolContext.mainToolID];
        };
        Main.prototype.setCurrentSubTool = function (subToolIndex) {
            var mainTool = this.getCurrentMainTool();
            mainTool.currentSubToolIndex = subToolIndex;
            this.toolContext.subToolIndex = subToolIndex;
            this.currentTool = mainTool.subTools[subToolIndex];
        };
        Main.prototype.setCurrentLayer = function (layer) {
            this.toolContext.currentLayer = layer;
            if (layer.type == ManualTracingTool.LayerTypeID.vectorLayer) {
                var vectorLayer = layer;
                this.toolContext.currentVectorLayer = vectorLayer;
                this.toolContext.currentVectorGroup = vectorLayer.groups[0];
            }
            else {
                this.toolContext.currentVectorGroup = null;
            }
            if (layer.type == ManualTracingTool.LayerTypeID.posingLayer) {
                var posingLayer = layer;
                this.toolContext.currentPosingData = posingLayer.posingData;
                this.toolContext.currentPosingModel = posingLayer.posingModel;
            }
            else {
                this.toolContext.currentPosingData = null;
            }
            for (var _i = 0, _a = this.layerWindowItems; _i < _a.length; _i++) {
                var item = _a[_i];
                item.layer.isSelected = false;
            }
            layer.isSelected = true;
        };
        // View operations
        Main.prototype.resizeWindows = function () {
            this.resizeCanvasToParent(this.mainWindow);
            this.fitCanvas(this.editorWindow, this.mainWindow);
            this.fitCanvas(this.webglWindow, this.mainWindow);
            this.fitCanvas(this.pickingWindow, this.mainWindow);
            this.resizeCanvasToParent(this.layerWindow);
            this.caluculateLayerWindowLayout(this.layerWindow);
        };
        Main.prototype.resizeCanvasToParent = function (canvasWindow) {
            canvasWindow.width = canvasWindow.canvas.parentElement.clientWidth;
            canvasWindow.height = canvasWindow.canvas.parentElement.clientHeight;
            canvasWindow.canvas.width = canvasWindow.width;
            canvasWindow.canvas.height = canvasWindow.height;
        };
        Main.prototype.fitCanvas = function (canvasWindow, fitToWindow) {
            canvasWindow.width = fitToWindow.width;
            canvasWindow.height = fitToWindow.height;
            canvasWindow.canvas.width = canvasWindow.width;
            canvasWindow.canvas.height = canvasWindow.height;
        };
        Main.prototype.getMouseInfo = function (e, canvasWindow) {
            this.toolMouseEvent.button = e.button;
            this.toolMouseEvent.buttons = e.buttons;
            this.toolMouseEvent.offsetX = e.offsetX;
            this.toolMouseEvent.offsetY = e.offsetY;
            canvasWindow.caluclateViewMatrix(this.view2DMatrix);
            mat4.invert(this.invView2DMatrix, this.view2DMatrix);
            vec3.set(this.tempVec3, e.offsetX, e.offsetY, 0.0);
            vec3.transformMat4(this.toolMouseEvent.location, this.tempVec3, this.invView2DMatrix);
            //console.log(e.offsetX.toFixed(2) + ',' + e.offsetY.toFixed(2) + '  ' + this.toolMouseEvent.location[0].toFixed(2) + ',' + this.toolMouseEvent.location[1].toFixed(2));
        };
        Main.prototype.getWheelInfo = function (e) {
            var wheelDelta = 0.0;
            if ('wheelDelta' in e) {
                wheelDelta = e['wheelDelta'];
            }
            else if ('deltaY' in e) {
                wheelDelta = e['deltaY'];
            }
            else if ('wheelDeltaY' in e) {
                wheelDelta = e['wheelDeltaY'];
            }
            if (wheelDelta > 0) {
                wheelDelta = 1.0;
            }
            else if (wheelDelta < 0) {
                wheelDelta = -1.0;
            }
            this.toolMouseEvent.wheelDelta = wheelDelta;
        };
        Main.prototype.draw = function () {
            this.toolEnv.updateContext();
            if (this.footerText != this.footerTextBefore) {
                document.getElementById('footer').innerHTML = this.footerText;
                this.footerTextBefore = this.footerText;
            }
            if (this.toolContext.redrawMainWindow) {
                this.toolContext.redrawMainWindow = false;
                this.clearWindow(this.mainWindow);
                this.drawMainWindow(this.mainWindow);
            }
            if (this.toolContext.redrawEditorWindow) {
                this.toolContext.redrawEditorWindow = false;
                this.clearWindow(this.editorWindow);
                this.drawEditorWindow(this.editorWindow, this.mainWindow);
            }
            if (this.toolContext.redrawLayerWindow) {
                this.toolContext.redrawLayerWindow = false;
                this.clearWindow(this.layerWindow);
                this.drawLayerWindow(this.layerWindow);
            }
            if (this.toolContext.redrawWebGLWindow) {
                this.toolContext.redrawWebGLWindow = false;
                this.drawWebGLWindow(this.mainWindow, this.webglWindow, this.pickingWindow);
            }
        };
        Main.prototype.clearWindow = function (canvasWindow) {
            this.canvasRender.setContext(canvasWindow);
            this.canvasRender.clearRect(0, 0, canvasWindow.canvas.width, canvasWindow.canvas.height);
        };
        Main.prototype.drawMainWindow = function (canvasWindow) {
            this.canvasRender.setContext(canvasWindow);
            for (var _i = 0, _a = this.document.layers; _i < _a.length; _i++) {
                var layer = _a[_i];
                this.drawLayerRecursive(canvasWindow, layer);
            }
        };
        Main.prototype.drawLayerRecursive = function (canvasWindow, layer) {
            if (layer.type == ManualTracingTool.LayerTypeID.vectorLayer) {
                var vectorLayer = layer;
                this.drawVectorLayer(canvasWindow, vectorLayer);
            }
            else if (layer.type == ManualTracingTool.LayerTypeID.groupLayer) {
                for (var _i = 0, _a = layer.childLayers; _i < _a.length; _i++) {
                    var childLayer = _a[_i];
                    this.drawLayerRecursive(canvasWindow, childLayer);
                }
            }
            else if (layer.type == ManualTracingTool.LayerTypeID.posingLayer) {
                // No drawing
            }
        };
        Main.prototype.drawVectorLayer = function (canvasWindow, layer) {
            var context = this.toolContext;
            for (var _i = 0, _a = layer.groups; _i < _a.length; _i++) {
                var group = _a[_i];
                for (var _b = 0, _c = group.lines; _b < _c.length; _b++) {
                    var line = _c[_b];
                    if (line.points.length == 0) {
                        continue;
                    }
                    //this.drawRawLine(canvasWindow, line);
                    this.drawArangedLine(canvasWindow, line);
                    if (context.editMode == ManualTracingTool.EditModeID.selectMode) {
                        if (line.isClosingToMouse || line.isSelected) {
                            this.drawLinePoints(canvasWindow, line);
                        }
                    }
                }
            }
        };
        Main.prototype.drawRawLine = function (canvasWindow, line) {
            if (line.points.length == 0) {
                return;
            }
            this.canvasRender.setStrokeWidth(3.0);
            this.canvasRender.setStrokeColor(0.5, 0.5, 0.5, 1.0);
            this.canvasRender.beginPath();
            this.canvasRender.moveTo(line.points[0].location[0], line.points[0].location[1]);
            for (var i = 0; i < line.points.length; i++) {
                var point = line.points[i];
                this.canvasRender.lineTo(point.location[0], point.location[1]);
            }
            this.canvasRender.stroke();
        };
        Main.prototype.drawArangedLine = function (canvasWindow, line) {
            if (line.points.length == 0) {
                return;
            }
            var context = this.toolContext;
            this.canvasRender.setStrokeWidth(0.0);
            if (context.editMode == ManualTracingTool.EditModeID.selectMode) {
                if (line.isSelected) {
                    this.canvasRender.setStrokeColor(0.8, 0.3, 0.0, 1.0);
                }
                else {
                    this.canvasRender.setStrokeColor(0.0, 0.0, 0.0, 1.0);
                }
            }
            else {
                if (line.isEditTarget && this.currentTool == this.tool_ScratchLine) {
                    this.canvasRender.setStrokeColor(0.0, 0.5, 0.0, 1.0);
                }
                else {
                    this.canvasRender.setStrokeColor(0.0, 0.0, 0.0, 1.0);
                }
            }
            this.drawLineSegment(line, 0, line.points.length - 1);
        };
        Main.prototype.drawLinePoints = function (canvasWindow, line) {
            for (var i = 0; i < line.points.length; i++) {
                var point = line.points[i];
                this.drawPoint(point, this.linePointColor);
            }
        };
        Main.prototype.drawPoint = function (point, color) {
            this.canvasRender.beginPath();
            var radius = 2.0;
            if (point.isSelected) {
                radius = 3.0;
                this.canvasRender.setStrokeColor(0.8, 0.3, 0.0, 1.0);
                this.canvasRender.setFillColor(0.8, 0.3, 0.0, 1.0);
            }
            else {
                this.canvasRender.setStrokeColorV(color);
                this.canvasRender.setFillColorV(color);
            }
            this.canvasRender.circle(point.adjustedLocation[0], point.adjustedLocation[1], radius);
            this.canvasRender.fill();
        };
        Main.prototype.drawLineSegment = function (line, startIndex, endIndex) {
            this.canvasRender.beginPath();
            this.canvasRender.moveTo(line.points[startIndex].location[0], line.points[startIndex].location[1]);
            for (var i = startIndex + 1; i <= endIndex; i++) {
                var point1 = line.points[i];
                this.canvasRender.lineTo(point1.adjustedLocation[0], point1.adjustedLocation[1]);
            }
            this.canvasRender.stroke();
        };
        Main.prototype.drawEditorWindow = function (editorWindow, mainWindow) {
            var context = this.toolContext;
            mainWindow.copyTransformTo(editorWindow);
            this.canvasRender.setContext(editorWindow);
            this.canvasRender.setTransform(mainWindow);
            if (context.editMode == ManualTracingTool.EditModeID.selectMode) {
                this.drawCursor(editorWindow);
            }
            if (context.editMode == ManualTracingTool.EditModeID.drawMode) {
                if (this.currentTool == this.tool_DrawLine) {
                    if (this.tool_DrawLine.editLine != null) {
                        this.drawRawLine(editorWindow, this.tool_DrawLine.editLine);
                    }
                }
                else if (this.currentTool == this.tool_ScratchLine) {
                    this.drawCursor(editorWindow);
                    if (this.tool_ScratchLine_EditLine_Visible) {
                        if (this.tool_ScratchLine.editLine != null) {
                            this.drawRawLine(editorWindow, this.tool_ScratchLine.editLine);
                        }
                    }
                    if (this.tool_ScratchLine_TargetLine_Visible) {
                        if (this.tool_ScratchLine.targetLine != null) {
                            for (var _i = 0, _a = this.tool_ScratchLine.targetLine.points; _i < _a.length; _i++) {
                                var point = _a[_i];
                                this.drawPoint(point, this.testColor);
                            }
                        }
                    }
                    if (this.tool_ScratchLine_SampledLine_Visible) {
                        if (this.tool_ScratchLine.resampledLine != null) {
                            for (var _b = 0, _c = this.tool_ScratchLine.resampledLine.points; _b < _c.length; _b++) {
                                var point = _c[_b];
                                this.drawPoint(point, this.sampleColor);
                            }
                        }
                        if (this.tool_ScratchLine.extrudeLine != null) {
                            for (var _d = 0, _e = this.tool_ScratchLine.extrudeLine.points; _d < _e.length; _d++) {
                                var point = _e[_d];
                                this.drawPoint(point, this.extColor);
                            }
                        }
                    }
                    if (this.tool_ScratchLine_CandidatePoints_Visible) {
                        if (this.tool_ScratchLine.candidateLine != null) {
                            for (var _f = 0, _g = this.tool_ScratchLine.candidateLine.points; _f < _g.length; _f++) {
                                var point = _g[_f];
                                this.drawPoint(point, this.linePointColor);
                            }
                        }
                    }
                }
                else if (context.mainToolID == ManualTracingTool.MainToolID.posing) {
                    //for (let subtool of this.mainTools[<int>MainToolID.posing].subTools) {
                    //    let posingTools = <Tool_Posing3d_ToolBase>subtool;
                    //    if (posingTools.editLine != null) {
                    //        this.drawRawLine(editorWindow, posingTools.editLine);
                    //    }
                    //}
                    if (this.currentTool == this.tool_Posing3d_LocateHead
                        && this.tool_Posing3d_LocateHead.editLine != null) {
                        this.drawRawLine(editorWindow, this.tool_Posing3d_LocateHead.editLine);
                    }
                }
            }
        };
        Main.prototype.drawCursor = function (canvasWindow) {
            this.canvasRender.beginPath();
            this.canvasRender.setStrokeColor(1.0, 0.5, 0.5, 1.0);
            this.canvasRender.circle(this.toolMouseEvent.location[0], this.toolMouseEvent.location[1], this.toolContext.mouseCursorRadius / canvasWindow.viewScale);
            this.canvasRender.stroke();
        };
        // WebGL window drawing
        Main.prototype.drawWebGLWindow = function (mainWindow, webglWindow, pickingWindow) {
            mainWindow.copyTransformTo(pickingWindow);
            this.posing3dView.drawPickingImage(this.toolEnv);
            pickingWindow.context.clearRect(0, 0, pickingWindow.width, pickingWindow.height);
            pickingWindow.context.drawImage(webglWindow.canvas, 0, 0, webglWindow.width, webglWindow.height);
            this.posing3dView.drawVisualImage(this.toolEnv);
        };
        Main.prototype.caluculateLayerWindowLayout = function (layerWindow) {
            layerWindow.layerWindowPainY = layerWindow.height * layerWindow.layerWinowPainRate;
        };
        Main.prototype.collectLayerWindowItems = function () {
            this.layerWindowItems = new List();
            this.collectLayerWindowItemsRecursive(this.layerWindowItems, this.document.layers, null, 0);
            this.collectSubToolViewItems();
        };
        Main.prototype.collectLayerWindowItemsRecursive = function (result, layers, currentPreviousLayer, currentDepth) {
            var previousLayer = currentPreviousLayer;
            for (var _i = 0, layers_1 = layers; _i < layers_1.length; _i++) {
                var layer = layers_1[_i];
                var item = new LayerWindowItem();
                item.layer = layer;
                item.previousLayer = previousLayer;
                item.hierarchyDepth = currentDepth;
                result.push(item);
                if (layer.childLayers.length > 0) {
                    this.collectLayerWindowItemsRecursive(this.layerWindowItems, layer.childLayers, layer, currentDepth + 1);
                }
                previousLayer = layer;
            }
        };
        Main.prototype.drawLayerWindow = function (layerWindow) {
            this.canvasRender.setContext(layerWindow);
            this.drawLayerWindow_LayerItems(layerWindow);
            this.drawLayerWindow_SubTools(layerWindow);
        };
        Main.prototype.drawLayerWindow_LayerItems = function (layerWindow) {
            this.collectLayerWindowItems();
            var unitHeight = layerWindow.itemHeight;
            var currentY = 0.0;
            for (var _i = 0, _a = this.layerWindowItems; _i < _a.length; _i++) {
                var item = _a[_i];
                this.drawLayerWindowItem(item, 0, currentY, layerWindow.width, currentY + unitHeight, layerWindow.fontSize);
                currentY += unitHeight;
            }
        };
        Main.prototype.drawLayerWindowItem = function (item, left, top, right, bottom, fontSize) {
            var layer = item.layer;
            var itemWidth = (right - left) - 1;
            var itemHeight = (bottom - top) - 1;
            var leftMargin = 10.0;
            var bottomMargin = itemHeight * 0.3;
            var depthOffset = 10.0 * item.hierarchyDepth;
            if (layer.isSelected) {
                this.canvasRender.setFillColorV(this.layerWindowItemSelectedColor);
            }
            else {
                this.canvasRender.setFillColorV(this.layerWindowBackgroundColor);
            }
            this.canvasRender.fillRect(left, top, itemWidth, itemHeight);
            this.canvasRender.setFontSize(fontSize);
            this.canvasRender.setFillColor(0.0, 0.0, 0.0, 1.0);
            this.canvasRender.fillText(layer.name, left + leftMargin + depthOffset, bottom - bottomMargin);
        };
        Main.prototype.collectSubToolViewItems = function () {
            this.subToolViewItems = new List();
            var currentMainTool = this.getCurrentMainTool();
            for (var i = 0; i < currentMainTool.subTools.length; i++) {
                var tool = currentMainTool.subTools[i];
                var viewItem = new SubToolViewItem();
                viewItem.tool = tool;
                for (var buttonIndex = 0; buttonIndex < tool.inputSideOptionCount; buttonIndex++) {
                    var button = new SubToolViewItemOptionButton();
                    button.index = buttonIndex;
                    viewItem.buttons.push(button);
                }
                this.subToolViewItems.push(viewItem);
            }
        };
        Main.prototype.drawLayerWindow_SubTools = function (layerWindow) {
            var context = this.toolContext;
            if (context.mainToolID == ManualTracingTool.MainToolID.none) {
                return;
            }
            var currentMainTool = this.getCurrentMainTool();
            var subToolImage = this.subToolImages[0];
            var scale = layerWindow.subToolItemScale;
            var fullWidth = layerWindow.width - 1;
            var unitWidth = layerWindow.subToolItemUnitWidth;
            var unitHeight = layerWindow.subToolItemUnitHeight;
            var currentY = layerWindow.layerWindowPainY;
            for (var i = 0; i < currentMainTool.subTools.length; i++) {
                var viewItem = this.subToolViewItems[i];
                var tool = viewItem.tool;
                var srcY = i * unitHeight;
                var dstY = currentY;
                // Draw subtool image
                if (tool == this.currentTool) {
                    this.canvasRender.setFillColorV(this.subToolItemSelectedColor);
                }
                else {
                    this.canvasRender.setFillColorV(this.layerWindowBackgroundColor);
                }
                this.canvasRender.fillRect(0, dstY, fullWidth, unitHeight * scale);
                if (tool.isAvailable(this.toolEnv)) {
                    this.canvasRender.setGlobalAlpha(1.0);
                }
                else {
                    this.canvasRender.setGlobalAlpha(0.5);
                }
                this.canvasRender.drawImage(subToolImage.image.imageData, 0, srcY, unitWidth, unitHeight, 0, dstY, unitWidth * scale, unitHeight * scale);
                // Draw subtool option buttons
                for (var _i = 0, _a = viewItem.buttons; _i < _a.length; _i++) {
                    var button = _a[_i];
                    var buttonWidth = 128 * scale;
                    var buttonHeight = 128 * scale;
                    button.left = unitWidth * scale * 0.8;
                    button.top = dstY;
                    button.right = button.left + buttonWidth - 1;
                    button.bottom = button.top + buttonHeight - 1;
                    var inpuSideID = tool.getInputSideID(button.index, this.toolEnv);
                    if (inpuSideID == ManualTracingTool.InputSideID.front) {
                        this.canvasRender.drawImage(this.systemImage.image.imageData, 0, 0, 128, 128, button.left, button.top, buttonWidth, buttonHeight);
                    }
                    else if (inpuSideID == ManualTracingTool.InputSideID.back) {
                        this.canvasRender.drawImage(this.systemImage.image.imageData, 128, 0, 128, 128, button.left, button.top, buttonWidth, buttonHeight);
                    }
                }
                this.canvasRender.setStrokeWidth(0.0);
                this.canvasRender.setStrokeColorV(this.subToolItemSeperatorLineColor);
                this.canvasRender.drawLine(0, dstY, fullWidth, dstY);
                currentY += unitHeight * scale;
            }
            this.canvasRender.setGlobalAlpha(1.0);
            this.canvasRender.drawLine(0, currentY, fullWidth, currentY);
        };
        Main.prototype.updateFooterMessage = function () {
            var context = this.toolContext;
            var modeText = '';
            if (context.editMode == ManualTracingTool.EditModeID.drawMode) {
                modeText = 'DrawMode';
            }
            else if (context.editMode == ManualTracingTool.EditModeID.selectMode) {
                modeText = 'SelectMode';
            }
            var toolText = '';
            if (context.editMode == ManualTracingTool.EditModeID.drawMode) {
                if (this.currentTool == this.tool_DrawLine) {
                    toolText = 'Draw line';
                }
                else if (this.currentTool == this.tool_ScratchLine) {
                    toolText = 'Scratch line';
                }
                else if (this.currentTool == this.tool_Posing3d_LocateHead) {
                    toolText = 'Posing(Head location)';
                }
            }
            else if (context.editMode == ManualTracingTool.EditModeID.selectMode) {
                toolText = '';
            }
            this.footerText = modeText + ' ' + toolText;
            this.footerText = this.currentTool.helpText;
        };
        // Selection management
        Main.prototype.mousemoveHittest = function (x, y, minDistance) {
            this.selector_LineClosingHitTest.execute(this.document.layers, x, y, minDistance);
            return this.selector_LineClosingHitTest.isChanged;
        };
        return Main;
    }());
    var LayerWindow = (function (_super) {
        __extends(LayerWindow, _super);
        function LayerWindow() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.layerWinowPainRate = 0.0;
            _this.layerWindowPainY = 0.0;
            _this.itemHeight = 24.0;
            _this.fontSize = 16.0;
            _this.subToolItemScale = 0.5;
            _this.subToolItemUnitWidth = 256;
            _this.subToolItemUnitHeight = 128;
            return _this;
        }
        return LayerWindow;
    }(ManualTracingTool.CanvasWindow));
    var PickingWindow = (function (_super) {
        __extends(PickingWindow, _super);
        function PickingWindow() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.maxDepth = 4.0;
            return _this;
        }
        return PickingWindow;
    }(ManualTracingTool.CanvasWindow));
    ManualTracingTool.PickingWindow = PickingWindow;
    var LayerWindowItem = (function () {
        function LayerWindowItem() {
            this.layer = null;
            this.previousLayer = null;
            this.hierarchyDepth = 0;
        }
        return LayerWindowItem;
    }());
    var SubToolViewItem = (function () {
        function SubToolViewItem() {
            this.tool = null;
            this.buttons = new List();
        }
        return SubToolViewItem;
    }());
    var SubToolViewItemOptionButton = (function () {
        function SubToolViewItemOptionButton() {
            this.index = -1;
            //inputSideID = InputSideID.none;
            this.top = 0.0;
            this.right = 0.0;
            this.bottom = 0.0;
            this.left = 0.0;
        }
        return SubToolViewItemOptionButton;
    }());
    var _Main;
    window.onload = function () {
        _Main = new Main();
        _Main.mainWindow.canvas = document.getElementById('mainCanvas');
        _Main.editorWindow.canvas = document.getElementById('editorCanvas');
        _Main.layerWindow.canvas = document.getElementById('layerCanvas');
        _Main.webglWindow.canvas = document.getElementById('webglCanvas');
        _Main.pickingWindow.canvas = document.createElement('canvas');
        //document.getElementById('footer').appendChild(_Main.pickingWindow.canvas);
        _Main.startLoading();
        setTimeout(run, 1000 / 30);
    };
    function run() {
        if (_Main.isLoaded) {
            _Main.run();
            _Main.draw();
        }
        else {
            _Main.processLoading();
        }
        setTimeout(run, 1000 / 30);
    }
})(ManualTracingTool || (ManualTracingTool = {}));
