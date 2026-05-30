interface NameInputModalProps {
  nameInput: string;
  setNameInput: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function NameInputModal({ nameInput, setNameInput, onConfirm, onClose }: NameInputModalProps) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "28px 24px 24px",
          width: "min(300px, calc(100vw - 40px))",
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        }}
      >
        <p style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 17, color: "#1E293B" }}>
          輸入你的名字
        </p>
        <input
          autoFocus
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onConfirm(); }}
          placeholder="你的名字..."
          style={{
            width: "100%",
            padding: "12px 14px",
            fontSize: 16,
            borderRadius: 10,
            border: "1.5px solid #CBD5E1",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "10px 0",
              fontWeight: 700,
              fontSize: 15,
              background: "#1E3A5F",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            確認
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 0",
              fontWeight: 700,
              fontSize: 15,
              background: "#F1F5F9",
              color: "#64748B",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
