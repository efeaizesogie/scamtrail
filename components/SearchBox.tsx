"use client";
import { FormEvent, forwardRef, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { detect, EXAMPLES, InputType } from "@/lib/detect";
import { PixelGlyph } from "./Glyph";

export type SearchState = { type: InputType | null; submitted: boolean; value: string };

type Props = {
  onChange?: (s: SearchState) => void;
  showChips?: boolean;
  /** Visible label text above the field. Hidden visually when omitted. */
  label?: string;
  /** Prefills the field, e.g. on the report page. */
  initial?: string;
};

/** Where a search goes: the report page, with the detected type as a hint. */
export function reportHref(value: string, type: InputType) {
  return `/report?${new URLSearchParams({ q: value.trim(), type })}`;
}

const TYPE_LABEL: Record<InputType, string> = {
  HANDLE: "HANDLE",
  "EVM ADDRESS": "EVM ADDRESS",
  CONTRACT: "CONTRACT",
  DOMAIN: "DOMAIN",
  PROJECT: "PROJECT NAME",
};

export const SearchBox = forwardRef<HTMLDivElement, Props>(function SearchBox({ onChange, showChips = false, label, initial = "" }, fieldRef) {
  const id = useId();
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [value, setValue] = useState(initial);
  const [hint, setHint] = useState<InputType | null>(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const det = value.trim() ? detect(value, hint) : null;
  const type = det?.type ?? null;

  useEffect(() => {
    onChange?.({ type, submitted: submitted !== null && submitted === value, value });
  }, [type, submitted, value, onChange]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const d = detect(value, hint);
    if (!d.ok) {
      setError(d.error);
      setSubmitted(null);
      return;
    }
    setError("");
    setSubmitted(value);
    // Let the connector turn solid before the report page takes over.
    clearTimeout(timer.current);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = setTimeout(() => router.push(reportHref(d.value, d.type)), reduced ? 0 : 450);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const done = submitted !== null && submitted === value;

  return (
    <div className="w-full">
      <form onSubmit={submit} noValidate className="w-full" role="search">
        <label htmlFor={`${id}-q`} className={label ? "t-micro mb-3 block text-text-muted" : "visually-hidden"}>
          {label ?? "Search a handle, address, domain or project name"}
        </label>
        <div ref={fieldRef} className="flex w-full flex-col gap-2 sm:flex-row">
          <div className={`relative flex min-h-[56px] flex-1 items-center rounded-tag border bg-canvas transition-colors focus-within:border-text ${error ? "border-text" : "hairline-strong"}`}>
            <input
              id={`${id}-q`}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setHint(null);
                if (error) setError("");
              }}
              placeholder="X handle, token address, wallet or website"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${id}-err ${id}-type`}
              className="h-14 w-full min-w-0 bg-transparent pl-4 pr-3 text-body text-text placeholder:text-text-muted focus:outline-none"
            />
            {type && (
              <span className="t-micro mr-3 shrink-0 whitespace-nowrap rounded-tag border border-line/30 px-2 py-1 text-text-muted" aria-hidden="true">
                {TYPE_LABEL[type]}
              </span>
            )}
          </div>
          <button type="submit" className="btn-primary h-14 shrink-0 px-6">
            <PixelGlyph />
            INVESTIGATE
          </button>
        </div>
        <p id={`${id}-type`} className="visually-hidden" aria-live="polite">
          {type ? `Detected input type: ${TYPE_LABEL[type].toLowerCase()}.` : ""}
        </p>
        <p id={`${id}-err`} role="alert" className={`mt-2 min-h-[20px] text-left text-small ${error ? "text-text" : "text-text-muted"}`}>
          {error
            ? <span className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-[1.5px] w-4 border-t-[1.5px] border-dotted border-text" />{error}</span>
            : done
              ? "Opening the report."
              : ""}
        </p>
      </form>
      {showChips && (
        <ul className="mt-2 flex flex-wrap justify-center gap-2" aria-label="Example searches">
          {EXAMPLES.map((ex) => (
            <li key={ex.chip}>
              <button type="button" className="btn-ghost min-h-[44px] px-3"
                onClick={() => {
                  setValue(ex.value);
                  setHint(ex.type);
                  setError("");
                  setSubmitted(null);
                }}>
                {ex.chip}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
