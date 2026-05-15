import { useEffect, useState, useMemo, CSSProperties } from "react";
import DinoGame from "../components/game/DinoGame";
import { useSearchInput } from "../hooks/useSearchInput";
import { fetchAttendancePeople, postJson } from "../services/api";
import {
  API_ENDPOINTS,
  SESSION_LABELS,
  ATTENDANCE_STATUS,
  BADGE_SIZE,
  GRAY_BADGE_URL,
  COLOR_BADGE_URL,
} from "../constants";
import type {
  AttendancePerson,
  AttendanceUpdateItem,
  AttendanceSubmitResult,
  PendingChecks,
} from "../types";

const isSpecialSession = (s: number) => s >= 4;

export default function AttendanceApp() {
  const [allPeople, setAllPeople] = useState<AttendancePerson[]>([]);
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
  const [submitResult, setSubmitResult] = useState<AttendanceSubmitResult | null>(null);

  useEffect(() => {
    fetchAttendancePeople(API_ENDPOINTS.SIXTH_SUBMIT)
      .then(setAllPeople)
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
        if (p.sessions[s] === ATTENDANCE_STATUS.CHECKED || !!pendingChecks[`${p.name}_${s}`])
          done++;
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

    const updates: AttendanceUpdateItem[] = [];
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
      const { data } = await postJson<typeof payload, AttendanceSubmitResult>(
        API_ENDPOINTS.SIXTH_SUBMIT,
        payload
      );
      setSubmitResult(data);
      if (data.success) {
        const successKeys = new Set(
          (data.results || [])
            .filter((r) => r.success)
            .map((r) => `${r.name}_${r.session}`)
        );
        setAllPeople((prev) =>
          prev.map((p) => {
            const updated: AttendancePerson = { ...p, sessions: { ...p.sessions } };
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

  if (gameVisible)
    return (
      <DinoGame
        onLoaded={!loading || fetchError}
        onEnter={() => setGameVisible(false)}
      />
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
          <div style={S.goldAccent} />

          <div style={S.header}>
            <h1 style={S.title}>日日有光登記表</h1>
            <p style={S.subtitle}>可依小組查詢，或直接搜尋個人姓名</p>
          </div>

          {/* 牧區 */}
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

          {/* 小組 Autocomplete */}
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

          {/* OR divider */}
          <div style={S.orDivider}>
            <span style={S.orLine} />
            <span style={S.orText}>或直接搜尋姓名</span>
            <span style={S.orLine} />
          </div>

          {/* 個人搜尋 */}
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
                  if (!e.target.value) {
                    setSelectedName("");
                    resetAll();
                  }
                }}
                onFocus={() => nameSearch.setOpen(true)}
                onKeyDown={(e) => {
                  const opts = allNames.filter((n) => n.includes(nameSearch.query));
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
                  options={allNames.filter((n) => n.includes(nameSearch.query)).slice(0, 12)}
                  active={nameSearch.active}
                  onSelect={handleNameSelect}
                  onHover={(i) => nameSearch.setActive(i)}
                />
              )}
            </div>
          </div>

          {/* 出席表 */}
          {showTable && (
            <div style={S.section}>
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

              {legendOpen && (
                <div style={S.legendBox}>
                  <div style={S.legendCol}>
                    <span style={S.legendTitle}>1189</span>
                    <LegendItem imgGray imgSrc={GRAY_BADGE_URL(1)} label="尚報名（不可補登）" />
                    <LegendItem imgSrc={GRAY_BADGE_URL(1)} border label="未完成（可補登）" />
                    <LegendItem imgSrc={COLOR_BADGE_URL(1)} label="已完成" />
                    <LegendItem imgSrc={COLOR_BADGE_URL(1)} pending label="待送出" />
                  </div>
                  <div style={{ width: 1, background: "#DDD6FE", alignSelf: "stretch" }} />
                  <div style={S.legendCol}>
                    <span style={{ ...S.legendTitle, color: "#7C3AED" }}>日日有光</span>
                    <LegendItem imgSrc={GRAY_BADGE_URL(4)} border label="尚報名（可補登）" special />
                    <LegendItem imgSrc={GRAY_BADGE_URL(4)} border label="未完成（可補登）" special />
                    <LegendItem imgSrc={COLOR_BADGE_URL(4)} label="已完成" special />
                  </div>
                </div>
              )}

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

          {/* 備註 */}
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
          style={{ ...S.dropdownItem, ...(i === active ? S.dropdownItemActive : {}) }}
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
  person: AttendancePerson;
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
          <div key={session} style={{ ...S.sessionCol, ...(special ? S.specialCol : {}) }}>
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

  if (status === ATTENDANCE_STATUS.CHECKED) {
    return (
      <div title="已完成" style={{ width: BADGE_SIZE, height: BADGE_SIZE, cursor: "not-allowed" }}>
        <img
          src={COLOR_BADGE_URL(session)}
          alt=""
          width={BADGE_SIZE}
          height={BADGE_SIZE}
          style={{ display: "block" }}
        />
      </div>
    );
  }

  if (!special && status === ATTENDANCE_STATUS.NOT_REGISTERED) {
    return (
      <div
        title="尚未報名，不可補登"
        style={{ width: BADGE_SIZE, height: BADGE_SIZE, cursor: "not-allowed", opacity: 0.3 }}
      >
        <img
          src={GRAY_BADGE_URL(session)}
          alt=""
          width={BADGE_SIZE}
          height={BADGE_SIZE}
          style={{ display: "block" }}
        />
      </div>
    );
  }

  const canToggle =
    status === ATTENDANCE_STATUS.CROSSED ||
    (special && status === ATTENDANCE_STATUS.NOT_REGISTERED);

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
          src={isPending ? COLOR_BADGE_URL(session) : GRAY_BADGE_URL(session)}
          alt=""
          width={BADGE_SIZE}
          height={BADGE_SIZE}
          style={{ display: "block", opacity: isPending ? 1 : special ? 0.65 : 0.55 }}
        />
      </div>
    );
  }

  return (
    <div
      style={{ width: BADGE_SIZE, height: BADGE_SIZE, borderRadius: 4, background: "#E5E7EB" }}
    />
  );
}

// ── SubmitResultBox ────────────────────────────────────────────
function SubmitResultBox({ result }: { result: AttendanceSubmitResult }) {
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
  orDivider: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  orLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0", display: "block" },
  orText: { fontSize: 13, color: "#94A3B8", fontWeight: 600, whiteSpace: "nowrap" },
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
  dropdownItemActive: { backgroundColor: "#EFF6FF", color: "#1E3A5F" },
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
  legendCol: { flex: 1, display: "flex", flexDirection: "column", gap: 6 },
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
};
