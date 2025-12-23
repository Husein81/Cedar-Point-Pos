import { Shad } from "../components";
import { cn } from "../libs/utils";

type Props = {
  src?: string;
  className?: string;
  fallback?: string;
};

export function Avatar({ src, className, fallback }: Props) {
  return (
    <Shad.Avatar className={cn("rounded-lg size-8", className)}>
      {src && <Shad.AvatarImage src={src} alt="User Avatar" />}
      <Shad.AvatarFallback>
        {fallback?.charAt(0).toUpperCase() || "UN"}
      </Shad.AvatarFallback>
    </Shad.Avatar>
  );
}
