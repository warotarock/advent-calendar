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
    var SelectionEditMode;
    (function (SelectionEditMode) {
        SelectionEditMode[SelectionEditMode["setSelected"] = 1] = "setSelected";
        SelectionEditMode[SelectionEditMode["setUnselected"] = 2] = "setUnselected";
        SelectionEditMode[SelectionEditMode["toggle"] = 3] = "toggle";
    })(SelectionEditMode = ManualTracingTool.SelectionEditMode || (ManualTracingTool.SelectionEditMode = {}));
    var PointSelectorLine = (function () {
        function PointSelectorLine() {
            this.line = null;
            this.selectStateAfter = false;
            this.selectStateBefore = false;
        }
        return PointSelectorLine;
    }());
    ManualTracingTool.PointSelectorLine = PointSelectorLine;
    var PointSelectorPoint = (function () {
        function PointSelectorPoint() {
            this.point = null;
            this.selectStateAfter = false;
            this.selectStateBefore = false;
        }
        return PointSelectorPoint;
    }());
    ManualTracingTool.PointSelectorPoint = PointSelectorPoint;
    var LinePointSelector = (function () {
        function LinePointSelector() {
            this.selectedLines = null;
            this.selectedPoints = null;
        }
        LinePointSelector.prototype.clear = function () {
            this.selectedLines = new List();
            this.selectedPoints = new List();
        };
        LinePointSelector.prototype.selectPoint = function (line, point, editMode) {
            if (editMode == SelectionEditMode.setSelected
                || editMode == SelectionEditMode.toggle) {
                if (!point.isSelected && point.editChangeType == PointEditChangeType.none) {
                    var selPoint = new PointSelectorPoint();
                    selPoint.point = point;
                    selPoint.selectStateAfter = true;
                    selPoint.selectStateBefore = point.isSelected;
                    this.selectedPoints.push(selPoint);
                    point.isSelected = selPoint.selectStateAfter;
                    point.editChangeType = PointEditChangeType.unselectedToSelected;
                    if (line.editChangeType == PointEditChangeType.none) {
                        var selLine = new PointSelectorLine();
                        selLine.line = line;
                        selLine.selectStateAfter = true;
                        selLine.selectStateBefore = line.isSelected;
                        line.isSelected = selLine.selectStateAfter;
                        line.editChangeType = PointEditChangeType.unselectedToSelected;
                        this.selectedLines.push(selLine);
                    }
                }
            }
            if (editMode == SelectionEditMode.setUnselected
                || editMode == SelectionEditMode.toggle) {
                if (point.isSelected && point.editChangeType == PointEditChangeType.none) {
                    var selPoint = new PointSelectorPoint();
                    selPoint.point = point;
                    selPoint.selectStateAfter = false;
                    selPoint.selectStateBefore = point.isSelected;
                    this.selectedPoints.push(selPoint);
                    point.isSelected = selPoint.selectStateAfter;
                    point.editChangeType = PointEditChangeType.selectedToUnselected;
                    if (line.editChangeType == PointEditChangeType.none) {
                        var selLine = new PointSelectorLine();
                        selLine.line = line;
                        selLine.selectStateBefore = line.isSelected;
                        line.editChangeType = PointEditChangeType.selectedToUnselected;
                        this.selectedLines.push(selLine);
                    }
                }
            }
        };
        LinePointSelector.prototype.selectLinePoints = function (line, editMode) {
            for (var _i = 0, _a = line.points; _i < _a.length; _i++) {
                var point = _a[_i];
                this.selectPoint(line, point, editMode);
            }
        };
        LinePointSelector.prototype.releaseEditState = function () {
            for (var _i = 0, _a = this.selectedPoints; _i < _a.length; _i++) {
                var selPoint = _a[_i];
                selPoint.point.editChangeType = PointEditChangeType.none;
            }
            for (var _b = 0, _c = this.selectedLines; _b < _c.length; _b++) {
                var selLine = _c[_b];
                selLine.line.editChangeType = PointEditChangeType.none;
            }
        };
        return LinePointSelector;
    }());
    ManualTracingTool.LinePointSelector = LinePointSelector;
    var HitTest_LinePoint_BrushSelect = (function (_super) {
        __extends(HitTest_LinePoint_BrushSelect, _super);
        function HitTest_LinePoint_BrushSelect() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.editMode = SelectionEditMode.setSelected;
            _this.selector = new LinePointSelector();
            return _this;
        }
        HitTest_LinePoint_BrushSelect.prototype.beforeHitTest = function () {
            this.selector.clear();
        };
        HitTest_LinePoint_BrushSelect.prototype.onPointHited = function (line, point) {
            this.selector.selectPoint(line, point, this.editMode);
        };
        HitTest_LinePoint_BrushSelect.prototype.afterHitTest = function () {
            for (var _i = 0, _a = this.selector.selectedLines; _i < _a.length; _i++) {
                var selLine = _a[_i];
                var existsSelectedPoint = false;
                for (var _b = 0, _c = selLine.line.points; _b < _c.length; _b++) {
                    var point = _c[_b];
                    if (point.isSelected) {
                        existsSelectedPoint = true;
                        break;
                    }
                }
                selLine.selectStateAfter = existsSelectedPoint;
                selLine.line.isSelected = existsSelectedPoint;
            }
            this.selector.releaseEditState();
        };
        return HitTest_LinePoint_BrushSelect;
    }(ManualTracingTool.HitTest_LinePoint_PointDistanceBase));
    ManualTracingTool.HitTest_LinePoint_BrushSelect = HitTest_LinePoint_BrushSelect;
    var HitTest_LinePoint_LineHitTest = (function (_super) {
        __extends(HitTest_LinePoint_LineHitTest, _super);
        function HitTest_LinePoint_LineHitTest() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.isChanged = false;
            return _this;
        }
        HitTest_LinePoint_LineHitTest.prototype.beforeHitTest = function () {
            this.isChanged = false;
        };
        HitTest_LinePoint_LineHitTest.prototype.onLineSectionHited = function (line, point1, point2) {
            if (!line.isClosingToMouse) {
                this.isChanged = true;
            }
            line.isClosingToMouse = true;
            this.exitPointHitTest = true;
        };
        HitTest_LinePoint_LineHitTest.prototype.onLineSectionNotHited = function (line, point1, point2) {
            if (line.isClosingToMouse) {
                this.isChanged = true;
            }
            line.isClosingToMouse = false;
        };
        return HitTest_LinePoint_LineHitTest;
    }(ManualTracingTool.HitTest_LinePoint_LineDistanceBase));
    ManualTracingTool.HitTest_LinePoint_LineHitTest = HitTest_LinePoint_LineHitTest;
    var HitTest_LinePoint_LineSelect = (function (_super) {
        __extends(HitTest_LinePoint_LineSelect, _super);
        function HitTest_LinePoint_LineSelect() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.editMode = SelectionEditMode.setSelected;
            _this.selector = new LinePointSelector();
            return _this;
        }
        HitTest_LinePoint_LineSelect.prototype.beforeHitTest = function () {
            this.selector.clear();
        };
        HitTest_LinePoint_LineSelect.prototype.onLineSectionHited = function (line, point1, point2) {
            this.selector.selectLinePoints(line, this.editMode);
            this.exitPointHitTest = true;
        };
        HitTest_LinePoint_LineSelect.prototype.afterHitTest = function () {
            this.selector.releaseEditState();
        };
        return HitTest_LinePoint_LineSelect;
    }(ManualTracingTool.HitTest_LinePoint_LineDistanceBase));
    ManualTracingTool.HitTest_LinePoint_LineSelect = HitTest_LinePoint_LineSelect;
})(ManualTracingTool || (ManualTracingTool = {}));
