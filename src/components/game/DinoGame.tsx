import { useCallback, useEffect, useRef, useState } from "react";
import { useGameLoop } from "../../hooks/useGameLoop";
import { DinoSVG, CactusSVG, TallCactusSVG } from "./DinoSprites";
import { NameInputModal } from "./NameInputModal";
import { LeaderboardModal } from "./LeaderboardModal";
import { API_ENDPOINTS } from "../../constants";
import { fetchLeaderboard, saveLeaderboardScore } from "../../services/api";
import type { LeaderEntry } from "../../types";
import { DINO_X } from "./gameConstants";

function useGameSize() {
  const [size, setSize] = useState(() => ({
    w: Math.min(window.innerWidth - 16, 520),
  }));
  useEffect(() => {
    const update = () => setSize({ w: Math.min(window.innerWidth - 16, 520) });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

export interface DinoGameProps {
  onLoaded?: boolean;
  onEnter?: () => void;
}

export default function DinoGame({ onLoaded, onEnter }: DinoGameProps) {
  const { w: gameW } = useGameSize();

  const [playerName, setPlayerName] = useState(() => {
    const saved = localStorage.getItem("dino_name");
    if (saved) return saved;
    const random = "player" + Math.floor(Math.random() * 900 + 100);
    localStorage.setItem("dino_name", random);
    return random;
  });
  const [nameInput, setNameInput] = useState(() => localStorage.getItem("dino_name") || "");
  const [showNameInput, setShowNameInput] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const playerNameRef = useRef(playerName);
  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);

  const loadLeaderboard = useCallback(async () => {
    try {
      const scores = await fetchLeaderboard(API_ENDPOINTS.LEADERBOARD);
      setLeaderboard(scores);
    } catch { /* leaderboard is optional */ }
  }, []);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  const onSaveScore = useCallback(async (finalScore: number) => {
    const name = playerNameRef.current.trim();
    if (!name) return;
    try {
      await saveLeaderboardScore(API_ENDPOINTS.LEADERBOARD, name, finalScore);
      loadLeaderboard();
    } catch { /* leaderboard is optional */ }
  }, [loadLeaderboard]);

  const { dinoY, frame, obstacles, clouds, score, best, dead, started, flash, jump, saveCurrentScore, gameAreaRef } =
    useGameLoop(gameW, onSaveScore);

  // 資料載完但還沒開始玩 → 直接進入
  const startedOnceRef = useRef(false);
  useEffect(() => {
    if (onLoaded && !startedOnceRef.current) onEnter?.();
  }, [onLoaded, onEnter]);

  const confirmName = () => {
    const n = nameInput.trim();
    if (n) { setPlayerName(n); localStorage.setItem("dino_name", n); }
    setShowNameInput(false);
  };

  const groundY = 20;
  const dinoBottom = groundY + dinoY;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: flash ? "#fff0f0" : "#fff",
        transition: "background 0.15s",
        zIndex: 50,
        userSelect: "none",
      }}
    >
      {/* 頂部列 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px 10px",
          borderBottom: "1px solid #F1F5F9",
          background: "#fff",
          flexShrink: 0,
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setShowNameInput(true); }}
          style={{
            fontSize: 13, fontWeight: 700, color: "#374151",
            background: "#F3F4F6", borderRadius: 8, padding: "6px 12px",
            border: "1px solid #E5E7EB", whiteSpace: "nowrap", fontFamily: "inherit", cursor: "pointer",
          }}
        >
          🦕 {playerName}
        </button>

        <div style={{ flex: 1, textAlign: "center", fontFamily: "monospace" }}>
          <span style={{ fontSize: 18, color: "#374151", fontWeight: 800 }}>
            {String(score).padStart(5, "0")}
          </span>
          <span style={{ fontSize: 14, color: "#9CA3AF", fontWeight: 700, marginLeft: 12 }}>
            HI {String(best).padStart(5, "0")}
          </span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setShowLeaderboard((v) => !v); loadLeaderboard(); }}
          style={{
            fontSize: 13, fontWeight: 700, color: "#6D28D9",
            background: "#F5F3FF", borderRadius: 8, padding: "6px 12px",
            border: "1px solid #DDD6FE", whiteSpace: "nowrap", fontFamily: "inherit", cursor: "pointer",
          }}
        >
          🏆 排行榜
        </button>
      </div>

      {/* 遊戲畫布 */}
      <div
        ref={gameAreaRef}
        onClick={jump}
        style={{
          position: "relative", width: "100%", flex: 1,
          overflow: "hidden", cursor: "pointer", background: "#FAFAFA",
        }}
      >
        {clouds.map((c, i) => (
          <div
            key={i}
            style={{ position: "absolute", top: c.y, left: c.x, width: c.w, height: 18, borderRadius: 99, background: "#E5E7EB", opacity: 0.7 }}
          />
        ))}
        <div style={{ position: "absolute", bottom: groundY, left: 0, right: 0, height: 2, background: "#6B7280" }} />
        {Array.from({ length: Math.floor(gameW / 70) }, (_, i) => (i + 1) * 60).map((x) => (
          <div key={x} style={{ position: "absolute", bottom: groundY - 5, left: x, width: 4, height: 2, background: "#D1D5DB" }} />
        ))}
        <div style={{ position: "absolute", bottom: dinoBottom, left: DINO_X, opacity: dead ? 0.5 : 1, transition: dead ? "opacity 0.2s" : "none" }}>
          <DinoSVG frame={dead ? "dead" : !started ? 0 : frame} />
        </div>
        {obstacles.map((o, i) => (
          <div key={i} style={{ position: "absolute", bottom: groundY, left: o.x }}>
            {o.type === "tall" ? <TallCactusSVG h={o.h} /> : <CactusSVG h={o.h} />}
          </div>
        ))}

        {!started && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#9CA3AF", background: "rgba(255,255,255,0.85)", padding: "6px 16px", borderRadius: 20 }}>
              {onLoaded ? "點擊開始遊戲" : "載入資料中..."}
            </span>
          </div>
        )}
        {dead && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#DC2626", background: "rgba(255,255,255,0.9)", padding: "6px 16px", borderRadius: 20 }}>
              撞到了！點擊重新開始
            </span>
          </div>
        )}
      </div>

      {/* 底部進入按鈕 */}
      <div style={{ flexShrink: 0, padding: "12px 16px", display: "flex", justifyContent: "center", background: "#fff", borderTop: "1px solid #F1F5F9" }}>
        {onLoaded ? (
          <button
            onClick={(e) => { e.stopPropagation(); saveCurrentScore(); onEnter?.(); }}
            style={{
              width: "100%", maxWidth: 400, padding: "14px 0", fontSize: 16, fontWeight: 800,
              background: "linear-gradient(135deg, #C8860A 0%, #F59E0B 100%)",
              color: "#fff", border: "none", borderRadius: 12, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(200,134,10,0.35)", letterSpacing: 1,
            }}
          >
            進入回報表 →
          </button>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>
            載入資料中，請稍候...
          </p>
        )}
      </div>

      {showNameInput && (
        <NameInputModal
          nameInput={nameInput}
          setNameInput={setNameInput}
          onConfirm={confirmName}
          onClose={() => setShowNameInput(false)}
        />
      )}

      {showLeaderboard && (
        <LeaderboardModal
          leaderboard={leaderboard}
          playerName={playerName}
          best={best}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  );
}
