import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import App from "./App.js";
import { DevelopmentRequesterProvider } from "./DevelopmentRequesterContext.js";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DevelopmentRequesterProvider>
      <App />
    </DevelopmentRequesterProvider>
  </React.StrictMode>
);
