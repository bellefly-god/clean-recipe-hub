import { createRoot } from "react-dom/client";
import { ExtensionApp } from "@/app/ExtensionApp";
import "@/index.css";

createRoot(document.getElementById("root")!).render(<ExtensionApp entry="sidepanel" />);
