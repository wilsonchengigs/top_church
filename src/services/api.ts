import type { Activity, AttendancePerson, LeaderEntry } from "../types";

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function postJson<TBody, TResponse>(
  url: string,
  body: TBody
): Promise<{ status: number; data: TResponse }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(body),
  });
  const data: TResponse = await res.json();
  return { status: res.status, data };
}

export function fetchActivities(url: string): Promise<Activity[]> {
  return fetchJson<Activity[]>(url);
}

export async function fetchAttendancePeople(url: string): Promise<AttendancePerson[]> {
  const data = await fetchJson<{ people?: AttendancePerson[] }>(url);
  return data.people ?? [];
}

export async function fetchLeaderboard(url: string): Promise<LeaderEntry[]> {
  const data = await fetchJson<{ scores?: LeaderEntry[] }>(url);
  return data.scores ?? [];
}

export async function saveLeaderboardScore(
  url: string,
  name: string,
  score: number
): Promise<void> {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ name, score }),
  });
}
