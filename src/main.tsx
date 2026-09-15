import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/auth_context";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/pitch.css";
import "./styles/how.css";
import "./styles/reserve.css";
import "./styles/card.css";
import "./styles/app.css";
import "./styles/arrival.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* THE TRAILING SLASH MUST GO. BASE_URL is "/blacksburg/" but the path
        the browser is on is "/blacksburg" — with the slash left on, no
        route matches and the app renders nothing at all. The sibling
        prototype strips it the same way. At base "/" this is a no-op. */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      {/* The session is read once, above the router: the checkout needs an
          access token, and /in needs to know whether anyone is signed in. */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
