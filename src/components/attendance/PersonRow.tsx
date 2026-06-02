import type { CSSProperties } from "react";
import type { AttendancePerson, PendingChecks } from "../../types";
import { ATTENDANCE_STATUS, BADGE_SIZE, PINK_BADGE_URL, COLOR_BADGE_URL } from "../../constants";

const isSpecialSession = (s: number) => s >= 4;

const styles: Record<string, CSSProperties> = {
  row: {
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
  normalCol:  { backgroundColor: "#C8D4E8" },
  specialCol: { backgroundColor: "#EDE9FE" },
};

export interface PersonRowProps {
  person: AttendancePerson;
  pendingChecks: PendingChecks;
  onToggle: (name: string, session: number) => void;
  showArea: boolean;
}

export function PersonRow({ person, pendingChecks, onToggle, showArea }: PersonRowProps) {
  return (
    <div style={styles.row}>
      <div style={styles.nameCol}>
        {showArea && (
          <span style={{ fontSize: 9, color: "#94A3B8", display: "block", lineHeight: 1.2 }}>
            {person.area}
          </span>
        )}
        {person.name}
      </div>
      {[1, 2, 3, 4, 5, 6].map((session) => {
        const special = isSpecialSession(session);
        return (
          <div key={session} style={{ ...styles.sessionCol, ...(special ? styles.specialCol : styles.normalCol) }}>
            <SessionCell
              session={session}
              status={person.sessions[session]}
              isPending={!!pendingChecks[`${person.name}_${session}`]}
              onClick={() => onToggle(person.name, session)}
            />
          </div>
        );
      })}
    </div>
  );
}

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
        <img src={COLOR_BADGE_URL(session)} alt="" width={BADGE_SIZE} height={BADGE_SIZE} style={{ display: "block" }} />
      </div>
    );
  }

  if (!special && status === ATTENDANCE_STATUS.NOT_REGISTERED) {
    return (
      <div
        title="尚未報名，不可補登"
        style={{ width: BADGE_SIZE, height: BADGE_SIZE, cursor: "not-allowed", opacity: 0.3 }}
      >
        <img src={PINK_BADGE_URL(session)} alt="" width={BADGE_SIZE} height={BADGE_SIZE} style={{ display: "block" }} />
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
          transition: "opacity 0.15s",
        }}
      >
        <img
          src={isPending ? COLOR_BADGE_URL(session) : PINK_BADGE_URL(session)}
          alt=""
          width={BADGE_SIZE}
          height={BADGE_SIZE}
          style={{ display: "block", opacity: isPending ? 1 : special ? 0.65 : 0.55 }}
        />
      </div>
    );
  }

  return (
    <div style={{ width: BADGE_SIZE, height: BADGE_SIZE, borderRadius: 4, background: "#E5E7EB" }} />
  );
}
