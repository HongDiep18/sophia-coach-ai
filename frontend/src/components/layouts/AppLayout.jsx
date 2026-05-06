import { Outlet, Link, useLocation } from "react-router-dom";
import {
  BookOpen,
  MessageCircle,
  Pause,
  Play,
  Settings,
  Square,
  Zap,
} from "lucide-react";
import { useSpeechPlayback } from "../../hooks/useSpeechPlayback";

const navItems = [
  { path: "/", icon: MessageCircle, label: "Chat" },
  { path: "/vocabulary", icon: BookOpen, label: "Vocab" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function AppLayout() {
  const location = useLocation();
  const speech = useSpeechPlayback();
  const showHeaderPlayback =
    speech.state !== "idle" && location.pathname !== "/";

  return (
    <div className="flex h-screen flex-col bg-transparent">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 transition-colors group-hover:bg-blue-200">
              <Zap className="h-4 w-4 text-blue-700" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-slate-900">FluentFlow</h1>
              <p className="text-[10px] leading-none text-slate-500">AI English Coach</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {showHeaderPlayback ? (
              <div
                className="mr-1 flex items-center gap-0.5 rounded-lg border border-blue-200 bg-blue-50/90 px-1 py-0.5"
                title="Text-to-speech"
              >
                <span className="hidden px-1 text-[10px] font-medium text-slate-500 sm:inline">
                  Speaking
                </span>
                <button
                  type="button"
                  onClick={speech.stop}
                  aria-label="Stop speech"
                  className="grid h-7 w-7 place-items-center rounded-md text-slate-600 hover:bg-white hover:text-red-600"
                >
                  <Square className="h-2.5 w-2.5 fill-current" />
                </button>
                {speech.state === "playing" ? (
                  <button
                    type="button"
                    onClick={speech.pause}
                    aria-label="Pause speech"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-600 hover:bg-white hover:text-blue-700"
                  >
                    <Pause className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={speech.resume}
                    aria-label="Resume speech"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-600 hover:bg-white hover:text-blue-700"
                  >
                    <Play className="h-3 w-3" />
                  </button>
                )}
              </div>
            ) : null}
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-hidden px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}
