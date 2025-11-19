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
    var Command_DeletePoints = (function (_super) {
        __extends(Command_DeletePoints, _super);
        function Command_DeletePoints() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.document = null;
            return _this;
        }
        Command_DeletePoints.prototype.execute = function () {
            this.errorCheck();
        };
        Command_DeletePoints.prototype.undo = function () {
        };
        Command_DeletePoints.prototype.redo = function () {
        };
        Command_DeletePoints.prototype.errorCheck = function () {
            if (this.document == null) {
                throw ('Com_Select: document is null!');
            }
        };
        return Command_DeletePoints;
    }(ManualTracingTool.CommandBase));
    ManualTracingTool.Command_DeletePoints = Command_DeletePoints;
})(ManualTracingTool || (ManualTracingTool = {}));
