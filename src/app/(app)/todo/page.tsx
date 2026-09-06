import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TodoItem } from "@/components/ui/todo-item";
import { getDoneTodos, getOpenTodos } from "@/lib/queries";

import { AddTodoForm } from "./add-todo-form";

export const dynamic = "force-dynamic";

export default async function TodoPage() {
  const [open, done] = await Promise.all([getOpenTodos(), getDoneTodos()]);

  return (
    <>
      <PageHeader
        title="To do"
        description={open.length === 0 ? "Nothing outstanding." : `${open.length} outstanding.`}
      />

      <AddTodoForm />

      {open.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="All clear" description="Add anything above. Dated items show on Today when they fall due." />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
          {open.map((todo) => (
            <TodoItem key={todo.id} todo={todo} showDelete />
          ))}
        </ul>
      )}

      {done.length > 0 ? (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground select-none">
            Done recently ({done.length})
          </summary>
          <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
            {done.map((todo) => (
              <TodoItem key={todo.id} todo={todo} showDelete />
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}
