"use client";

import { useActionState } from "react";
import { CalendarDays, Check, Plus, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import {
  adjustAllowanceAction,
  completeRequestAction,
  createRequestAction,
  scheduleRequestAction,
  type ActionState,
} from "../actions";

const initial: ActionState = { error: null };

export function NewRequestForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(createRequestAction, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="client_id" value={clientId} />
      <div className="space-y-2">
        <Label htmlFor="description">What have they asked for?</Label>
        <Textarea id="description" name="description" rows={2} required placeholder="Swap the hero photo for the new van" />
      </div>
      <FormMessage error={state.error} ok={state.ok} />
      <Button type="submit" variant="outline" disabled={pending}>
        <Plus data-icon="inline-start" />
        {pending ? "Logging..." : "Log request"}
      </Button>
    </form>
  );
}

export function ScheduleForm({ id, clientId, current }: { id: string; clientId: string; current: string | null }) {
  const [state, action, pending] = useActionState(scheduleRequestAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="client_id" value={clientId} />
      <div className="space-y-1">
        <Label htmlFor={`sched-${id}`} className="text-xs text-muted-foreground">
          Schedule for
        </Label>
        <Input id={`sched-${id}`} name="scheduled_for" type="date" defaultValue={current ?? undefined} className="w-44" required />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        <CalendarDays data-icon="inline-start" />
        {current ? "Move" : "Schedule"}
      </Button>
      {state.error ? <p className="w-full text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}

export function CompleteForm({ id, clientId, hasAllowance }: { id: string; clientId: string; hasAllowance: boolean }) {
  const [state, action, pending] = useActionState(completeRequestAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="client_id" value={clientId} />
      <div className="space-y-1">
        <Label htmlFor={`mins-${id}`} className="text-xs text-muted-foreground">
          Minutes spent
        </Label>
        <Input id={`mins-${id}`} name="minutes_spent" inputMode="numeric" pattern="[0-9]*" className="w-28" required placeholder="25" />
      </div>
      <Button type="submit" disabled={pending}>
        <Check data-icon="inline-start" />
        {pending ? "Saving..." : hasAllowance ? "Done, debit" : "Done"}
      </Button>
      {state.error ? <p className="w-full text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}

export function AdjustForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(adjustAllowanceAction, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="client_id" value={clientId} />
      <div className="grid gap-3 sm:grid-cols-[8rem_8rem_1fr]">
        <div className="space-y-1">
          <Label htmlFor="adj-type" className="text-xs text-muted-foreground">
            Direction
          </Label>
          <NativeSelect id="adj-type" name="type" defaultValue="credit">
            <option value="credit">Add</option>
            <option value="debit">Take</option>
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="adj-minutes" className="text-xs text-muted-foreground">
            Minutes
          </Label>
          <Input id="adj-minutes" name="minutes" inputMode="numeric" pattern="[0-9]*" required placeholder="30" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="adj-note" className="text-xs text-muted-foreground">
            Why
          </Label>
          <Input id="adj-note" name="note" required placeholder="Goodwill for the launch delay" />
        </div>
      </div>
      <FormMessage error={state.error} ok={state.ok} />
      <Button type="submit" variant="outline" disabled={pending}>
        <Scale data-icon="inline-start" />
        {pending ? "Recording..." : "Record adjustment"}
      </Button>
    </form>
  );
}
