"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_SOURCES } from "@/lib/lead-sources";

import { addEnquiryAction, type AddEnquiryState } from "../actions";

const initial: AddEnquiryState = { error: null };

export function AddEnquiryForm() {
  const [state, action, pending] = useActionState(addEnquiryAction, initial);
  // The browser's zone offset, written after mount so server and client renders match.
  const offsetRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (offsetRef.current) offsetRef.current.value = String(new Date().getTimezoneOffset());
  }, []);

  return (
    <form action={action} className="space-y-4">
      <input ref={offsetRef} type="hidden" name="tz_offset" defaultValue="0" />

      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lead_source">Where it came from</Label>
          <NativeSelect id="lead_source" name="lead_source" defaultValue="Facebook group">
            {LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="received_at">When they got in touch</Label>
          <Input id="received_at" name="received_at" type="datetime-local" />
          <p className="text-xs text-muted-foreground">Leave blank for right now.</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="business_name">Business</Label>
        <Input id="business_name" name="business_name" autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="off" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">What they asked for</Label>
        <Textarea id="message" name="message" rows={4} placeholder="Paste the post or message, or a line on what they need." />
      </div>

      <FormMessage error={state.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : "Save lead"}
      </Button>
    </form>
  );
}
