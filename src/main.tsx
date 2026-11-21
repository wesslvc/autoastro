import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import { Shell } from "./components/shell";
import { ToastProvider } from "./lib/observatory";
import Home from "./pages/home";
import Targets from "./pages/targets";
import Capture from "./pages/capture";
import "./index.css";

try {
  if (localStorage.getItem("theme") === "night") document.documentElement.dataset.theme = "night";
} catch {}

const qc = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={qc}>
    <ToastProvider>
      <Router>
        <Shell>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/targets" component={Targets} />
            <Route path="/capture" component={Capture} />
            <Route>
              <h1 className="hero">페이지를 찾을 수 없습니다.</h1>
            </Route>
          </Switch>
        </Shell>
      </Router>
    </ToastProvider>
  </QueryClientProvider>,
);
