"use client";

import {
  ClipboardEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Lock, ShieldCheck, XCircle } from "lucide-react";

const LAUNCH_PIN = "2026";
const PIN_LENGTH = 4;

export default function LaunchPage() {
  const router = useRouter();
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [isOpening, setIsOpening] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const pinValue = pin.join("");

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function openPortal(value = pinValue) {
    if (isOpening) return;

    if (value.length !== PIN_LENGTH) {
      setError("Please enter the 4 digit launch PIN.");
      return;
    }

    if (value === LAUNCH_PIN) {
      setError("");
      setIsOpening(true);
      localStorage.setItem("launch_access", "yes");

      window.setTimeout(() => {
        router.push("/?launch=success");
      }, 600);
      return;
    }

    setError("Incorrect PIN. Please try again.");
    setPin(Array(PIN_LENGTH).fill(""));
    inputRefs.current[0]?.focus();
  }

  function updatePin(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);

    setError("");

    const nextPin = [...pin];
    nextPin[index] = digit;
    setPin(nextPin);

    if (digit && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const nextValue = nextPin.join("");

    if (nextValue.length === PIN_LENGTH) {
      window.setTimeout(() => openPortal(nextValue), 120);
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < PIN_LENGTH - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();

    const pastedDigits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, PIN_LENGTH)
      .split("");

    if (pastedDigits.length === 0) return;

    const nextPin = Array(PIN_LENGTH).fill("");
    pastedDigits.forEach((digit, index) => {
      nextPin[index] = digit;
    });

    setError("");
    setPin(nextPin);

    const nextFocusIndex = Math.min(pastedDigits.length, PIN_LENGTH - 1);
    inputRefs.current[nextFocusIndex]?.focus();

    const nextValue = nextPin.join("");

    if (nextValue.length === PIN_LENGTH) {
      window.setTimeout(() => openPortal(nextValue), 120);
    }
  }

  function clearPin() {
    setPin(Array(PIN_LENGTH).fill(""));
    setError("");
    inputRefs.current[0]?.focus();
  }

  return (
    <main className="bg-[#fbf6ea] px-4 py-8 text-slate-900 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-[2rem] border border-amber-100 bg-white shadow-2xl shadow-slate-900/10">
          <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 px-5 py-6 text-white sm:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-amber-300/20 text-amber-200 ring-1 ring-white/15">
                <Lock size={28} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-100">
                  Launch Access
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-4xl">
                  Enter 4 digit PIN
                </h1>
              </div>
            </div>
          </div>

          <div className="px-5 py-7 sm:px-8 sm:py-8">
            <div className="rounded-[1.5rem] border border-amber-100 bg-[#fffaf0] p-5">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                  <ShieldCheck size={20} />
                </div>

                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-800">
                    SSF Kasaragod Division
                  </p>
                  <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                    This page is for controlled launch access before opening the
                    live result portal publicly.
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                openPortal();
              }}
              className="mt-7"
            >
              <div className="flex justify-center gap-3 sm:gap-4">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(input) => {
                      inputRefs.current[index] = input;
                    }}
                    value={digit}
                    onChange={(event) => updatePin(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    onPaste={handlePaste}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    disabled={isOpening}
                    aria-label={`PIN digit ${index + 1}`}
                    className="h-16 w-16 rounded-2xl border-2 border-amber-100 bg-white text-center text-2xl font-black text-emerald-950 shadow-lg shadow-slate-900/5 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100 disabled:opacity-60 sm:h-20 sm:w-20 sm:rounded-3xl sm:text-3xl"
                  />
                ))}
              </div>

              {error && (
                <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  <XCircle size={18} />
                  {error}
                </div>
              )}

              <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto]">
                <button
                  type="submit"
                  disabled={isOpening}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-700 px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-xl shadow-emerald-900/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isOpening ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <ArrowRight size={18} />
                  )}
                  {isOpening ? "Opening..." : "Open Portal"}
                </button>

                <button
                  type="button"
                  onClick={clearPin}
                  disabled={isOpening}
                  className="inline-flex items-center justify-center rounded-2xl border border-amber-100 bg-white px-5 py-4 text-sm font-black text-slate-600 shadow-lg shadow-slate-900/5 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear
                </button>
              </div>
            </form>

            <p className="mt-6 text-center text-xs font-bold text-slate-400">
              Official result publishing access only
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
