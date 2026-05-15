import type { LeaderEntry } from "../../types";

interface LeaderboardModalProps {
  leaderboard: LeaderEntry[];
  playerName: string;
  best: number;
  onClose: () => void;
}

export function LeaderboardModal({ leaderboard, playerName, best, onClose }: LeaderboardModalProps) {
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
          padding: "24px 20px 20px",
          width: "min(340px, calc(100vw - 32px))",
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div>
            <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 18, color: "#1E293B" }}>
              🏆 排行榜
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#94A3B8" }}>
              成績約每 30 秒更新一次
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "#94A3B8",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {playerName && (
          <div
            style={{
              background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
              border: "1.5px solid #BFDBFE",
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#3B82F6",
                marginBottom: 6,
                letterSpacing: 0.5,
              }}
            >
              🦕 我的紀錄
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#1E3A5F" }}>{playerName}</span>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 20, color: "#1E40AF" }}
                >
                  {String(best).padStart(5, "0")}
                </div>
                {(() => {
                  const myRank = leaderboard.findIndex((e) => e.name === playerName);
                  return myRank >= 0 ? (
                    <div style={{ fontSize: 11, color: "#60A5FA", fontWeight: 600 }}>
                      排名第 {myRank + 1} 名
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "#93C5FD" }}>尚未上榜</div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#94A3B8",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          前十名
        </div>

        {leaderboard.length === 0 ? (
          <p
            style={{ color: "#94A3B8", textAlign: "center", fontSize: 14, padding: "16px 0" }}
          >
            還沒有紀錄
          </p>
        ) : (
          leaderboard.slice(0, 10).map((entry) => {
            const isMe = entry.name === playerName;
            return (
              <div
                key={entry.rank}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 10px",
                  marginBottom: 4,
                  borderRadius: 10,
                  background: isMe ? "#FFF7ED" : entry.rank <= 3 ? "#FAFAFA" : "transparent",
                  border: isMe ? "1.5px solid #FED7AA" : "1.5px solid transparent",
                }}
              >
                <span
                  style={{ width: 26, textAlign: "center", fontWeight: 800, fontSize: 15, flexShrink: 0 }}
                >
                  {entry.rank === 1
                    ? "🥇"
                    : entry.rank === 2
                    ? "🥈"
                    : entry.rank === 3
                    ? "🥉"
                    : <span style={{ fontSize: 12, color: "#94A3B8" }}>#{entry.rank}</span>}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontWeight: isMe ? 800 : 600,
                    fontSize: 15,
                    color: isMe ? "#C2410C" : "#1E293B",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.name}{isMe ? " 👈" : ""}
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 700,
                    fontSize: 15,
                    color: entry.rank === 1 ? "#D97706" : isMe ? "#EA580C" : "#374151",
                    flexShrink: 0,
                  }}
                >
                  {String(entry.score).padStart(5, "0")}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
