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
}

function SessionCell({ session, status, isPending, onClick }: SessionCellProps) {
  const special = isSpecialSession(session);

  if (status === ATTENDANCE_STATUS.CHECKED) {
    return (
      <div title="已完成" style={{ width: BADGE_SIZE, height: BADGE_SIZE }} className="cursor-not-allowed">
        <img src={COLOR_BADGE_URL(session)} alt="" width={BADGE_SIZE} height={BADGE_SIZE} className="block" />
      </div>
    );
  }

  if (!special && status === ATTENDANCE_STATUS.NOT_REGISTERED) {
    return (
      <div
        title="尚未報名，不可補登"
        style={{ width: BADGE_SIZE, height: BADGE_SIZE }}
        className="cursor-not-allowed opacity-30"
      >
        <img src={PINK_BADGE_URL(session)} alt="" width={BADGE_SIZE} height={BADGE_SIZE} className="block" />
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
        style={{ width: BADGE_SIZE, height: BADGE_SIZE, opacity: isPending ? 1 : special ? 0.65 : 0.55 }}
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
    <div style={{ width: BADGE_SIZE, height: BADGE_SIZE }} className="rounded bg-gray-200" />
  );
}
