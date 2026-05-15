import { DINO_W, DINO_H } from "./gameConstants";

export function DinoSVG({ frame }: { frame: 0 | 1 | "dead" }) {
  return (
    <svg width={DINO_W * 2} height={DINO_H * 2} viewBox="0 0 34 48" fill="#535353">
      <rect x="4" y="14" width="22" height="18" />
      <rect x="18" y="8" width="10" height="10" />
      <rect x="20" y="2" width="14" height="12" />
      <rect x="30" y="4" width="3" height="3" fill="white" />
      <rect x="32" y="12" width="2" height="2" fill={frame === "dead" ? "#DC2626" : "#535353"} />
      <rect x="0" y="16" width="8" height="6" />
      <rect x="2" y="14" width="6" height="4" />
      <rect x="20" y="22" width="6" height="4" />
      {frame === "dead" ? (
        <>
          <rect x="14" y="32" width="6" height="10" />
          <rect x="10" y="38" width="8" height="4" />
          <rect x="22" y="32" width="6" height="10" />
          <rect x="22" y="38" width="8" height="4" />
        </>
      ) : frame === 0 ? (
        <>
          <rect x="14" y="32" width="6" height="12" />
          <rect x="14" y="44" width="8" height="4" />
          <rect x="22" y="32" width="6" height="8" />
          <rect x="18" y="38" width="8" height="4" />
        </>
      ) : (
        <>
          <rect x="14" y="32" width="6" height="8" />
          <rect x="10" y="38" width="8" height="4" />
          <rect x="22" y="32" width="6" height="12" />
          <rect x="22" y="44" width="8" height="4" />
        </>
      )}
    </svg>
  );
}

export function CactusSVG({ h }: { h: number }) {
  return (
    <svg width="28" height={h} viewBox={`0 0 28 ${h}`} fill="#535353">
      <rect x="10" y="0" width="8" height={h} />
      <rect x="2" y={h * 0.25} width="10" height="6" />
      <rect x="2" y={h * 0.15} width="6" height="12" />
      <rect x="18" y={h * 0.35} width="10" height="6" />
      <rect x="22" y={h * 0.25} width="6" height="12" />
    </svg>
  );
}

export function TallCactusSVG({ h }: { h: number }) {
  return (
    <svg width="22" height={h} viewBox={`0 0 22 ${h}`} fill="#4B5563">
      <rect x="8" y="0" width="6" height={h} />
      <rect x="1" y={h * 0.3} width="8" height="5" />
      <rect x="1" y={h * 0.2} width="5" height="14" />
      <rect x="13" y={h * 0.45} width="8" height="5" />
      <rect x="17" y={h * 0.35} width="5" height="14" />
    </svg>
  );
}
