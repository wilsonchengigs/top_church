import type { CSSProperties } from "react";
import { GRAYCOLOR_BADGE_URL, COLOR_BADGE_URL } from "../../constants";

const SPIN_KEYFRAMES = `
@keyframes badgeCycle {
  0%    { opacity: 1; }
  14%   { opacity: 1; }
  16%   { opacity: 0; }
  100%  { opacity: 0; }
}`;

const size = 24;

function BadgeCycleIcon() {
  const badges = [1, 2, 3, 4, 5, 6];
  const duration = 3; // seconds per full cycle
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <style>{SPIN_KEYFRAMES}</style>
      {badges.map((n, i) => (
        <img
          key={n}
          src={COLOR_BADGE_URL(n)}
          alt=""
          width={size}
          height={size}
          style={{
            display: "block",
            position: i === 0 ? "relative" : "absolute",
            top: 0,
            left: 0,
            animation: `badgeCycle ${duration * badges.length}s ${i * duration}s infinite`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  box: {
    padding: "10px 12px",
    backgroundColor: "#FAFAFA",
    border: "1px solid #E2E8F0",
    borderRadius: 10,
  },
  col: { display: "flex", flexDirection: "column", gap: 6 },
  title: { fontSize: 13, fontWeight: 700, color: "#7C3AED", marginBottom: 4, letterSpacing: 0.5 },
};

export function LegendBox() {
  return (
    <div style={styles.box}>
      <div style={styles.col}>
        <span style={styles.title}>回報辦法</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}>
          <div style={{ width: size, height: size, flexShrink: 0 }}>
            <img src={GRAYCOLOR_BADGE_URL(1)} alt="" width={size} height={size} style={{ display: "block", opacity: 0.9 }} />
          </div>
          <span>未完成（可補登）</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}>
          <BadgeCycleIcon />
          <span>已完成</span>
        </div>
      </div>
    </div>
  );
}
