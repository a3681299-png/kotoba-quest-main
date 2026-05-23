export type LayerVerticalAlign = "center" | "bottom";

export interface Size {
  width: number;
  height: number;
}

export interface LayerLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface LayerLayoutOptions {
  viewport: Size;
  texture: Size;
  verticalAlign: LayerVerticalAlign;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateLayerLayout({
  viewport,
  texture,
  verticalAlign,
}: LayerLayoutOptions): LayerLayout {
  const scale = Math.max(
    viewport.width / texture.width,
    viewport.height / texture.height,
  );
  const width = texture.width * scale;
  const height = texture.height * scale;
  const x = (viewport.width - width) / 2;
  const y =
    verticalAlign === "bottom" ? viewport.height - height : (viewport.height - height) / 2;

  return {
    x: roundToTwo(x),
    y: roundToTwo(y),
    width: roundToTwo(width),
    height: roundToTwo(height),
    scale: roundToTwo(scale),
  };
}
