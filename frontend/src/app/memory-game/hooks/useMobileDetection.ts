import { useEffect } from "react";

export const useMobileDetection = (
  setIsMobile: (isMobile: boolean) => void
) => {
  useEffect(() => {
    console.log("📱 useEffect определения мобильного устройства вызван");
    const checkMobile = () => {
      // Более надежное определение мобильного устройства
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice =
        /mobile|android|iphone|ipad|phone|tablet|blackberry|windows phone/i.test(
          userAgent
        ) ||
        window.innerWidth <= 768 ||
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0;

      console.log("📱 Определение мобильного устройства:", {
        userAgent: userAgent.substring(0, 100),
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        isMobileDevice,
        hasTouch: "ontouchstart" in window,
        maxTouchPoints: navigator.maxTouchPoints,
        isMobile: isMobileDevice,
      });
      console.log("📱 Устанавливаем isMobile в:", isMobileDevice);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    window.addEventListener("orientationchange", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("orientationchange", checkMobile);
    };
  }, [setIsMobile]);
};
