import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const TypingText = ({ text }: { text: string }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 60);
    return () => clearInterval(interval);
  }, [text]);
  return <span>{displayed}</span>;
};

const PhoneMockup = () => {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rawRotateX = useTransform(mouseY, [-0.5, 0.5], [22, 5]);
  const rawRotateY = useTransform(mouseX, [-0.5, 0.5], [-20, -3]);
  const rotateX = useSpring(rawRotateX, { stiffness: 100, damping: 22 });
  const rotateY = useSpring(rawRotateY, { stiffness: 100, damping: 22 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    mouseX.set((e.clientX - cx) / rect.width);
    mouseY.set((e.clientY - cy) / rect.height);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  const [stage, setStage] = useState(0);
  const totalStages = 4;

  useEffect(() => {
    const durations = [3000, 2800, 2500, 4500];
    const timeout = setTimeout(() => {
      setStage((s) => (s + 1) % totalStages);
    }, durations[stage] ?? 3000);
    return () => clearTimeout(timeout);
  }, [stage]);

  const glareBackground = useTransform(
    [mouseX, mouseY],
    ([x, y]) => {
      const px = 45 + (x as number) * 50;
      const py = 25 + (y as number) * 50;
      return `radial-gradient(ellipse at ${px}% ${py}%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 30%, transparent 65%)`;
    }
  );

  return (
    <div ref={ref} className="relative w-full flex items-center justify-center py-12" style={{ perspective: "1200px" }}>
      {/* Ground shadow */}
      <motion.div
        className="absolute bottom-0 left-1/2 z-0"
        animate={{
          translateX: "-50%",
          translateY: [0, 12, 0],
          scaleX: [0.55, 0.45, 0.55],
          scaleY: [1, 0.7, 1],
          opacity: [0.35, 0.2, 0.35],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="w-[420px] h-[80px] rounded-[50%]"
          style={{ background: "radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 70%)", filter: "blur(30px)" }}
        />
      </motion.div>

      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10"
      >
        {/* Phone container */}
        <div className="relative w-[280px]" style={{ aspectRatio: "886 / 1808" }}>

          {/* Screen content — behind the bezel frame */}
          {/* Positioned to fill the screen area inside the bezel */}
          {/* iPhone 16 Pro bezel: screen area is roughly 3.2% inset on sides, 2.8% top, 2.6% bottom */}
          <div
            className="absolute overflow-hidden z-10 flex flex-col"
            style={{
              top: "2.6%",
              left: "3.4%",
              right: "3.4%",
              bottom: "2.6%",
              borderRadius: "12.5% / 6.2%",
              background: "#060906",
            }}
          >
            {/* Status bar */}
            <div className="flex items-center justify-between px-7 pt-[15%] pb-1 text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
              <span>9:41</span>
              <div className="flex gap-1.5 items-center">
                <svg width="15" height="10" viewBox="0 0 15 10" fill="currentColor" className="opacity-70">
                  <rect x="0" y="6" width="3" height="4" rx="0.5"/>
                  <rect x="4" y="4" width="3" height="6" rx="0.5"/>
                  <rect x="8" y="2" width="3" height="8" rx="0.5"/>
                  <rect x="12" y="0" width="3" height="10" rx="0.5"/>
                </svg>
                <svg width="16" height="10" viewBox="0 0 16 10" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-70">
                  <rect x="0.5" y="1" width="12" height="8" rx="1.5"/>
                  <rect x="13" y="3.5" width="2" height="3" rx="0.5" fill="currentColor"/>
                  <rect x="2" y="2.5" width="7" height="5" rx="0.5" fill="currentColor" stroke="none"/>
                </svg>
              </div>
            </div>

            {/* Stage content */}
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex-1 flex flex-col px-4 pt-2"
            >
              {/* --- Stage 0: Paste URL --- */}
              {stage === 0 && (
                <div className="flex flex-col flex-1">
                  <div className="text-[10px] font-semibold tracking-widest uppercase mb-4" style={{ color: "#22c55e" }}>Shippabel</div>
                  <div className="text-[16px] font-bold leading-tight mb-5" style={{ color: "#fff" }}>
                    Paste your app link
                  </div>

                  {/* URL field with typing animation */}
                  <div className="rounded-xl px-3 py-2.5 mb-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div className="text-[8px] mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>GitHub URL</div>
                    <div className="flex items-center gap-1">
                      <motion.span
                        className="text-[10px] font-mono"
                        style={{ color: "rgba(255,255,255,0.7)" }}
                        initial={{ width: 0 }}
                        animate={{ width: "auto" }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      >
                        <TypingText text="github.com/you/my-app" />
                      </motion.span>
                      <motion.span
                        className="inline-block w-[1px] h-3"
                        style={{ background: "#22c55e" }}
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    </div>
                  </div>

                  {/* Check button */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8 }}
                    className="rounded-xl py-2.5 text-center text-[11px] font-bold"
                    style={{ background: "#22c55e", color: "#fff" }}
                  >
                    Check my app →
                  </motion.div>

                  {/* Progress dots appearing */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.2 }}
                    className="flex items-center justify-center gap-1.5 mt-4"
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: "#22c55e" }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                    <span className="text-[8px] ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>Scanning...</span>
                  </motion.div>
                </div>
              )}

              {/* --- Stage 1: Score result --- */}
              {stage === 1 && (
                <div className="flex flex-col items-center flex-1">
                  <div className="text-[9px] font-semibold tracking-widest uppercase mb-3" style={{ color: "#22c55e" }}>Results</div>

                  {/* Score ring */}
                  <div className="relative w-[100px] h-[100px] mb-3">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                      <motion.circle
                        cx="60" cy="60" r="50" fill="none"
                        strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={314}
                        initial={{ strokeDashoffset: 314, stroke: "#f59e0b" }}
                        animate={{ strokeDashoffset: 314 * 0.05, stroke: "#22c55e" }}
                        transition={{ duration: 2, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span className="text-[28px] font-bold" style={{ color: "#fff" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                        95
                      </motion.span>
                      <span className="text-[9px] -mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>/100</span>
                    </div>
                  </div>

                  {/* Checkmarks */}
                  <div className="space-y-1.5 w-full px-1">
                    {["Settings look good", "No security issues", "Ready to publish"].map((text, i) => (
                      <motion.div
                        key={text}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.4 }}
                        className="flex items-center gap-2"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.6 + i * 0.4, type: "spring", stiffness: 300 }}
                          className="h-4 w-4 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "#22c55e" }}
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                        </motion.div>
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>{text}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* --- Stage 2: Fixing problems --- */}
              {stage === 2 && (
                <div className="flex flex-col flex-1">
                  <div className="text-[9px] font-semibold tracking-widest uppercase mb-3 text-center" style={{ color: "#22c55e" }}>Fixing 5 problems</div>

                  <div className="space-y-2.5 px-1">
                    {[
                      "Created app settings",
                      "Set unique app name",
                      "Added privacy policy",
                      "Fixed app icon",
                      "Secured secret keys",
                    ].map((text, i) => (
                      <motion.div
                        key={text}
                        initial={{ opacity: 0.3 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.4 }}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                        style={{ background: "rgba(255,255,255,0.04)" }}
                      >
                        <motion.div
                          initial={{ scale: 0, background: "rgba(255,255,255,0.1)" }}
                          animate={{ scale: 1, background: "#22c55e" }}
                          transition={{ delay: i * 0.4 + 0.2, type: "spring", stiffness: 300 }}
                          className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                        </motion.div>
                        <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{text}</span>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    className="text-center mt-3"
                  >
                    <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>Score: </span>
                    <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>95</span>
                    <span className="text-[9px] mx-1" style={{ color: "rgba(255,255,255,0.2)" }}>→</span>
                    <span className="text-[9px] font-bold" style={{ color: "#22c55e" }}>100</span>
                  </motion.div>
                </div>
              )}

              {/* --- Stage 3: Congratulations! --- */}
              {stage === 3 && (
                <div className="flex flex-col items-center flex-1 relative overflow-hidden">
                  {/* Confetti particles */}
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        width: 4 + Math.random() * 4,
                        height: 4 + Math.random() * 4,
                        background: ["#22c55e", "#4ade80", "#fbbf24", "#60a5fa", "#f472b6", "#a78bfa"][i % 6],
                        left: `${30 + Math.random() * 40}%`,
                        top: "30%",
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 0],
                        x: (Math.random() - 0.5) * 120,
                        y: -40 + Math.random() * 80,
                      }}
                      transition={{ delay: 0.2 + i * 0.08, duration: 1.2, ease: "easeOut" }}
                    />
                  ))}

                  {/* Big checkmark */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                    className="h-16 w-16 rounded-full flex items-center justify-center mb-3"
                    style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 0 30px rgba(34,197,94,0.4)" }}
                  >
                    <motion.svg
                      width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      <path d="M20 6L9 17l-5-5"/>
                    </motion.svg>
                  </motion.div>

                  {/* Congratulations text */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-center mb-3"
                  >
                    <div className="text-[18px] font-extrabold" style={{ color: "#fff" }}>Congratulations!</div>
                    <div className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Your app is now live</div>
                  </motion.div>

                  {/* App Store mini card */}
                  <motion.div
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1, type: "spring" }}
                    className="w-full rounded-xl p-3 flex items-center gap-2.5"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-[16px] shrink-0" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>💪</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold" style={{ color: "#fff" }}>MyFitApp</div>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <svg key={s} width="8" height="8" viewBox="0 0 20 20" fill="#fbbf24"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        ))}
                        <span className="text-[8px] ml-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>4.9</span>
                      </div>
                    </div>
                    <div className="rounded-full px-3 py-1 text-[9px] font-bold" style={{ background: "#007AFF", color: "#fff" }}>GET</div>
                  </motion.div>

                  {/* Stats */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex gap-3 w-full mt-3"
                  >
                    <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <motion.div
                        className="text-[18px] font-bold"
                        style={{ color: "#4ade80" }}
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        2,847
                      </motion.div>
                      <div className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Downloads</div>
                    </div>
                    <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <motion.div
                        className="text-[18px] font-bold"
                        style={{ color: "#fff" }}
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      >
                        $2.4K
                      </motion.div>
                      <div className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>This month</div>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>

            {/* Spacer to push tab bar down */}
            <div className="flex-1" />

            {/* Bottom tab bar */}
            <div className="mx-3 mb-3 mt-2.5 rounded-2xl px-4 py-2.5 flex items-center justify-around" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex flex-col items-center gap-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <span className="text-[7px] font-medium" style={{ color: "#22c55e" }}>Check</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
                <span className="text-[7px]" style={{ color: "rgba(255,255,255,0.3)" }}>Fix</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h10"/>
                </svg>
                <span className="text-[7px]" style={{ color: "rgba(255,255,255,0.3)" }}>Listing</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 relative">
                <div className="absolute -top-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1">
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                  </svg>
                </div>
                <span className="text-[7px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Ship</span>
              </div>
            </div>

            {/* Home indicator */}
            <div className="flex justify-center pb-[4%]">
              <div className="w-[35%] h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
            </div>
          </div>

          {/* Apple's official iPhone 16 Pro bezel PNG — on top */}
          <img
            src="/iphone-frame.png"
            alt=""
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
            draggable={false}
          />

          {/* Glare overlay */}
          <motion.div
            className="absolute pointer-events-none z-30"
            style={{
              top: "2.6%",
              left: "3.4%",
              right: "3.4%",
              bottom: "2.6%",
              borderRadius: "12.5% / 6.2%",
              background: glareBackground,
            }}
          />
        </div>

      </motion.div>
    </div>
  );
};

export default PhoneMockup;
