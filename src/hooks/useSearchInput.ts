import { useEffect, useRef, useState } from "react";

export interface SearchInputState {
  query: string;
  setQuery: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  active: number;
  setActive: (fn: number | ((prev: number) => number)) => void;
  ref: React.RefObject<HTMLDivElement | null>;
}

export function useSearchInput(): SearchInputState {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnClickOutside);
    return () => document.removeEventListener("mousedown", closeOnClickOutside);
  }, []);

  return { query, setQuery, open, setOpen, active, setActive, ref };
}
