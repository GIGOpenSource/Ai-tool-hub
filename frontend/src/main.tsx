import { createRoot } from "react-dom/client"; // 客户端 createRoot API
import App from "./app/App"; // 省略扩展名以符合 tsc 模块解析（与 Vite 一致）
import "./styles/index.css"; // 全局样式入口

createRoot(document.getElementById("root")!).render(<App />); // 挂载到 index.html 的 #root
