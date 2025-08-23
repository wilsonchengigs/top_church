import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import BibleVerseLoader from "../components/BibleVerseLoader";
import toast, { Toaster } from "react-hot-toast";
type Person = {
  uid: string;
  name: string;
  phone: string;
  group: string;
  team: string;
  activityPrice: number;
  已繳費?: string; // 新增 "已繳費" 欄位
};

type Activity = {
  activityName: string;
  activityId: string;
  activityPrice: number;
  data: Person[];
};

export default function PaymentSearch() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [handler, setHandler] = useState("請選擇經手人");
  // 紀錄已標記繳費的uid集合
  const [paidUids, setPaidUids] = useState<Set<string>>(new Set());
  // 紀錄已取得樹的name集合
  const [treeRetrievedNames, setTreeRetrievedNames] = useState<Set<string>>(
    new Set()
  );
  // 紀錄正在送出的uid集合（loading狀態）
  const [submitting, setSubmitting] = useState(false);
  // 選擇查看某個學員的詳細資料
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  // 自訂繳費金額
  const [customAmount, setCustomAmount] = useState<number | null>(null);
  const excludedKeys = ["uid", "activityName", "activityId", "activityPrice"];
  const keyMap = {
    name: "姓名",
    phone: "電話",
    team: "小組",
    group: "團契",
  };
  const firstSightVerses = ["初次載入，請稍等..."];
  const submittingVerses = ["繳費記錄中，請稍等..."];
  const formUrl =
    "https://script.google.com/macros/s/AKfycbw5R_BtMYgk1ysy25UsTKY35Xenl-QbPZ6QmefrOAUGLZdibClzrT56RDb4le2JPd8/exec";

  // 經手人配置
  const hadlerConfig = [
    "請選擇經手人",
    "又藺",
    "璧瑄",
    "若望",
    "玉榕",
    "宥辰",
    "芳瑜",
    "皓軒",
  ];
  // 過濾出符合查詢條件的學員
  const filtered = activities
    .map((activity) => {
      return activity.data
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
        }));
    })
    .reduce((acc, curr) => acc.concat(curr), []);

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // 如果不是有效日期，返回原始字串
    return date.toLocaleDateString("en-US"); // 格式化為 MM/DD
  }
  async function markAsPaid(
    person: Person & { activityName: string },
    mode?: string
  ) {
    if (handler === "請選擇經手人") {
      toast.error("請選擇經手人");
      return;
    }
    console.log(person);
    const requestMode = mode || "paid";
    setSubmitting(true);
    try {
      const res = await fetch(`${formUrl}?mode=${requestMode}`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({
          activityName: person.activityName,
          name: person.name,
          handler: handler,
          price: customAmount || person.activityPrice,
        }),
      });
      const data = await res.json();
      if (res.status === 200) {
        if (requestMode === "paid") {
          setPaidUids((prev) => new Set(prev).add(person.uid));
        } else if (requestMode === "tree") {
          setTreeRetrievedNames((prev) => new Set(prev).add(person.name));
        }
        toast.success(data.message);
        setSelectedPerson(null);
        setCustomAmount(null);
      } else {
        toast.error(
          `${requestMode === "tree" ? "Get tree" : "繳費"}失敗：` + data.message
        );
      }
    } catch (error) {
      toast.error("網路錯誤：" + error);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    fetch(formUrl)
      .then((res) => res.json())
      .then((data) => {
        setActivities(data); // 設定資料到 state
      })
      .catch((err) => console.error("載入失敗", err))
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <BibleVerseLoader verses={firstSightVerses} />;
  if (submitting) return <BibleVerseLoader verses={submittingVerses} />;

  return (
    <>
      <Helmet>
        <title>Top Church 報名與繳費記錄查詢</title>
      </Helmet>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            iconTheme: {
              primary: "#4ade80",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
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
              {hadlerConfig.map((handler) => (
                <option key={handler} value={handler}>
                  {handler}
                </option>
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
            {filtered.map((person) => (
              <div
                key={`${person.uid || person.phone || person.name}_${
                  person.activityId || ""
                }_${person.name}`}
                className="flex justify-between items-center p-3 border rounded-lg bg-white shadow-sm hover:shadow-md transition"
              >
                <div>
                  <p className="font-medium text-gray-900">{person.name}</p>
                  <p className="text-sm text-gray-500">
                    📱 {person.phone} ｜ 🏷️ {person.team} ｜ 📘{" "}
                    {person.activityName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedPerson(person);
                    setCustomAmount(person.activityPrice);
                  }} // 顯示詳細資料
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

          {/* 彈出詳細資料視窗 */}
          {selectedPerson && (
            <div 
              className="fixed inset-0 bg-black/30 flex justify-center items-center z-50"
              onClick={() => {
                setSelectedPerson(null);
                setCustomAmount(null);
              }}
            >
              <div 
                className="bg-white p-6 rounded-lg max-w-4xl w-full shadow-lg relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setSelectedPerson(null);
                    setCustomAmount(null);
                  }}
                  className="absolute top-2 right-2 px-4 py-2 bg-gray-500 text-white rounded-full cursor-pointer"
                >
                  X
                </button>
                <h2 className="text-2xl font-bold mb-4">
                  {selectedPerson.name} {selectedPerson.activityName} 報名資訊{" "}
                </h2>

                {/* 垂直表格容器 */}
                <div className="overflow-auto max-h-96">
                  <table className="w-full table-auto border-collapse">
                    <tbody>
                      {/* 渲染 selectedPerson 的資料 */}
                      {Object.entries(selectedPerson)
                        .filter(([key]) => !excludedKeys.includes(key))
                        .map(([key, value]) => {
                          const formattedKey =
                            key && !isNaN(Date.parse(key))
                              ? formatDate(key)
                              : key;
                          return (
                            <tr key={`row-${key}`}>
                              <th className="px-4 py-2 border text-left bg-gray-100">
                                {keyMap[formattedKey as keyof typeof keyMap] ||
                                  formattedKey}
                              </th>
                              <td className="px-4 py-2 border">
                                {JSON.stringify(value) || ""}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* 自訂金額輸入框 */}
                <div className="flex items-center justify-center gap-2 my-4">
                  <label className="text-gray-700 font-medium">繳費金額:</label>
                  <input
                    type="number"
                    value={customAmount || ""}
                    onChange={(e) => setCustomAmount(Number(e.target.value))}
                    className="w-32 p-2 border border-gray-400 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500"
                    placeholder="輸入金額"
                  />
                </div>

                {/* 按鈕容器 */}
                <div className="flex flex-row justify-center gap-4 my-4">
                  {/* 已繳費按鈕 */}
                  <button
                    onClick={() => markAsPaid(selectedPerson)}
                    className={`cursor-pointer px-4 py-2 rounded-lg 
                          ${
                            paidUids.has(selectedPerson.uid) ||
                            selectedPerson["已繳費"]
                              ? "bg-amber-900 text-white disabled:opacity-50 disabled:cursor-not-allowed" // 已繳費
                              : "bg-blue-500 text-white hover:bg-blue-600"
                          } // 未繳費
                        `}
                    disabled={
                      paidUids.has(selectedPerson.uid) ||
                      selectedPerson["已繳費"]
                    } // 按鈕禁用已繳費學員
                  >
                    {paidUids.has(selectedPerson.uid) ||
                    selectedPerson["已繳費"]
                      ? "學員已繳費"
                      : "標記為已繳費"}
                  </button>

                  {/* Get Tree 按鈕 - 只在特定條件下顯示 */}
                  {selectedPerson.activityName === "日日有光_程式用" &&
                    (paidUids.has(selectedPerson.uid) ||
                      selectedPerson["已繳費"]) && (
                      <button
                        onClick={() => markAsPaid(selectedPerson, "tree")}
                        className={`cursor-pointer px-4 py-2 rounded-lg ${
                          treeRetrievedNames.has(selectedPerson.name) ||
                          selectedPerson["已領樹"]
                            ? "bg-gray-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            : "bg-green-500 text-white hover:bg-green-600"
                        }`}
                        disabled={
                          treeRetrievedNames.has(selectedPerson.name) ||
                          selectedPerson["已領樹"]
                        } // 禁用已取得樹的學員
                      >
                        {treeRetrievedNames.has(selectedPerson.name) ||
                        selectedPerson["已領樹"]
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
