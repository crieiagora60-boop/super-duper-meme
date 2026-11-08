import React from "react";
import { createRoot } from "react-dom/client";
import Editor from "@/components/editor/Editor";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado");

createRoot(root).render(
  <React.StrictMode>
    <Editor />
  </React.StrictMode>,
);
