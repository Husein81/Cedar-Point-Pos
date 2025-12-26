import { icons } from "lucide-react";
import type { LucideProps } from "lucide-react";

interface IconProps extends LucideProps {
  name: string;
  className?: string;
  color?: string;
  onClick?: () => void;
}

const GoogleIcon = () => {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 533.5 544.3"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M533.5 278.4c0-18.8-1.6-37.1-4.7-54.8H272v103.8h147.1c-6.4 34.7-25.3 64.1-54 83.9v69.8h87.1c50.8-46.8 81.3-115.8 81.3-203.7z"
        fill="#4285F4"
      />
      <path
        d="M272 544.3c72.8 0 133.8-24.1 178.5-65.5l-87.1-69.8c-24.2 16.2-55.3 25.7-91.4 25.7-70.3 0-129.9-47.5-151.2-111.6H32.7v70.2C77.3 482.2 169.7 544.3 272 544.3z"
        fill="#34A853"
      />
      <path
        d="M120.8 324.3c-11.6-34.7-11.6-71.9 0-106.6V147.5H32.7c-43.1 84-43.1 184.2 0 268.2l88.1-70.2z"
        fill="#FBBC05"
      />
      <path
        d="M272 107.5c38.7-.6 73.1 13.4 100.3 39.6l75-75C405.6 24.5 344.6.5 272 0 169.7 0 77.3 62.1 32.7 147.5l88.1 70.2c21.3-64.1 80.9-111.6 151.2-110.2z"
        fill="#EA4335"
      />
    </svg>
  );
};

export const Icon = ({ name, color, size, className, onClick }: IconProps) => {
  if (name === "Google") {
    return <GoogleIcon />;
  }

  const LucideIcon = icons[name as keyof typeof icons];

  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found in lucide-react icons.`);
    return undefined;
  }

  return (
    <LucideIcon
      className={className}
      color={color}
      size={size}
      onClick={onClick}
    />
  );
};
