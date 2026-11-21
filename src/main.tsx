import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SettingsProvider } from "./lib/settings";
import { ToastProvider } from "./lib/observatory";
import App from "./App";
import "./index.css";

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={qc}>
    <SettingsProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </SettingsProvider>
  </QueryClientProvider>,
);
