import { Routes, Route } from "react-router-dom";

import AppLayout from "./components/layouts/AppLayout";
import VoiceAssistant from "./pages/VoiceAssistant";
import Chat from "./pages/Chat";
import Vocabulary from "./pages/Vocabulary";
import AppSettings from "./pages/AppSettings";
import { ToastProvider } from "./components/ui/toast";

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<VoiceAssistant />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/vocabulary" element={<Vocabulary />} />
          <Route path="/settings" element={<AppSettings />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}

export default App;
