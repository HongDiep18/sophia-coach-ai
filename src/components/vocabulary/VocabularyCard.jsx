import { motion } from "framer-motion";
import {
  Volume2,
  Trash2,
  ArrowUpCircle,
  CheckCircle2,
  Circle,
} from "lucide-react";
// 123
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusConfig = {
  new: {
    icon: Circle,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "New",
  },
  learning: {
    icon: ArrowUpCircle,
    color: "text-chart-5",
    bg: "bg-chart-5/10",
    label: "Learning",
  },
  mastered: {
    icon: CheckCircle2,
    color: "text-primary",
    bg: "bg-primary/10",
    label: "Mastered",
  },
};

export default function VocabCard({ vocab, onStatusChange, onDelete }) {
  const status = statusConfig[vocab.learning_status] || statusConfig.new;
  const StatusIcon = status.icon;

  const speakWord = () => {
    const utterance = new SpeechSynthesisUtterance(vocab.word);
    utterance.lang = "en-US";
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  const cycleStatus = () => {
    const order = ["new", "learning", "mastered"];
    const idx = order.indexOf(vocab.learning_status || "new");
    const next = order[(idx + 1) % order.length];
    onStatusChange(vocab.id, next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-semibold text-foreground">
            {vocab.word}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={speakWord}
          >
            <Volume2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Badge
            variant="outline"
            className={`cursor-pointer ${status.bg} ${status.color} border-transparent text-[10px]`}
            onClick={cycleStatus}
          >
            <StatusIcon className="h-2.5 w-2.5 mr-1" />
            {status.label}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            onClick={() => onDelete(vocab.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {vocab.definition && (
        <p className="text-xs text-muted-foreground leading-relaxed mb-1">
          {vocab.definition}
        </p>
      )}
      {vocab.vietnamese && (
        <p className="text-xs text-muted-foreground/70">
          🇻🇳 {vocab.vietnamese}
        </p>
      )}
      {vocab.context_sentence && (
        <p className="text-[11px] italic text-muted-foreground/50 mt-2 border-t border-border/50 pt-2">
          "{vocab.context_sentence}"
        </p>
      )}
    </motion.div>
  );
}
