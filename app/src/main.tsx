import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { context, initialContext } from "./state";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // Aditya's client ID needed for Google OAuth, should be replaced with Aaron's client ID
  <GoogleOAuthProvider clientId="1080920977375-djjnsjd5dpj4eopgfadkt9keukc57m8b.apps.googleusercontent.com">
    <React.StrictMode>
      <context.Provider value={initialContext}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </context.Provider>
    </React.StrictMode>
  </GoogleOAuthProvider>
);
