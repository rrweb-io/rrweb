export function findLast<T>(
  array: Array<T>,
  predicate: (value: T) => boolean,
): T | undefined {
  const length = array.length;
  for (let i = length - 1; i >= 0; i -= 1) {
    if (predicate(array[i])) {
      return array[i];
    }
  }
}
