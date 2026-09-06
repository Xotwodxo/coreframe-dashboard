"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export interface TodoState {
  error: string | null;
}

function refresh() {
  revalidatePath("/todo");
  revalidatePath("/");
}

export async function addTodoAction(_prev: TodoState, formData: FormData): Promise<TodoState> {
  await requireUser();
  const body = String(formData.get("body") ?? "").trim().slice(0, 500);
  const due = String(formData.get("due_on") ?? "").trim();
  if (!body) return { error: "Write the thing to do." };
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "The date is not valid." };
  const priority = [0, 1, 2, 3].includes(Number(formData.get("priority"))) ? Number(formData.get("priority")) : 0;

  const supabase = await createClient();
  const { error } = await supabase.from("todos").insert({ body, due_on: due || null, priority });
  if (error) {
    console.error("[todo] Add failed.", error.message);
    return { error: "Could not add it." };
  }
  refresh();
  return { error: null };
}

export async function toggleTodoAction(id: string, done: boolean) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("todos").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id);
  refresh();
}

export async function deleteTodoAction(id: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("todos").delete().eq("id", id);
  refresh();
}
