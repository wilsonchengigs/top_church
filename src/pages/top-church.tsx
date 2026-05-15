import { useState } from "react";
import { Helmet } from "react-helmet";
import BibleVerseLoader from "../components/BibleVerseLoader";
import toast, { Toaster } from "react-hot-toast";
import { useActivityData } from "../hooks/useActivityData";
import { postJson } from "../services/api";
import { formatKey } from "../utils/format";
import {
  API_ENDPOINTS,
  TOP_CHURCH_HANDLERS,
  LOADING_VERSES,
  PAYMENT_KEY_MAP,
  PAYMENT_EXCLUDED_KEYS,
} from "../constants";
import type { PaymentPersonWithActivity } from "../types";

const HANDLER_PLACEHOLDER = TOP_CHURCH_HANDLERS[0];

function filterPersons(
  activities: ReturnType<typeof useActivityData>["activities"],
  query: string
): PaymentPersonWithActivity[] {
  if (!query) return [];
  return activities.flatMap((activity) =>
    activity.data
      .filter(
        (person) =>
          person.name.includes(query) ||
          person.phone.includes(query) ||
          person.team.includes(query) ||
          person.group.includes(query) ||
          activity.activityName.includes(query)
      )
      .map((person) => ({
        ...person,
        activityName: activity.activityName,
        activityId: activity.activityId,
        activityPrice: activity.activityPrice,
      }))
  );
}

