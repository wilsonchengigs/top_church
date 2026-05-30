import { useEffect, useState, useMemo, useRef, CSSProperties } from "react";
import { Dropdown } from "../components/shared/Dropdown";
import { PersonRow } from "../components/attendance/PersonRow";
import { SubmitResultBox } from "../components/attendance/SubmitResultBox";
import { LegendBox } from "../components/attendance/LegendBox";
import { useSearchInput } from "../hooks/useSearchInput";
import { fetchAttendancePeople, postJson } from "../services/api";
import { API_ENDPOINTS, SESSION_LABELS, ATTENDANCE_STATUS, COLOR_BADGE_URL } from "../constants";
import { S } from "./sixthsubmit.styles";
import type {
  AttendancePerson,
  AttendanceUpdateItem,
  AttendanceSubmitResult,
  PendingChecks,
} from "../types";

const isSpecialSession = (s: number) => s >= 4;

function BadgeLanding({ onLoaded, onEnter }: { onLoaded: boolean; onEnter: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const cycledRef = useRef(false);
  const onEnterRef = useRef(onEnter);
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => { onEnterRef.current = onEnter; }, [onEnter]);
  useEffect(() => { onLoadedRef.current = onLoaded; }, [onLoaded]);

  useEffect(() => {
    let current = 0;
    const id = setInterval(() => {
      current = (current + 1) % 6;
      setActiveIdx(current);
      if (current === 5) cycledRef.current = true;
      if (cycledRef.current && onLoadedRef.current) {
        clearInterval(id);
        setTimeout(() => onEnterRef.current(), 300);
      }
    }, 400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (onLoaded && cycledRef.current) onEnterRef.current();
  }, [onLoaded]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 32,
      backgroundColor: "#F5F3EE",
      fontFamily: "'Noto Sans TC', 'Microsoft JhengHei', sans-serif",
    }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1E3A5F", margin: 0 }}>
        1189日日有光｜線上回報
      </h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, justifyItems: "center" }}>
        {[1, 2, 3, 4, 5, 6].map((session, i) => (
          <img
            key={session}
            src={COLOR_BADGE_URL(session)}
            width={80}
            height={80}
            alt=""
            style={{
              opacity: activeIdx === i ? 1 : activeIdx > i ? 0.5 : 0.15,
              transform: activeIdx === i ? "scale(1.15)" : "scale(1)",
              transition: "opacity 0.2s, transform 0.2s",
            }}
          />
        ))}
      </div>
      {!onLoaded && (
        <p style={{ margin: 0, fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>
          載入資料中，請稍候...
        </p>
      )}
    </div>
  );
}

export default function AttendanceApp() {
  const [allPeople, setAllPeople] = useState<AttendancePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameVisible, setGameVisible] = useState(true);
  const [fetchError, setFetchError] = useState(false);

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
    return [...new Set(allPeople.filter((p) => p.area === selectedArea).map((p) => p.group))].sort();
  }, [allPeople, selectedArea]);

  const groupOptions = useMemo(() => groups.map((g) => `${g}`), [groups]);

  const allNames = useMemo(
    () => [...new Set(allPeople.map((p) => p.name))].sort(),
    [allPeople]
  );

  const groupPeople = useMemo(() => {
    if (!selectedArea || !selectedGroup) return [];
    return allPeople.filter((p) => p.area === selectedArea && p.group === selectedGroup);
  }, [allPeople, selectedArea, selectedGroup]);

  const namePeople = useMemo(() => {
    if (!selectedName) return [];
    const found = allPeople.find((p) => p.name === selectedName);
    if (!found) return [];
    return allPeople.filter((p) => p.area === found.area && p.group === found.group);
  }, [allPeople, selectedName]);

  const people = selectedName ? namePeople : groupPeople;
  const mode = selectedName ? "name" : "group";
  const nameGroupLabel = namePeople[0] ? `${namePeople[0].area} — ${namePeople[0].group}（${selectedName}）` : selectedName;

  const specialProgress = useMemo(() => {
    if (people.length === 0) return 0;
    let done = 0;
    for (const p of people) {
      for (const s of [4, 5, 6]) {
        if (p.sessions[s] === ATTENDANCE_STATUS.CHECKED || !!pendingChecks[`${p.name}_${s}`]) done++;
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
    if (!hasWork)
      return { background: "linear-gradient(135deg, #A8B0BC 0%, #6B7280 100%)", opacity: 0.45, boxShadow: "none", transform: "scale(1)", color: "#fff" };
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
      updates.push({ name: key.slice(0, lastUnderscore), session: parseInt(key.slice(lastUnderscore + 1)) });
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
          (data.results || []).filter((r) => r.success).map((r) => `${r.name}_${r.session}`)
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
    return <BadgeLanding onLoaded={!loading || fetchError} onEnter={() => setGameVisible(false)} />;

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
          <div style={S.header}>
            <h1 style={S.title}>1189日日有光｜線上回報</h1>
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
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* OR divider */}
          <div style={S.orDivider}>
            <span style={S.orLine} />
            <span style={S.orText}>請先選擇牧區，再依 小組編號 或 直接輸入個人姓名 搜尋</span>
            <span style={S.orLine} />
          </div>

          {/* 小組編號 Autocomplete */}
          <div style={S.section}>
            <label style={S.label}>小組編號</label>
            <div ref={groupSearch.ref} style={{ position: "relative" }}>
              <input
                style={{ ...S.textInput, opacity: !selectedArea ? 0.45 : 1 }}
                disabled={!selectedArea}
                placeholder={selectedArea ? "輸入小組編號..." : "請先選擇牧區"}
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
                  options={groupOptions.filter((g) => !groupSearch.query || g.toLowerCase().includes(groupSearch.query.toLowerCase()))}
                  active={groupSearch.active}
                  onSelect={handleGroupSelect}
                  onHover={(i) => groupSearch.setActive(i)}
                />
              )}
            </div>
          </div>

          {/* 個人搜尋 */}
          <div style={S.section}>
            <label style={S.label}>個人搜尋</label>
            <div ref={nameSearch.ref} style={{ position: "relative" }}>
              <input
                style={{ ...S.textInput, opacity: !selectedArea ? 0.45 : 1 }}
                disabled={!selectedArea}
                placeholder={selectedArea ? "輸入姓名..." : "請先選擇牧區"}
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

          {/* 出席表 */}
          {showTable && (
            <div style={S.section}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <LegendBox />
              </div>
              <label style={{ ...S.label, marginBottom: 8 }}>
                {mode === "name" ? nameGroupLabel : `${selectedArea} — ${selectedGroup}`}
              </label>

              {/* 表格標題 */}
              <div style={S.tableHeader}>
                <div style={S.nameCol} />
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
                cursor: (pendingCount === 0 && !note.trim()) || submitting ? "not-allowed" : "pointer",
              }}
              onClick={handleSubmit}
              disabled={(pendingCount === 0 && !note.trim()) || submitting}
            >
              {submitting ? "送出中..." : pendingCount > 0 ? `送出登記（${pendingCount} 筆）` : "送出登記"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
