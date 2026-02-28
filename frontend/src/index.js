import React from "react";
import ReactDOM from "react-dom/client";
// Configure axios BEFORE any other imports that might use it
import "@/config/axios";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
