
namespace ManualTracingTool {

    class Main {

        mainWindow = new CanvasWindow();
        editorWindow = new CanvasWindow();
        layerWindow = new LayerWindow();
        webglWindow = new CanvasWindow();
        pickingWindow = new PickingWindow();

        canvasRender = new CanvasRender();
        webGLRender = new WebGLRender();

        // Integrated tool system

        mainTools = new List<MainTool>();

        toolContext: ToolContext = null;
        toolEnv: ToolEnvironment = null;
        toolMouseEvent = new ToolMouseEvent();

        systemImage: ImageResource = null;
        subToolImages = new List<ImageResource>();

        // Drawing tools
        currentTool: ToolBase = null;
        tool_DrawLine = new Tool_DrawLine();
        tool_AddPoint = new Tool_AddPoint();
        tool_ScratchLine = new Tool_ScratchLine();

        currentSelectTool: ToolBase = null;
        tool_BrushSelect = new Tool_Select_BrushSelet();

        selector_LineClosingHitTest = new Selector_LinePoint_LineClosingHitTest();

        // Posing tools
        posing3dView = new Posing3DView();
        posing3DLogic = new Posing3DLogic();
        tool_Posing3d_LocateHead = new Tool_Posing3d_LocateHead();
        tool_Posing3d_RotateHead = new Tool_Posing3d_RotateHead();
        tool_Posing3d_TwistHead = new Tool_Posing3d_TwistHead();
        tool_Posing3d_LocateBody = new Tool_Posing3d_LocateBody();
        tool_Posing3d_RatateBody = new Tool_Posing3d_RatateBody();
        tool_Posing3d_LocateLeftArm1 = new Tool_Posing3d_LocateLeftArm1();
        tool_Posing3d_LocateLeftArm2 = new Tool_Posing3d_LocateLeftArm2();
        tool_Posing3d_LocateRightArm1 = new Tool_Posing3d_LocateRightArm1();
        tool_Posing3d_LocateRightArm2 = new Tool_Posing3d_LocateRightArm2();
        tool_Posing3d_LocateLeftLeg1 = new Tool_Posing3d_LocateLeftLeg1();
        tool_Posing3d_LocateLeftLeg2 = new Tool_Posing3d_LocateLeftLeg2();
        tool_Posing3d_LocateRightLeg1 = new Tool_Posing3d_LocateRightLeg1();
        tool_Posing3d_LocateRightLeg2 = new Tool_Posing3d_LocateRightLeg2();
        imageResurces = new List<ImageResource>();
        modelFile = new ModelFile();
        modelResources = new List<ModelResource>();

        // Document data
        document: DocumentData = null;
        tempFileName = 'Manual tracing tool save data';

        // Work variable
        view2DMatrix = mat4.create();
        invView2DMatrix = mat4.create();
        tempVec3 = vec3.create();

        linePointColor = vec3.fromValues(0.0, 0.0, 0.0);
        testColor = vec3.fromValues(0.0, 0.7, 0.0);
        sampleColor = vec3.fromValues(0.0, 0.5, 1.0);
        extColor = vec3.fromValues(0.0, 0.0, 0.0);

        isLoaded = false;

        // Loading

        startLoading() {

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
            this.imageResurces.push(new ImageResource().file('texture01.png'));
            this.imageResurces.push(new ImageResource().file('system_image01.png').tex(false));
            this.imageResurces.push(new ImageResource().file('toolbar_image01.png').tex(false));

            this.loadModels(this.modelFile, './res/' + this.modelFile.fileName);

            for (let imageResource of this.imageResurces) {

                this.loadTexture(imageResource, './res/' + imageResource.fileName);
            }
        }

        processLoading() {

            if (!this.modelFile.loaded) {
                return;
            }

            for (let imageResource of this.imageResurces) {

                if (!imageResource.loaded) {
                    return;
                }
            }

            // Loading finished
            this.start();
        }

        loadTexture(imageResource: ImageResource, url: string) {

            let image = new Image();

            imageResource.image.imageData = image;

            image.addEventListener('load',
                () => {
                    if (imageResource.isGLTexture) {
                        this.webGLRender.initializeImageTexture(imageResource.image);
                    }
                    imageResource.loaded = true;
                }
            );

            image.src = url;
        }

