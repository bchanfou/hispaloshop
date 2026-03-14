// Silence debug/info logs in production (keep error & warn for monitoring)
if (process.env.NODE_ENV === 'production') {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
}

import { initSentry } from '@/lib/sentry';
initSentry();

import React from "react";
import ReactDOM from "react-dom/client";
// Configure axios BEFORE any other imports that might use it
import "@/config/axios";
import "@/index.css";
import App from "@/App";
import SWRProvider from "@/components/SWRProvider";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <SWRProvider>
      <App />
    </SWRProvider>
  </React.StrictMode>,
);
