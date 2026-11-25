// src/components/EmptyState.jsx
import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white/70 px-6 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 text-stone-400">
        <Icon className="h-8 w-8" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-stone-800">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-stone-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}