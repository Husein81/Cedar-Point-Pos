import { Shad, cn } from "@repo/ui";

type Props = {
  name: string;
  className?: string;
};

// Offline-desktop has no network access by design (see CSP img-src in
// index.html) — @repo/ui's Avatar falls back to a remote dicebear image,
// which this app must never request. Renders the initial locally instead.
export function InitialsAvatar({ name, className }: Props) {
  return (
    <Shad.Avatar className={cn("rounded-lg size-8", className)}>
      <Shad.AvatarFallback>
        {name.charAt(0).toUpperCase() || "U"}
      </Shad.AvatarFallback>
    </Shad.Avatar>
  );
}
