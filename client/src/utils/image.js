// Downscale + compress a photo client-side before uploading, so a full-resolution phone
// photo doesn't blow past the API's request size limit. maxDim matches Claude's documented
// image processing size, so nothing is wasted uploading resolution the model discards anyway.
export async function fileToCompressedBase64(file, { maxDim = 1568, quality = 0.82 } = {}) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)

  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return dataUrl.split(',')[1] // strip the "data:image/jpeg;base64," prefix
}