export default function PaymentTracker() {
  const { activities, loading } = useActivityData(API_ENDPOINTS.TOP_CHURCH);
  const [query, setQuery] = useState("");
  const [handler, setHandler] = useState<string>(HANDLER_PLACEHOLDER);
  const [paidUids, setPaidUids] = useState<Set<string>>(new Set());
  const [treeRetrievedNames, setTreeRetrievedNames] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PaymentPersonWithActivity | null>(null);
  const [customAmount, setCustomAmount] = useState<number | null>(null);

  const filtered = filterPersons(activities, query);

  const clearSelection = () => {
    setSelectedPerson(null);
    setCustomAmount(null);
  };

  async function markAsPaid(
    person: PaymentPersonWithActivity,
    mode = "paid"
  ) {
    if (handler === HANDLER_PLACEHOLDER) {
      toast.error("請選擇經手人");
      return;
    }
    setSubmitting(true);
    try {
      const url = `${API_ENDPOINTS.TOP_CHURCH}?mode=${mode}`;
      const { status, data } = await postJson<unknown, { message: string }>(url, {
        activityName: person.activityName,
        name: person.name,
        handler,
        price: customAmount ?? person.activityPrice,
      });
      if (status === 200) {
        if (mode === "paid") setPaidUids((prev) => new Set(prev).add(person.uid));
        else if (mode === "tree") setTreeRetrievedNames((prev) => new Set(prev).add(person.name));
        toast.success(data.message);
        clearSelection();
      } else {
        toast.error(`${mode === "tree" ? "Get tree" : "繳費"}失敗：` + data.message);
      }
    } catch (error) {
      toast.error("網路錯誤：" + error);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <BibleVerseLoader verses={LOADING_VERSES.INITIAL} />;
  if (submitting) return <BibleVerseLoader verses={LOADING_VERSES.SUBMITTING} />;

  return (
    <>
      <Helmet>
        <title>Top Church 報名與繳費記錄查詢</title>
      </Helmet>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: { background: "#363636", color: "#fff" },
          success: { iconTheme: { primary: "#4ade80", secondary: "#fff" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />
      <div className="mx-auto">
        <div className="sticky top-0 bg-white z-10 p-4 shadow-md">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">
              Top Church 報名與繳費記錄查詢
            </h1>
            <select
              className="w-1/3 p-3 border border-gray-400 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500"
              value={handler}
              onChange={(e) => setHandler(e.target.value)}
            >
              {TOP_CHURCH_HANDLERS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4">
          <input
            type="text"
            className="w-full p-3 border border-gray-400 rounded-lg mb-4 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500"
            placeholder="輸入姓名、電話、小組、活動名稱"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="min-h-[120px] space-y-2">
            {filtered.map((person, index) => (
              <div
                key={`${index}_${person.uid || person.phone || person.name}_${person.activityId || ""}_${person.name}`}
                className="flex justify-between items-center p-3 border rounded-lg bg-white shadow-sm hover:shadow-md transition"
              >
                <div>
                  <p className="font-medium text-gray-900">{person.name}</p>
                  <p className="text-sm text-gray-500">
                    📱 {person.phone} ｜ 🏷️ {person.team} ｜ 📘 {person.activityName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedPerson(person);
                    setCustomAmount(person.activityPrice);
                  }}
                  className={`px-4 cursor-pointer py-1 rounded-lg text-sm ${
                    person["已繳費"]
                      ? "bg-amber-900 text-white"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {person["已繳費"] ? "已繳費" : "標記為已繳費"}
                </button>
              </div>
            ))}

            {filtered.length === 0 && query && (
              <p className="text-gray-500 text-center">查無符合資料</p>
            )}
          </div>

          {selectedPerson && (
            <div
              className="fixed inset-0 bg-black/30 flex justify-center items-center z-50"
              onClick={clearSelection}
            >
              <div
                className="bg-white p-6 rounded-lg max-w-4xl w-full shadow-lg relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={clearSelection}
                  className="absolute top-2 right-2 px-4 py-2 bg-gray-500 text-white rounded-full cursor-pointer"
                >
                  X
                </button>
                <h2 className="text-2xl font-bold mb-4">
                  {selectedPerson.name} {selectedPerson.activityName} 報名資訊
                </h2>

                <div className="overflow-auto max-h-96">
                  <table className="w-full table-auto border-collapse">
                    <tbody>
                      {Object.entries(selectedPerson)
                        .filter(([key]) => !(PAYMENT_EXCLUDED_KEYS as readonly string[]).includes(key))
                        .map(([key, value]) => (
                          <tr key={`row-${key}`}>
                            <th className="px-4 py-2 border text-left bg-gray-100">
                              {formatKey(key, PAYMENT_KEY_MAP)}
                            </th>
                            <td className="px-4 py-2 border">
                              {JSON.stringify(value) || ""}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-center gap-2 my-4">
                  <label className="text-gray-700 font-medium">繳費金額:</label>
                  <input
                    type="number"
                    value={customAmount ?? ""}
                    onChange={(e) => setCustomAmount(Number(e.target.value))}
                    className="w-32 p-2 border border-gray-400 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500"
                    placeholder="輸入金額"
                  />
                </div>

                <div className="flex flex-row justify-center gap-4 my-4">
                  <button
                    onClick={() => markAsPaid(selectedPerson)}
                    className={`cursor-pointer px-4 py-2 rounded-lg ${
                      paidUids.has(selectedPerson.uid) || selectedPerson["已繳費"]
                        ? "bg-amber-900 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                    disabled={paidUids.has(selectedPerson.uid) || !!selectedPerson["已繳費"]}
                  >
                    {paidUids.has(selectedPerson.uid) || selectedPerson["已繳費"]
                      ? "學員已繳費"
                      : "標記為已繳費"}
                  </button>

                  {selectedPerson.activityName === "日日有光_程式用" &&
                    (paidUids.has(selectedPerson.uid) || selectedPerson["已繳費"]) && (
                      <button
                        onClick={() => markAsPaid(selectedPerson, "tree")}
                        className={`cursor-pointer px-4 py-2 rounded-lg ${
                          treeRetrievedNames.has(selectedPerson.name) || selectedPerson["已領樹"]
                            ? "bg-gray-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            : "bg-green-500 text-white hover:bg-green-600"
                        }`}
                        disabled={
                          treeRetrievedNames.has(selectedPerson.name) || !!selectedPerson["已領樹"]
                        }
                      >
                        {treeRetrievedNames.has(selectedPerson.name) || selectedPerson["已領樹"]
                          ? "會友已領樹"
                          : "標記為已領樹"}
                      </button>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
