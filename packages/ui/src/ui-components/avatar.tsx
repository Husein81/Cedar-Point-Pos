import { Shad } from "../components";
import { cn } from "../libs/utils";

type Props = {
  src?: string;
  className?: string;
  fallback?: string;
};

function getAvatarUrl(name: string): string {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${name}`;
}

export function Avatar({ src, className, fallback }: Props) {
  const source = src || getAvatarUrl(fallback ?? "UN");
  return (
    <Shad.Avatar className={cn("rounded-lg size-8", className)}>
      {source && <Shad.AvatarImage src={source} alt="User Avatar" />}
      <Shad.AvatarFallback>
        {fallback?.charAt(0).toUpperCase() || "UN"}
      </Shad.AvatarFallback>
    </Shad.Avatar>
  );
}
