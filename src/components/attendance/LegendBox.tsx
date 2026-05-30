import type { CSSProperties } from "react";
import { GRAY_BADGE_URL, COLOR_BADGE_URL } from "../../constants";

const PINK_FILTER = "sepia(1) hue-rotate(290deg) saturate(4) brightness(1.1)";

interface LegendItemProps {
  visual: "background" | "pink" | "color" | "pending";
  label: string;
}

function LegendItem({ visual, label }: LegendItemProps) {
  const size = 24;

  const renderVisual = () => {
    if (visual === "background") {
      return (
        <div style={{ width: size, height: size, borderRadius: 4, background: "#F1F5F9", flexShrink: 0 }} />
      );
    }
    if (visual === "pink") {
      return (
        <div style={{ width: size, height: size, flexShrink: 0 }}>
          <img
            src={GRAY_BADGE_URL(1)}
            alt=""
            width={size}
            height={size}
            style={{ display: "block", filter: PINK_FILTER, opacity: 0.85 }}
          />
        </div>
      );
    }
    if (visual === "color") {
      return (
        <div style={{ width: size, height: size, flexShrink: 0 }}>
          <img src={COLOR_BADGE_URL(1)} alt="" width={size} height={size} style={{ display: "block" }} />
        </div>
      );
    }
    return (
      <div style={{ width: size, height: size, flexShrink: 0, outline: "2.5px solid #6D28D9", outlineOffset: "2px" }}>
        <img src={COLOR_BADGE_URL(1)} alt="" width={size} height={size} style={{ display: "block" }} />
      </div>
    );
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}>
      {renderVisual()}
      <span>{label}</span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  box: {
    padding: "12px 14px",
    backgroundColor: "#FAFAFA",
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    marginBottom: 12,
  },
  col: { display: "flex", flexDirection: "column", gap: 6 },
  title: { fontSize: 11, fontWeight: 700, color: "#7C3AED", marginBottom: 2, letterSpacing: 0.5 },
};

export function LegendBox() {
  return (
    <div style={styles.box}>
      <div style={styles.col}>
        <span style={styles.title}>回報辦法</span>
        <LegendItem visual="background" label="沒報名" />
        <LegendItem visual="pink" label="未完成（可補登）" />
        <LegendItem visual="color" label="已完成" />
        <LegendItem visual="pending" label="待送出" />
      </div>
    </div>
  );
}
