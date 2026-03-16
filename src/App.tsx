import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Lobby from "./screens/Lobby";
import Waiting from "./screens/Waiting";
import Call from "./screens/Call";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/waiting/:roomId" element={<Waiting />} />
        <Route path="/call/:roomId" element={<Call />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
