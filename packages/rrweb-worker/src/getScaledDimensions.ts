export function getScaledDimensions(
  width: number,
  height: number,
  maxSize?: [width: number, height: number],
) {
  if (!maxSize) {
    return [width, height];
  }
  const [maxWidth, maxHeight] = maxSize;

  // Nothing to do here
  if (width <= maxWidth && height <= maxHeight) {
    return [width, height];
  }

  let targetWidth = width;
  let targetHeight = height;

  // TODO: memoization could be a nice optimization here as canvas sizes should
  // not be too dynamic

  // scale down each dimension
  if (targetWidth > maxWidth) {
    targetHeight = Math.floor((maxWidth * height) / width);
    targetWidth = maxWidth;
  }
  if (targetHeight > maxHeight) {
    targetWidth = Math.floor((maxHeight * width) / height);
    targetHeight = maxHeight;
  }

  return [targetWidth, targetHeight];
}
