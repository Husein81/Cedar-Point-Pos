import { ReactNode } from "react";
import { Shad } from "../components";

export interface TabsCardItem {
  value: string;
  label: string;
  title?: string;
  description?: string;
  content: ReactNode;
  footer?: ReactNode;
}

type Props = {
  defaultValue: string;
  tabs: TabsCardItem[];
  className?: string;
};

export function Tabs({ defaultValue, tabs, className }: Props) {
  return (
    <div className={className}>
      <Shad.Tabs defaultValue={defaultValue}>
        <Shad.TabsList>
          {tabs.map((tab) => (
            <Shad.TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </Shad.TabsTrigger>
          ))}
        </Shad.TabsList>

        {tabs.map((tab) => (
          <Shad.TabsContent key={tab.value} value={tab.value}>
            <Shad.Card>
              {(tab.title || tab.description) && (
                <Shad.CardHeader>
                  {tab.title && <Shad.CardTitle>{tab.title}</Shad.CardTitle>}
                  {tab.description && (
                    <Shad.CardDescription>
                      {tab.description}
                    </Shad.CardDescription>
                  )}
                </Shad.CardHeader>
              )}

              <Shad.CardContent className="grid gap-6">
                {tab.content}
              </Shad.CardContent>

              {tab.footer && <Shad.CardFooter>{tab.footer}</Shad.CardFooter>}
            </Shad.Card>
          </Shad.TabsContent>
        ))}
      </Shad.Tabs>
    </div>
  );
}
