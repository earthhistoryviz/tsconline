import React, { useEffect, useRef, useState } from "react";
import lottie, { AnimationItem } from "lottie-web";

type LottieIconButtonProps = {
  animationData: object;
  loop?: boolean;
  autoplay?: boolean;
  playOnClick?: boolean;
  width?: number;
  height?: number;
};
const Lottie: React.FC<LottieIconButtonProps> = ({
  animationData,
  loop = false,
  autoplay = false,
  playOnClick = false,
  width = 35,
  height = 35,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [animationInstance, setAnimationInstance] =
    useState<AnimationItem | null>(null);
  useEffect(() => {
    if (!ref.current || animationInstance) return;
    const anim = lottie.loadAnimation({
      container: ref.current,
      renderer: "svg",
      animationData: JSON.parse(JSON.stringify(animationData)),
      loop: loop,
      autoplay: autoplay,
    });
    setAnimationInstance(anim);
    return () => anim.destroy();
  }, [ref]);
  function onClick() {
    if (playOnClick) {
      animationInstance?.goToAndPlay(0);
    }
  }
  return (
    <div
      ref={ref}
      style={{ width: `${width}px`, height: `${height}px` }}
      onClick={onClick}
    />
  );
};

export default Lottie;
