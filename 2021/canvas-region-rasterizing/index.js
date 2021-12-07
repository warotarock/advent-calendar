// 領域全体の情報
class RegionInfo {
    constructor(canvasWidth, canvasHeight) {
        // キャンバスのサイズ
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        // 領域を構成するパス
        this.pathSegments = null;
        // 塗りつぶしの基準となるエッジ情報（一次元目の要素数はcanvasHeightと一致、二次元目は可変）
        this.edgeInfos = null;
        // 領域の矩形範囲
        this.minX = 0;
        this.minY = 0;
        this.maxX = 0;
        this.maxY = 0;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.minX = canvasWidth;
        this.minY = canvasHeight;
    }
}
// 領域こ構成する線分
class PathSegment {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }
}
// 領域のエッジ情報
class EdgeInfo {
    constructor(x, pixelLength, passingLineCount) {
        this.x = x;
        this.pixelLength = pixelLength;
        this.passingLineCount = passingLineCount;
    }
}
// エッジ情報構築処理の状態
class EdgeProcessState {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.beginXIndex = 0;
        this.lastXIndex = 0;
        this.lastYIndex = 0;
        this.passingLineCount = 0;
    }
}
// 領域情報の作成
function createRegionInfo(width, height) {
    const regionInfo = new RegionInfo(width, height);
    resetRegionInfo(regionInfo);
    return regionInfo;
}
function resetRegionInfo(regionInfo) {
    regionInfo.minX = regionInfo.canvasWidth - 1;
    regionInfo.minY = regionInfo.canvasHeight - 1;
    regionInfo.maxX = 0;
    regionInfo.maxY = 0;
    regionInfo.pathSegments = [];
    regionInfo.edgeInfos = new Array(regionInfo.canvasHeight);
    for (let index = 0; index < regionInfo.edgeInfos.length; index++) {
        regionInfo.edgeInfos[index] = [];
    }
}
// エッジ情報の構築
function constructEdgeInfo(regionInfo) {
    const pathSegments = regionInfo.pathSegments;
    if (pathSegments.length < 3) {
        return;
    }
    const state = new EdgeProcessState();
    const first_PathSegment = pathSegments[0];
    state.x = Math.floor(first_PathSegment.x1);
    state.y = Math.floor(first_PathSegment.y1);
    state.beginXIndex = state.x;
    state.lastXIndex = state.x;
    state.lastYIndex = state.y;
    state.passingLineCount = 0;
    const last_PathSegment = pathSegments[pathSegments.length - 1];
    // 最後の線分から最初の線分に戻る部分の状態をさかのぼって計算
    backProcessEdgeInfoConstructionForLast(state, last_PathSegment);
    // 各線分のエッジ情報を構築
    for (let index = 0; index < pathSegments.length; index++) {
        const current_PathSegment = pathSegments[index];
        const previous_PathSegment = (index > 0
            ? pathSegments[index - 1]
            : pathSegments[pathSegments.length - 1]);
        processEdgeInfoConstruction(regionInfo, state, current_PathSegment, previous_PathSegment);
    }
}
function processEdgeInfoConstruction(regionInfo, state, current_PathSegment, previous_PathSegment) {
    let x = state.x;
    let y = state.y;
    let beginXIndex = state.beginXIndex;
    let lastXIndex = state.lastXIndex;
    let lastYIndex = state.lastYIndex;
    let passingLineCount = state.passingLineCount;
    const current_yDifference = current_PathSegment.y2 - current_PathSegment.y1;
    const previous_yDifference = previous_PathSegment.y2 - previous_PathSegment.y1;
    const x1 = current_PathSegment.x1;
    const y1 = current_PathSegment.y1;
    const x2 = current_PathSegment.x2;
    const y2 = current_PathSegment.y2;
    // エッジ情報の積み上げ
    const startX = Math.floor(x1);
    const startY = Math.floor(y1);
    const endX = Math.floor(x2);
    const endY = Math.floor(y2);
    const xDifference = endX - startX;
    const yDifference = endY - startY;
    // currentとpreviousに挟まれた頂点が、線が一方向に通過する角（＝横向きの角）であることの判定
    const isPassingCorner = ((current_yDifference < 0 && previous_yDifference < 0)
        || (current_yDifference > 0 && previous_yDifference > 0)
        || (current_yDifference == 0 && previous_yDifference != 0)
        || (current_yDifference != 0 && previous_yDifference == 0));
    // 一方向に通過する角でない（＝上下向きの角）場合は、ピクセルに入って同じ方向に出ていく二本の線分が存在することとして扱います
    if (!isPassingCorner) {
        passingLineCount = 2;
    }
    // エッジ情報の積み上げ: 縦方向の線分の場合
    if (Math.abs(xDifference) <= Math.abs(yDifference)) {
        const scanDirection = Math.sign(yDifference);
        while (y != endY) {
            // 縦方向に移動
            y += scanDirection;
            // 横方向の位置を計算
            const currentX = startX + xDifference / yDifference * (y - startY);
            const xIndex = Math.floor(currentX);
            // 縦方向に移動したため、確定済みピクセルに登録
            {
                const startXIndex = Math.min(lastXIndex, beginXIndex);
                const endXIndex = Math.max(lastXIndex, beginXIndex);
                registerEdgeInfo(regionInfo, startXIndex, lastYIndex, Math.abs(endXIndex - startXIndex) + 1, passingLineCount);
            }
            // 横方向に移動
            x = xIndex;
            // 確定済みピクセルの範囲を次のピクセルに移動
            beginXIndex = Math.floor(currentX);
            lastXIndex = beginXIndex;
            lastYIndex = y;
            // 頂点以外のエッジは常に交差する線1本として扱う
            passingLineCount = 1;
        }
    }
    // エッジ情報の積み上げ: 横方向の線分の場合
    else {
        const scanDirection = Math.sign(xDifference);
        while (x != endX) {
            // 横方向に移動
            x += scanDirection;
            // 縦方向の位置を計算
            const currentY = startY + yDifference / xDifference * (x - startX);
            const yIndex = Math.floor(currentY);
            // 縦方向の移動が発生する場合
            if (yIndex != lastYIndex) {
                // 縦方向に移動
                y = yIndex;
                // 縦方向に移動したため、確定済みピクセルに登録
                {
                    const startXIndex = Math.min(lastXIndex, beginXIndex);
                    const endXIndex = Math.max(lastXIndex, beginXIndex);
                    registerEdgeInfo(regionInfo, startXIndex, lastYIndex, Math.abs(endXIndex - startXIndex) + 1, passingLineCount);
                }
                // 確定済みピクセルの範囲を次のピクセルに移動
                beginXIndex = x;
                lastXIndex = beginXIndex;
                lastYIndex = y;
                // 頂点以外のエッジは常に交差する線1本として扱う
                passingLineCount = 1;
            }
            // 確定済みピクセルの範囲を更新
            lastXIndex = x;
        }
    }
    // 描画範囲の更新
    regionInfo.minX = Math.min(regionInfo.minX, x1, x2);
    regionInfo.minY = Math.min(regionInfo.minY, y1, y2);
    regionInfo.maxX = Math.max(regionInfo.maxX, x1, x2);
    regionInfo.maxY = Math.max(regionInfo.maxY, y1, y2);
    regionInfo.minX = Math.max(regionInfo.minX, 0);
    regionInfo.minY = Math.max(regionInfo.minY, 0);
    regionInfo.maxX = Math.min(regionInfo.maxX, regionInfo.canvasWidth - 1);
    regionInfo.maxY = Math.min(regionInfo.maxY, regionInfo.canvasHeight - 1);
    // 状態の更新
    state.x = x;
    state.y = y;
    state.beginXIndex = beginXIndex;
    state.lastXIndex = lastXIndex;
    state.lastYIndex = lastYIndex;
    state.passingLineCount = passingLineCount;
}
function backProcessEdgeInfoConstructionForLast(state, current_PathSegment) {
    let x = state.x;
    let beginXIndex = state.beginXIndex;
    let lastXIndex = state.lastXIndex;
    let lastYIndex = state.lastYIndex;
    const x1 = current_PathSegment.x1;
    const y1 = current_PathSegment.y1;
    const x2 = current_PathSegment.x2;
    const y2 = current_PathSegment.y2;
    // エッジ情報の積み上げ
    const startX = Math.floor(x1);
    const startY = Math.floor(y1);
    const endX = Math.floor(x2);
    const endY = Math.floor(y2);
    const xDifference = endX - startX;
    const yDifference = endY - startY;
    // エッジ情報の積み上げ: 縦方向の線分の場合
    if (Math.abs(xDifference) <= Math.abs(yDifference)) {
        // 縦方向の場合、必ず縦の移動があるため特に処理は必要ありません
    }
    // エッジ情報の積み上げ: 横方向の線分の場合
    else {
        const scanDirection = -Math.sign(xDifference);
        while (x != startX) {
            // 横方向に移動
            x += scanDirection;
            // 縦方向の位置を計算
            const currentY = startY + yDifference / xDifference * (x - startX);
            const yIndex = Math.floor(currentY);
            // 縦方向の移動が発生する場合
            if (yIndex != lastYIndex) {
                // 確定済みピクセルの範囲を設定
                beginXIndex = lastXIndex;
                break;
            }
            // 確定済みピクセルの範囲を更新
            lastXIndex = x;
        }
    }
    // 状態の更新
    state.beginXIndex = beginXIndex;
}
function registerEdgeInfo(regionInfo, x, y, pixelLength, passingLineCount) {
    const xIndex = Math.floor(x);
    const yIndex = Math.floor(y);
    const edgeInfos = regionInfo.edgeInfos[yIndex];
    // 登録済みのエッジ情報を検索し、挿入/追加/結合いずれかを決定します
    let insertIndex = -1;
    let combineIndex = -1;
    for (let index = 0; index < edgeInfos.length; index++) {
        const edgeInfo = edgeInfos[index];
        if (xIndex + pixelLength - 1 < edgeInfo.x) {
            insertIndex = index;
            break;
        }
        else if (xIndex <= edgeInfo.x + edgeInfo.pixelLength - 1) {
            combineIndex = index;
            break;
        }
    }
    if (insertIndex != -1) {
        // 挿入
        edgeInfos.splice(insertIndex, 0, new EdgeInfo(xIndex, pixelLength, passingLineCount));
    }
    else if (combineIndex != -1) {
        // 結合
        const edgeInfo = edgeInfos[combineIndex];
        const minX = Math.min(xIndex, edgeInfo.x);
        const maxX = Math.max(xIndex + pixelLength - 1, edgeInfo.x + edgeInfo.pixelLength - 1);
        edgeInfo.x = minX;
        edgeInfo.pixelLength = maxX - minX + 1;
        edgeInfo.passingLineCount += passingLineCount;
    }
    else {
        // 追加
        edgeInfos.push(new EdgeInfo(xIndex, pixelLength, passingLineCount));
    }
}
// 塗りつぶし処理
function rasterizeRegionFill(data, regionInfo) {
    const pixelBytes = 4;
    const lineBytes = regionInfo.canvasWidth * pixelBytes;
    for (let y = regionInfo.minY; y <= regionInfo.maxY; y++) {
        const edgeInfos = regionInfo.edgeInfos[y];
        if (edgeInfos.length == 0) {
            continue;
        }
        let passingLineCount = 0;
        for (let index = 0; index < edgeInfos.length; index++) {
            const edgeInfo = edgeInfos[index];
            let startX = edgeInfo.x;
            let endX = startX + edgeInfo.pixelLength - 1;
            // 通過する線分の数が奇数である間のピクセルを塗りつぶします
            passingLineCount += edgeInfo.passingLineCount;
            if ((passingLineCount % 2) == 1) {
                for (let indexTo = index + 1; indexTo < edgeInfos.length; indexTo++) {
                    const edgeInfoTo = edgeInfos[indexTo];
                    passingLineCount += edgeInfoTo.passingLineCount;
                    // 偶数のところまで継続
                    if (passingLineCount % 2 == 0) {
                        endX = edgeInfoTo.x + edgeInfoTo.pixelLength - 1;
                        index = indexTo;
                        break;
                    }
                }
            }
            // 連続する部分の塗りつぶし
            let x = startX;
            let offset = y * lineBytes + x * pixelBytes;
            for (; x <= endX; x++) {
                data[offset + 0] = 0;
                data[offset + 1] = 0;
                data[offset + 2] = 0;
                data[offset + 3] = 255;
                offset += pixelBytes;
            }
        }
    }
}
// パスの作成
let pathCurrentX = 0.0;
let pathCurrentY = 0.0;
let pathBeginX = 0.0;
let pathBeginY = 0.0;
function beginPath(regionInfo, x, y) {
    regionInfo.pathSegments = [];
    pathCurrentX = x;
    pathCurrentY = y;
    pathBeginX = x;
    pathBeginY = y;
}
function lineTo(regionInfo, x, y) {
    regionInfo.pathSegments.push(new PathSegment(pathCurrentX, pathCurrentY, x, y));
    pathCurrentX = x;
    pathCurrentY = y;
}
function closePath(regionInfo) {
    regionInfo.pathSegments.push(new PathSegment(pathCurrentX, pathCurrentY, pathBeginX, pathBeginY));
    constructEdgeInfo(regionInfo);
}
// メイン処理
function draw(data, width, height) {
    const regionInfo = createRegionInfo(width, height);
    resetRegionInfo(regionInfo);
    beginPath(regionInfo, 5, 1);
    lineTo(regionInfo, 8, 2);
    lineTo(regionInfo, 5, 5);
    lineTo(regionInfo, 2, 2);
    closePath(regionInfo);
    rasterizeRegionFill(data, regionInfo);
    printRegionInfo(regionInfo);
    resetRegionInfo(regionInfo);
    beginPath(regionInfo, 100, 100);
    lineTo(regionInfo, 132, 200);
    lineTo(regionInfo, 50, 140);
    lineTo(regionInfo, 150, 140);
    lineTo(regionInfo, 68, 200);
    closePath(regionInfo);
    rasterizeRegionFill(data, regionInfo);
    // printRegionInfo(regionInfo) // エッジ情報を見たい場合
    resetRegionInfo(regionInfo);
    beginPath(regionInfo, 200, 100);
    lineTo(regionInfo, 240, 200);
    lineTo(regionInfo, 200, 190);
    lineTo(regionInfo, 160, 200);
    closePath(regionInfo);
    rasterizeRegionFill(data, regionInfo);
    // printRegionInfo(regionInfo)
    resetRegionInfo(regionInfo);
    beginPath(regionInfo, 300, 100);
    lineTo(regionInfo, 340, 113);
    lineTo(regionInfo, 300, 200);
    lineTo(regionInfo, 260, 113);
    closePath(regionInfo);
    beginPath(regionInfo, 300, 105);
    lineTo(regionInfo, 270, 115);
    lineTo(regionInfo, 300, 180);
    lineTo(regionInfo, 320, 125);
    closePath(regionInfo);
    beginPath(regionInfo, 298, 111);
    lineTo(regionInfo, 298, 122);
    lineTo(regionInfo, 280, 117);
    closePath(regionInfo);
    rasterizeRegionFill(data, regionInfo);
    // printRegionInfo(regionInfo)
}
function printRegionInfo(regionInfo) {
    for (const [index, edgeInfos] of regionInfo.edgeInfos.entries()) {
        if (edgeInfos.length > 0) {
            console.log(index, edgeInfos);
        }
    }
}
window.onload = () => {
    const canvas = document.getElementById('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    const canvasImageData = ctx.createImageData(canvas.width, canvas.height);
    document.getElementById('execute').onclick = () => {
        draw(canvasImageData.data, canvas.width, canvas.height);
        ctx.putImageData(canvasImageData, 0, 0);
    };
    draw(canvasImageData.data, canvas.width, canvas.height);
    ctx.putImageData(canvasImageData, 0, 0);
};
//# sourceMappingURL=index.js.map