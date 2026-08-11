"use client";

import { Check, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ProgrammeOption = {
  id: string;
  name: string;
  sort_order?: number | null;
  categoryName?: string;
  programmeType?: string;
  stageType?: string;
  genderScope?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: ProgrammeOption[];
  placeholder?: string;
  emptyText?: string;
  closeOnSelect?: boolean;
  clearQueryOnSelect?: boolean;
};

export default function SearchableProgrammeSelect({
  value,
  onChange,
  options,
  placeholder = "Search or select programme...",
  emptyText = "No programmes found",
  closeOnSelect = true,
  clearQueryOnSelect = true,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((item) => item.id === value) || null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return options;

    return options.filter((item) => {
      const text = [
        item.sort_order,
        item.name,
        item.categoryName,
        item.programmeType,
        item.stageType,
        formatStage(item.stageType),
        item.genderScope,
        formatGender(item.genderScope),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(keyword);
    });
  }, [options, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectProgramme(id: string) {
    onChange(id);

    if (clearQueryOnSelect) {
      setQuery("");
    }

    if (closeOnSelect) {
      setOpen(false);
      return;
    }

    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function formatStage(value?: string) {
    if (!value) return "";
    const normalized = String(value).trim().toLowerCase().replace(/[-\s]+/g, "_");
    return normalized.includes("off") ? "Off-stage" : "Stage";
  }

  function formatGender(value?: string) {
    if (!value) return "";

    const normalized = String(value).trim().toLowerCase();

    if (normalized.includes("female") || normalized.includes("girl")) {
      return "Girls";
    }

    if (normalized.includes("male") || normalized.includes("boy")) {
      return "Boys";
    }

    if (normalized.includes("all") || normalized.includes("mixed")) {
      return "All";
    }

    return value;
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex h-14 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm font-bold outline-none transition hover:bg-slate-50 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      >
        <span className="min-w-0 flex-1 truncate text-slate-900">
          {selected
            ? `${selected.sort_order ? `${selected.sort_order}. ` : ""}${selected.name}`
            : placeholder}
        </span>
        <Search size={18} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
          <div className="border-b border-slate-100 p-3">
            <div className="flex h-12 items-center gap-3 rounded-2xl bg-slate-50 px-4 ring-1 ring-slate-100 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-100">
              <Search size={18} className="text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm font-black text-slate-400">
                {emptyText}
              </div>
            ) : (
              filtered.map((item) => {
                const active = item.id === value;
                const meta = [
                  item.categoryName,
                  formatGender(item.genderScope),
                  formatStage(item.stageType),
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectProgramme(item.id)}
                    className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                      active
                        ? "bg-violet-50 ring-1 ring-violet-200"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${
                        active
                          ? "bg-violet-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {active ? <Check size={16} /> : item.sort_order || "#"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-950">
                        {item.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-bold capitalize text-slate-500">
                        {meta || "Programme"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black text-slate-500">
            Showing {filtered.length} of {options.length} programmes
          </div>
        </div>
      )}
    </div>
  );
}
