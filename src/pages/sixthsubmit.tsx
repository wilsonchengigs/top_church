import { useEffect, useState, useMemo, useRef, CSSProperties, useCallback } from "react";

// ── DinoLoader (mini-game) ─────────────────────────────────────
const GAME_H = 120;
const DINO_X = 40;
const DINO_W = 34;
const DINO_H = 48;
const JUMP_V = 14;
const GRAVITY = 0.9;
const BASE_SPEED = 5;

// ★ 部署完 Apps Script 後把 URL 貼這裡
const LEADERBOARD_URL = "https://script.google.com/macros/s/AKfycbwFsXCKwNEDgDglJNPDtjNe8CTd-x-pScfj-VhMSBIlYUwYpC0F6g7J36_tM69Rw7Xz/exec";

interface Obstacle { x: number; w: number; h: number; type: "cactus" | "tall"; }
interface Cloud { x: number; y: number; w: number; }
interface LeaderEntry { rank: number; name: string; score: number; }

function useGameWidth() {
  const [w, setW] = useState(() => Math.min(window.innerWidth - 24, 480));
  useEffect(() => {
    const update = () => setW(Math.min(window.innerWidth - 24, 480));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return w;
}

function DinoLoader({ onLoaded, onEnter }: { onLoaded?: boolean; onEnter?: () => void }) {
  const gameW = useGameWidth();
  const [dinoY, setDinoY] = useState(0);
  const [frame, setFrame] = useState<0 | 1>(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [clouds, setClouds] = useState<Cloud[]>([
    { x: 300, y: 20, w: 60 },
    { x: 160, y: 10, w: 45 },
  ]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("dino_best") || "0"));
  const [dead, setDead] = useState(false);
  const [started, setStarted] = useState(false);
  const [flash, setFlash] = useState(false);

  // 姓名
  const [playerName, setPlayerName] = useState(() => {
    const saved = localStorage.getItem("dino_name");
    if (saved) return saved;
    const random = "player" + Math.floor(Math.random() * 900 + 100);
    localStorage.setItem("dino_name", random);
    return random;
  });
  const [nameInput, setNameInput] = useState(() => localStorage.getItem("dino_name") || "");
  const [showNameInput, setShowNameInput] = useState(false);

  // 排行榜
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const deadRef = useRef(false);
  const startedRef = useRef(false);
  const dinoYRef = useRef(0);
  const velYRef = useRef(0);
  const obsRef = useRef<Obstacle[]>([]);
  const scoreRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastObsRef = useRef(0);
  const playerNameRef = useRef(playerName);
  const gameWRef = useRef(gameW);
  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);
  useEffect(() => { gameWRef.current = gameW; }, [gameW]);

  const fetchLeaderboard = useCallback(async () => {
    if (!LEADERBOARD_URL || LEADERBOARD_URL.startsWith("YOUR_")) return;
    try {
      const res = await fetch(LEADERBOARD_URL);
      const data = await res.json();
      if (data.scores) setLeaderboard(data.scores);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  const saveScore = useCallback(async (finalScore: number) => {
    const name = playerNameRef.current.trim();
    if (!name || !LEADERBOARD_URL || LEADERBOARD_URL.startsWith("YOUR_")) return;
    try {
      await fetch(LEADERBOARD_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ name, score: finalScore }),
      });
      fetchLeaderboard();
    } catch { /* ignore */ }
  }, [fetchLeaderboard]);

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
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [jump]);

  useEffect(() => {
    let tick = 0;
    // 每 10 秒自動存一次（約 600 ticks @ 60fps）
    const autoSaveInterval = setInterval(() => {
      if (startedRef.current && !deadRef.current && scoreRef.current > 0) {
        saveScore(Math.floor(scoreRef.current / 6));
      }
    }, 10000);

    function loop() {
      tick++;
      if (tick % 2 === 0) {
        setClouds((prev) =>
          prev.map((c) => ({ ...c, x: c.x - 0.6 < -c.w ? gameWRef.current + 40 : c.x - 0.6 }))
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
          { x: gameWRef.current + 10, w: tall ? 22 : 28, h: tall ? 72 : 52, type: tall ? "tall" : "cactus" },
        ];
        lastObsRef.current = tick;
      }
      obsRef.current = obsRef.current.map((o) => ({ ...o, x: o.x - speed })).filter((o) => o.x > -50);
      setObstacles([...obsRef.current]);
      const dinoLeft = DINO_X + 6;
      const dinoRight = DINO_X + DINO_W - 6;
      const dinoBottom = dinoYRef.current;
      const dinoTop = dinoBottom + DINO_H - 4;
      for (const o of obsRef.current) {
        if (dinoRight > o.x + 4 && dinoLeft < o.x + o.w - 4 && dinoBottom < o.h && dinoTop > 0) {
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
    return () => { cancelAnimationFrame(rafRef.current); clearInterval(autoSaveInterval); };
  }, [best, saveScore]);

  const groundY = 18;
  const dinoBottom = groundY + dinoY;
  const hasLeaderboardUrl = LEADERBOARD_URL && !LEADERBOARD_URL.startsWith("YOUR_");

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: TouchEvent) => { e.preventDefault(); jump(); };
    el.addEventListener("touchstart", handler, { passive: false });
    return () => el.removeEventListener("touchstart", handler);
  }, [jump]);

  return (
    <div
      ref={containerRef}
      onClick={jump}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: flash ? "#fff0f0" : "#fff",
        transition: "background 0.15s",
        zIndex: 50,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {/* Top bar: name + score + leaderboard btn */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, width: gameW, padding: "0 4px", boxSizing: "border-box" }}>
        {/* Player name */}
        <div
          onClick={(e) => { e.stopPropagation(); setShowNameInput(true); }}
          style={{
            fontSize: 13, fontWeight: 700, color: playerName ? "#374151" : "#9CA3AF",
            background: "#F3F4F6", borderRadius: 8, padding: "4px 10px", cursor: "pointer",
            border: "1px solid #E5E7EB", whiteSpace: "nowrap",
          }}
        >
          {playerName ? `🦕 ${playerName}` : "設定名字"}
        </div>

        {/* Score */}
        <div style={{ flex: 1, textAlign: "center", fontFamily: "monospace" }}>
          <span style={{ fontSize: 16, color: "#374151", fontWeight: 700 }}>
            {String(score).padStart(5, "0")}
          </span>
          <span style={{ fontSize: 16, color: "#9CA3AF", fontWeight: 700, marginLeft: 16 }}>
            HI {String(best).padStart(5, "0")}
          </span>
        </div>

        {/* Leaderboard btn */}
        {hasLeaderboardUrl && (
          <div
            onClick={(e) => { e.stopPropagation(); setShowLeaderboard((v) => !v); fetchLeaderboard(); }}
            style={{
              fontSize: 13, fontWeight: 700, color: "#6D28D9",
              background: "#F5F3FF", borderRadius: 8, padding: "4px 10px", cursor: "pointer",
              border: "1px solid #DDD6FE", whiteSpace: "nowrap",
            }}
          >
            🏆 排行榜
          </div>
        )}
      </div>

      {/* Game canvas */}
      <div style={{ position: "relative", width: gameW, height: GAME_H + groundY + 4, overflow: "hidden" }}>
        {clouds.map((c, i) => (
          <div key={i} style={{
            position: "absolute", top: c.y, left: c.x, width: c.w, height: 18,
            borderRadius: 99, background: "#E5E7EB", opacity: 0.7,
          }} />
        ))}
        <div style={{ position: "absolute", bottom: groundY, left: 0, right: 0, height: 2, background: "#6B7280" }} />
        {Array.from({ length: Math.floor(gameW / 70) }, (_, i) => (i + 1) * 60).map((x) => (
          <div key={x} style={{ position: "absolute", bottom: groundY - 4, left: x, width: 4, height: 2, background: "#D1D5DB" }} />
        ))}
        <div style={{ position: "absolute", bottom: dinoBottom, left: DINO_X, opacity: dead ? 0.5 : 1, transition: dead ? "opacity 0.2s" : "none" }}>
          <DinoSVG frame={dead ? "dead" : !started ? 0 : frame} />
        </div>
        {obstacles.map((o, i) => (
          <div key={i} style={{ position: "absolute", bottom: groundY, left: o.x }}>
            {o.type === "tall" ? <TallCactusSVG h={o.h} /> : <CactusSVG h={o.h} />}
          </div>
        ))}
      </div>

      {/* Status text */}
      <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: "#6B7280", textAlign: "center", minHeight: 20, padding: "0 12px" }}>
        {dead
          ? "撞到了！點擊螢幕重新開始"
          : !started
          ? onLoaded ? "資料已載入完成，點擊開始玩！" : "點擊螢幕開始・載入資料中..."
          : onLoaded ? "資料已載入完成" : "載入資料中..."}
      </div>

      {/* Enter button (only when loaded) */}
      {onLoaded && (
        <button
          onClick={(e) => { e.stopPropagation(); saveScore(Math.floor(scoreRef.current / 6)); onEnter?.(); }}
          style={{
            marginTop: 14, padding: "11px 32px", fontSize: 16, fontWeight: 800,
            background: "linear-gradient(135deg, #C8860A 0%, #F59E0B 100%)",
            color: "#fff", border: "none", borderRadius: 12, cursor: "pointer",
            boxShadow: "0 4px 16px rgba(200,134,10,0.35)", letterSpacing: 1,
          }}
        >
          進入登記表 →
        </button>
      )}

      {/* Name input modal */}
      {showNameInput && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div style={{
            background: "#fff", borderRadius: 16, padding: "28px 24px 24px",
            width: "min(300px, calc(100vw - 40px))",
            boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
          }}>
            <p style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 17, color: "#1E293B" }}>輸入你的名字</p>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = nameInput.trim();
                  if (n) { setPlayerName(n); localStorage.setItem("dino_name", n); }
                  setShowNameInput(false);
                }
              }}
              placeholder="你的名字..."
              style={{
                width: "100%", padding: "12px 14px", fontSize: 16, borderRadius: 10,
                border: "1.5px solid #CBD5E1", outline: "none", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => {
                  const n = nameInput.trim();
                  if (n) { setPlayerName(n); localStorage.setItem("dino_name", n); }
                  setShowNameInput(false);
                }}
                style={{
                  flex: 1, padding: "10px 0", fontWeight: 700, fontSize: 15,
                  background: "#1E3A5F", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer",
                }}
              >
                確認
              </button>
              <button
                onClick={() => setShowNameInput(false)}
                style={{
                  flex: 1, padding: "10px 0", fontWeight: 700, fontSize: 15,
                  background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 10, cursor: "pointer",
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard modal */}
      {showLeaderboard && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div style={{
            background: "#fff", borderRadius: 16, padding: "24px 20px 20px",
            width: "min(340px, calc(100vw - 32px))",
            boxShadow: "0 12px 40px rgba(0,0,0,0.2)", maxHeight: "85vh", overflowY: "auto",
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 18, color: "#1E293B" }}>🏆 排行榜</p>
                <p style={{ margin: 0, fontSize: 11, color: "#94A3B8" }}>成績約每 30 秒更新一次</p>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94A3B8", lineHeight: 1 }}
              >✕</button>
            </div>

            {/* 我的紀錄 */}
            {playerName && (
              <div style={{
                background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
                border: "1.5px solid #BFDBFE", borderRadius: 12, padding: "12px 14px", marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#3B82F6", marginBottom: 6, letterSpacing: 0.5 }}>
                  🦕 我的紀錄
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#1E3A5F" }}>{playerName}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 20, color: "#1E40AF" }}>
                      {String(best).padStart(5, "0")}
                    </div>
                    {(() => {
                      const myRank = leaderboard.findIndex((e) => e.name === playerName);
                      return myRank >= 0
                        ? <div style={{ fontSize: 11, color: "#60A5FA", fontWeight: 600 }}>排名第 {myRank + 1} 名</div>
                        : <div style={{ fontSize: 11, color: "#93C5FD" }}>尚未上榜</div>;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* 分隔 */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 0.5, marginBottom: 8 }}>
              前十名
            </div>

            {/* 排行榜列表 */}
            {leaderboard.length === 0 ? (
              <p style={{ color: "#94A3B8", textAlign: "center", fontSize: 14, padding: "16px 0" }}>還沒有紀錄</p>
            ) : (
              leaderboard.slice(0, 10).map((entry) => {
                const isMe = entry.name === playerName;
                return (
                  <div key={entry.rank} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 10px",
                    marginBottom: 4,
                    borderRadius: 10,
                    background: isMe ? "#FFF7ED" : entry.rank <= 3 ? "#FAFAFA" : "transparent",
                    border: isMe ? "1.5px solid #FED7AA" : "1.5px solid transparent",
                  }}>
                    <span style={{
                      width: 26, textAlign: "center", fontWeight: 800, fontSize: 15, flexShrink: 0,
                    }}>
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : (
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>#{entry.rank}</span>
                      )}
                    </span>
                    <span style={{
                      flex: 1, fontWeight: isMe ? 800 : 600, fontSize: 15,
                      color: isMe ? "#C2410C" : "#1E293B",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {entry.name}{isMe ? " 👈" : ""}
                    </span>
                    <span style={{
                      fontFamily: "monospace", fontWeight: 700, fontSize: 15,
                      color: entry.rank === 1 ? "#D97706" : isMe ? "#EA580C" : "#374151",
                      flexShrink: 0,
                    }}>
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
      {/* body */}
      <rect x="4" y="14" width="22" height="18" />
      {/* neck */}
      <rect x="18" y="8" width="10" height="10" />
      {/* head */}
      <rect x="20" y="2" width="14" height="12" />
      {/* eye */}
      <rect x="30" y="4" width="3" height="3" fill="white" />
      {/* mouth */}
      <rect x="32" y="12" width="2" height="2" fill={frame === "dead" ? "#DC2626" : "#535353"} />
      {/* tail */}
      <rect x="0" y="16" width="8" height="6" />
      <rect x="2" y="14" width="6" height="4" />
      {/* arm */}
      <rect x="20" y="22" width="6" height="4" />
      {/* legs */}
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

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzkyg10DQolseMzmerKqvPjRZutThSKNipeBjVuCjmXRStEIupRNQXcBA17VghQhlS0fQ/exec";

const SESSION_LABELS = ["第一次", "第二次", "第三次", "第四次", "第五次", "第六次"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
const BADGE_SIZE = 40;

const GRAY_BADGE = (n: number) =>
  `/topchurch_grayscale_svg_badges/topchurch_badge_${ROMAN[n - 1]}_grayscale.svg`;
const COLOR_BADGE = (n: number) =>
  `/topchurch_color_svg_badges/topchurch_badge_${ROMAN[n - 1]}_color.svg`;

const STATUS = { NOT_REGISTERED: "尚報名", CHECKED: "✓", CROSSED: "✗" } as const;
const isSpecialSession = (s: number) => s >= 4;

// ── Types ──────────────────────────────────────────────────────
interface Person {
  area: string;
  group: string;
  name: string;
  sessions: Record<number, string>;
}

interface UpdateItem {
  name: string;
  session: number;
}

interface SubmitResultItem {
  name: string;
  session: number;
  success: boolean;
  reason?: string;
}

interface SubmitResultData {
  success: boolean;
  results?: SubmitResultItem[];
  error?: string;
}

type PendingChecks = Record<string, boolean>;

// ── Search autocomplete hook ───────────────────────────────────
interface SearchInput {
  query: string;
  setQuery: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  active: number;
  setActive: (fn: number | ((prev: number) => number)) => void;
  ref: React.RefObject<HTMLDivElement | null>;
}

function useSearchInput(): SearchInput {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return { query, setQuery, open, setOpen, active, setActive, ref };
}

// ─────────────────────────────────────────────────────────────
export default function AttendanceApp() {
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameVisible, setGameVisible] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  const [selectedArea, setSelectedArea] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const groupSearch = useSearchInput();

  const [selectedName, setSelectedName] = useState("");
  const nameSearch = useSearchInput();

  const [pendingChecks, setPendingChecks] = useState<PendingChecks>({});
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResultData | null>(null);

  useEffect(() => {
    fetch(SCRIPT_URL)
      .then((r) => r.json())
      .then((data) => setAllPeople(data.people || []))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  const areas = useMemo(
    () => [...new Set(allPeople.map((p) => p.area))].sort(),
    [allPeople]
  );

  const groups = useMemo(() => {
    if (!selectedArea) return [];
    return [
      ...new Set(
        allPeople.filter((p) => p.area === selectedArea).map((p) => p.group)
      ),
    ].sort();
  }, [allPeople, selectedArea]);

  const groupOptions = useMemo(() => groups.map((g) => `${g}`), [groups]);

  const allNames = useMemo(
    () => [...new Set(allPeople.map((p) => p.name))].sort(),
    [allPeople]
  );

  const groupPeople = useMemo(() => {
    if (!selectedArea || !selectedGroup) return [];
    return allPeople.filter(
      (p) => p.area === selectedArea && p.group === selectedGroup
    );
  }, [allPeople, selectedArea, selectedGroup]);

  const namePeople = useMemo(() => {
    if (!selectedName) return [];
    return allPeople.filter((p) => p.name === selectedName);
  }, [allPeople, selectedName]);

  const people = selectedName ? namePeople : groupPeople;
  const mode = selectedName ? "name" : "group";

  const specialProgress = useMemo(() => {
    if (people.length === 0) return 0;
    let done = 0;
    for (const p of people) {
      for (const s of [4, 5, 6]) {
        const isPending = !!pendingChecks[`${p.name}_${s}`];
        if (p.sessions[s] === STATUS.CHECKED || isPending) done++;
      }
    }
    return Math.round((done / (3 * people.length)) * 100);
  }, [people, pendingChecks]);

  const pendingCount = useMemo(
    () => Object.values(pendingChecks).filter(Boolean).length,
    [pendingChecks]
  );

  // Gray (#9CA3AF → #64748B) to gold (#D4A017 → #B8860B) gradient transition
  const btnStyle = useMemo((): CSSProperties => {
    const hasWork = pendingCount > 0 || note.trim().length > 0;
    if (!hasWork) {
      return {
        background: "linear-gradient(135deg, #A8B0BC 0%, #6B7280 100%)",
        opacity: 0.45,
        boxShadow: "none",
        transform: "scale(1)",
        color: "#fff",
      };
    }
    const t = Math.min(pendingCount / 8, 1);
    const r1 = Math.round(156 + (212 - 156) * t);
    const g1 = Math.round(163 + (160 - 163) * t);
    const b1 = Math.round(175 + (23 - 175) * t);
    const r2 = Math.round(100 + (184 - 100) * t);
    const g2 = Math.round(116 + (134 - 116) * t);
    const b2 = Math.round(139 + (11 - 139) * t);
    const shadowAlpha = 0.18 + t * 0.42;
    const shadowSpread = Math.round(8 + t * 20);
    return {
      background: `linear-gradient(135deg, rgb(${r1},${g1},${b1}) 0%, rgb(${r2},${g2},${b2}) 100%)`,
      opacity: 1,
      boxShadow: `0 ${shadowSpread / 2}px ${shadowSpread}px rgba(${r1},${Math.round(g1 * 0.65)},0,${shadowAlpha}), 0 2px 6px rgba(0,0,0,0.08)`,
      transform: pendingCount > 4 ? "scale(1.01)" : "scale(1)",
      color: t > 0.45 ? "#1A1000" : "#fff",
    };
  }, [pendingCount, note]);

  const toggleCheck = (name: string, session: number) => {
    const key = `${name}_${session}`;
    setPendingChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetAll = () => {
    setPendingChecks({});
    setSubmitResult(null);
  };

  const handleAreaChange = (area: string) => {
    setSelectedArea(area);
    setSelectedGroup("");
    groupSearch.setQuery("");
    resetAll();
  };

  const handleGroupSelect = (group: string) => {
    setSelectedGroup(group);
    groupSearch.setQuery(group);
    groupSearch.setOpen(false);
    setSelectedName("");
    nameSearch.setQuery("");
    resetAll();
  };

  const handleNameSelect = (name: string) => {
    setSelectedName(name);
    nameSearch.setQuery(name);
    nameSearch.setOpen(false);
    setSelectedArea("");
    setSelectedGroup("");
    groupSearch.setQuery("");
    resetAll();
  };

  const handleSubmit = async () => {
    const hasWork = pendingCount > 0 || note.trim().length > 0;
    if (!hasWork || submitting) return;

    const updates: UpdateItem[] = [];
    for (const [key, checked] of Object.entries(pendingChecks)) {
      if (!checked) continue;
      const lastUnderscore = key.lastIndexOf("_");
      updates.push({
        name: key.slice(0, lastUnderscore),
        session: parseInt(key.slice(lastUnderscore + 1)),
      });
    }

    const payload =
      mode === "name"
        ? { name: selectedName, updates, note }
        : { area: selectedArea, group: selectedGroup, updates, note };

    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
      const data: SubmitResultData = await res.json();
      setSubmitResult(data);
      if (data.success) {
        const successKeys = new Set(
          (data.results || [])
            .filter((r) => r.success)
            .map((r) => `${r.name}_${r.session}`)
        );
        setAllPeople((prev) =>
          prev.map((p) => {
            const updated: Person = { ...p, sessions: { ...p.sessions } };
            for (let s = 1; s <= 6; s++) {
              if (successKeys.has(`${p.name}_${s}`)) updated.sessions[s] = "✓";
            }
            return updated;
          })
        );
        setPendingChecks({});
        setNote("");
      }
    } catch (err) {
      setSubmitResult({ success: false, error: (err as Error).toString() });
    } finally {
      setSubmitting(false);
    }
  };

  if (gameVisible) return (
    <DinoLoader onLoaded={!loading || fetchError} onEnter={() => setGameVisible(false)} />
  );

  if (fetchError)
    return (
      <div style={S.container}>
        <div style={S.card}>
          <p style={{ color: "#DC2626", textAlign: "center", fontSize: 17 }}>
            ⚠️ 資料載入失敗，請重新整理頁面
          </p>
        </div>
      </div>
    );

  const showTable = people.length > 0;

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={S.container}>
        <div style={S.card}>
          {/* Gold top accent */}
          <div style={S.goldAccent} />

          {/* Header */}
          <div style={S.header}>
            <h1 style={S.title}>日日有光登記表</h1>
            <p style={S.subtitle}>可依小組查詢，或直接搜尋個人姓名</p>
          </div>

          {/* ── 牧區 ── */}
          <div style={S.section}>
            <label style={S.label}>牧區</label>
            <select
              style={S.select}
              value={selectedArea}
              onChange={(e) => handleAreaChange(e.target.value)}
            >
              <option value="">請選擇牧區</option>
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* ── 小組 Autocomplete ── */}
          <div style={S.section}>
            <label style={S.label}>小組（輸入搜尋）</label>
            <div ref={groupSearch.ref} style={{ position: "relative" }}>
              <input
                style={{ ...S.textInput, opacity: !selectedArea ? 0.45 : 1 }}
                disabled={!selectedArea}
                placeholder={selectedArea ? "輸入小組名稱..." : "請先選擇牧區"}
                value={groupSearch.query}
                onChange={(e) => {
                  groupSearch.setQuery(e.target.value);
                  groupSearch.setOpen(true);
                  groupSearch.setActive(-1);
                  if (!e.target.value) { setSelectedGroup(""); resetAll(); }
                }}
                onFocus={() => groupSearch.setOpen(true)}
                onKeyDown={(e) => {
                  const opts = groupOptions.filter((g) =>
                    g.toLowerCase().includes(groupSearch.query.toLowerCase())
                  );
                  if (e.key === "ArrowDown") { groupSearch.setActive((a) => Math.min(a + 1, opts.length - 1)); e.preventDefault(); }
                  else if (e.key === "ArrowUp") { groupSearch.setActive((a) => Math.max(a - 1, 0)); e.preventDefault(); }
                  else if (e.key === "Enter" && groupSearch.active >= 0) handleGroupSelect(opts[groupSearch.active]);
                  else if (e.key === "Escape") groupSearch.setOpen(false);
                }}
              />
              {groupSearch.open && selectedArea && (
                <Dropdown
                  options={groupOptions.filter(
                    (g) =>
                      !groupSearch.query ||
                      g.toLowerCase().includes(groupSearch.query.toLowerCase())
                  )}
                  active={groupSearch.active}
                  onSelect={handleGroupSelect}
                  onHover={(i) => groupSearch.setActive(i)}
                />
              )}
            </div>
          </div>

          {/* ── OR divider ── */}
          <div style={S.orDivider}>
            <span style={S.orLine} />
            <span style={S.orText}>或直接搜尋姓名</span>
            <span style={S.orLine} />
          </div>

          {/* ── 個人搜尋 ── */}
          <div style={S.section}>
            <label style={S.label}>個人搜尋</label>
            <div ref={nameSearch.ref} style={{ position: "relative" }}>
              <input
                style={S.textInput}
                placeholder="輸入姓名..."
                value={nameSearch.query}
                onChange={(e) => {
                  nameSearch.setQuery(e.target.value);
                  nameSearch.setOpen(true);
                  nameSearch.setActive(-1);
                  if (!e.target.value) { setSelectedName(""); resetAll(); }
                }}
                onFocus={() => nameSearch.setOpen(true)}
                onKeyDown={(e) => {
                  const opts = allNames.filter((n) => n.includes(nameSearch.query));
                  if (e.key === "ArrowDown") { nameSearch.setActive((a) => Math.min(a + 1, opts.length - 1)); e.preventDefault(); }
                  else if (e.key === "ArrowUp") { nameSearch.setActive((a) => Math.max(a - 1, 0)); e.preventDefault(); }
                  else if (e.key === "Enter" && nameSearch.active >= 0) handleNameSelect(opts[nameSearch.active]);
                  else if (e.key === "Escape") nameSearch.setOpen(false);
                }}
              />
              {nameSearch.open && nameSearch.query && (
                <Dropdown
                  options={allNames.filter((n) => n.includes(nameSearch.query)).slice(0, 12)}
                  active={nameSearch.active}
                  onSelect={handleNameSelect}
                  onHover={(i) => nameSearch.setActive(i)}
                />
              )}
            </div>
          </div>

          {/* ── 出席表 ── */}
          {showTable && (
            <div style={S.section}>
              {/* Section heading + legend toggle */}
              <div style={S.tableHeadingRow}>
                <label style={{ ...S.label, marginBottom: 0 }}>
                  {mode === "name"
                    ? `「${selectedName}」出席狀況`
                    : `${selectedArea} — ${selectedGroup}`}
                </label>
                <button
                  style={S.legendToggle}
                  onClick={() => setLegendOpen((v) => !v)}
                >
                  {legendOpen ? "收起圖例 ▲" : "查看圖例 ▼"}
                </button>
              </div>

              {/* 圖例 (collapsible) */}
              {legendOpen && (
                <div style={S.legendBox}>
                  <div style={S.legendCol}>
                    <span style={S.legendTitle}>1189</span>
                    <LegendItem imgGray imgSrc={GRAY_BADGE(1)} label="尚報名（不可補登）" />
                    <LegendItem imgSrc={GRAY_BADGE(1)} border label="未完成（可補登）" />
                    <LegendItem imgSrc={COLOR_BADGE(1)} label="已完成" />
                    <LegendItem imgSrc={COLOR_BADGE(1)} pending label="待送出" />
                  </div>
                  <div style={{ width: 1, background: "#DDD6FE", alignSelf: "stretch" }} />
                  <div style={S.legendCol}>
                    <span style={{ ...S.legendTitle, color: "#7C3AED" }}>日日有光</span>
                    <LegendItem imgSrc={GRAY_BADGE(4)} border label="尚報名（可補登）" special />
                    <LegendItem imgSrc={GRAY_BADGE(4)} border label="未完成（可補登）" special />
                    <LegendItem imgSrc={COLOR_BADGE(4)} label="已完成" special />
                  </div>
                </div>
              )}

              {/* 欄位標題 */}
              <div style={S.tableHeader}>
                <div style={S.nameCol} />
                <div style={S.sessionGroupLabel}>1189</div>
                <div style={{ ...S.sessionGroupLabel, ...S.specialGroupLabel }}>日日有光</div>
              </div>
              <div style={S.tableSubHeader}>
                <div style={S.nameCol} />
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <div
                    key={s}
                    style={{
                      ...S.sessionCol,
                      ...(isSpecialSession(s) ? S.specialColHeader : {}),
                      fontWeight: 600,
                      fontSize: 10,
                      color: isSpecialSession(s) ? "#7C3AED" : "#475569",
                    }}
                  >
                    {SESSION_LABELS[s - 1]}
                  </div>
                ))}
              </div>

              <div style={S.tableBody}>
                {people.map((person) => (
                  <PersonRow
                    key={`${person.area}_${person.name}`}
                    person={person}
                    pendingChecks={pendingChecks}
                    onToggle={toggleCheck}
                    showArea={mode === "name"}
                  />
                ))}
              </div>

              {/* 完成率 */}
              <div style={S.progressBar}>
                <div style={S.progressInner}>
                  <span style={S.progressLabel}>日日有光完成率</span>
                  <span style={S.progressPct}>{specialProgress}%</span>
                </div>
                <div style={S.progressTrack}>
                  <div style={{ ...S.progressFill, width: `${specialProgress}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* ── 備註 ── */}
          {showTable && (
            <div style={S.section}>
              <label style={S.label}>備註（選填）</label>
              <textarea
                style={S.textarea}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="請填入備註"
                rows={3}
              />
            </div>
          )}

          {submitResult && <SubmitResultBox result={submitResult} />}

          {/* ── 送出按鈕 ── */}
          {showTable && (
            <button
              style={{
                ...S.submitBtn,
                ...btnStyle,
                cursor:
                  (pendingCount === 0 && !note.trim()) || submitting
                    ? "not-allowed"
                    : "pointer",
              }}
              onClick={handleSubmit}
              disabled={(pendingCount === 0 && !note.trim()) || submitting}
            >
              {submitting
                ? "送出中..."
                : pendingCount > 0
                ? `送出登記（${pendingCount} 筆）`
                : "送出登記"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Dropdown ───────────────────────────────────────────────────
interface DropdownProps {
  options: string[];
  active: number;
  onSelect: (v: string) => void;
  onHover: (i: number) => void;
}

function Dropdown({ options, active, onSelect, onHover }: DropdownProps) {
  if (options.length === 0) return null;
  return (
    <div style={S.dropdown}>
      {options.map((opt, i) => (
        <div
          key={opt}
          style={{
            ...S.dropdownItem,
            ...(i === active ? S.dropdownItemActive : {}),
          }}
          onMouseDown={() => onSelect(opt)}
          onMouseEnter={() => onHover(i)}
        >
          {opt}
        </div>
      ))}
    </div>
  );
}

// ── PersonRow ──────────────────────────────────────────────────
interface PersonRowProps {
  person: Person;
  pendingChecks: PendingChecks;
  onToggle: (name: string, session: number) => void;
  showArea: boolean;
}

function PersonRow({ person, pendingChecks, onToggle, showArea }: PersonRowProps) {
  return (
    <div style={S.tableRow}>
      <div style={S.nameCol}>
        {showArea && (
          <span style={{ fontSize: 9, color: "#94A3B8", display: "block", lineHeight: 1.2 }}>
            {person.area}
          </span>
        )}
        {person.name}
      </div>
      {[1, 2, 3, 4, 5, 6].map((session) => {
        const status = person.sessions[session];
        const isPending = !!pendingChecks[`${person.name}_${session}`];
        const special = isSpecialSession(session);
        return (
          <div
            key={session}
            style={{ ...S.sessionCol, ...(special ? S.specialCol : {}) }}
          >
            <SessionCell
              session={session}
              status={status}
              isPending={isPending}
              onClick={() => onToggle(person.name, session)}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── SessionCell ────────────────────────────────────────────────
interface SessionCellProps {
  session: number;
  status: string;
  isPending: boolean;
  onClick: () => void;
}

function SessionCell({ session, status, isPending, onClick }: SessionCellProps) {
  const special = isSpecialSession(session);

  if (status === STATUS.CHECKED) {
    return (
      <div title="已完成" style={{ width: BADGE_SIZE, height: BADGE_SIZE, cursor: "not-allowed" }}>
        <img src={COLOR_BADGE(session)} alt="" width={BADGE_SIZE} height={BADGE_SIZE} style={{ display: "block" }} />
      </div>
    );
  }

  if (!special && status === STATUS.NOT_REGISTERED) {
    return (
      <div title="尚未報名，不可補登" style={{ width: BADGE_SIZE, height: BADGE_SIZE, cursor: "not-allowed", opacity: 0.3 }}>
        <img src={GRAY_BADGE(session)} alt="" width={BADGE_SIZE} height={BADGE_SIZE} style={{ display: "block" }} />
      </div>
    );
  }

  const canToggle =
    status === STATUS.CROSSED || (special && status === STATUS.NOT_REGISTERED);

  if (canToggle) {
    return (
      <div
        onClick={onClick}
        title={isPending ? "點擊取消" : "點擊補登記為完成"}
        style={{
          width: BADGE_SIZE,
          height: BADGE_SIZE,
          cursor: "pointer",
          borderRadius: "50%",
          outline: isPending ? "2.5px solid #6D28D9" : "2px solid transparent",
          outlineOffset: "2px",
          transition: "outline 0.15s, opacity 0.15s",
        }}
      >
        <img
          src={isPending ? COLOR_BADGE(session) : GRAY_BADGE(session)}
          alt=""
          width={BADGE_SIZE}
          height={BADGE_SIZE}
          style={{
            display: "block",
            opacity: isPending ? 1 : special ? 0.65 : 0.55,
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ width: BADGE_SIZE, height: BADGE_SIZE, borderRadius: 4, background: "#E5E7EB" }} />
  );
}

// ── SubmitResultBox ────────────────────────────────────────────
function SubmitResultBox({ result }: { result: SubmitResultData }) {
  const successItems = (result.results || []).filter((r) => r.success);
  const failedItems = (result.results || []).filter((r) => !r.success);
  return (
    <div
      style={{
        margin: "16px 0",
        padding: "14px 16px",
        borderRadius: 10,
        backgroundColor: result.success ? "#F0FDF4" : "#FEF2F2",
        border: `1.5px solid ${result.success ? "#BBF7D0" : "#FECACA"}`,
      }}
    >
      {result.success ? (
        <>
          <p style={{ margin: 0, color: "#15803D", fontWeight: 700, fontSize: 16 }}>
            ✅ 成功更新 {successItems.length} 筆
          </p>
          {failedItems.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p style={{ margin: "0 0 4px", color: "#B45309", fontWeight: 600, fontSize: 14 }}>
                ⚠️ 以下 {failedItems.length} 筆無法更新：
              </p>
              {failedItems.map((r, i) => (
                <p key={i} style={{ margin: "2px 0", color: "#92400E", fontSize: 13 }}>
                  • {r.name} 第{r.session}次：{r.reason}
                </p>
              ))}
            </div>
          )}
        </>
      ) : (
        <p style={{ margin: 0, color: "#DC2626", fontWeight: 700, fontSize: 16 }}>
          ❌ 送出失敗：{result.error || "請稍後再試"}
        </p>
      )}
    </div>
  );
}

// ── LegendItem ─────────────────────────────────────────────────
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
          outline: pending
            ? "2.5px solid #6D28D9"
            : border
            ? "2px solid #9CA3AF"
            : "none",
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

// ── Styles ─────────────────────────────────────────────────────
const S: Record<string, CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#F5F3EE",
    padding: "20px 12px 48px",
    fontFamily: "'Noto Sans TC', 'Microsoft JhengHei', sans-serif",
    boxSizing: "border-box",
  },
  card: {
    maxWidth: 600,
    margin: "0 auto",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    boxShadow: "0 6px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.05)",
    padding: "0 20px 28px",
    overflow: "hidden",
  },
  goldAccent: {
    height: 5,
    background: "linear-gradient(90deg, #C8860A 0%, #F59E0B 50%, #C8860A 100%)",
    margin: "0 -20px 24px",
  },
  header: {
    marginBottom: 28,
    paddingBottom: 18,
    borderBottom: "1.5px solid #E2E8F0",
  },
  title: {
    margin: "0 0 6px",
    fontSize: 28,
    fontWeight: 800,
    color: "#1E3A5F",
    letterSpacing: 1,
  },
  subtitle: { margin: 0, fontSize: 14, color: "#64748B" },
  section: { marginBottom: 24 },
  label: {
    display: "block",
    fontWeight: 700,
    fontSize: 15,
    color: "#374151",
    marginBottom: 10,
  },
  select: {
    width: "100%",
    padding: "14px 16px",
    fontSize: 16,
    borderRadius: 10,
    border: "1.5px solid #CBD5E1",
    backgroundColor: "#F8FAFC",
    color: "#1E293B",
    outline: "none",
    boxSizing: "border-box",
  },
  textInput: {
    width: "100%",
    padding: "14px 16px",
    fontSize: 16,
    borderRadius: 10,
    border: "1.5px solid #CBD5E1",
    backgroundColor: "#F8FAFC",
    color: "#1E293B",
    outline: "none",
    boxSizing: "border-box",
  },
  orDivider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
    display: "block",
  },
  orText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  dropdown: {
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
  dropdownItem: {
    padding: "14px 16px",
    fontSize: 15,
    cursor: "pointer",
    color: "#1E293B",
    borderBottom: "1px solid #F1F5F9",
    transition: "background 0.1s",
  },
  dropdownItemActive: {
    backgroundColor: "#EFF6FF",
    color: "#1E3A5F",
  },
  tableHeadingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  legendToggle: {
    padding: "6px 12px",
    fontSize: 12,
    color: "#6D28D9",
    background: "#F5F3FF",
    border: "1px solid #DDD6FE",
    borderRadius: 99,
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 600,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  legendBox: {
    display: "flex",
    gap: 16,
    padding: "12px 14px",
    backgroundColor: "#FAFAFA",
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    marginBottom: 12,
  },
  legendCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1E3A5F",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  tableHeader: {
    display: "flex",
    alignItems: "center",
    padding: "6px 8px 0",
    backgroundColor: "#F8FAFC",
    borderRadius: "10px 10px 0 0",
  },
  tableSubHeader: {
    display: "flex",
    alignItems: "center",
    padding: "4px 8px 6px",
    backgroundColor: "#F8FAFC",
    borderBottom: "2px solid #E2E8F0",
    textAlign: "center",
  },
  sessionGroupLabel: {
    flex: 3,
    textAlign: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "#94A3B8",
    letterSpacing: 1,
    paddingBottom: 2,
    borderBottom: "1.5px solid #E2E8F0",
  },
  specialGroupLabel: {
    color: "#7C3AED",
    borderBottom: "1.5px solid #C4B5FD",
    background: "linear-gradient(to right, #F5F3FF, #EDE9FE)",
    borderRadius: "4px 4px 0 0",
    padding: "2px 0",
  },
  tableBody: {
    maxHeight: 480,
    overflowY: "auto",
    border: "1px solid #E2E8F0",
    borderTop: "none",
  },
  tableRow: {
    display: "flex",
    alignItems: "center",
    padding: "8px 8px",
    borderBottom: "1px solid #F1F5F9",
  },
  nameCol: {
    flex: "0 0 65px" as CSSProperties["flex"],
    fontWeight: 600,
    color: "#1E293B",
    fontSize: 14,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  sessionCol: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "2px 0",
  },
  specialCol: { backgroundColor: "#FAF5FF" },
  specialColHeader: { backgroundColor: "#F5F3FF" },
  progressBar: {
    padding: "14px 16px",
    background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)",
    borderRadius: "0 0 10px 10px",
    border: "1px solid #DDD6FE",
    borderTop: "none",
  },
  progressInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  progressLabel: { fontSize: 13, fontWeight: 700, color: "#6D28D9" },
  progressPct: {
    fontSize: 36,
    fontWeight: 800,
    color: "#4C1D95",
    letterSpacing: -1,
    lineHeight: 1,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#DDD6FE",
    borderRadius: 99,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(to right, #8B5CF6, #6D28D9)",
    borderRadius: 99,
    transition: "width 0.4s ease",
  },
  textarea: {
    width: "100%",
    padding: "14px 16px",
    fontSize: 15,
    borderRadius: 10,
    border: "1.5px solid #CBD5E1",
    backgroundColor: "#F8FAFC",
    color: "#1E293B",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    lineHeight: 1.6,
  },
  submitBtn: {
    width: "100%",
    padding: "18px 24px",
    fontSize: 18,
    fontWeight: 800,
    border: "none",
    borderRadius: 12,
    letterSpacing: 1,
    transition: "all 0.3s ease",
    marginTop: 4,
  },
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "56px 0",
    gap: 18,
  },
  spinner: {
    width: 44,
    height: 44,
    border: "4px solid #E2E8F0",
    borderTop: "4px solid #D4A017",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { margin: 0, color: "#64748B", fontSize: 16 },
};
