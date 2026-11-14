import React from "react";

interface WatermarkPatternProps {
  /** Unique SVG pattern ID per instance so multiple watermarks on a page never collide. */
  patternId: string;
  text: string;
  color: string;
  opacity?: number;
  tileWidth?: number;
  tileHeight?: number;
  fontSize?: number;
  letterSpacing?: string;
  fontFamily?: string;
}

/**
 * Renders a seamlessly tiled SVG text watermark covering 100% of its parent container
 * regardless of viewport width or height.
 */
export default function WatermarkPattern({
  patternId,
  text,
  color,
  opacity = 0.05,
  tileWidth = 180,
  tileHeight = 72,
  fontSize = 22,
  letterSpacing = "0.08em",
  fontFamily = "inherit",
}: WatermarkPatternProps) {
  const halfW = tileWidth / 2;
  const row1Y = Math.round(tileHeight * 0.36);
  const row2Y = Math.round(tileHeight * 0.86);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      style={{ opacity }}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={patternId}
          width={tileWidth}
          height={tileHeight}
          patternUnits="userSpaceOnUse"
        >
          <text
            x={halfW}
            y={row1Y}
            textAnchor="middle"
            fill={color}
            fontSize={fontSize}
            fontWeight="900"
            letterSpacing={letterSpacing}
            style={{ fontFamily }}
          >
            {text}
          </text>
          {/* Split second row across tile edges for staggered brick alignment without clipping */}
          <text
            x={0}
            y={row2Y}
            textAnchor="middle"
            fill={color}
            fontSize={fontSize}
            fontWeight="900"
            letterSpacing={letterSpacing}
            style={{ fontFamily }}
          >
            {text}
          </text>
          <text
            x={tileWidth}
            y={row2Y}
            textAnchor="middle"
            fill={color}
            fontSize={fontSize}
            fontWeight="900"
            letterSpacing={letterSpacing}
            style={{ fontFamily }}
          >
            {text}
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
