import { Icon } from "@repo/ui";
import { Card, CardContent } from "@repo/ui/components/card";

interface PageStubProps {
  title: string;
  description: string;
  icon: string;
}

export function PageStub({ title, description, icon }: PageStubProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="bg-white border-[#5d9eff]/20 max-w-md w-full">
        <CardContent className="flex flex-col items-center text-center py-12">
          <div className="w-16 h-16 bg-linear-to-br from-[#5d9eff]/20 to-[#525ff9]/20 rounded-full flex items-center justify-center mb-6">
            <Icon name={icon} size={32} className="text-[#525ff9]" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
          <div className="mt-6 px-4 py-2 bg-[#5d9eff]/10 border border-[#525ff9]/20 rounded-lg">
            <p className="text-sm text-[#525ff9] font-medium">🚧 Coming Soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
