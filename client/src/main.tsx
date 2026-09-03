import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import App from "./App";
import { DevelopmentRequesterProvider } from "./DevelopmentRequesterContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DevelopmentRequesterProvider>
      <App />
    </DevelopmentRequesterProvider>
  </React.StrictMode>
);
