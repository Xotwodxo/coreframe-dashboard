import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";

/** Lives on the navy header, so it is styled for a dark ground. */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        aria-label="Sign out"
        title="Sign out"
        className="text-white/70 hover:bg-white/10 hover:text-white"
      >
        <LogOut />
      </Button>
    </form>
  );
}
