"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

type ResponsivePosterPreviewProps = {
  children: ReactNode;
};

const POSTER_WIDTH = 1116;
const POSTER_HEIGHT = 1280;

export default function ResponsivePosterPreview({
  children,
}: ResponsivePosterPreviewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.55);

  useEffect(() => {
    function updateScale() {
      if (!wrapperRef.current) return;

      const availableWidth = wrapperRef.current.offsetWidth;
      const newScale = availableWidth / POSTER_WIDTH;

      setScale(newScale);
    }

    updateScale();

    window.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  return (
    <div className="w-full overflow-auto bg-slate-100 p-3 sm:p-5">
      <div
        ref={wrapperRef}
        className="mx-auto w-full max-w-[620px]"
      >
        <div
          className="relative overflow-hidden rounded-2xl bg-[#f5a1c5] shadow-2xl shadow-slate-900/20"
          style={{
            width: "100%",
            height: `${POSTER_HEIGHT * scale}px`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: `${POSTER_WIDTH}px`,
              height: `${POSTER_HEIGHT}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}