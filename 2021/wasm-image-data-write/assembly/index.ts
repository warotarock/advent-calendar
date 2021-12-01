
// instantiate時に渡されたモジュール
declare namespace main {
  function putPixel(offset: f64, r: f64, g: f64, b: f64, a: f64): void
}

// JavaScript関数経由で描画
export function drawViaFunction(width: u32, height: u32, time: f64): void {

  const pixelBytes: u32 = 4
  const lineBytes: u32 = width * pixelBytes
  const density: f64 = 0.05
  const amplitude: f64 = 0.3
  const frequency: f64 = 10.0
  const scroll: f64 = 0.1
  const fwidth = width as f64
  const fheight = height as f64
  const sin = Math.sin
  const abs = Math.abs

  let offsetY: u32 = 0

  for (let y: f64 = 0.0; y < fheight; y += 1.0) {

    const posy = y / fheight - 0.5
    let offset = offsetY

    for (let x: f64 = 0; x < fwidth; x += 1.0) {

      const posx = x / fwidth - 0.5

      // from https://glslsandbox.com/e#76927.0
      const line1 = (1.0 / abs((posy + (amplitude * sin((posx + time * scroll) * frequency)))) * density) * 255
      const line2 = (1.0 / abs((posy + (amplitude * sin(((posx - 0.1) + time * scroll) * frequency)))) * density) * 255
      const line3 = (1.0 / abs((posy + (amplitude * sin(((posx - 0.2) + time * scroll) * frequency)))) * density) * 255
      
      main.putPixel(
        offset,
        0.10 * line1 + 0.05 * line2 + 0.05 * line3,
        0.05 * line1 + 0.10 * line2 + 0.05 * line3,
        0.05 * line1 + 0.05 * line2 + 0.10 * line3,
        255.0
      )

      offset += pixelBytes
    }

    offsetY += lineBytes
  }
}

// メモリ共有で描画
export function drawToByteArray(data: Uint8Array, width: u32, height: u32, time: f64): void {

  const pixelBytes: u32 = 4
  const lineBytes: u32 = width * pixelBytes
  const density: f64 = 0.05
  const amplitude: f64 = 0.3
  const frequency: f64 = 10.0
  const scroll: f64 = 0.1
  const fwidth = width as f64
  const fheight = height as f64
  const sin = Math.sin
  const abs = Math.abs

  let offsetY: u32 = 0

  for (let y: f64 = 0.0; y < fheight; y += 1.0) {

    const posy = y / fheight - 0.5
    let offset = offsetY

    for (let x: f64 = 0; x < fwidth; x += 1.0) {

      const posx = x / fwidth - 0.5

      // from https://glslsandbox.com/e#76927.0
      const line1 = (1.0 / abs((posy + (amplitude * sin((posx + time * scroll) * frequency)))) * density) * 255
      const line2 = (1.0 / abs((posy + (amplitude * sin(((posx - 0.1) + time * scroll) * frequency)))) * density) * 255
      const line3 = (1.0 / abs((posy + (amplitude * sin(((posx - 0.2) + time * scroll) * frequency)))) * density) * 255
      
      data[offset + 0] = clampU8(line1 * 0.10 + line2 * 0.05 + line3 * 0.05)
      data[offset + 1] = clampU8(line1 * 0.05 + line2 * 0.10 + line3 * 0.05)
      data[offset + 2] = clampU8(line1 * 0.05 + line2 * 0.05 + line3 * 0.10)
      data[offset + 3] = 255

      offset += pixelBytes
    }

    offsetY += lineBytes
  }
}

function clampU8(value: f64): u8 {

  if (value > 255) {
    return 255
  }
  else {
    return value as u8
  }
}

// 型付き配列をJavaScriptと共有するために必要な型のエクスポート
export const Uint8ArrayID = idof<Uint8Array>()

