"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, X } from "lucide-react";
import { uiText } from "./customer-preferences";

type Prompt = { title: string; message: string; confirm: boolean; resolve: (answer: boolean) => void };
const Context = createContext<(title: string, message: string, confirm?: boolean) => Promise<boolean>>(() => Promise.resolve(false));

export function CustomerDialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Prompt[]>([]);
  const ref = useRef<HTMLDialogElement>(null);
  const active = queue[0];
  useEffect(() => { if (active && !ref.current?.open) ref.current?.showModal(); }, [active]);
  function close(answer: boolean) {
    active?.resolve(answer);
    ref.current?.close();
    setQueue((current) => current.slice(1));
  }
  return <Context.Provider value={(title, message, confirm = false) => new Promise((resolve) => setQueue((current) => [...current, { title, message, confirm, resolve }]))}>
    {children}
    {active ? <dialog ref={ref} onCancel={(event) => { event.preventDefault(); close(false); }} className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-lg border border-amber-200 bg-white p-6 text-[#102642] shadow-xl backdrop:bg-black/40">
      <button title={uiText("Close")} onClick={() => close(false)} className="absolute right-3 top-3 p-2"><X size={20} /></button>
      <AlertCircle className="mb-4 text-amber-500" size={36} />
      <h2 className="text-xl font-bold">{uiText(active.title)}</h2>
      <p className="my-5 whitespace-pre-wrap text-sm leading-6">{uiText(active.message)}</p>
      <div className="flex justify-end gap-3">
        {active.confirm ? <button className="rounded-lg border px-5 py-3 font-bold" onClick={() => close(false)}>{uiText("Cancel")}</button> : null}
        <button autoFocus className="rounded-lg bg-amber-500 px-5 py-3 font-bold" onClick={() => close(true)}>{uiText(active.confirm ? "Confirm" : "OK")}</button>
      </div>
    </dialog> : null}
  </Context.Provider>;
}

export const useCustomerDialog = () => useContext(Context);
