import { useEffect, useState, useMemo } from "react";
import BibleVerseLoader from "../components/BibleVerseLoader";
import { toast } from "react-toastify";

type PersonData = [string, string, string]; // [area, group, name]

type SubmissionPayload = {
  area: string;
  group: string;
  name: string;
  status: boolean;
  message: string;
};

const FORM_URL = "https://script.google.com/macros/s/AKfycbwdGml409OmPizvDARleIGRXQwlmFjdhlWOKXoCw6ep0-gmRACsAS_ZWLGwNcax4SOI7Q/exec";

const BIBLE_VERSES = [
  "凡事都有定期，天下萬務都有定時。 — 傳道書 3:1",
  "你要專心仰賴耶和華，不可倚靠自己的聰明。 — 箴言 3:5",
  "耶和華是我的牧者，我必不致缺乏。 — 詩篇 23:1",
];

export default function TopChurch() {
  const [data, setData] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [allUnselected, setAllUnselected] = useState(false);
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [formMessage, setFormMessage] = useState("");
  const [showAllMode, setShowAllMode] = useState(false);
  const areas = Array.from(new Set(data.map(([area]) => area)));

  const groups = selectedArea
    ? Array.from(
        new Set(
          data
            .filter(([area]) => area === selectedArea)
            .map(([, group]) => group)
        )
      )
    : [];

  const names = useMemo(() => {
    if (showAllMode) {
      return data.map(([, , name]) => name);
    }
    
    return selectedArea && selectedGroup
      ? data
          .filter(([area, group]) => area === selectedArea && group === selectedGroup)
          .map(([, , name]) => name)
      : [];
  }, [data, selectedArea, selectedGroup, showAllMode]);
  
  const allPersonsData = useMemo(() => {
    return data.map(([area, group, name]) => ({ area, group, name }));
  }, [data]);

  const toggleName = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };
  const handleSubmit = async () => {
    setLoading(true);
    
    const payload: SubmissionPayload[] = showAllMode 
      ? allPersonsData.map(({ area, group, name }) => ({
          area,
          group,
          name,
          status: selectedNames.includes(name),
          message: formMessage,
        }))
      : names.map((name) => ({
          area: selectedArea,
          group: selectedGroup,
          name,
          status: selectedNames.includes(name),
          message: formMessage,
        }));

    try {
      const response = await fetch(FORM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      await response.json();
      
      showToast("成功送出！", "success");
      resetForm();
    } catch (error) {
      console.error("送出失敗", error);
      showToast("送出失敗，請稍後再試", "error");
    } finally {
      setLoading(false);
    }
  };
  
  const showToast = (message: string, type: "success" | "error") => {
    const toastConfig = {
      position: "top-center" as const,
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    };
    
    if (type === "success") {
      toast.success(message, toastConfig);
    } else {
      toast.error(message, toastConfig);
    }
  };
  
  const resetForm = () => {
    setSelectedNames([]);
    setSelectedGroup("");
    setSelectedArea("");
    setFormMessage("");
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(FORM_URL);
        const json = await response.json();
        
        const converted: PersonData[] = json
          .map((item: Record<string, string>) => {
            let area = "";
            let group = "";
            const people: string[] = [];

            Object.values(item).forEach((value) => {
              if (!value) return;
              const strValue = String(value);

              if (!area && /^[\u4e00-\u9fa5]+$/.test(strValue)) {
                area = strValue;
              } else if (!group) {
                group = strValue;
              } else if (people.length < 1) {
                people.push(strValue);
              }
            });

            return people.map((name): PersonData => [area, group, name]);
          })
          .flat();

        setData(converted);
      } catch (error) {
        console.error("讀取資料失敗", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) return <BibleVerseLoader verses={BIBLE_VERSES} />;

  return (
    <div className="p-4 max-w-2xl mx-auto bg-gray-50 rounded-xl shadow-lg text-gray-800 font-sans">

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-base font-semibold">
            選擇模式：
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={!showAllMode}
                onChange={() => {
                  setShowAllMode(false);
                  setSelectedNames([]);
                }}
                className="cursor-pointer"
              />
              <span className="text-sm">按牧區組別</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode" 
                checked={showAllMode}
                onChange={() => {
                  setShowAllMode(true);
                  setSelectedArea("");
                  setSelectedGroup("");
                  setSelectedNames([]);
                }}
                className="cursor-pointer"
              />
              <span className="text-sm">顯示全部</span>
            </label>
          </div>
        </div>
        
        {!showAllMode && (
          <>
            <label className="block text-base font-semibold mb-2">
              牧區：
            </label>
            <select
              value={selectedArea}
              onChange={(e) => {
                setSelectedArea(e.target.value);
                setSelectedGroup("");
                setSelectedNames([]);
              }}
              className="w-full px-3 py-2 text-base bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">請選擇牧區</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {!showAllMode && (
        <div className="mb-6">
          <label className="block text-base font-semibold mb-2">
            組別：
          </label>
          <select
            disabled={!selectedArea}
            value={selectedGroup}
            onChange={(e) => {
              setSelectedGroup(e.target.value);
              setSelectedNames([]);
            }}
            className={`w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none transition-colors ${
              !selectedArea
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-white text-black cursor-pointer focus:border-blue-500"
            }`}
          >
            <option value="">請選擇組別</option>
            {groups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-base font-semibold mb-2">
          已完成第四梯次的{showAllMode ? '學員' : '組員'}：
        </label>
        <div className="max-h-96 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-inner py-2">
          {names.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              {showAllMode ? '載入中...' : '請先選擇牧區與組別'}
            </div>
          ) : (
            <>
              <SelectAllOption
                isAllSelected={selectedNames.length === names.length}
                onToggleAll={() => {
                  if (selectedNames.length === names.length) {
                    setSelectedNames([]);
                  } else {
                    setSelectedNames([...names]);
                  }
                }}
                label={showAllMode ? '全部完成' : '全組完成'}
              />
              
              {showAllMode ? (
                allPersonsData.map(({ area, group, name }) => (
                  <div key={`${area}-${group}-${name}`} className="mb-2 px-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                      <input
                        type="checkbox"
                        checked={selectedNames.includes(name)}
                        onChange={() => {
                          if (allUnselected) {
                            setAllUnselected(false);
                          }
                          toggleName(name);
                        }}
                        className="cursor-pointer"
                      />
                      <span>{name}</span>
                      <span className="text-xs text-gray-500">({area} - {group})</span>
                    </label>
                  </div>
                ))
              ) : (
                names.map((name) => (
                  <NameCheckbox
                    key={name}
                    name={name}
                    isSelected={selectedNames.includes(name)}
                    onToggle={() => {
                      if (allUnselected) {
                        setAllUnselected(false);
                      }
                      toggleName(name);
                    }}
                  />
                ))
              )}
              
              <SelectAllOption
                isAllSelected={allUnselected}
                onToggleAll={() => {
                  const nextValue = !allUnselected;
                  setAllUnselected(nextValue);
                  if (nextValue) {
                    setSelectedNames([]);
                  }
                }}
                label={showAllMode ? '全部未完成' : '全組未完成'}
              />
            </>
          )}
        </div>
      </div>
      <div className="mb-8">
        <label className="block text-base font-semibold mb-2">
          備註：
        </label>
        <textarea
          rows={3}
          value={formMessage}
          onChange={(e) => setFormMessage(e.target.value)}
          placeholder="請輸入備註..."
          className="w-full px-3 py-3 text-sm bg-white border border-gray-300 rounded-lg resize-y focus:outline-none focus:border-blue-500 shadow-inner transition-colors"
        />
      </div>

      <button
        onClick={handleSubmit}
        className="w-full py-4 text-lg font-semibold text-white bg-blue-500 border-none rounded-lg cursor-pointer shadow-lg hover:bg-blue-600 hover:shadow-xl transition-all duration-300"
      >
        送出
      </button>
    </div>
  );
}

type SelectAllOptionProps = {
  isAllSelected: boolean;
  onToggleAll: () => void;
  label: string;
};

function SelectAllOption({ isAllSelected, onToggleAll, label }: SelectAllOptionProps) {
  return (
    <div className="mb-3 px-2">
      <label className="flex items-center gap-2 font-semibold cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={onToggleAll}
          className="cursor-pointer"
        />
        {label}
      </label>
    </div>
  );
}

type NameCheckboxProps = {
  name: string;
  isSelected: boolean;
  onToggle: () => void;
};

function NameCheckbox({ name, isSelected, onToggle }: NameCheckboxProps) {
  return (
    <div className="mb-2 px-2">
      <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="cursor-pointer"
        />
        {name}
      </label>
    </div>
  );
}
