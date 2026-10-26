import { DIAGRAM_HEIGHT, DIAGRAM_WIDTH } from './horseDiagram.js'

// Alpha hit testing supplements region paths: a path cannot make transparent
// background, the gaps between legs, or the tail into an injury placement target.
export function loadHorsePhoto(url) {
  return new Promise((resolve, reject) => {
    if (!url) { reject(new Error('Chưa có ảnh ngựa phù hợp.')); return }
    const photo = new Image()
    photo.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = DIAGRAM_WIDTH; canvas.height = DIAGRAM_HEIGHT
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Không đọc được ảnh ngựa.')
        // Match SVG image preserveAspectRatio="xMidYMid meet" exactly.
        const scale = Math.min(DIAGRAM_WIDTH / photo.naturalWidth, DIAGRAM_HEIGHT / photo.naturalHeight)
        const width = photo.naturalWidth * scale, height = photo.naturalHeight * scale
        context.drawImage(photo, (DIAGRAM_WIDTH - width) / 2, (DIAGRAM_HEIGHT - height) / 2, width, height)
        const pixels = context.getImageData(0, 0, DIAGRAM_WIDTH, DIAGRAM_HEIGHT).data
        let opaque = false, transparent = false
        for (let index = 3; index < pixels.length; index += 4) {
          if (pixels[index] > 192) opaque = true
          if (pixels[index] < 16) transparent = true
          if (opaque && transparent) break
        }
        if (!opaque || !transparent) throw new Error('Cần ảnh ngựa có nền trong suốt.')
        resolve({
          naturalWidth: photo.naturalWidth, naturalHeight: photo.naturalHeight,
          contains(point, mirror = false) {
            if (!point || !Number.isFinite(point.xRatio) || !Number.isFinite(point.yRatio) || point.xRatio < 0 || point.xRatio > 1 || point.yRatio < 0 || point.yRatio > 1) return false
            const x = Math.min(DIAGRAM_WIDTH - 1, Math.floor((mirror ? 1 - point.xRatio : point.xRatio) * DIAGRAM_WIDTH))
            const y = Math.min(DIAGRAM_HEIGHT - 1, Math.floor(point.yRatio * DIAGRAM_HEIGHT))
            return pixels[(y * DIAGRAM_WIDTH + x) * 4 + 3] > 192
          },
        })
      } catch (error) { reject(error) }
    }
    photo.onerror = () => reject(new Error('Không tải được ảnh ngựa.'))
    photo.src = url
  })
}
