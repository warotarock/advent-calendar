var ManualTracingTool;
(function (ManualTracingTool) {
    var CanvasWindow = (function () {
        function CanvasWindow() {
            this.canvas = null;
            this.context = null;
            this.width = 0.0;
            this.height = 0.0;
            this.viewScale = 1.0;
            this.viewRotation = 0.0;
        }
        return CanvasWindow;
    }());
    ManualTracingTool.CanvasWindow = CanvasWindow;
    var CanvasRender = (function () {
        function CanvasRender() {
            this.context = null;
            this.viewScale = 1.0;
            this.viewRotation = 0.0;
        }
        CanvasRender.prototype.setContext = function (canvasWindow) {
            this.context = canvasWindow.context;
            this.viewScale = canvasWindow.viewScale;
            this.viewRotation = canvasWindow.viewRotation;
        };
        CanvasRender.prototype.clearRect = function (left, top, width, height) {
            this.context.clearRect(left, top, width, height);
        };
        CanvasRender.prototype.setFillColor = function (r, g, b) {
            this.context.fillStyle = 'rgb(' + (r * 255).toFixed(0) + ',' + (g * 255).toFixed(0) + ',' + (b * 255).toFixed(0) + ')';
        };
        CanvasRender.prototype.fillRect = function (left, top, width, height) {
            this.context.fillRect(left, top, width, height);
        };
        CanvasRender.prototype.setStrokeColor = function (r, g, b) {
            this.context.strokeStyle = 'rgb(' + (r * 255).toFixed(0) + ',' + (g * 255).toFixed(0) + ',' + (b * 255).toFixed(0) + ')';
        };
        CanvasRender.prototype.beginPath = function () {
            this.context.beginPath();
        };
        CanvasRender.prototype.stroke = function () {
            this.context.stroke();
        };
        CanvasRender.prototype.fill = function () {
            this.context.fill();
        };
        CanvasRender.prototype.moveTo = function (x, y) {
            this.context.moveTo(x, y);
        };
        CanvasRender.prototype.lineTo = function (x, y) {
            this.context.lineTo(x, y);
        };
        CanvasRender.prototype.circle = function (x, y, radius) {
            this.context.arc(x, y, radius, 0.0, Math.PI * 2.0);
        };
        CanvasRender.prototype.setFontSize = function (height) {
            this.context.font = height.toFixed(0) + "px 'ＭＳ Ｐゴシック'";
        };
        CanvasRender.prototype.fillText = function (text, x, y) {
            this.context.fillText(text, x, y);
        };
        return CanvasRender;
    }());
    ManualTracingTool.CanvasRender = CanvasRender;
})(ManualTracingTool || (ManualTracingTool = {}));
