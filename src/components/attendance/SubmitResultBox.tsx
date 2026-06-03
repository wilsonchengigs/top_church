import type { AttendanceSubmitResult } from "../../types";

export function SubmitResultBox({ result }: { result: AttendanceSubmitResult }) {
  const successItems = (result.results || []).filter((r) => r.success);
  const failedItems = (result.results || []).filter(
    (r) => !r.success && !r.reason?.includes("尚未報名")
  );

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
