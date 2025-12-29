import { Button, Icon } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";

export function UnderConstruction() {
const navigate = useNavigate()
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Button onClick={() => navigate({
          to: '/'
        })}> 
        <Icon name="ArrowLeft" />
          Go Back
        </Button>
        <h1 className="flex items-center gap-2 text-4xl font-bold text-gray-900 mb-4">
          <Icon name="Construction" size={"34"}/>
          Under Construction
        </h1>
        <p className="text-gray-600">Page is under construction go back.</p>
      </div>
    </div>
  );
}