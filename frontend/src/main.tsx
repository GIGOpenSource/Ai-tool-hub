import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

/** 挂载 React 应用入口；#root 见 index.html */
createRoot(document.getElementById("root")!).render(<App />);
