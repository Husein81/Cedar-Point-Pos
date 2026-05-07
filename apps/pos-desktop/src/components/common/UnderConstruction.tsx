import { Button, Icon } from "@repo/ui";
import { Link } from "@tanstack/react-router";

export function UnderConstruction() {
  return (
    <div className="flex items-center justify-center min-h-0">
      <div className="text-center">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <Icon name="ArrowLeft" className="w-4 h-4 mr-2" />
            Go Back Home
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Icon
            name="Construction"
            className="w-16 h-16 text-muted-foreground mb-4"
          />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Under construction
          </h1>
        </div>
        <p className="text-gray-600">Page is under construction</p>
      </div>
    </div>
  );
}
