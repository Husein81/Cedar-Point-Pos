import {
  RouterProvider,
  createHashHistory,
  createRouter,
} from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import "@repo/ui/globals";
import "./index.css";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree, history: createHashHistory() });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(<RouterProvider router={router} />);
