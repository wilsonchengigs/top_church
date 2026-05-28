import { useEffect, useState, useMemo, type CSSProperties, type KeyboardEvent } from "react";
import { Dropdown } from "../components/shared/Dropdown";
import { PersonRow } from "../components/attendance/PersonRow";
import { SubmitResultBox } from "../components/attendance/SubmitResultBox";
import { LegendBox } from "../components/attendance/LegendBox";
import { useSearchInput } from "../hooks/useSearchInput";
import { fetchAttendancePeople, postJson } from "../services/api";
import { API_ENDPOINTS, SESSION_LABELS, ATTENDANCE_STATUS, SPECIAL_SESSIONS, COLOR_BADGE_URL } from "../constants";
import { S } from "./sixthsubmit.styles";
import type {
  AttendancePerson,
  AttendanceUpdateItem,
  AttendanceSubmitResult,
  PendingChecks,
} from "../types";

const isSpecialSession = (s: number) => s >= 4;

const LANDING_BADGE_SIZE = 88;
const LANDING_ANIM_MS = 5500; // last badge starts at 3.5s + 0.6s anim + 1.4s pause

export default function SixthSubmitPage() {
  const [allPeople, setAllPeople] = useState<AttendancePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [showLanding, setShowLanding] = useState(true);
  const [landingFading, setLandingFading] = useState(false);
  const [animDone, setAnimDone] = useState(false);

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

  useEffect(() => {
    const t = setTimeout(() => setAnimDone(true), LANDING_ANIM_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!animDone || loading) return;
    setLandingFading(true);
    const t = setTimeout(() => setShowLanding(false), 700);
    return () => clearTimeout(t);
  }, [animDone, loading]);

  const areas = useMemo(
    () => [...new Set(allPeople.map((p) => p.area))].sort(),
    [allPeople]
  );

  const groups = useMemo(() => {
    if (!selectedArea) return [];
    return [...new Set(allPeople.filter((p) => p.area === selectedArea).map((p) => p.group))].sort();
  }, [allPeople, selectedArea]);

  const areaNames = useMemo(
    () => selectedArea
      ? [...new Set(allPeople.filter((p) => p.area === selectedArea).map((p) => p.name))].sort()
      : [],
    [allPeople, selectedArea]
  );

  const groupPeople = useMemo(() => {
    if (!selectedArea || !selectedGroup) return [];
    return allPeople.filter((p) => p.area === selectedArea && p.group === selectedGroup);
  }, [allPeople, selectedArea, selectedGroup]);

  const namePeople = useMemo(
    () => (selectedName && selectedArea ? allPeople.filter((p) => p.area === selectedArea && p.name === selectedName) : []),
    [allPeople, selectedName, selectedArea]
  );

  const people = selectedName ? namePeople : groupPeople;
  const mode = selectedName ? "name" : "group";

  const filteredGroupOptions = useMemo(
    () => groups.filter((g) => !groupSearch.query || g.toLowerCase().includes(groupSearch.query.toLowerCase())),
    [groups, groupSearch.query]
  );

  const filteredNameOptions = useMemo(
    () => areaNames.filter((n) => n.includes(nameSearch.query)).slice(0, 12),
    [areaNames, nameSearch.query]
  );

  const specialProgress = useMemo(() => {
    if (people.length === 0) return 0;
    let done = 0;
    for (const p of people) {
      for (const s of SPECIAL_SESSIONS) {
        if (p.sessions[s] === ATTENDANCE_STATUS.CHECKED || !!pendingChecks[`${p.name}_${s}`]) done++;
      }
    }
    return Math.round((done / (SPECIAL_SESSIONS.length * people.length)) * 100);
  }, [people, pendingChecks]);

  const pendingCount = useMemo(
    () => Object.values(pendingChecks).filter(Boolean).length,
    [pendingChecks]
  );

  const btnStyle = useMemo((): CSSProperties => {
    const hasWork = pendingCount > 0 || note.trim().length > 0;
    if (!hasWork) return {
      background: "linear-gradient(135deg, #A8B0BC 0%, #6B7280 100%)",
      opacity: 0.45,
      boxShadow: "none",
      color: "#fff",
    };
    if (pendingCount >= 5) return {
      background: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
      opacity: 1,
      boxShadow: "0 8px 20px rgba(180,83,9,0.45), 0 2px 6px rgba(0,0,0,0.08)",
      transform: "scale(1.01)",
      color: "#1A1000",
    };
    return {
      background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      opacity: 1,
      boxShadow: "0 4px 12px rgba(217,119,6,0.3), 0 2px 6px rgba(0,0,0,0.08)",
      color: "#fff",
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
    setSelectedName("");
    nameSearch.setQuery("");
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
    setSelectedGroup("");
    groupSearch.setQuery("");
    resetAll();
  };

  const handleGroupKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const opts = filteredGroupOptions;
    if (e.key === "ArrowDown") { groupSearch.setActive((a) => Math.min(a + 1, opts.length - 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp") { groupSearch.setActive((a) => Math.max(a - 1, 0)); e.preventDefault(); }
    else if (e.key === "Enter" && groupSearch.active >= 0) handleGroupSelect(opts[groupSearch.active]);
    else if (e.key === "Escape") groupSearch.setOpen(false);
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const opts = filteredNameOptions;
    if (e.key === "ArrowDown") { nameSearch.setActive((a) => Math.min(a + 1, opts.length - 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp") { nameSearch.setActive((a) => Math.max(a - 1, 0)); e.preventDefault(); }
    else if (e.key === "Enter" && nameSearch.active >= 0) handleNameSelect(opts[nameSearch.active]);
    else if (e.key === "Escape") nameSearch.setOpen(false);
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
        ? { area: selectedArea, name: selectedName, updates, note }
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
              if (successKeys.has(`${p.name}_${s}`)) updated.sessions[s] = ATTENDANCE_STATUS.CHECKED;
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

  if (fetchError && !showLanding)
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
    {showLanding && (
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        opacity: landingFading ? 0 : 1,
        transition: "opacity 0.7s ease",
        fontFamily: "'Noto Sans TC', 'Microsoft JhengHei', sans-serif",
      }}>
        {/* 金色頂線 */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 4,
          background: "linear-gradient(90deg, #C8860A 0%, #F59E0B 50%, #C8860A 100%)",
        }} />

        <p style={{ color: "#94A3B8", fontSize: 13, letterSpacing: 3, margin: "0 0 10px", textTransform: "uppercase" }}>
          1189 第六屆
        </p>
        <h1 style={{ color: "#1E3A5F", fontSize: 36, fontWeight: 800, margin: "0 0 40px", letterSpacing: 2 }}>
          日日有光
        </h1>

        {/* 3+3 兩排 badge */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 20 }}>
            {[1, 2, 3].map((n) => (
              <img key={n} src={COLOR_BADGE_URL(n)} alt="" width={LANDING_BADGE_SIZE} height={LANDING_BADGE_SIZE}
                style={{ animation: `badgeLand 5.5s ${(n - 1) * 0.7}s infinite` }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[4, 5, 6].map((n) => (
              <img key={n} src={COLOR_BADGE_URL(n)} alt="" width={LANDING_BADGE_SIZE} height={LANDING_BADGE_SIZE}
                style={{ animation: `badgeLand 5.5s ${(n - 1) * 0.7}s infinite` }} />
            ))}
          </div>
        </div>

        <p style={{
          color: loading ? "#CBD5E1" : "#22C55E",
          fontSize: 12,
          marginTop: 48,
          letterSpacing: 1,
          transition: "color 0.4s",
        }}>
          {loading ? "資料載入中..." : "資料就緒"}
        </p>
      </div>
    )}
    <div style={S.container}>
      <div style={S.card}>
        <div style={S.goldAccent} />

        <div style={S.header}>
          <h1 style={S.title}>日日有光登記表</h1>
          <p style={S.subtitle}>先選擇牧區，再依小組或姓名搜尋成員</p>
        </div>

        {/* 牧區 */}
        <div style={S.section}>
          <label style={S.label}>牧區</label>
          <select
            style={{ ...S.select, opacity: loading ? 0.6 : 1 }}
            disabled={loading}
            value={selectedArea}
            onChange={(e) => handleAreaChange(e.target.value)}
          >
            <option value="">{loading ? "資料載入中..." : "請選擇牧區"}</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* 未選牧區：引導提示 */}
        {!selectedArea && (
          <div style={S.areaHint}>
            選擇牧區後，可依小組或姓名查詢並登記出席
          </div>
        )}

        {/* 選了牧區才顯示搜尋區塊 */}
        {selectedArea && (
          <>
            {/* 小組 Autocomplete */}
            <div style={S.section}>
              <label style={S.label}>小組（輸入搜尋）</label>
              <div ref={groupSearch.ref} style={{ position: "relative" }}>
                <input
                  style={S.textInput}
                  placeholder="輸入小組名稱..."
                  value={groupSearch.query}
                  onChange={(e) => {
                    groupSearch.setQuery(e.target.value);
                    groupSearch.setOpen(true);
                    groupSearch.setActive(-1);
                    if (!e.target.value) { setSelectedGroup(""); resetAll(); }
                  }}
                  onFocus={() => groupSearch.setOpen(true)}
                  onKeyDown={handleGroupKeyDown}
                />
                {groupSearch.open && (
                  <Dropdown
                    options={filteredGroupOptions}
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
                    if (!e.target.value) { setSelectedName(""); resetAll(); }
                  }}
                  onFocus={() => nameSearch.setOpen(true)}
                  onKeyDown={handleNameKeyDown}
                />
                {nameSearch.open && nameSearch.query && (
                  <Dropdown
                    options={filteredNameOptions}
                    active={nameSearch.active}
                    onSelect={handleNameSelect}
                    onHover={(i) => nameSearch.setActive(i)}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* 出席表 */}
        {showTable && (
          <div style={S.section}>
            <div style={S.tableHeadingRow}>
              <label style={{ ...S.label, marginBottom: 0 }}>
                {mode === "name" ? `「${selectedName}」出席狀況` : `${selectedArea} — ${selectedGroup}`}
              </label>
            </div>

            <LegendBox />

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
                    ...(isSpecialSession(s) ? S.specialColHeader : S.normalColHeader),
                    fontWeight: 600,
                    fontSize: 10,
                    color: isSpecialSession(s) ? "#7C3AED" : "#334E7A",
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
