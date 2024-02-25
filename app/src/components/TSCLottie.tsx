import React, { useEffect, useRef, useState } from "react";
import lottie, { AnimationItem } from "lottie-web";

type LottieIconButtonProps = {
  animationData: object;
  loop?: boolean;
  autoplay?: boolean;
  playOnClick?: boolean;
  width?: number;
  height?: number;
  speed?: number;
  playOnHover?: boolean;
};
const Lottie: React.FC<LottieIconButtonProps> = ({
  animationData,
  loop = false,
  autoplay = false,
  playOnClick = false,
  width = 35,
  height = 35,
  speed = 1,
  playOnHover = false
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [animationInstance, setAnimationInstance] = useState<AnimationItem | null>(null);
  useEffect(() => {
    if (!ref.current || animationInstance) return;
    const anim = lottie.loadAnimation({
      container: ref.current,
      renderer: "svg",
      animationData: JSON.parse(JSON.stringify(animationData)),
      loop: loop,
      autoplay: autoplay
    });
    anim.setSpeed(speed);
    setAnimationInstance(anim);
    return () => anim.destroy();
  }, [ref]);
  function onClick() {
    if (playOnClick) {
      animationInstance?.goToAndPlay(0);
    }
  }
  function onHover() {
    if (playOnHover) {
      animationInstance?.goToAndPlay(0);
    }
  }
  return (
    <div ref={ref} style={{ width: `${width}px`, height: `${height}px` }} onClick={onClick} onMouseEnter={onHover} />
  );
};

export default Lottie;
