import { Icon, Shad } from "@repo/ui";

type Actions = {
  title: string;
  icon?: string;
  className?: string;
  variant?: "default" | "destructive";
  onClick?: () => void;
  content?: React.ReactNode;
};

type Props = {
  actions?: Actions[];
};
const Actions = ({ actions }: Props) => {
  return (
    <Shad.DropdownMenu>
      <Shad.DropdownMenuTrigger>
        <Icon
          name="Ellipsis"
          className="w-5 h-5 cursor-pointer text-muted-foreground"
        />
      </Shad.DropdownMenuTrigger>
      <Shad.DropdownMenuContent align="end" className="w-40">
        {actions?.map((action) =>
          action.content ? (
            action.content
          ) : (
            <Shad.DropdownMenuItem
              key={action.title}
              onClick={action.onClick}
              className={action.className}
              variant={action.variant}
            >
              {action.icon && (
                <Icon
                  name={action.icon}
                  className="w-4 h-4 mr-2 text-muted-foreground"
                />
              )}
              {action.title}
            </Shad.DropdownMenuItem>
          )
        )}
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
};
export default Actions;
