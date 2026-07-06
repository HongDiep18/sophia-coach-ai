import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type ToastVariant = "success" | "error" | "warning" | "info" | "loading";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** Secondary line under the title. */
  description?: string;
  /** Auto-dismiss delay in ms. Pass `Infinity` to keep it until dismissed. */
  duration?: number;
  /** Optional inline button (Undo / Retry / View...). */
  action?: ToastAction;
}

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration: number;
  action?: ToastAction;
}

type PromiseMessage<T> = string | ((data: T) => string);

interface PromiseMessages<T> {
  loading: string;
  success: PromiseMessage<T>;
  error: PromiseMessage<unknown>;
}

export interface ToastApi {
  show: (variant: ToastVariant, title: string, options?: ToastOptions) => number;
  success: (title: string, options?: ToastOptions) => number;
  error: (title: string, options?: ToastOptions) => number;
  warning: (title: string, options?: ToastOptions) => number;
  info: (title: string, options?: ToastOptions) => number;
  loading: (title: string, options?: ToastOptions) => number;
  /** Dismiss one toast by id, or all when called with no argument. */
  dismiss: (id?: number) => void;
  /** Fire a loading toast that flips to success/error when the promise settles. */
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    messages: PromiseMessages<T>,
  ) => Promise<T>;
}

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

const DEFAULT_DURATION = 4000;
const MAX_VISIBLE = 3;

interface VariantConfig {
  Icon: LucideIcon;
  iconClass: string;
  barClass: string;
  /** `true` -> role="alert" (assertive), otherwise role="status" (polite). */
  assertive: boolean;
}

const VARIANT_CONFIG: Record<ToastVariant, VariantConfig> = {
  success: {
    Icon: CheckCircle2,
    iconClass: "text-emerald-600",
    barClass: "bg-emerald-500",
    assertive: false,
  },
  error: {
    Icon: XCircle,
    iconClass: "text-rose-600",
    barClass: "bg-rose-500",
    assertive: true,
  },
  warning: {
    Icon: AlertTriangle,
    iconClass: "text-amber-600",
    barClass: "bg-amber-500",
    assertive: false,
  },
  info: {
    Icon: Info,
    iconClass: "text-blue-600",
    barClass: "bg-blue-500",
    assertive: false,
  },
  loading: {
    Icon: Loader2,
    iconClass: "text-slate-500 animate-spin",
    barClass: "bg-slate-400",
    assertive: false,
  },
};

const resolveMessage = <T,>(message: PromiseMessage<T>, arg: T): string =>
  typeof message === "function" ? message(arg) : message;

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error("useToast must be used within a <ToastProvider>.");
  }
  return api;
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                   */
/* -------------------------------------------------------------------------- */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const update = useCallback((id: number, patch: Partial<ToastItem>) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const add = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { ...toast, id }].slice(-MAX_VISIBLE));
    return id;
  }, []);

  const api = useMemo<ToastApi>(() => {
    const show = (
      variant: ToastVariant,
      title: string,
      options: ToastOptions = {},
    ) =>
      add({
        variant,
        title,
        description: options.description,
        action: options.action,
        duration: options.duration ?? DEFAULT_DURATION,
      });

    return {
      show,
      success: (title, options) => show("success", title, options),
      error: (title, options) => show("error", title, options),
      warning: (title, options) => show("warning", title, options),
      info: (title, options) => show("info", title, options),
      loading: (title, options = {}) =>
        show("loading", title, {
          ...options,
          duration: options.duration ?? Infinity,
        }),
      dismiss: (id) => (id == null ? setToasts([]) : remove(id)),
      promise: async (promise, messages) => {
        const id = add({
          variant: "loading",
          title: messages.loading,
          duration: Infinity,
        });
        try {
          const data = await (typeof promise === "function"
            ? promise()
            : promise);
          update(id, {
            variant: "success",
            title: resolveMessage(messages.success, data),
            duration: DEFAULT_DURATION,
          });
          return data;
        } catch (error) {
          update(id, {
            variant: "error",
            title: resolveMessage(messages.error, error),
            duration: DEFAULT_DURATION,
          });
          throw error;
        }
      },
    };
  }, [add, remove, update]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Viewport + Toast                                                           */
/* -------------------------------------------------------------------------- */

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const { id, variant, title, description, action, duration } = toast;
  const { Icon, iconClass, barClass, assertive } = VARIANT_CONFIG[variant];

  const controls = useAnimationControls();
  const remainingRef = useRef(duration);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const finite = duration !== Infinity;

  const pause = useCallback(() => {
    if (!finite) return;
    clearTimeout(timerRef.current);
    remainingRef.current -= performance.now() - startRef.current;
    controls.stop();
  }, [controls, finite]);

  const resume = useCallback(() => {
    if (!finite) return;
    startRef.current = performance.now();
    timerRef.current = setTimeout(
      () => onDismiss(id),
      Math.max(0, remainingRef.current),
    );
    controls.start({
      scaleX: 0,
      transition: {
        duration: Math.max(0, remainingRef.current) / 1000,
        ease: "linear",
      },
    });
  }, [controls, finite, id, onDismiss]);

  // (Re)start the countdown whenever the duration changes — e.g. a loading
  // toast that resolves via toast.promise() flips from Infinity to a real value.
  useEffect(() => {
    if (!finite) return;
    remainingRef.current = duration;
    resume();
    return () => clearTimeout(timerRef.current);
  }, [duration, finite, resume]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      role={assertive ? "alert" : "status"}
      aria-atomic="true"
      onMouseEnter={pause}
      onMouseLeave={resume}
      className="pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur"
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {description ? (
            <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          ) : null}

          {action ? (
            <button
              type="button"
              onClick={() => {
                action.onClick();
                onDismiss(id);
              }}
              className="mt-2 rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50"
            >
              {action.label}
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onDismiss(id)}
          aria-label="Dismiss notification"
          className="-mr-1 -mt-1 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {finite ? (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={controls}
          style={{ transformOrigin: "left" }}
          className={`absolute bottom-0 left-0 h-0.5 w-full ${barClass}`}
        />
      ) : null}
    </motion.div>
  );
}
