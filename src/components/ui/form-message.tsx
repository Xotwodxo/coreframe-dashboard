/** The one way a form reports back: red for a problem, green for done. */
export function FormMessage({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (error) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
      >
        {error}
      </p>
    );
  }
  if (ok) {
    return (
      <p role="status" className="rounded-lg border border-good/30 bg-good/10 px-3 py-2 text-sm text-good">
        {ok}
      </p>
    );
  }
  return null;
}
