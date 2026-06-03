export const API_ENDPOINTS = {
  TOP_CHURCH:
    "https://script.google.com/macros/s/AKfycbw5R_BtMYgk1ysy25UsTKY35Xenl-QbPZ6QmefrOAUGLZdibClzrT56RDb4le2JPd8/exec",
  HABITS:
    "https://script.google.com/macros/s/AKfycbxWdpuLM5VSCFJlo5hW27t6silbjwuwOP1jSDY-xexw8tsYLjCgaB-CM8cVDR8sVWwU/exec",
  SUBMIT:
    "https://script.google.com/macros/s/AKfycbzmQ7dcz_wT0O70HKI5WFZnrV_viVziy0Rrlq7J51FSwbwBt9mYI1V0C2URcOhCe3xZ_w/exec",
  SIXTH_SUBMIT:
    "https://script.google.com/macros/s/AKfycby-mqLXHznwVT4vSjnCaRw3c6neHtKYFaD6oN0mwqHddQdIHUHCZqBaBNMTy8EQmAQ/exec",
  LEADERBOARD:
    "https://script.google.com/macros/s/AKfycbwFsXCKwNEDgDglJNPDtjNe8CTd-x-pScfj-VhMSBIlYUwYpC0F6g7J36_tM69Rw7Xz/exec",
} as const;

export const TOP_CHURCH_HANDLERS = [
  "請選擇經手人",
  "又藺",
  "若芸",
  "璧瑄",
  "若望",
  "玉榕",
  "宥辰",
  "芳瑜",
  "皓軒",
  "佳璇",
  "姿吟",
] as const;

export const HABITS_HANDLERS = [
  "請選經手人",
  "又藺",
  "璧瑄",
  "若望",
  "玉榕",
  "宥辰",
  "芳瑜",
  "皓軒",
] as const;

export const BIBLE_VERSES = [
  "凡事都有定期，天下萬務都有定時。 — 傳道書 3:1",
  "你要專心仰賴耶和華，不可倚靠自己的聰明。 — 箴言 3:5",
  "耶和華是我的牧者，我必不致缺乏。 — 詩篇 23:1",
] as const;

export const LOADING_VERSES = {
  INITIAL: ["初次載入，請稍等..."],
  SUBMITTING: ["繳費記錄中，請稍等..."],
} as const;

export const SESSION_LABELS = [
  "第一次",
  "第二次",
  "第三次",
  "第四次",
  "第五次",
  "第六次",
] as const;

export const SPECIAL_SESSIONS = [4, 5, 6] as const;

export const SESSION_ROMAN = ["I", "II", "III", "IV", "V", "VI"] as const;

export const ATTENDANCE_STATUS = {
  NOT_REGISTERED: "尚報名",
  CHECKED: "✓",
  CROSSED: "✗",
} as const;

export const BADGE_SIZE = 40;

export const PINK_BADGE_URL = (n: number): string =>
  `/topchurch_pink_svg_badges/topchurch_badge_${SESSION_ROMAN[n - 1]}_pink.svg`;

export const COLOR_BADGE_URL = (n: number): string =>
  `/topchurch_color_svg_badges/topchurch_badge_${SESSION_ROMAN[n - 1]}_color.svg`;

export const PAYMENT_KEY_MAP: Record<string, string> = {
  name: "姓名",
  phone: "電話",
  team: "小組",
  group: "團契",
};

export const PAYMENT_EXCLUDED_KEYS = [
  "uid",
  "activityName",
  "activityId",
  "activityPrice",
] as const;
