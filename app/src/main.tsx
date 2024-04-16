import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { context, initialContext } from "./state";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <React.StrictMode>
      <context.Provider value={initialContext}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </context.Provider>
    </React.StrictMode>
  </GoogleOAuthProvider>
);
