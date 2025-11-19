var EditorView3D = (function () {
    function EditorView3D() {
    }
    EditorView3D.prototype.loadTexture = function (resultImage, url) {
        var _this = this;
        resultImage.imageData = new Image();
        resultImage.imageData.addEventListener('load', function () {
            _this.render.initializeImageTexture(resultImage);
        });
        resultImage.imageData.src = url;
    };
    EditorView3D.prototype.loadModel = function (resultModel, url, modelName) {
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
                if (modelData.name == modelName) {
                    _this.render.initializeModelBuffer(resultModel, modelData.vertices, modelData.indices, 4 * modelData.vertexStride); // 4 = size of float
                    break;
                }
            }
        });
        xhr.send();
    };
    return EditorView3D;
}());
