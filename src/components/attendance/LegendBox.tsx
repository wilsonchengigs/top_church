import type { CSSProperties } from "react";
import { GRAY_BADGE_URL, COLOR_BADGE_URL } from "../../constants";

interface LegendItemProps {
  imgSrc: string;
  imgGray?: boolean;
  pending?: boolean;
  border?: boolean;
  special?: boolean;
  label: string;
}

function LegendItem({
  imgSrc,
  imgGray = false,
  pending = false,
  border = false,
  special = false,
  label,
}: LegendItemProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}>
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          outline: pending ? "2.5px solid #6D28D9" : border ? "2px solid #9CA3AF" : "none",
          outlineOffset: "2px",
          flexShrink: 0,
        }}
      >
        <img
          src={imgSrc}
          alt=""
          width={24}
          height={24}
          style={{ display: "block", opacity: (imgGray || border) && !pending ? 0.45 : 1 }}
        />
      </div>
      <span style={{ color: special ? "#6D28D9" : "#374151" }}>{label}</span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  box: {
    display: "flex",
    gap: 16,
    padding: "12px 14px",
    backgroundColor: "#FAFAFA",
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    marginBottom: 12,
  },
  col: { flex: 1, display: "flex", flexDirection: "column", gap: 6 },
  title: { fontSize: 11, fontWeight: 700, color: "#1E3A5F", marginBottom: 2, letterSpacing: 0.5 },
  divider: { width: 1, background: "#DDD6FE", alignSelf: "stretch" },
};

export function LegendBox() {
  return (
    <div style={styles.box}>
      <div style={styles.col}>
        <span style={styles.title}>1189</span>
        <LegendItem imgGray imgSrc={GRAY_BADGE_URL(1)} label="尚報名（不可補登）" />
        <LegendItem imgSrc={GRAY_BADGE_URL(1)} border label="未完成（可補登）" />
        <LegendItem imgSrc={COLOR_BADGE_URL(1)} label="已完成" />
        <LegendItem imgSrc={COLOR_BADGE_URL(1)} pending label="待送出" />
      </div>
      <div style={styles.divider} />
      <div style={styles.col}>
        <span style={{ ...styles.title, color: "#7C3AED" }}>日日有光</span>
        <LegendItem imgSrc={GRAY_BADGE_URL(4)} border label="尚報名（可補登）" special />
        <LegendItem imgSrc={GRAY_BADGE_URL(4)} border label="未完成（可補登）" special />
        <LegendItem imgSrc={COLOR_BADGE_URL(4)} label="已完成" special />
      </div>
    </div>
  );
}
