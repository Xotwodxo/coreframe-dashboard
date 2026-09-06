"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

import { addTodoAction, type TodoState } from "./actions";

const initial: TodoState = { error: null };

export function AddTodoForm() {
  const [state, action, pending] = useActionState(addTodoAction, initial);
  const ref = useRef<HTMLFormElement>(null);

  // Clear after a successful add so the next one can be typed straight away.
  useEffect(() => {
    if (!pending && state.error === null) ref.current?.reset();
  }, [pending, state]);

  return (
    <form ref={ref} action={action} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="body" placeholder="What needs doing?" required className="flex-1" autoComplete="off" />
        <Input name="due_on" type="date" className="sm:w-44" aria-label="Due date, optional" />
        <NativeSelect name="priority" defaultValue="0" aria-label="Priority" className="sm:w-36">
          <option value="0">Normal</option>
          <option value="2">High</option>
          <option value="3">Urgent</option>
        </NativeSelect>
        <Button type="submit" disabled={pending}>
          <Plus data-icon="inline-start" />
          Add
        </Button>
      </div>
      <FormMessage error={state.error} />
    </form>
  );
}
