import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

export default function FloatingChatButton() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="fixed bottom-6 right-6 z-40"
    >
      <Link
        to="/chat"
        aria-label="Open chat with your English coach"
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-700"
      >
        {/* pulsing ring to draw attention */}
        <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/40" />

        <Bot className="relative h-6 w-6" />

        {/* tooltip label on hover */}
        <span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100">
          Chat with coach
        </span>
      </Link>
    </motion.div>
  );
}
