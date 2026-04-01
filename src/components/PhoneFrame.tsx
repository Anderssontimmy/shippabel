/**
 * PhoneFrame — A pure CSS iPhone mockup with correct proportions.
 * Renders children (screenshot image) inside the screen area.
 * No Three.js, no Canvas, no external images. Just CSS.
 */

interface PhoneFrameProps {
  children?: React.ReactNode;
  width?: number | string;
  frameColor?: string;
  className?: string;
}

export const PhoneFrame = ({ children, width = "100%", frameColor = "#1d1d1f", className = "" }: PhoneFrameProps) => {
  return (
    <div className={className} style={{ width, aspectRatio: "430 / 882" }}>
      {/* Outer body */}
      <div
        className="relative w-full h-full"
        style={{
          borderRadius: "15.5% / 7.6%",
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
            borderRadius: "12% / 5.8%",
            background: "#000",
          }}
        >
          {children ?? (
            <div
              className="w-full h-full flex items-center justify-center text-center"
              style={{
                background: "linear-gradient(155deg, #7dd3fc 0%, #93c5fd 30%, #c4b5fd 65%, #d8b4fe 100%)",
                color: "rgba(71,85,105,0.8)",
                fontSize: "clamp(8px, 2.5cqw, 14px)",
                fontWeight: 600,
                lineHeight: 1.3,
              }}
            >
              Insert your<br />Screenshot
            </div>
          )}
        </div>

        {/* Dynamic Island */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "3.5%",
            width: "24%",
            height: "2.8%",
            borderRadius: "999px",
            background: "#000",
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

        {/* Power button */}
        <div
          className="absolute"
          style={{
            right: "-1.8%",
            top: "22%",
            width: "1.2%",
            height: "9%",
            borderRadius: "0 2px 2px 0",
            background: `linear-gradient(180deg, ${lighten(frameColor, 15)}, ${frameColor})`,
          }}
        />

        {/* Volume buttons */}
        <div className="absolute" style={{ left: "-1.8%", top: "18%", width: "1.2%", height: "4%", borderRadius: "2px 0 0 2px", background: `linear-gradient(180deg, ${lighten(frameColor, 15)}, ${frameColor})` }} />
        <div className="absolute" style={{ left: "-1.8%", top: "24%", width: "1.2%", height: "7%", borderRadius: "2px 0 0 2px", background: `linear-gradient(180deg, ${lighten(frameColor, 15)}, ${frameColor})` }} />
        <div className="absolute" style={{ left: "-1.8%", top: "33%", width: "1.2%", height: "7%", borderRadius: "2px 0 0 2px", background: `linear-gradient(180deg, ${lighten(frameColor, 15)}, ${frameColor})` }} />
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
