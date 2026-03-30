import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const PhoneMockup = () => {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rawRotateX = useTransform(mouseY, [-0.5, 0.5], [22, 5]);
  const rawRotateY = useTransform(mouseX, [-0.5, 0.5], [3, 20]);
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
  const totalStages = 5;

  useEffect(() => {
    const durations = [2500, 2000, 2200, 2500, 4000];
    const timeout = setTimeout(() => {
      setStage((s) => (s + 1) % totalStages);
    }, durations[stage] ?? 2500);
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
          className="w-[400px] h-[90px] rounded-[50%]"
          style={{ background: "radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)", filter: "blur(30px)" }}
        />
      </motion.div>

      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10"
      >
        {/* Phone container */}
        <div className="relative w-[320px]" style={{ aspectRatio: "886 / 1808" }}>

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

            {/* App header */}
            <div className="px-5 pt-1 pb-2">
              <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#22c55e" }}>Shippabel</div>
              <motion.div
                key={stage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-[16px] font-bold mt-1 leading-tight"
                style={{ color: "#fff" }}
              >
                {stage === 0 && <>Scanning<br /><span style={{ color: "#22c55e" }}>MyFitApp...</span></>}
                {stage === 1 && <>Auto-fixing<br /><span style={{ color: "#22c55e" }}>5 issues...</span></>}
                {stage === 2 && <>Generating<br /><span style={{ color: "#22c55e" }}>store listing...</span></>}
                {stage === 3 && <>Submitting to<br /><span style={{ color: "#22c55e" }}>App Store...</span></>}
                {stage === 4 && <>You're<br /><span style={{ color: "#4ade80" }}>live! 🎉</span></>}
              </motion.div>
            </div>

            {/* Main card */}
            <div className="mx-3 rounded-2xl p-3.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <motion.div key={stage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                {stage <= 1 && (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[8px] font-medium tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Readiness Score</div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-[30px] font-bold" style={{ color: "#fff" }}>{stage === 0 ? "73" : "94"}</span>
                        <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>/100</span>
                      </div>
                    </div>
                    <div className="relative w-[46px] h-[46px]">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 50 50">
                        <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                        <motion.circle
                          cx="25" cy="25" r="20" fill="none"
                          stroke={stage === 0 ? "#f59e0b" : "#4ade80"}
                          strokeWidth="3" strokeLinecap="round" strokeDasharray={126}
                          animate={{ strokeDashoffset: stage === 0 ? 126 * 0.27 : 126 * 0.06 }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </svg>
                    </div>
                  </div>
                )}
                {stage === 2 && (
                  <div>
                    <div className="text-[8px] font-medium tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Store Listing</div>
                    <div className="text-[13px] font-bold" style={{ color: "#fff" }}>MyFitApp</div>
                    <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>Your AI-powered fitness companion</div>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {["fitness", "workout", "health", "tracker"].map((kw) => (
                        <span key={kw} className="text-[7px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#4ade80" }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {stage === 3 && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center text-[16px]" style={{ background: "rgba(255,255,255,0.08)" }}>🍎</div>
                    <div>
                      <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>Submitting to</div>
                      <div className="text-[13px] font-bold" style={{ color: "#fff" }}>App Store Connect</div>
                    </div>
                  </div>
                )}
                {stage === 4 && (
                  <div>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="h-10 w-10 rounded-2xl flex items-center justify-center text-[18px]" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>💪</div>
                      <div>
                        <div className="text-[13px] font-bold" style={{ color: "#fff" }}>MyFitApp</div>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[1,2,3,4,5].map(s => (
                            <svg key={s} width="9" height="9" viewBox="0 0 20 20" fill="#fbbf24"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                          ))}
                          <span className="text-[8px] ml-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>4.9</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="flex-1 rounded-xl p-2 text-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div className="text-[14px] font-bold" style={{ color: "#4ade80" }} animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }}>2,847</motion.div>
                        <div className="text-[7px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Downloads</div>
                      </div>
                      <div className="flex-1 rounded-xl p-2 text-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div className="text-[14px] font-bold" style={{ color: "#fff" }} animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}>$2.4K</motion.div>
                        <div className="text-[7px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>This month</div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Progress log */}
            <div className="mx-3 mt-2.5 rounded-2xl p-2.5 space-y-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: stage === 4 ? "#4ade80" : "linear-gradient(90deg, #22c55e, #16a34a)" }}
                  animate={{ width: `${[15, 45, 70, 90, 100][stage]}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <div className="space-y-1">
                {[
                  { text: "Settings checked", at: 0 },
                  { text: "5 problems fixed", at: 1 },
                  { text: "Store page written", at: 2 },
                  { text: "Privacy policy created", at: 2 },
                  { text: "App uploaded", at: 3 },
                ].map((line) => (
                  <motion.div
                    key={line.text}
                    animate={{ opacity: stage >= line.at ? 0.7 : 0.15 }}
                    className="text-[8px] font-mono"
                    style={{ color: stage >= line.at ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)" }}
                  >
                    {stage > line.at ? "✓" : stage === line.at ? "●" : "○"} {line.text}
                  </motion.div>
                ))}
                {stage >= 4 && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-[8px] font-mono font-semibold" style={{ color: "#4ade80" }}>
                    ✓ Live on App Store & Google Play
                  </motion.div>
                )}
              </div>
            </div>

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
