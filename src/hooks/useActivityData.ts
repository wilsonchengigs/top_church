import { useEffect, useState } from "react";
import type { Activity } from "../types";
import { fetchActivities } from "../services/api";

interface UseActivityDataResult {
  activities: Activity[];
  loading: boolean;
}

export function useActivityData(url: string): UseActivityDataResult {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities(url)
      .then(setActivities)
      .catch((err) => console.error("載入失敗", err))
      .finally(() => setLoading(false));
  }, [url]);

  return { activities, loading };
}
