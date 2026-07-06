/**
 * PhoneFrame — a pure CSS Android phone mockup with correct proportions
 * (punch-hole camera, gesture bar). Renders children (screenshot image)
 * inside the screen area. No Three.js, no Canvas, no external images.
 */

interface PhoneFrameProps {
  children?: React.ReactNode;
  width?: number | string;
  frameColor?: string;
  className?: string;
  compact?: boolean;
}

export const PhoneFrame = ({ children, width = "100%", frameColor = "#1d1d1f", className = "", compact = false }: PhoneFrameProps) => {
  return (
    <div className={className} style={{ width, aspectRatio: "430 / 882" }}>
      {/* Outer body */}
      <div
        className="relative w-full h-full"
        style={{
          borderRadius: "13% / 6.4%",
          background: `linear-gradient(145deg, ${lighten(frameColor, 20)}, ${frameColor}, ${lighten(frameColor, 10)})`,
          boxShadow: `
            0 20px 60px -15px rgba(0,0,0,0.3),
            0 10px 20px -5px rgba(0,0,0,0.15),
            inset 0 1px 0 ${lighten(frameColor, 30)},
            inset 0 -1px 0 rgba(0,0,0,0.2)
          `,
        }}
      >
        {/* Screen area */}
        <div
          className="absolute overflow-hidden"
          style={{
            top: "2.2%",
            left: "4.5%",
            right: "4.5%",
            bottom: "2.2%",
            borderRadius: "10% / 4.9%",
            background: "#000",
          }}
        >
          {children ?? (
            <div
              className="w-full h-full flex items-center justify-center text-center"
              style={{
                background: "linear-gradient(155deg, #7dd3fc 0%, #93c5fd 30%, #c4b5fd 65%, #d8b4fe 100%)",
              }}
            >
              {!compact && (
                <span style={{ color: "rgba(71,85,105,0.8)", fontSize: "clamp(8px, 2.5cqw, 14px)", fontWeight: 600, lineHeight: 1.3 }}>
                  Insert your<br />Screenshot
                </span>
              )}
            </div>
          )}
        </div>

        {/* Punch-hole camera */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "3.4%",
            width: "3.6%",
            aspectRatio: "1",
            borderRadius: "999px",
            background: "#000",
            boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.08)",
          }}
        />

        {/* Home indicator */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: "2.8%",
            width: "28%",
            height: "0.5%",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.2)",
          }}
        />

      </div>
    </div>
  );
};

function lighten(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0xff) + percent);
  const b = Math.min(255, (num & 0xff) + percent);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
