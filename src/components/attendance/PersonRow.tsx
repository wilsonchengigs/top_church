import type { AttendancePerson, PendingChecks } from "../../types";
import { ATTENDANCE_STATUS, BADGE_SIZE, PINK_BADGE_URL, COLOR_BADGE_URL } from "../../constants";

const isSpecialSession = (s: number) => s >= 4;

export interface PersonRowProps {
  person: AttendancePerson;
  pendingChecks: PendingChecks;
  onToggle: (name: string, session: number) => void;
  showArea: boolean;
}

export function PersonRow({ person, pendingChecks, onToggle, showArea }: PersonRowProps) {
  // Session 4 registered implies sessions 5 & 6 are also registered
  const registeredForSpecial = person.sessions[4] !== ATTENDANCE_STATUS.NOT_REGISTERED;

  return (
    <div className="flex items-center px-2 py-2 border-b border-slate-100">
      <div className="flex-none w-[65px] font-semibold text-slate-900 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
        {showArea && (
          <span className="text-[9px] text-slate-400 block leading-tight">
            {person.area}
          </span>
        )}
        {person.name}
      </div>
      {[1, 2, 3, 4, 5, 6].map((session) => (
        <div key={session} className="flex-1 flex justify-center items-center py-0.5">
          <SessionCell
            session={session}
            status={person.sessions[session]}
            isPending={!!pendingChecks[`${person.name}_${session}`]}
            onClick={() => onToggle(person.name, session)}
            registeredForSpecial={registeredForSpecial}
          />
        </div>
      ))}
    </div>
  );
}

interface SessionCellProps {
  session: number;
  status: string;
  isPending: boolean;
  onClick: () => void;
  registeredForSpecial: boolean;
}

function SessionCell({ session, status, isPending, onClick, registeredForSpecial }: SessionCellProps) {
  const special = isSpecialSession(session);

  if (status === ATTENDANCE_STATUS.CHECKED) {
    return (
      <div title="已完成" style={{ width: BADGE_SIZE, height: BADGE_SIZE }} className="cursor-not-allowed">
        <img src={COLOR_BADGE_URL(session)} alt="" width={BADGE_SIZE} height={BADGE_SIZE} className="block" />
      </div>
    );
  }

  // Sessions 1–3: view-only, no interaction allowed
  if (!special) {
    return (
      <div
        title={status === ATTENDANCE_STATUS.NOT_REGISTERED ? "尚未報名" : "回報已截止"}
        style={{ width: BADGE_SIZE, height: BADGE_SIZE }}
        className={`cursor-not-allowed ${status === ATTENDANCE_STATUS.NOT_REGISTERED ? "opacity-30" : "opacity-50"}`}
      >
        <img src={PINK_BADGE_URL(session)} alt="" width={BADGE_SIZE} height={BADGE_SIZE} className="block" />
      </div>
    );
  }

  // Sessions 4–6: clickable if CROSSED, or NOT_REGISTERED but registered for session 4
  const canToggle =
    status === ATTENDANCE_STATUS.CROSSED ||
    (status === ATTENDANCE_STATUS.NOT_REGISTERED && registeredForSpecial);

  if (canToggle) {
    return (
      <div
        onClick={onClick}
        title={isPending ? "點擊取消" : "點擊補登記為完成"}
        style={{ width: BADGE_SIZE, height: BADGE_SIZE, opacity: isPending ? 1 : 0.65 }}
        className="cursor-pointer rounded-full transition-opacity duration-150"
      >
        <img
          src={isPending ? COLOR_BADGE_URL(session) : PINK_BADGE_URL(session)}
          alt=""
          width={BADGE_SIZE}
          height={BADGE_SIZE}
          className="block"
        />
      </div>
    );
  }

  return (
    <div style={{ width: BADGE_SIZE, height: BADGE_SIZE }} className="rounded" />
  );
}
