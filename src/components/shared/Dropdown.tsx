import type { CSSProperties } from "react";

export interface DropdownProps {
  options: string[];
  active: number;
  onSelect: (v: string) => void;
  onHover: (i: number) => void;
}

const styles: Record<string, CSSProperties> = {
  container: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    border: "1.5px solid #CBD5E1",
    borderRadius: 10,
    boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
    zIndex: 50,
    maxHeight: 280,
    overflowY: "auto",
  },
  item: {
    padding: "14px 16px",
    fontSize: 15,
    cursor: "pointer",
    color: "#1E293B",
    borderBottom: "1px solid #F1F5F9",
    transition: "background 0.1s",
  },
  itemActive: {
    backgroundColor: "#EFF6FF",
    color: "#1E3A5F",
  },
};

export function Dropdown({ options, active, onSelect, onHover }: DropdownProps) {
  if (options.length === 0) return null;
  return (
    <div style={styles.container}>
      {options.map((opt, i) => (
        <div
          key={opt}
          style={{ ...styles.item, ...(i === active ? styles.itemActive : {}) }}
          onMouseDown={() => onSelect(opt)}
          onMouseEnter={() => onHover(i)}
        >
          {opt}
        </div>
      ))}
    </div>
  );
}
