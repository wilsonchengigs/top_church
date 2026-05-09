import { useEffect, useState, useMemo, useRef, CSSProperties } from "react";

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzkyg10DQolseMzmerKqvPjRZutThSKNipeBjVuCjmXRStEIupRNQXcBA17VghQhlS0fQ/exec";

const SESSION_LABELS = ["第一次", "第二次", "第三次", "第四次", "第五次", "第六次"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

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
  const [fetchError, setFetchError] = useState(false);

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

  const btnStyle = useMemo((): CSSProperties => {
    const hasWork = pendingCount > 0 || note.trim().length > 0;
    if (!hasWork) {
      return {
        backgroundColor: "#D4A017",
        opacity: 0.38,
        boxShadow: "none",
        transform: "scale(1)",
      };
    }
    const t = Math.min(pendingCount / 10, 1);
    const r = Math.round(212 + (255 - 212) * t);
    const g = Math.round(160 + (200 - 160) * t);
    const b = Math.round(23 + (0 - 23) * t);
    const glow = 4 + pendingCount * 3;
    const alpha = Math.min(0.25 + pendingCount * 0.06, 0.7);
    return {
      backgroundColor: `rgb(${r},${g},${b})`,
      opacity: 1,
      boxShadow: `0 4px ${glow}px rgba(${r},${g},0,${alpha})`,
      transform: pendingCount > 3 ? "scale(1.01)" : "scale(1)",
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

  if (loading)
    return (
      <div style={S.container}>
        <div style={S.card}>
          <div style={S.loadingWrap}>
            <div style={S.spinner} />
            <p style={S.loadingText}>載入資料中，請稍候...</p>
          </div>
        </div>
      </div>
    );

  if (fetchError)
    return (
      <div style={S.container}>
        <div style={S.card}>
          <p style={{ color: "#DC2626", textAlign: "center" }}>
            ⚠️ 資料載入失敗，請重新整理頁面
          </p>
        </div>
      </div>
    );

  const showTable = people.length > 0;

  return (
    <div style={S.container}>
      <div style={S.card}>
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
              <option key={a} value={a}>
                {a}
              </option>
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
              placeholder={selectedArea ? "輸入小組名稱搜尋..." : "請先選擇牧區"}
              value={groupSearch.query}
              onChange={(e) => {
                groupSearch.setQuery(e.target.value);
                groupSearch.setOpen(true);
                groupSearch.setActive(-1);
                if (!e.target.value) {
                  setSelectedGroup("");
                  resetAll();
                }
              }}
              onFocus={() => groupSearch.setOpen(true)}
              onKeyDown={(e) => {
                const opts = groupOptions.filter((g) =>
                  g.toLowerCase().includes(groupSearch.query.toLowerCase())
                );
                if (e.key === "ArrowDown") {
                  groupSearch.setActive((a) => Math.min(a + 1, opts.length - 1));
                  e.preventDefault();
                } else if (e.key === "ArrowUp") {
                  groupSearch.setActive((a) => Math.max(a - 1, 0));
                  e.preventDefault();
                } else if (e.key === "Enter" && groupSearch.active >= 0) {
                  handleGroupSelect(opts[groupSearch.active]);
                } else if (e.key === "Escape") {
                  groupSearch.setOpen(false);
                }
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

        {/* ── 個人搜尋 ── */}
        <div style={S.section}>
          <label style={S.label}>個人搜尋（直接輸入姓名）</label>
          <div ref={nameSearch.ref} style={{ position: "relative" }}>
            <input
              style={S.textInput}
              placeholder="輸入姓名搜尋..."
              value={nameSearch.query}
              onChange={(e) => {
                nameSearch.setQuery(e.target.value);
                nameSearch.setOpen(true);
                nameSearch.setActive(-1);
                if (!e.target.value) {
                  setSelectedName("");
                  resetAll();
                }
              }}
              onFocus={() => nameSearch.setOpen(true)}
              onKeyDown={(e) => {
                const opts = allNames.filter((n) =>
                  n.includes(nameSearch.query)
                );
                if (e.key === "ArrowDown") {
                  nameSearch.setActive((a) => Math.min(a + 1, opts.length - 1));
                  e.preventDefault();
                } else if (e.key === "ArrowUp") {
                  nameSearch.setActive((a) => Math.max(a - 1, 0));
                  e.preventDefault();
                } else if (e.key === "Enter" && nameSearch.active >= 0) {
                  handleNameSelect(opts[nameSearch.active]);
                } else if (e.key === "Escape") {
                  nameSearch.setOpen(false);
                }
              }}
            />
            {nameSearch.open && nameSearch.query && (
              <Dropdown
                options={allNames
                  .filter((n) => n.includes(nameSearch.query))
                  .slice(0, 12)}
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
            <label style={S.label}>
              {mode === "name"
                ? `「${selectedName}」出席狀況`
                : `${selectedArea} — ${selectedGroup} 組員出席狀況`}
            </label>

            {/* 圖例 */}
            <div style={S.legend}>
              <div style={S.legendGroup}>
                <span style={S.legendTitle}>1189</span>
                <LegendItem imgGray imgSrc={GRAY_BADGE(1)} label="尚報名（不可補登）" />
                <LegendItem imgSrc={GRAY_BADGE(1)} border label="未完成（可補登）" />
                <LegendItem imgSrc={COLOR_BADGE(1)} label="已完成" />
                <LegendItem imgSrc={COLOR_BADGE(1)} pending label="待送出" />
              </div>
              <div
                style={{
                  ...S.legendGroup,
                  borderLeft: "2px solid #DDD6FE",
                  paddingLeft: 12,
                }}
              >
                <span style={{ ...S.legendTitle, color: "#7C3AED" }}>
                  日日有光
                </span>
                <LegendItem
                  imgSrc={GRAY_BADGE(4)}
                  border
                  label="尚報名（可補登）"
                  special
                />
                <LegendItem
                  imgSrc={GRAY_BADGE(4)}
                  border
                  label="未完成（可補登）"
                  special
                />
                <LegendItem imgSrc={COLOR_BADGE(4)} label="已完成" special />
              </div>
            </div>

            {/* 欄位標題 */}
            <div style={S.tableHeader}>
              <div
                style={{
                  ...S.nameCol,
                  fontWeight: 600,
                  fontSize: 12,
                  color: "#475569",
                }}
              >
                姓名
              </div>
              <div style={S.sessionGroupLabel}>1189</div>
              <div style={{ ...S.sessionGroupLabel, ...S.specialGroupLabel }}>
                日日有光
              </div>
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
                    fontSize: 11,
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
                <div
                  style={{ ...S.progressFill, width: `${specialProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── 備註 ── */}
        {showTable && (
          <div style={S.section}>
            <label style={S.label}>備註</label>
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
          <span style={{ fontSize: 10, color: "#94A3B8", marginRight: 4 }}>
            [{person.area}]
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
  const SIZE = 32;
  const special = isSpecialSession(session);

  if (status === STATUS.CHECKED) {
    return (
      <div
        title="已完成"
        style={{ width: SIZE, height: SIZE, cursor: "not-allowed" }}
      >
        <img
          src={COLOR_BADGE(session)}
          alt=""
          width={SIZE}
          height={SIZE}
          style={{ display: "block" }}
        />
      </div>
    );
  }

  if (!special && status === STATUS.NOT_REGISTERED) {
    return (
      <div
        title="尚未報名，不可補登"
        style={{ width: SIZE, height: SIZE, cursor: "not-allowed", opacity: 0.35 }}
      >
        <img
          src={GRAY_BADGE(session)}
          alt=""
          width={SIZE}
          height={SIZE}
          style={{ display: "block" }}
        />
      </div>
    );
  }

  const canToggle =
    status === STATUS.CROSSED ||
    (special && status === STATUS.NOT_REGISTERED);

  if (canToggle) {
    return (
      <div
        onClick={onClick}
        title={isPending ? "點擊取消" : "點擊補登記為完成"}
        style={{
          width: SIZE,
          height: SIZE,
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
          width={SIZE}
          height={SIZE}
          style={{
            display: "block",
            opacity: isPending ? 1 : special ? 0.65 : 0.55,
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: SIZE,
        height: SIZE,
        borderRadius: 4,
        background: "#E5E7EB",
      }}
    />
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
        padding: "12px 16px",
        borderRadius: 8,
        backgroundColor: result.success ? "#F0FDF4" : "#FEF2F2",
        border: `1px solid ${result.success ? "#BBF7D0" : "#FECACA"}`,
      }}
    >
      {result.success ? (
        <>
          <p style={{ margin: 0, color: "#15803D", fontWeight: 600 }}>
            ✅ 成功更新 {successItems.length} 筆
          </p>
          {failedItems.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ margin: "0 0 4px", color: "#B45309", fontWeight: 600 }}>
                ⚠️ 以下 {failedItems.length} 筆無法更新：
              </p>
              {failedItems.map((r, i) => (
                <p
                  key={i}
                  style={{ margin: "2px 0", color: "#92400E", fontSize: 13 }}
                >
                  • {r.name} 第{r.session}次：{r.reason}
                </p>
              ))}
            </div>
          )}
        </>
      ) : (
        <p style={{ margin: 0, color: "#DC2626", fontWeight: 600 }}>
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        color: "#374151",
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          outline: pending
            ? "2.5px solid #6D28D9"
            : border
            ? "2px solid #9CA3AF"
            : "none",
          outlineOffset: "2px",
        }}
      >
        <img
          src={imgSrc}
          alt=""
          width={20}
          height={20}
          style={{
            display: "block",
            opacity: (imgGray || border) && !pending ? 0.45 : 1,
          }}
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
    backgroundColor: "#F1F5F9",
    padding: "24px 16px",
    fontFamily: "'Noto Sans TC', 'Microsoft JhengHei', sans-serif",
    boxSizing: "border-box",
  },
  card: {
    maxWidth: 820,
    margin: "0 auto",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
    padding: "28px 24px",
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "2px solid #E2E8F0",
  },
  title: {
    margin: "0 0 6px",
    fontSize: 26,
    fontWeight: 800,
    color: "#1E3A5F",
    letterSpacing: 1,
  },
  subtitle: { margin: 0, fontSize: 14, color: "#64748B" },
  section: { marginBottom: 24 },
  label: {
    display: "block",
    fontWeight: 700,
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },
  select: {
    width: "100%",
    padding: "10px 14px",
    fontSize: 15,
    borderRadius: 8,
    border: "1.5px solid #CBD5E1",
    backgroundColor: "#F8FAFC",
    color: "#1E293B",
    outline: "none",
    boxSizing: "border-box",
  },
  textInput: {
    width: "100%",
    padding: "10px 14px",
    fontSize: 15,
    borderRadius: 8,
    border: "1.5px solid #CBD5E1",
    backgroundColor: "#F8FAFC",
    color: "#1E293B",
    outline: "none",
    boxSizing: "border-box",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    border: "1.5px solid #CBD5E1",
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    zIndex: 50,
    maxHeight: 260,
    overflowY: "auto",
  },
  dropdownItem: {
    padding: "10px 14px",
    fontSize: 14,
    cursor: "pointer",
    color: "#1E293B",
    borderBottom: "1px solid #F1F5F9",
    transition: "background 0.1s",
  },
  dropdownItemActive: {
    backgroundColor: "#EFF6FF",
    color: "#1E3A5F",
  },
  legend: {
    display: "flex",
    gap: 16,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  legendGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
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
    padding: "6px 10px 0",
    backgroundColor: "#F8FAFC",
    borderRadius: "8px 8px 0 0",
  },
  tableSubHeader: {
    display: "flex",
    alignItems: "center",
    padding: "4px 10px 6px",
    backgroundColor: "#F8FAFC",
    borderBottom: "2px solid #E2E8F0",
    fontSize: 11,
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
    maxHeight: 460,
    overflowY: "auto",
    border: "1px solid #E2E8F0",
    borderTop: "none",
  },
  tableRow: {
    display: "flex",
    alignItems: "center",
    padding: "6px 10px",
    borderBottom: "1px solid #F1F5F9",
  },
  nameCol: {
    flex: "0 0 50px" as CSSProperties["flex"],
    fontWeight: 500,
    color: "#1E293B",
    fontSize: 13,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  sessionCol: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "1px",
  },
  specialCol: { backgroundColor: "#FAF5FF" },
  specialColHeader: { backgroundColor: "#F5F3FF" },
  progressBar: {
    padding: "12px 14px",
    background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)",
    borderRadius: "0 0 8px 8px",
    border: "1px solid #DDD6FE",
    borderTop: "none",
  },
  progressInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  progressLabel: { fontSize: 12, fontWeight: 600, color: "#6D28D9" },
  progressPct: {
    fontSize: 28,
    fontWeight: 800,
    color: "#4C1D95",
    letterSpacing: -1,
    lineHeight: 1,
  },
  progressTrack: {
    height: 6,
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
    padding: "10px 14px",
    fontSize: 14,
    borderRadius: 8,
    border: "1.5px solid #CBD5E1",
    backgroundColor: "#F8FAFC",
    color: "#1E293B",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    fontSize: 16,
    fontWeight: 800,
    color: "#1E293B",
    border: "none",
    borderRadius: 10,
    letterSpacing: 0.5,
    transition: "all 0.25s ease",
  },
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px 0",
    gap: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid #E2E8F0",
    borderTop: "4px solid #1E3A5F",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { margin: 0, color: "#64748B", fontSize: 15 },
};