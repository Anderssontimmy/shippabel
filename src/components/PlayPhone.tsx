import { motion } from "framer-motion";
import { Star, Rocket, Wifi, BatteryFull, Check } from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";

/**
 * PlayPhone — the landing hero visual. An Android phone showing the outcome
 * we sell: the visitor's own app, live on Google Play. Pure CSS, no images.
 */

const Screenshot = ({ from, to }: { from: string; to: string }) => (
  <div
    className="h-24 w-14 shrink-0 rounded-lg"
    style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}
  />
);

const PlayListing = () => (
  <div className="flex h-full w-full flex-col bg-white text-left" style={{ fontSize: "clamp(7px, 3.2cqw, 12px)" }}>
    {/* Android status bar */}
    <div className="flex items-center justify-between px-4 pt-2.5 pb-1 text-gray-700">
      <span className="text-[0.85em] font-medium tracking-wide">12:30</span>
      <span className="flex items-center gap-1 text-gray-500">
        <Wifi aria-hidden="true" className="h-[1em] w-[1em]" />
        <BatteryFull aria-hidden="true" className="h-[1em] w-[1em]" />
      </span>
    </div>

    <div className="flex-1 overflow-hidden px-4 pt-4">
      {/* App identity */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 shadow-sm">
          <Rocket aria-hidden="true" className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[1.25em] font-bold leading-tight text-gray-900">Your app</p>
          <p className="truncate text-[0.9em] font-medium text-green-700">Published with Shippabel</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3.5 flex items-center text-gray-600">
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

      {/* Install */}
      <div className="mt-4 w-full rounded-full bg-green-600 py-2 text-center font-semibold text-white">
        Install
      </div>

      {/* Screenshots */}
      <div className="mt-4 flex gap-2 overflow-hidden">
        <Screenshot from="#dcfce7" to="#86efac" />
        <Screenshot from="#e0e7ff" to="#a5b4fc" />
        <Screenshot from="#fef9c3" to="#fde68a" />
        <Screenshot from="#fce7f3" to="#f9a8d4" />
      </div>

      {/* About */}
      <div className="mt-4">
        <p className="font-semibold text-gray-900">About this app</p>
        <div className="mt-2 space-y-1.5" aria-hidden="true">
          <div className="h-[0.6em] w-full rounded-full bg-gray-100" />
          <div className="h-[0.6em] w-11/12 rounded-full bg-gray-100" />
          <div className="h-[0.6em] w-3/5 rounded-full bg-gray-100" />
        </div>
      </div>

      {/* Ratings */}
      <div className="mt-5">
        <p className="font-semibold text-gray-900">Ratings and reviews</p>
        <div className="mt-2.5 flex items-center gap-4">
          <div>
            <p className="text-[2.4em] font-bold leading-none text-gray-900">5.0</p>
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

const PlayPhone = () => (
  <div className="relative w-[15.5rem] sm:w-72" style={{ containerType: "inline-size" }}>
    {/* Soft glow behind the phone */}
    <div
      aria-hidden="true"
      className="absolute -inset-10 -z-10 rounded-full"
      style={{ background: "radial-gradient(closest-side, rgba(34,197,94,0.14), transparent 70%)" }}
    />

    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <PhoneFrame frameColor="#2a2c31">
        <PlayListing />
      </PhoneFrame>
    </motion.div>

    {/* Status chip: the promise, floating off the frame */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
      className="absolute -right-6 top-[38%] flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 shadow-lg shadow-gray-900/5 sm:-right-16"
    >
      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-green-600">
        <Check aria-hidden="true" className="h-3 w-3 text-white" strokeWidth={3} />
      </span>
      <span className="text-xs font-semibold text-gray-800">Live on Google Play</span>
    </motion.div>
  </div>
);

export default PlayPhone;
