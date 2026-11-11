const DEFAULT_IMAGE_WIDTH = 1200;
const DEFAULT_IMAGE_HEIGHT = 675;

function parseDimension(value?: string | number): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

interface ResolveImageDimensionsInput {
  width?: string | number;
  height?: string | number;
}

export function resolveImageDimensions({
  width,
  height,
}: ResolveImageDimensionsInput): { width: number; height: number } {
  return {
    width: parseDimension(width) ?? DEFAULT_IMAGE_WIDTH,
    height: parseDimension(height) ?? DEFAULT_IMAGE_HEIGHT,
  };
}
