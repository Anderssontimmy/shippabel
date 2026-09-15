import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Star, Rocket, Wifi, BatteryFull, Check, Loader2, Upload, Image as ImageIcon, Settings2, Shield, Lock } from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";

/**
 * PlayPhone — the landing hero visual. An Android phone that plays the whole
 * Shippabel story on a loop: check → fix → send to Google Play → live.
 * Mouse-tilt + float + glare give it life; AI-generated app screenshots fill
 * the Play listing. Pure DOM, no canvas.
 */

const STAGE_DURATIONS = [3200, 3000, 2400, 5200];

// ---------- Stage 0: Checking ----------

const CHECK_ROWS = [
  { icon: ImageIcon, label: "App icon" },
  { icon: Settings2, label: "App settings" },
  { icon: Shield, label: "Privacy policy" },
  { icon: Lock, label: "No exposed secrets" },
];

const CheckingScreen = () => (
  <div className="flex h-full flex-col px-5 pt-8">
    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-700">
      <Rocket aria-hidden="true" className="h-5 w-5 text-white" />
    </div>
    <p className="mt-3 text-center text-[1.15em] font-bold text-gray-900">Checking your app</p>
    <p className="mt-0.5 text-center text-[0.85em] text-gray-400">Takes about 30 seconds</p>

    <div className="mt-5 space-y-2">
      {CHECK_ROWS.map((row, i) => (
        <motion.div
          key={row.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.5, duration: 0.3, ease: "easeOut" }}
          className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5"
        >
          <row.icon aria-hidden="true" className="h-[1.1em] w-[1.1em] text-gray-400" />
          <span className="flex-1 text-[0.95em] font-medium text-gray-700">{row.label}</span>
          <motion.span
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 0.9 + i * 0.5, duration: 0.15 }}
          >
            <Loader2 aria-hidden="true" className="h-[1em] w-[1em] animate-spin text-gray-300" />
          </motion.span>
          <motion.span
            className="-ml-[1.35em] flex h-[1.3em] w-[1.3em] items-center justify-center rounded-full bg-green-600"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.95 + i * 0.5, type: "spring", stiffness: 500, damping: 25 }}
          >
            <Check aria-hidden="true" className="h-[0.85em] w-[0.85em] text-white" strokeWidth={3.5} />
          </motion.span>
        </motion.div>
      ))}
    </div>
  </div>
);

// ---------- Stage 1: Fixing ----------

const FIX_ROWS = ["App icon added", "Version number set"];

const FixingScreen = () => (
  <div className="flex h-full flex-col px-5 pt-8">
    <p className="text-center text-[1.15em] font-bold text-gray-900">2 things needed fixing</p>
    <p className="mt-0.5 text-center text-[0.85em] text-gray-400">We fix them for you</p>

    <div className="mt-5 space-y-2">
      {FIX_ROWS.map((label, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.7, duration: 0.3, ease: "easeOut" }}
          className="flex items-center gap-2.5 rounded-xl border border-green-100 bg-green-50 px-3 py-2.5"
        >
          <motion.span
            className="flex h-[1.3em] w-[1.3em] items-center justify-center rounded-full bg-green-600"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 + i * 0.7, type: "spring", stiffness: 500, damping: 25 }}
          >
            <Check aria-hidden="true" className="h-[0.85em] w-[0.85em] text-white" strokeWidth={3.5} />
          </motion.span>
          <span className="text-[0.95em] font-medium text-gray-800">{label}</span>
        </motion.div>
      ))}
    </div>

    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.9, duration: 0.4 }}
      className="mt-5 text-center text-[0.9em] font-medium text-green-700"
    >
      Nothing for you to do
    </motion.p>
  </div>
);

// ---------- Stage 2: Publishing ----------

const PublishingScreen = () => (
  <div className="flex h-full flex-col items-center justify-center px-5 pb-10">
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900"
    >
      <Upload aria-hidden="true" className="h-5 w-5 text-white" />
    </motion.div>
    <p className="mt-4 text-[1.15em] font-bold text-gray-900">Sending to Google Play</p>
    <div className="mt-3 h-1.5 w-3/5 overflow-hidden rounded-full bg-gray-100">
      <motion.div
        className="h-full rounded-full bg-green-600"
        initial={{ width: "8%" }}
        animate={{ width: "96%" }}
        transition={{ duration: 1.9, ease: "easeInOut" }}
      />
    </div>
  </div>
);

// ---------- Stage 3: Live (Play listing) ----------

// Soft gradient placeholders standing in for the app's screenshots
const SHOTS = [
  ["#dcfce7", "#86efac"],
  ["#e0e7ff", "#a5b4fc"],
  ["#fef9c3", "#fde68a"],
  ["#fce7f3", "#f9a8d4"],
] as const;

