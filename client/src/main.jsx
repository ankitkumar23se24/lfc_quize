import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import ThemeToggle from "./components/ThemeToggle";
import Landing from "./pages/Landing";
import Join from "./pages/Join";
import Play from "./pages/Play";
import HostLogin from "./pages/HostLogin";
import Dashboard from "./pages/Dashboard";
import QuizEditor from "./pages/QuizEditor";
import Preview from "./pages/Preview";
import Live from "./pages/Live";
import Results from "./pages/Results";
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeToggle />
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/join" element={<Join />} />
      <Route path="/quiz/:roomCode" element={<Play />} />
      <Route path="/host/login" element={<HostLogin />} />
      <Route path="/host/dashboard" element={<Dashboard />} />
      <Route path="/host/quiz/create" element={<QuizEditor />} />
      <Route path="/host/quiz/:id/edit" element={<QuizEditor />} />
      <Route path="/host/quiz/:id/preview" element={<Preview />} />
      <Route path="/host/live/:roomCode" element={<Live />} />
      <Route path="/host/results/:sessionId" element={<Results />} />
    </Routes>
  </BrowserRouter>,
);