        loadModels(modelFile: ModelFile, url: string) {

            let xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.responseType = 'json';

            xhr.addEventListener('load',
                (e: Event) => {

                    let data: any;
                    if (xhr.responseType == 'json') {
                        data = xhr.response;
                    }
                    else {
                        data = JSON.parse(xhr.response);
                    }

                    for (let modelData of data.static_models) {

                        let modelResource = new ModelResource();
                        modelResource.modelName = modelData.name;

                        this.webGLRender.initializeModelBuffer(modelResource.model, modelData.vertices, modelData.indices, 4 * modelData.vertexStride); // 4 = size of float

                        modelFile.modelResources.push(modelResource);
                        modelFile.modelResourceDictionary[modelData.name] = modelResource;
                    }

                    modelFile.loaded = true;
                }
            );

            xhr.send();
        }

        // Starting ups

        start() {

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
        }

        private initializeDocument() {

            let saveData = window.localStorage.getItem(this.tempFileName);
            if (saveData) {

                this.document = JSON.parse(saveData);
                return;
            }

            this.document = new DocumentData();

            {
                let layer1 = new VectorLayer();
                layer1.name = 'layer1'
                this.document.layers.push(layer1);
                let group1 = new VectorGroup();
                layer1.groups.push(group1);
            }

            {
                let layer1 = new GroupLayer();
                layer1.name = 'group1'
                this.document.layers.push(layer1);

                let layer2 = new VectorLayer();
                layer2.name = 'child1'
                layer1.childLayers.push(layer2);
                let group2 = new VectorGroup();
                layer2.groups.push(group2);
            }

            {
                let layer1 = new VectorLayer();
                layer1.name = 'background'
                this.document.layers.push(layer1);
                let group1 = new VectorGroup();
                layer1.groups.push(group1);
            }

            {
                let layer1 = new PosingLayer();
                layer1.name = 'posing1'
                this.document.layers.push(layer1);
            }
        }

        private initializeContext() {

            this.toolContext = new ToolContext();

            this.toolContext.mainWindow = this.mainWindow;
            this.toolContext.pickingWindow = this.pickingWindow;

            this.toolContext.posing3DView = this.posing3dView;
            this.toolContext.posing3DLogic = this.posing3DLogic;

            this.toolContext.document = this.document;

            this.toolContext.commandHistory = new CommandHistory();
        }

        private initializeViews() {

            this.collectLayerWindowItems();

            this.mainWindow.centerLocationRate[0] = 0.5;
            this.mainWindow.centerLocationRate[1] = 0.5;
        }

        private initializeTools() {

            // Constructs main tools and sub tools structure
            this.mainTools.push(
                new MainTool().id(MainToolID.none)
            );

            this.mainTools.push(
                new MainTool().id(MainToolID.drawLine)
                .subTool(this.tool_DrawLine)
            );

            this.mainTools.push(
                new MainTool().id(MainToolID.scratchLine)
                    .subTool(this.tool_ScratchLine)
            );

            this.mainTools.push(
                new MainTool().id(MainToolID.posing)
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
                    .subTool(this.tool_Posing3d_TwistHead)
            );

            // Constructs current tool states
            this.toolEnv = new ToolEnvironment(this.toolContext);

            //this.currentTool = this.tool_DrawLine;
            //this.currentTool = this.tool_AddPoint;
            //this.currentTool = this.tool_ScratchLine;
            this.currentTool = this.tool_Posing3d_LocateHead;

            this.currentSelectTool = this.tool_BrushSelect;

            this.systemImage = this.imageResurces[1];
            this.subToolImages.push(this.imageResurces[2]);

            this.posing3dView.storeResources(this.modelFile, this.imageResurces);
        }

        private setEvents() {

            this.editorWindow.canvas.addEventListener('mousedown', (e: MouseEvent) => {
                this.mainWindow_mousedown(e);
            });

            this.editorWindow.canvas.addEventListener('mousemove', (e: MouseEvent) => {
                this.mainWindow_mousemove(e);
            });

            this.editorWindow.canvas.addEventListener('mouseup', (e: MouseEvent) => {
                this.mainWindow_mouseup(e);
            });

            this.editorWindow.canvas.addEventListener('mousewheel', (e: MouseEvent) => {
                this.editorWindow_mousewheel(e);
            });

            this.layerWindow.canvas.addEventListener('mousedown', (e: MouseEvent) => {
                this.layerWindow_mousedown(e);
            });

            document.addEventListener('keydown', (e: KeyboardEvent) => {
                this.document_keydown(e);
            });

            document.addEventListener('keyup', (e: KeyboardEvent) => {
                this.document_keyup(e);
            });

            window.addEventListener('resize', (e: Event) => {
                this.htmlWindow_resize(e);
            });

            window.addEventListener('contextmenu', (e: Event) => {
                return this.htmlWindow_contextmenu(e);
            });
        }