const LiveScreen = () => (
  <div className="flex h-full w-full flex-col bg-white text-left">
    {/* Android status bar */}
    <div className="flex items-center justify-between px-4 pt-2.5 pb-1 text-gray-700">
      <span className="text-[0.85em] font-medium tracking-wide">12:30</span>
      <span className="flex items-center gap-1 text-gray-500">
        <Wifi aria-hidden="true" className="h-[1em] w-[1em]" />
        <BatteryFull aria-hidden="true" className="h-[1em] w-[1em]" />
      </span>
    </div>

    <div className="flex-1 overflow-hidden px-4 pt-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 shadow-sm">
          <Rocket aria-hidden="true" className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[1.25em] font-bold leading-tight text-gray-900">Your app</p>
          <p className="truncate text-[0.9em] font-medium text-green-700">Published with Shippabel</p>
        </div>
      </div>

      <div className="mt-3 flex items-center text-gray-600">
        <span className="flex flex-1 flex-col items-center gap-0.5 border-r border-gray-200">
          <span className="flex items-center gap-0.5 font-semibold text-gray-900">
            5.0 <Star aria-hidden="true" className="h-[0.8em] w-[0.8em] fill-current" />
          </span>
          <span className="text-[0.75em] text-gray-400">12 reviews</span>
        </span>
        <span className="flex flex-1 flex-col items-center gap-0.5 border-r border-gray-200">
          <span className="font-semibold text-gray-900">100+</span>
          <span className="text-[0.75em] text-gray-400">Downloads</span>
        </span>
        <span className="flex flex-1 flex-col items-center gap-0.5">
          <span className="font-semibold text-gray-900">Free</span>
          <span className="text-[0.75em] text-gray-400">In-app: none</span>
        </span>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.35, type: "spring", stiffness: 300, damping: 22 }}
        className="mt-3.5 w-full rounded-full bg-green-600 py-2 text-center font-semibold text-white"
      >
        Install
      </motion.div>

      <div className="mt-3.5 flex gap-2 overflow-hidden">
        {SHOTS.map(([from, to], i) => (
          <motion.div
            key={i}
            aria-hidden="true"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.12, duration: 0.35, ease: "easeOut" }}
            className="h-32 w-[4.6rem] shrink-0 rounded-lg"
            style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}
          />
        ))}
      </div>

      <div className="mt-3.5">
        <p className="font-semibold text-gray-900">Ratings and reviews</p>
        <div className="mt-2 flex items-center gap-4">
          <div>
            <p className="text-[2.2em] font-bold leading-none text-gray-900">5.0</p>
            <div className="mt-1 flex gap-px text-green-600">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} aria-hidden="true" className="h-[0.9em] w-[0.9em] fill-current" />
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-1" aria-hidden="true">
            {[100, 12, 5, 2, 1].map((w, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2 text-[0.7em] text-gray-400">{5 - i}</span>
                <div className="h-[0.55em] flex-1 rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-green-600" style={{ width: `${w}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ---------- Confetti (stage 3 payoff) ----------

const CONFETTI_COLORS = ["#16a34a", "#4ade80", "#6366f1", "#f59e0b", "#ec4899"];

const Confetti = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-visible">
    {Array.from({ length: 16 }).map((_, i) => {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 90 + (i % 4) * 34;
      return (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/3 h-2 w-1.5 rounded-[1px]"
          style={{ background: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist * 0.85 + 40,
            opacity: 0,
            rotate: 180 + i * 40,
            scale: 0.6,
          }}
          transition={{ duration: 1.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        />
      );
    })}
  </div>
);

// ---------- The phone ----------

const stageScreens = [CheckingScreen, FixingScreen, PublishingScreen, LiveScreen];

const PlayPhone = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setStage((s) => (s + 1) % stageScreens.length), STAGE_DURATIONS[stage]);
    return () => clearTimeout(t);
  }, [stage]);

  // Mouse-follow tilt (springy, subtle)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -4]), { stiffness: 120, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 4]), { stiffness: 120, damping: 20 });
  const glare = useTransform([mouseX, mouseY], ([x, y]) => {
    const px = 45 + (x as number) * 45;
    const py = 25 + (y as number) * 45;
    return `radial-gradient(ellipse at ${px}% ${py}%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 30%, transparent 60%)`;
  });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [mouseX, mouseY]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  const Screen = stageScreens[stage]!;

  return (
    <div ref={ref} className="relative w-[15.5rem] sm:w-72" style={{ perspective: "1100px", containerType: "inline-size" }}>
      {/* Soft glow */}
      <div
        aria-hidden="true"
        className="absolute -inset-10 -z-10 rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(34,197,94,0.14), transparent 70%)" }}
      />

      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <PhoneFrame frameColor="#2a2c31">
          <div className="relative h-full w-full bg-white" style={{ fontSize: "clamp(7px, 3.2cqw, 12px)" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={stage}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Screen />
              </motion.div>
            </AnimatePresence>
            {/* Glare follows the cursor */}
            <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10" style={{ background: glare }} />
          </div>
        </PhoneFrame>

        {stage === 3 && <Confetti />}
      </motion.div>

      {/* The payoff chip, only when the app goes live */}
      <AnimatePresence>
        {stage === 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 24, delay: 0.15 }}
            className="absolute -right-6 top-[36%] flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 shadow-lg shadow-gray-900/5 sm:-right-16"
          >
            <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-green-600">
              <Check aria-hidden="true" className="h-3 w-3 text-white" strokeWidth={3} />
            </span>
            <span className="text-xs font-semibold text-gray-800">Live on Google Play</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlayPhone;
