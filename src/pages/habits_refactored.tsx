import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import BibleVerseLoader from "../components/BibleVerseLoader";
import { Button, Select, Modal, Alert } from "../components/ui";
import { PersonCard, PersonTable, SearchInput, EmptyState, PersonData } from "../components/shared";

interface Person {
  uid: string;
  name: string;
  phone: string;
  group: string;
  team: string;
  activityPrice: number;
  已繳費?: string;
}

interface Activity {
  activityName: string;
  activityId: string;
  activityPrice: number;
  data: Person[];
}

type PersonWithActivity = PersonData & {
  uid: string;
  activityName: string;
  activityId: string;
  activityPrice: number;
  已繳費?: string;
};

const EXCLUDED_KEYS = ["uid", "activityName", "activityId", "activityPrice"];
const KEY_MAP = {
  name: "姓名",
  phone: "電話",
  team: "小組",
  group: "團契",
} as const;

const LOADING_VERSES = ["初次載入，請稍等..."];
const SUBMITTING_VERSES = ["繳費記錄中，請稍等..."];
const FORM_URL = "https://script.google.com/macros/s/AKfycbxWdpuLM5VSCFJlo5hW27t6silbjwuwOP1jSDY-xexw8tsYLjCgaB-CM8cVDR8sVWwU/exec";

const HANDLER_OPTIONS = [
  "請選經手人",
  "又藺",
  "璧瑄",
  "若望",
  "玉榕",
  "宥辰",
  "芳瑜",
  "皓軒",
];

export default function PaymentSearch() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [handler, setHandler] = useState("請選擇經手人");
  const [paidUids, setPaidUids] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonWithActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredPersons = useMemo(() => {
    const allPersons = activities.flatMap((activity) => 
      activity.data.map((person): PersonWithActivity => ({
        ...person,
        activityName: activity.activityName,
        activityId: activity.activityId,
        activityPrice: activity.activityPrice,
      }))
    );

    if (!query.trim()) return allPersons;
    
    const searchTerm = query.toLowerCase().trim();
    
    return allPersons.filter((person) => {
      return (
        person.name.toLowerCase().includes(searchTerm) ||
        person.phone.includes(query) ||
        person.team?.toLowerCase().includes(searchTerm) ||
        person.group?.toLowerCase().includes(searchTerm) ||
        person.activityName.toLowerCase().includes(searchTerm)
      );
    });
  }, [activities, query]);

  const markAsPaid = useCallback(async (person: PersonWithActivity) => {
    if (handler === "請選擇經手人") {
      setError("請選擇經手人");
      return;
    }
    
    if (paidUids.has(person.uid) || person["已繳費"]) {
      setError("此學員已經繳費");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(FORM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({
          activityName: person.activityName,
          name: person.name,
          handler: handler,
          price: person.activityPrice,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setPaidUids((prev) => new Set(prev).add(person.uid));
      setSelectedPerson(null);
      setError(null);
      
      // Show success message
      setSuccessMessage(`✅ ${person.name} 繳費記錄已成功更新`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`網路錯誤：${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  }, [handler, paidUids]);

  useEffect(() => {
    const fetchActivities = async () => {
      setError(null);
      
      try {
        const response = await fetch(FORM_URL);
        
        if (!response.ok) {
          throw new Error(`載入失敗: HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
          throw new Error("資料格式不正確");
        }
        
        setActivities(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "載入失敗";
        setError(errorMessage);
        console.error("載入失敗", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedPerson(null);
    setError(null);
    setSuccessMessage(null);
  }, []);
  
  const handlerOptions = HANDLER_OPTIONS.map(option => ({
    value: option,
    label: option,
  }));

  if (loading) return <BibleVerseLoader verses={LOADING_VERSES} />;
  if (submitting) return <BibleVerseLoader verses={SUBMITTING_VERSES} />;
  
  if (error && !activities.length) {
    return (
      <div className="max-w-xl mx-auto p-4">
        <Alert 
          variant="error" 
          title="載入錯誤"
          onClose={() => window.location.reload()}
        >
          <p>{error}</p>
          <Button 
            variant="danger"
            size="sm"
            onClick={() => window.location.reload()} 
            className="mt-3"
          >
            重新載入
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>豐生活 卓越養成計劃 報名與繳費記錄查詢</title>
      </Helmet>
      <div className="max-w-xl mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            豐生活 卓越養成計劃 報名與繳費記錄查詢
          </h1>
          <div className="w-1/3">
            <Select
              options={handlerOptions}
              value={handler}
              onChange={(e) => setHandler(e.target.value)}
            />
          </div>
        </div>

        <SearchInput
          query={query}
          onQueryChange={setQuery}
          placeholder="搜尋姓名、電話、小組、團契、活動名稱（留空顯示全部）"
          resultCount={filteredPersons.length}
          showResultCount={Boolean(query)}
        />

        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert variant="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}
        
        <div className="min-h-[120px] space-y-2">
          {filteredPersons.length === 0 ? (
            <EmptyState 
              title={query ? "查無符合資料" : "所有學員資料"}
              description={query ? "請嘗試其他搜尋關鍵字" : "請輸入搜尋條件來查找特定學員"}
              icon={query ? "🔍" : "👥"}
            />
          ) : (
            filteredPersons.map((person) => (
              <PersonCard
                key={`${person.uid || person.phone || person.name}_${person.activityId || ""}`}
                person={person}
                isPaid={Boolean(person["已繳費"]) || paidUids.has(person.uid)}
                onSelect={() => setSelectedPerson(person)}
              />
            ))
          )}
        </div>

        {selectedPerson && (
          <Modal
            isOpen={true}
            onClose={handleCloseModal}
            title={`${selectedPerson.name} ${selectedPerson.activityName} 報名資訊`}
          >
            <PersonTable 
              person={selectedPerson}
              excludedKeys={EXCLUDED_KEYS}
              keyMap={KEY_MAP}
            />
            
            <div className="mt-6 text-center">
              <Button
                variant={paidUids.has(selectedPerson.uid) || Boolean(selectedPerson["已繳費"]) ? 'success' : 'primary'}
                size="lg"
                loading={submitting}
                disabled={paidUids.has(selectedPerson.uid) || Boolean(selectedPerson["已繳費"])}
                onClick={() => markAsPaid(selectedPerson)}
                className="min-w-[200px]"
              >
                {paidUids.has(selectedPerson.uid) || Boolean(selectedPerson["已繳費"]) ? '✓ 學員已繳費' : '標記為已繳費'}
              </Button>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}