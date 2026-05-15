import { useCallback, useEffect, useRef, useState } from "react";
import type { DinoObstacle, DinoCloud, LeaderEntry } from "../../types";
import { API_ENDPOINTS } from "../../constants";
import { fetchLeaderboard, saveLeaderboardScore } from "../../services/api";

const DINO_X = 40;
const DINO_W = 34;
const DINO_H = 48;
const JUMP_V = 14;
const GRAVITY = 0.9;
const BASE_SPEED = 5;

function useGameSize() {
  const [size, setSize] = useState(() => ({
    w: Math.min(window.innerWidth - 16, 520),
    h: Math.min(Math.floor(window.innerHeight * 0.45), 280),
  }));
  useEffect(() => {
    const update = () =>
      setSize({
        w: Math.min(window.innerWidth - 16, 520),
        h: Math.min(Math.floor(window.innerHeight * 0.45), 280),
      });
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
  const [dinoY, setDinoY] = useState(0);
  const [frame, setFrame] = useState<0 | 1>(0);
  const [obstacles, setObstacles] = useState<DinoObstacle[]>([]);
  const [clouds, setClouds] = useState<DinoCloud[]>([
    { x: 300, y: 20, w: 60 },
    { x: 160, y: 10, w: 45 },
  ]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() =>
    parseInt(localStorage.getItem("dino_best") || "0")
  );
  const [dead, setDead] = useState(false);
  const [started, setStarted] = useState(false);
  const [flash, setFlash] = useState(false);

  const [playerName, setPlayerName] = useState(() => {
    const saved = localStorage.getItem("dino_name");
    if (saved) return saved;
    const random = "player" + Math.floor(Math.random() * 900 + 100);
    localStorage.setItem("dino_name", random);
    return random;
  });
  const [nameInput, setNameInput] = useState(
    () => localStorage.getItem("dino_name") || ""
  );
  const [showNameInput, setShowNameInput] = useState(false);

  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const deadRef = useRef(false);
  const startedRef = useRef(false);
  const dinoYRef = useRef(0);
  const velYRef = useRef(0);
  const obsRef = useRef<DinoObstacle[]>([]);
  const scoreRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastObsRef = useRef(0);
  const playerNameRef = useRef(playerName);
  const gameWRef = useRef(gameW);
  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);
  useEffect(() => {
    gameWRef.current = gameW;
  }, [gameW]);

  const loadLeaderboard = useCallback(async () => {
    try {
      const scores = await fetchLeaderboard(API_ENDPOINTS.LEADERBOARD);
      setLeaderboard(scores);
    } catch { /* leaderboard is optional */ }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const saveScore = useCallback(
    async (finalScore: number) => {
      const name = playerNameRef.current.trim();
      if (!name) return;
      try {
        await saveLeaderboardScore(API_ENDPOINTS.LEADERBOARD, name, finalScore);
        loadLeaderboard();
      } catch { /* leaderboard is optional */ }
    },
    [loadLeaderboard]
  );

  const jump = useCallback(() => {
    if (deadRef.current) {
      deadRef.current = false;
      startedRef.current = true;
      dinoYRef.current = 0;
      velYRef.current = 0;
      obsRef.current = [];
      scoreRef.current = 0;
      lastObsRef.current = 0;
      setDead(false);
      setStarted(true);
      setScore(0);
      setObstacles([]);
      setDinoY(0);
      return;
    }
    if (!startedRef.current) {
      startedRef.current = true;
      setStarted(true);
    }
    if (dinoYRef.current <= 2) {
      velYRef.current = JUMP_V;
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [jump]);

  useEffect(() => {
    if (onLoaded && !startedRef.current) onEnter?.();
  }, [onLoaded, onEnter]);

  useEffect(() => {
    let tick = 0;
    const autoSaveInterval = setInterval(() => {
      if (startedRef.current && !deadRef.current && scoreRef.current > 0) {
        saveScore(Math.floor(scoreRef.current / 6));
      }
    }, 10000);

    function loop() {
      tick++;
      if (tick % 2 === 0) {
        setClouds((prev) =>
          prev.map((c) => ({
            ...c,
            x: c.x - 0.6 < -c.w ? gameWRef.current + 40 : c.x - 0.6,
          }))
        );
      }
      if (tick % 8 === 0 && startedRef.current && !deadRef.current) {
        setFrame((f) => (f === 0 ? 1 : 0));
      }
      if (!startedRef.current || deadRef.current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      velYRef.current = Math.max(velYRef.current - GRAVITY, -20);
      dinoYRef.current = Math.max(dinoYRef.current + velYRef.current, 0);
      setDinoY(dinoYRef.current);
      scoreRef.current += 1;
      if (tick % 6 === 0) setScore(Math.floor(scoreRef.current / 6));
      const speed = BASE_SPEED + Math.floor(scoreRef.current / 300) * 0.8;
      const minGap = Math.max(90, 160 - Math.floor(scoreRef.current / 200) * 10);
      if (tick - lastObsRef.current > minGap) {
        const tall = Math.random() < 0.3;
        obsRef.current = [
          ...obsRef.current,
          {
            x: gameWRef.current + 10,
            w: tall ? 22 : 28,
            h: tall ? 72 : 52,
            type: tall ? "tall" : "cactus",
          },
        ];
        lastObsRef.current = tick;
      }
      obsRef.current = obsRef.current
        .map((o) => ({ ...o, x: o.x - speed }))
        .filter((o) => o.x > -50);
      setObstacles([...obsRef.current]);
      const dinoLeft = DINO_X + 6;
      const dinoRight = DINO_X + DINO_W - 6;
      const dinoBottom = dinoYRef.current;
      const dinoTop = dinoBottom + DINO_H - 4;
      for (const o of obsRef.current) {
        if (
          dinoRight > o.x + 4 &&
          dinoLeft < o.x + o.w - 4 &&
          dinoBottom < o.h &&
          dinoTop > 0
        ) {
          deadRef.current = true;
          setDead(true);
          setFlash(true);
          setTimeout(() => setFlash(false), 300);
          const finalScore = Math.floor(scoreRef.current / 6);
          const newBest = Math.max(best, finalScore);
          setBest(newBest);
          localStorage.setItem("dino_best", String(newBest));
          saveScore(finalScore);
          break;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(autoSaveInterval);
    };
  }, [best, saveScore]);

  const groundY = 20;
  const dinoBottom = groundY + dinoY;

  const gameAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = gameAreaRef.current;
    if (!el) return;
    const handler = (e: TouchEvent) => {
      e.preventDefault();
      jump();
    };
    el.addEventListener("touchstart", handler, { passive: false });
    return () => el.removeEventListener("touchstart", handler);
  }, [jump]);

  const confirmName = () => {
    const n = nameInput.trim();
    if (n) {
      setPlayerName(n);
      localStorage.setItem("dino_name", n);
    }
    setShowNameInput(false);
  };

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
      {/* 頂部列：名字 + 分數 + 排行榜 */}
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
          onClick={(e) => {
            e.stopPropagation();
            setShowNameInput(true);
          }}
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#374151",
            background: "#F3F4F6",
            borderRadius: 8,
            padding: "6px 12px",
            border: "1px solid #E5E7EB",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          🦕 {playerName}
        </button>

        <div style={{ flex: 1, textAlign: "center", fontFamily: "monospace" }}>
          <span style={{ fontSize: 18, color: "#374151", fontWeight: 800 }}>
            {String(score).padStart(5, "0")}
          </span>
          <span
            style={{
              fontSize: 14,
              color: "#9CA3AF",
              fontWeight: 700,
              marginLeft: 12,
            }}
          >
            HI {String(best).padStart(5, "0")}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowLeaderboard((v) => !v);
            loadLeaderboard();
          }}
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#6D28D9",
            background: "#F5F3FF",
            borderRadius: 8,
            padding: "6px 12px",
            border: "1px solid #DDD6FE",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
            cursor: "pointer",
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
          position: "relative",
          width: "100%",
          flex: 1,
          overflow: "hidden",
          cursor: "pointer",
          background: "#FAFAFA",
        }}
      >
        {clouds.map((c, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: c.y,
              left: c.x,
              width: c.w,
              height: 18,
              borderRadius: 99,
              background: "#E5E7EB",
              opacity: 0.7,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            bottom: groundY,
            left: 0,
            right: 0,
            height: 2,
            background: "#6B7280",
          }}
        />
        {Array.from(
          { length: Math.floor(gameW / 70) },
          (_, i) => (i + 1) * 60
        ).map((x) => (
          <div
            key={x}
            style={{
              position: "absolute",
              bottom: groundY - 5,
              left: x,
              width: 4,
              height: 2,
              background: "#D1D5DB",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            bottom: dinoBottom,
            left: DINO_X,
            opacity: dead ? 0.5 : 1,
            transition: dead ? "opacity 0.2s" : "none",
          }}
        >
          <DinoSVG frame={dead ? "dead" : !started ? 0 : frame} />
        </div>
        {obstacles.map((o, i) => (
          <div key={i} style={{ position: "absolute", bottom: groundY, left: o.x }}>
            {o.type === "tall" ? <TallCactusSVG h={o.h} /> : <CactusSVG h={o.h} />}
          </div>
        ))}

        {!started && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#9CA3AF",
                background: "rgba(255,255,255,0.85)",
                padding: "6px 16px",
                borderRadius: 20,
              }}
            >
              {onLoaded ? "點擊開始遊戲" : "載入資料中..."}
            </span>
          </div>
        )}
        {dead && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#DC2626",
                background: "rgba(255,255,255,0.9)",
                padding: "6px 16px",
                borderRadius: 20,
              }}
            >
              撞到了！點擊重新開始
            </span>
          </div>
        )}
      </div>

      {/* 底部：進入按鈕 */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 16px",
          display: "flex",
          justifyContent: "center",
          background: "#fff",
          borderTop: "1px solid #F1F5F9",
        }}
      >
        {onLoaded ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              saveScore(Math.floor(scoreRef.current / 6));
              onEnter?.();
            }}
            style={{
              width: "100%",
              maxWidth: 400,
              padding: "14px 0",
              fontSize: 16,
              fontWeight: 800,
              background: "linear-gradient(135deg, #C8860A 0%, #F59E0B 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(200,134,10,0.35)",
              letterSpacing: 1,
            }}
          >
            進入登記表 →
          </button>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>
            載入資料中，請稍候...
          </p>
        )}
      </div>

      {/* 改名 modal */}
      {showNameInput && (
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
            <p
              style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 17, color: "#1E293B" }}
            >
              輸入你的名字
            </p>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmName();
              }}
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
                onClick={confirmName}
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
                onClick={() => setShowNameInput(false)}
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
      )}

      {/* 排行榜 modal */}
      {showLeaderboard && (
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
                <p
                  style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 18, color: "#1E293B" }}
                >
                  🏆 排行榜
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "#94A3B8" }}>
                  成績約每 30 秒更新一次
                </p>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
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
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#1E3A5F" }}>
                    {playerName}
                  </span>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 800,
                        fontSize: 20,
                        color: "#1E40AF",
                      }}
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
                      {entry.name}
                      {isMe ? " 👈" : ""}
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
      )}
    </div>
  );
}

function DinoSVG({ frame }: { frame: 0 | 1 | "dead" }) {
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

function CactusSVG({ h }: { h: number }) {
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

function TallCactusSVG({ h }: { h: number }) {
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
