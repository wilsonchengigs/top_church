import { useState } from "react";
import { Helmet } from "react-helmet";
import BibleVerseLoader from "../components/BibleVerseLoader";
import { useActivityData } from "../hooks/useActivityData";
import { postJson } from "../services/api";
import { formatKey } from "../utils/format";
import {
  API_ENDPOINTS,
  HABITS_HANDLERS,
  LOADING_VERSES,
  PAYMENT_KEY_MAP,
  PAYMENT_EXCLUDED_KEYS,
} from "../constants";
import type { PaymentPersonWithActivity } from "../types";

const HANDLER_PLACEHOLDER = HABITS_HANDLERS[0];

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

export default function HabitsTracker() {
  const { activities, loading } = useActivityData(API_ENDPOINTS.HABITS);
  const [query, setQuery] = useState("");
  const [handler, setHandler] = useState<string>(HANDLER_PLACEHOLDER);
  const [paidUids, setPaidUids] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PaymentPersonWithActivity | null>(null);

  const filtered = filterPersons(activities, query);

  async function markAsPaid(person: PaymentPersonWithActivity) {
    if (handler === HANDLER_PLACEHOLDER) {
      alert("請選擇經手人");
      return;
    }
    setSubmitting(true);
    try {
      const { status, data } = await postJson<unknown, { message: string }>(
        API_ENDPOINTS.HABITS,
        {
          activityName: person.activityName,
          name: person.name,
          handler,
          price: person.activityPrice,
        }
      );
      if (status === 200) {
        setPaidUids((prev) => new Set(prev).add(person.uid));
        alert(data.message);
        setSelectedPerson(null);
      } else {
        alert("繳費失敗：" + data.message);
      }
    } catch (error) {
      alert("網路錯誤：" + error);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <BibleVerseLoader verses={LOADING_VERSES.INITIAL} />;
  if (submitting) return <BibleVerseLoader verses={LOADING_VERSES.SUBMITTING} />;

  return (
    <>
      <Helmet>
        <title>豐生活 卓越養成計劃 報名與繳費記錄查詢</title>
      </Helmet>
      <div className="max-w-xl mx-auto p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">
            豐生活 卓越養成計劃 報名與繳費記錄查詢
          </h1>
          <select
            className="w-1/3 p-3 border border-gray-400 rounded-lg mb-4 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500"
            value={handler}
            onChange={(e) => setHandler(e.target.value)}
          >
            {HABITS_HANDLERS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        <input
          type="text"
          className="w-full p-3 border border-gray-400 rounded-lg mb-4 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500"
          placeholder="輸入姓名、電話、小組、活動名稱"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="min-h-[120px] space-y-2">
          {filtered.map((person) => (
            <div
              key={`${person.uid || person.phone || person.name}_${person.activityId || ""}`}
              className="flex justify-between items-center p-3 border rounded-lg bg-white shadow-sm hover:shadow-md transition"
            >
              <div>
                <p className="font-medium text-gray-900">{person.name}</p>
                <p className="text-sm text-gray-500">
                  📱 {person.phone} ｜ 🏷️ {person.team} ｜ 📘 {person.activityName}
                </p>
              </div>
              <button
                onClick={() => setSelectedPerson(person)}
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
          <div className="fixed inset-0 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-4xl w-full shadow-lg relative">
              <button
                onClick={() => setSelectedPerson(null)}
                className="absolute top-2 right-2 px-4 py-2 bg-gray-500 text-white rounded-full cursor-pointer"
              >
                X
              </button>
              <h2 className="text-2xl font-bold mb-4">
                {selectedPerson.name} {selectedPerson.activityName} 報名資訊
              </h2>

              <div className="overflow-x-auto">
                <table className="min-w-max table-auto border-collapse">
                  <thead>
                    <tr>
                      {Object.entries(selectedPerson)
                        .filter(([key]) => !(PAYMENT_EXCLUDED_KEYS as readonly string[]).includes(key))
                        .map(([key]) => (
                          <th className="px-4 py-2 border" key={`th-${key}`}>
                            {formatKey(key, PAYMENT_KEY_MAP)}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {Object.entries(selectedPerson)
                        .filter(([key]) => !(PAYMENT_EXCLUDED_KEYS as readonly string[]).includes(key))
                        .map(([key, value]) => (
                          <td key={`td-${key}`} className="px-4 py-2 border">
                            {JSON.stringify(value) || ""}
                          </td>
                        ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => markAsPaid(selectedPerson)}
                className={`my-4 cursor-pointer block mx-auto px-4 py-2 rounded-lg ${
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
            </div>
          </div>
        )}
      </div>
    </>
  );
}