        // Continuous processes

        run() {

        }

        // Events

        private mainWindow_mousedown(e: MouseEvent) {

            if (!this.isLoaded) {
                return;
            }

            this.getMouseInfo(e, this.mainWindow);

            let context = this.toolContext;
            this.toolEnv.updateContext();

            // Draw mode
            if (context.editMode == EditModeID.drawMode) {

                this.currentTool.mouseDown(this.toolMouseEvent, this.toolEnv);
            }
            // Select mode
            else if (context.editMode == EditModeID.selectMode) {

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
        }

        private mainWindow_MouseViewOperationStart() {

            this.toolMouseEvent.isMouseDragging = true;

            mat4.copy(this.dragBeforeTransformMatrix, this.invView2DMatrix);
            vec3.copy(this.dragBeforeViewLocation, this.mainWindow.viewLocation);

            vec3.copy(this.toolMouseEvent.mouseDownLocation, this.toolMouseEvent.location);
            vec3.set(this.toolMouseEvent.mouseMovedVector, 0.0, 0.0, 0.0);
        }

        private mainWindow_MouseViewOperationEnd() {

            this.toolMouseEvent.isMouseDragging = false;
        }

        private mainWindow_mousemove(e: MouseEvent) {

            if (!this.isLoaded) {
                return;
            }

            this.getMouseInfo(e, this.mainWindow);

            let context = this.toolContext;
            this.toolEnv.updateContext();

            // Draw mode
            if (context.editMode == EditModeID.drawMode) {

                this.currentTool.mouseMove(this.toolMouseEvent, this.toolEnv);
            }
            // Select mode
            else if (context.editMode == EditModeID.selectMode) {

                let isSelectionChanged = this.mousemoveHittest(this.toolMouseEvent.location[0], this.toolMouseEvent.location[1], this.toolContext.mouseCursorRadius);
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
        }

        private mainWindow_mouseup(e: MouseEvent) {

            if (!this.isLoaded) {
                return;
            }

            this.getMouseInfo(e, this.mainWindow);

            let context = this.toolContext;
            this.toolEnv.updateContext();

            // Draw mode
            if (context.editMode == EditModeID.drawMode) {

                this.currentTool.mouseUp(this.toolMouseEvent, this.toolEnv);
            }
            // Select mode
            else if (context.editMode == EditModeID.selectMode) {

                this.currentSelectTool.mouseUp(this.toolMouseEvent, this.toolEnv);
            }

            this.mainWindow_MouseViewOperationEnd();

            e.preventDefault();
        }

        private layerWindow_mousedown(e: MouseEvent) {

            if (!this.isLoaded) {
                return;
            }

            let context = this.toolContext;
            let layerWindow = this.layerWindow;

            this.getMouseInfo(e, layerWindow);
            this.toolEnv.updateContext();

            let clickedX = this.toolMouseEvent.location[0];
            let clickedY = this.toolMouseEvent.location[1];

            if (this.toolMouseEvent.location[1] < layerWindow.layerWindowPainY) {

                // Layer window item click
                let selectedIndex = Math.floor(clickedY / layerWindow.itemHeight);

                if (selectedIndex < this.layerWindowItems.length) {

                    let selectedItem = this.layerWindowItems[selectedIndex];
                    let selectedLayer = selectedItem.layer;

                    // Select layer content
                    this.setCurrentLayer(selectedLayer);
                }

                this.toolEnv.setRedrawLayerWindow();
            }
            else {

                // Sub tool click

                if (context.mainToolID == MainToolID.none) {
                    return;
                }

                let selectedIndex = Math.floor((clickedY - layerWindow.layerWindowPainY) / (layerWindow.subToolItemUnitHeight * layerWindow.subToolItemScale));

                if (selectedIndex < this.subToolViewItems.length) {

                    let viewItem = this.subToolViewItems[selectedIndex];
                    let tool = viewItem.tool;

                    if (tool.isAvailable(this.toolEnv)) {

                        // Change current sub tool
                        this.setCurrentSubTool(selectedIndex)
                        this.updateFooterMessage();
                        this.toolEnv.setRedrawMainWindowEditorWindow()
                        this.toolEnv.setRedrawLayerWindow()

                        // Option button click
                        for (let button of viewItem.buttons) {

                            if (clickedX >= button.left && clickedX <= button.right
                                && clickedY >= button.top && clickedY <= button.bottom) {

                                let inpuSideID = tool.getInputSideID(button.index, this.toolEnv);

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
        }

        private editorWindow_mousewheel(e: MouseEvent) {

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
        }

        private document_keydown(e: KeyboardEvent) {

            if (!this.isLoaded) {
                return;
            }

            let context = this.toolContext;

            this.toolContext.shiftKey = e.shiftKey;
            this.toolContext.altKey = e.altKey;
            this.toolContext.ctrlKey = e.ctrlKey;

            if (e.key == 'Tab') {

                // Change mode
                if (context.editMode == EditModeID.drawMode) {

                    context.editMode = EditModeID.selectMode;
                }
                else {

                    context.editMode = EditModeID.drawMode;
                }

                /// Update footer message
                this.updateFooterMessage();

                this.toolEnv.setRedrawMainWindowEditorWindow();

                return e.preventDefault();
            }

            if (e.key == 'e') {

                if (context.editMode == EditModeID.drawMode) {

                    this.currentTool = this.tool_ScratchLine;
                    this.updateFooterMessage();
                    this.toolEnv.setRedrawMainWindow()
                }

                return;
            }

            if (e.key == 'b') {

                if (context.editMode == EditModeID.drawMode) {

                    this.currentTool = this.tool_DrawLine;
                    this.updateFooterMessage();
                    this.toolEnv.setRedrawMainWindow()
                }

                return;
            }

            if (e.key == 'p') {

                if (context.editMode == EditModeID.drawMode) {

                    if (this.currentTool == this.tool_Posing3d_LocateHead) {

                        this.currentTool = this.tool_Posing3d_RotateHead;
                    }
                    else {

                        this.currentTool = this.tool_Posing3d_LocateHead;
                    }

                    this.updateFooterMessage();
                    this.toolEnv.setRedrawMainWindow()
                    this.toolEnv.setRedrawLayerWindow()
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

                if (context.editMode == EditModeID.selectMode) {

                    if (this.toolContext.currentLayer != null
                        && this.toolContext.currentLayer.type == LayerTypeID.vectorLayer) {

                        let command = new Command_DeletePoints();
                        if (command.collectEditTargets(<VectorLayer>(this.toolContext.currentLayer))) {

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

                let rot = 10.0;
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

                let addScale = 0.1;
                if (e.key == 'd') {
                    addScale = -addScale;
                }

                this.mainWindow.addViewScale(addScale);

                this.toolEnv.setRedrawMainWindowEditorWindow();

                e.preventDefault();
                return;
            }

            if (e.key == 'ArrowLeft' || e.key == 'ArrowRight' || e.key == 'ArrowUp' || e.key == 'ArrowDown') {

                let x = 0.0;
                let y = 0.0;
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

                let leftLimit = this.mainWindow.width * (-0.5);
                let rightLimit = this.mainWindow.width * 1.5
                let topLimit = this.mainWindow.height * (-0.5);
                let bottomLimit = this.mainWindow.height * 1.5

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
        }

        private document_keyup(e: KeyboardEvent) {

            this.toolContext.shiftKey = e.shiftKey;
            this.toolContext.altKey = e.altKey;
            this.toolContext.ctrlKey = e.ctrlKey;

            if (e.key == ' ') {

                this.mainWindow_MouseViewOperationEnd();
            }
        }

        private htmlWindow_resize(e: Event) {

            this.resizeWindows();

            this.toolEnv.setRedrawMainWindowEditorWindow();
            this.toolEnv.setRedrawLayerWindow();
        }

        private htmlWindow_contextmenu(e): boolean {

            if (e.preventDefault) {
                e.preventDefault();
            }
            else if (e.returnValue) {
                e.returnValue = false;
            }

            return false;
        }

        // Tools and context operations

        private getCurrentMainTool(): MainTool {

            return this.mainTools[<int>this.toolContext.mainToolID];
        }

        private setCurrentSubTool(subToolIndex: int) {

            let mainTool = this.getCurrentMainTool();

            mainTool.currentSubToolIndex = subToolIndex;

            this.toolContext.subToolIndex = subToolIndex;

            this.currentTool = mainTool.subTools[subToolIndex];
        }

        private setCurrentLayer(layer: Layer) {

            this.toolContext.currentLayer = layer;

            if (layer.type == LayerTypeID.vectorLayer) {

                let vectorLayer = <VectorLayer>layer;

                this.toolContext.currentVectorLayer = vectorLayer;
                this.toolContext.currentVectorGroup = vectorLayer.groups[0];
            }
            else {

                this.toolContext.currentVectorGroup = null;
            }

            if (layer.type == LayerTypeID.posingLayer) {

                let posingLayer = <PosingLayer>layer;

                this.toolContext.currentPosingData = posingLayer.posingData;
                this.toolContext.currentPosingModel = posingLayer.posingModel;
            }
            else {

                this.toolContext.currentPosingData = null;
            }

            for (let item of this.layerWindowItems) {

                item.layer.isSelected = false;
            }

            layer.isSelected = true;
        }

        // View operations

        private resizeWindows() {

            this.resizeCanvasToParent(this.mainWindow);
            this.fitCanvas(this.editorWindow, this.mainWindow);
            this.fitCanvas(this.webglWindow, this.mainWindow);
            this.fitCanvas(this.pickingWindow, this.mainWindow);

            this.resizeCanvasToParent(this.layerWindow);

            this.caluculateLayerWindowLayout(this.layerWindow);
        }

        private resizeCanvasToParent(canvasWindow: CanvasWindow) {

            canvasWindow.width = canvasWindow.canvas.parentElement.clientWidth;
            canvasWindow.height = canvasWindow.canvas.parentElement.clientHeight;

            canvasWindow.canvas.width = canvasWindow.width;
            canvasWindow.canvas.height = canvasWindow.height;
        }

        private fitCanvas(canvasWindow: CanvasWindow, fitToWindow: CanvasWindow) {

            canvasWindow.width = fitToWindow.width;
            canvasWindow.height = fitToWindow.height;

            canvasWindow.canvas.width = canvasWindow.width;
            canvasWindow.canvas.height = canvasWindow.height;
        }

        private getMouseInfo(e: MouseEvent, canvasWindow: CanvasWindow) {

            this.toolMouseEvent.button = e.button;
            this.toolMouseEvent.buttons = e.buttons;
            this.toolMouseEvent.offsetX = e.offsetX;
            this.toolMouseEvent.offsetY = e.offsetY;

            canvasWindow.caluclateViewMatrix(this.view2DMatrix);
            mat4.invert(this.invView2DMatrix, this.view2DMatrix);

            vec3.set(this.tempVec3, e.offsetX, e.offsetY, 0.0);
            vec3.transformMat4(this.toolMouseEvent.location, this.tempVec3, this.invView2DMatrix);

            //console.log(e.offsetX.toFixed(2) + ',' + e.offsetY.toFixed(2) + '  ' + this.toolMouseEvent.location[0].toFixed(2) + ',' + this.toolMouseEvent.location[1].toFixed(2));
        }

        private getWheelInfo(e: MouseEvent) {

            let wheelDelta = 0.0;
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
        }

        draw() {

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
        }

        // Main window drawing

        dragBeforeTransformMatrix = mat4.create();
        dragBeforeViewLocation = vec3.create();

        private clearWindow(canvasWindow: CanvasWindow) {

            this.canvasRender.setContext(canvasWindow);

            this.canvasRender.clearRect(0, 0, canvasWindow.canvas.width, canvasWindow.canvas.height);
        }

        private drawMainWindow(canvasWindow: CanvasWindow) {

            this.canvasRender.setContext(canvasWindow);

            for (let layer of this.document.layers) {

                this.drawLayerRecursive(canvasWindow, layer)
            }
        }

        private drawLayerRecursive(canvasWindow: CanvasWindow, layer: Layer) {

            if (layer.type == LayerTypeID.vectorLayer) {

                let vectorLayer = <VectorLayer>layer;
                this.drawVectorLayer(canvasWindow, vectorLayer);
            }
            else if (layer.type == LayerTypeID.groupLayer) {

                for (let childLayer of layer.childLayers) {

                    this.drawLayerRecursive(canvasWindow, childLayer);
                }
            }
            else if (layer.type == LayerTypeID.posingLayer) {

                // No drawing
            }
        }

        private drawVectorLayer(canvasWindow: CanvasWindow, layer: VectorLayer) {

            let context = this.toolContext;

            for (let group of layer.groups) {

                for (let line of group.lines) {

                    if (line.points.length == 0) {
                        continue;
                    }

                    //this.drawRawLine(canvasWindow, line);
                    this.drawArangedLine(canvasWindow, line);

                    if (context.editMode == EditModeID.selectMode) {
                        if (line.isClosingToMouse || line.isSelected) {
                            this.drawLinePoints(canvasWindow, line);
                        }
                    }
                }
            }
        }

        private drawRawLine(canvasWindow: CanvasWindow, line: VectorLine) {

            if (line.points.length == 0) {
                return;
            }

            this.canvasRender.setStrokeWidth(3.0);
            this.canvasRender.setStrokeColor(0.5, 0.5, 0.5, 1.0);

            this.canvasRender.beginPath()

            this.canvasRender.moveTo(line.points[0].location[0], line.points[0].location[1]);

            for (let i = 0; i < line.points.length; i++) {
                let point = line.points[i];

                this.canvasRender.lineTo(point.location[0], point.location[1]);
            }

            this.canvasRender.stroke()
        }

        private drawArangedLine(canvasWindow: CanvasWindow, line: VectorLine) {

            if (line.points.length == 0) {
                return;
            }

            let context = this.toolContext;

            this.canvasRender.setStrokeWidth(0.0);

            if (context.editMode == EditModeID.selectMode) {

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
        }

        private drawLinePoints(canvasWindow: CanvasWindow, line: VectorLine) {

            for (let i = 0; i < line.points.length; i++) {
                let point = line.points[i];

                this.drawPoint(point, this.linePointColor);
            }
        }

        private drawPoint(point: LinePoint, color: Vec3) {

            this.canvasRender.beginPath()

            let radius = 2.0;
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
        }

        private drawLineSegment(line: VectorLine, startIndex: int, endIndex: int) {

            this.canvasRender.beginPath()

            this.canvasRender.moveTo(line.points[startIndex].location[0], line.points[startIndex].location[1]);

            for (let i = startIndex + 1; i <= endIndex; i++) {

                let point1 = line.points[i];

                this.canvasRender.lineTo(point1.adjustedLocation[0], point1.adjustedLocation[1]);
            }

            this.canvasRender.stroke()
        }

        // Editor window drawing

        tool_ScratchLine_EditLine_Visible = true;
        tool_ScratchLine_TargetLine_Visible = true;
        tool_ScratchLine_SampledLine_Visible = true;
        tool_ScratchLine_CandidatePoints_Visible = false;

        private drawEditorWindow(editorWindow: CanvasWindow, mainWindow: CanvasWindow) {

            let context = this.toolContext;

            mainWindow.copyTransformTo(editorWindow);

            this.canvasRender.setContext(editorWindow);
            this.canvasRender.setTransform(mainWindow);

            if (context.editMode == EditModeID.selectMode) {

                this.drawCursor(editorWindow);
            }

            if (context.editMode == EditModeID.drawMode) {

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

                            for (let point of this.tool_ScratchLine.targetLine.points) {

                                this.drawPoint(point, this.testColor);
                            }
                        }
                    }

                    if (this.tool_ScratchLine_SampledLine_Visible) {

                        if (this.tool_ScratchLine.resampledLine != null) {

                            for (let point of this.tool_ScratchLine.resampledLine.points) {

                                this.drawPoint(point, this.sampleColor);
                            }
                        }

                        if (this.tool_ScratchLine.extrudeLine != null) {

                            for (let point of this.tool_ScratchLine.extrudeLine.points) {

                                this.drawPoint(point, this.extColor);
                            }
                        }
                    }

                    if (this.tool_ScratchLine_CandidatePoints_Visible) {

                        if (this.tool_ScratchLine.candidateLine != null) {

                            for (let point of this.tool_ScratchLine.candidateLine.points) {

                                this.drawPoint(point, this.linePointColor);
                            }
                        }
                    }
                }
                else if (context.mainToolID == MainToolID.posing) {

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
        }

        private drawCursor(canvasWindow: CanvasWindow) {

            this.canvasRender.beginPath();
            this.canvasRender.setStrokeColor(1.0, 0.5, 0.5, 1.0);
            this.canvasRender.circle(this.toolMouseEvent.location[0], this.toolMouseEvent.location[1], this.toolContext.mouseCursorRadius / canvasWindow.viewScale);
            this.canvasRender.stroke();
        }

        // WebGL window drawing

        private drawWebGLWindow(mainWindow: CanvasWindow, webglWindow: CanvasWindow, pickingWindow: CanvasWindow) {

            mainWindow.copyTransformTo(pickingWindow);

            this.posing3dView.drawPickingImage(this.toolEnv);

            pickingWindow.context.clearRect(0, 0, pickingWindow.width, pickingWindow.height);
            pickingWindow.context.drawImage(webglWindow.canvas, 0, 0, webglWindow.width, webglWindow.height);

            this.posing3dView.drawVisualImage(this.toolEnv);
        }

        // Layer window drawing

        layerWindowItems: List<LayerWindowItem> = null;

        private caluculateLayerWindowLayout(layerWindow: LayerWindow) {

            layerWindow.layerWindowPainY = layerWindow.height * layerWindow.layerWinowPainRate;
        }

        private collectLayerWindowItems() {

            this.layerWindowItems = new List<LayerWindowItem>();

            this.collectLayerWindowItemsRecursive(this.layerWindowItems, this.document.layers, null, 0);

            this.collectSubToolViewItems();
        }

        private collectLayerWindowItemsRecursive(result: List<LayerWindowItem>, layers: List<Layer>, currentPreviousLayer: Layer, currentDepth: int) {

            let previousLayer = currentPreviousLayer;

            for (let layer of layers) {

                let item = new LayerWindowItem();
                item.layer = layer;
                item.previousLayer = previousLayer;
                item.hierarchyDepth = currentDepth;

                result.push(item);

                if (layer.childLayers.length > 0) {
                    this.collectLayerWindowItemsRecursive(this.layerWindowItems, layer.childLayers, layer, currentDepth + 1);
                }

                previousLayer = layer;
            }
        }

        private drawLayerWindow(layerWindow: LayerWindow) {

            this.canvasRender.setContext(layerWindow);

            this.drawLayerWindow_LayerItems(layerWindow);

            this.drawLayerWindow_SubTools(layerWindow);
        }

        private drawLayerWindow_LayerItems(layerWindow: LayerWindow) {

            this.collectLayerWindowItems();

            let unitHeight = layerWindow.itemHeight;

            let currentY = 0.0;

            for (let item of this.layerWindowItems) {

                this.drawLayerWindowItem(item, 0, currentY, layerWindow.width, currentY + unitHeight, layerWindow.fontSize);

                currentY += unitHeight;
            }
        }

        layerWindowBackgroundColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
        layerWindowItemSelectedColor = vec4.fromValues(0.9, 0.9, 1.0, 1.0);

        private drawLayerWindowItem(item: LayerWindowItem, left: float, top: float, right: float, bottom: float, fontSize: float) {

            let layer = item.layer;

            let itemWidth = (right - left) - 1;
            let itemHeight = (bottom - top) - 1;

            let leftMargin = 10.0;
            let bottomMargin = itemHeight * 0.3;

            let depthOffset = 10.0 * item.hierarchyDepth;

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
        }

        subToolViewItems: List<SubToolViewItem> = null;
        subToolItemSelectedColor = vec4.fromValues(0.9, 0.9, 1.0, 1.0);
        subToolItemSeperatorLineColor = vec4.fromValues(0.0, 0.0, 0.0, 0.5);

        private collectSubToolViewItems() {

            this.subToolViewItems = new List<SubToolViewItem>();

            let currentMainTool = this.getCurrentMainTool();

            for (let i = 0; i < currentMainTool.subTools.length; i++) {

                let tool = <Tool_Posing3d_ToolBase>currentMainTool.subTools[i];

                let viewItem = new SubToolViewItem();
                viewItem.tool = tool;

                for (let buttonIndex = 0; buttonIndex < tool.inputSideOptionCount; buttonIndex++) {

                    let button = new SubToolViewItemOptionButton();
                    button.index = buttonIndex;

                    viewItem.buttons.push(button);
                }

                this.subToolViewItems.push(viewItem);
            }
        }

        private drawLayerWindow_SubTools(layerWindow: LayerWindow) {

            let context = this.toolContext;

            if (context.mainToolID == MainToolID.none) {
                return;
            }

            let currentMainTool = this.getCurrentMainTool();
            let subToolImage = this.subToolImages[0];

            let scale = layerWindow.subToolItemScale;
            let fullWidth = layerWindow.width - 1;
            let unitWidth = layerWindow.subToolItemUnitWidth;
            let unitHeight = layerWindow.subToolItemUnitHeight;

            let currentY = layerWindow.layerWindowPainY;

            for (let i = 0; i < currentMainTool.subTools.length; i++) {

                let viewItem = this.subToolViewItems[i];
                let tool = viewItem.tool;

                let srcY = i * unitHeight;
                let dstY = currentY;

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

                this.canvasRender.drawImage(subToolImage.image.imageData
                    , 0, srcY, unitWidth, unitHeight
                    , 0, dstY, unitWidth * scale, unitHeight * scale);

                // Draw subtool option buttons
                for (let button of viewItem.buttons) {

                    let buttonWidth = 128 * scale;
                    let buttonHeight = 128 * scale;

                    button.left = unitWidth * scale * 0.8;
                    button.top = dstY;
                    button.right = button.left + buttonWidth - 1;
                    button.bottom = button.top + buttonHeight - 1;

                    let inpuSideID = tool.getInputSideID(button.index, this.toolEnv);
                    if (inpuSideID == InputSideID.front) {

                        this.canvasRender.drawImage(this.systemImage.image.imageData
                            , 0, 0, 128, 128
                            , button.left, button.top, buttonWidth, buttonHeight);
                    }
                    else if (inpuSideID == InputSideID.back) {

                        this.canvasRender.drawImage(this.systemImage.image.imageData
                            , 128, 0, 128, 128
                            , button.left, button.top, buttonWidth, buttonHeight);
                    }
                }

                this.canvasRender.setStrokeWidth(0.0);
                this.canvasRender.setStrokeColorV(this.subToolItemSeperatorLineColor);
                this.canvasRender.drawLine(0, dstY, fullWidth, dstY);

                currentY += unitHeight * scale;
            }

            this.canvasRender.setGlobalAlpha(1.0);

            this.canvasRender.drawLine(0, currentY, fullWidth, currentY);
        }

        // Footer window drawing

        footerText: string = '';
        footerTextBefore: string = '';

        private updateFooterMessage() {

            let context = this.toolContext;
            let modeText = '';

            if (context.editMode == EditModeID.drawMode) {

                modeText = 'DrawMode';
            }
            else if (context.editMode == EditModeID.selectMode) {

                modeText = 'SelectMode';
            }

            let toolText = '';

            if (context.editMode == EditModeID.drawMode) {

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
            else if (context.editMode == EditModeID.selectMode) {

                toolText = '';
            }


            this.footerText = modeText + ' ' + toolText;

            this.footerText = this.currentTool.helpText;
        }

        // Selection management

        private mousemoveHittest(x: float, y: float, minDistance: float): boolean {

            this.selector_LineClosingHitTest.execute(this.document.layers, x, y, minDistance);

            return this.selector_LineClosingHitTest.isChanged;
        }
    }

    class LayerWindow extends CanvasWindow {

        layerWinowPainRate = 0.0;
        layerWindowPainY = 0.0;

        itemHeight = 24.0;
        fontSize = 16.0;

        subToolItemScale = 0.5;
        subToolItemUnitWidth = 256;
        subToolItemUnitHeight = 128;
    }

    export class PickingWindow extends CanvasWindow {

        maxDepth = 4.0;
    }

    class LayerWindowItem {

        layer: Layer = null;
        previousLayer: Layer = null;
        hierarchyDepth = 0;
    }

    class SubToolViewItem {

        tool: Tool_Posing3d_ToolBase = null;
        buttons = new List<SubToolViewItemOptionButton>();
    }

    class SubToolViewItemOptionButton {

        index = -1;
        //inputSideID = InputSideID.none;
        top = 0.0;
        right = 0.0;
        bottom = 0.0;
        left = 0.0;
    }


    var _Main: Main;

    window.onload = () => {

        _Main = new Main();
        _Main.mainWindow.canvas = <HTMLCanvasElement>document.getElementById('mainCanvas');
        _Main.editorWindow.canvas = <HTMLCanvasElement>document.getElementById('editorCanvas');
        _Main.layerWindow.canvas = <HTMLCanvasElement>document.getElementById('layerCanvas');
        _Main.webglWindow.canvas = <HTMLCanvasElement>document.getElementById('webglCanvas');
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
}
