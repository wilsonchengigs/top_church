import { useCallback, useEffect, useRef, useState } from "react";
import type { DinoObstacle, DinoCloud } from "../types";
import { DINO_X, DINO_W, DINO_H, JUMP_V, GRAVITY, BASE_SPEED } from "../components/game/gameConstants";

export interface GameLoopState {
  dinoY: number;
  frame: 0 | 1;
  obstacles: DinoObstacle[];
  clouds: DinoCloud[];
  score: number;
  best: number;
  dead: boolean;
  started: boolean;
  flash: boolean;
  jump: () => void;
  saveCurrentScore: () => void;
  gameAreaRef: React.RefObject<HTMLDivElement | null>;
}

export function useGameLoop(
  gameW: number,
  onSaveScore: (score: number) => Promise<void>
): GameLoopState {
  const [dinoY, setDinoY] = useState(0);
  const [frame, setFrame] = useState<0 | 1>(0);
  const [obstacles, setObstacles] = useState<DinoObstacle[]>([]);
  const [clouds, setClouds] = useState<DinoCloud[]>([
    { x: 300, y: 20, w: 60 },
    { x: 160, y: 10, w: 45 },
  ]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("dino_best") || "0"));
  const [dead, setDead] = useState(false);
  const [started, setStarted] = useState(false);
  const [flash, setFlash] = useState(false);

  const deadRef = useRef(false);
  const startedRef = useRef(false);
  const dinoYRef = useRef(0);
  const velYRef = useRef(0);
  const obsRef = useRef<DinoObstacle[]>([]);
  const scoreRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastObsRef = useRef(0);
  const gameWRef = useRef(gameW);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => { gameWRef.current = gameW; }, [gameW]);

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
    if (dinoYRef.current <= 2) velYRef.current = JUMP_V;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [jump]);

  useEffect(() => {
    const el = gameAreaRef.current;
    if (!el) return;
    const handler = (e: TouchEvent) => { e.preventDefault(); jump(); };
    el.addEventListener("touchstart", handler, { passive: false });
    return () => el.removeEventListener("touchstart", handler);
  }, [jump]);

  useEffect(() => {
    let tick = 0;
    const autoSaveInterval = setInterval(() => {
      if (startedRef.current && !deadRef.current && scoreRef.current > 0) {
        onSaveScore(Math.floor(scoreRef.current / 6));
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
        if (dinoRight > o.x + 4 && dinoLeft < o.x + o.w - 4 && dinoBottom < o.h && dinoTop > 0) {
          deadRef.current = true;
          setDead(true);
          setFlash(true);
          setTimeout(() => setFlash(false), 300);
          const finalScore = Math.floor(scoreRef.current / 6);
          setBest((prev) => {
            const newBest = Math.max(prev, finalScore);
            localStorage.setItem("dino_best", String(newBest));
            return newBest;
          });
          onSaveScore(finalScore);
          break;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); clearInterval(autoSaveInterval); };
  }, [onSaveScore]);

  const saveCurrentScore = useCallback(() => {
    onSaveScore(Math.floor(scoreRef.current / 6));
  }, [onSaveScore]);

  return {
    dinoY, frame, obstacles, clouds, score, best, dead, started, flash,
    jump, saveCurrentScore, gameAreaRef,
  };
}
