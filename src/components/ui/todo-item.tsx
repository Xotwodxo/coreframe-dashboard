"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { daysUntil, formatDate } from "@/lib/format";
import type { Todo } from "@/lib/types";
import { cn } from "@/lib/utils";

import { deleteTodoAction, toggleTodoAction } from "@/app/(app)/todo/actions";

/** One line with a big tick target. Ticking is the whole interaction. */
export function TodoItem({ todo, showDelete = false }: { todo: Todo; showDelete?: boolean }) {
  const [pending, start] = useTransition();
  const done = Boolean(todo.done_at);
  const days = todo.due_on && !done ? daysUntil(todo.due_on) : null;

  return (
    <li className={cn("flex items-center gap-3 px-3 py-2", pending && "opacity-60")}>
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={done}
          onChange={(e) => start(() => toggleTodoAction(todo.id, e.target.checked))}
          className="size-6 shrink-0 accent-[var(--cyan-action)]"
          aria-label={done ? "Mark not done" : "Mark done"}
        />
        <span className="min-w-0">
          <span className={cn("block text-sm", done && "text-muted-foreground line-through")}>{todo.body}</span>
          {todo.due_on ? (
            <span
              className={cn(
                "block text-xs",
                done ? "text-muted-foreground" : days !== null && days < 0 ? "text-bad" : days === 0 ? "text-warn" : "text-muted-foreground"
              )}
            >
              {done
                ? `Done ${formatDate(todo.done_at)}`
                : days !== null && days < 0
                  ? `Due ${formatDate(todo.due_on)}, ${-days} ${days === -1 ? "day" : "days"} ago`
                  : days === 0
                    ? "Due today"
                    : days === 1
                      ? "Due tomorrow"
                      : `Due ${formatDate(todo.due_on)}`}
            </span>
          ) : done ? (
            <span className="block text-xs text-muted-foreground">Done {formatDate(todo.done_at)}</span>
          ) : null}
        </span>
      </label>
      {showDelete ? (
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Delete this item?")) start(() => deleteTodoAction(todo.id));
          }}
          className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
          aria-label="Delete"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      ) : null}
    </li>
  );
}
