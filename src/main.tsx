
  import { createRoot } from "react-dom/client";
  import "@fontsource-variable/geist";
  import App from "./App.tsx";
  import "./index.css";

  document.documentElement.lang = 'vi';

  createRoot(document.getElementById("root")!).render(<App />);
  
