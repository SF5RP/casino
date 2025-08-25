import { keyframes } from "@mui/system";

// Анимация празднования с мягким покачиванием для найденной пары
export const celebrationAnimation = keyframes({
  "0%": {
    transform: "scale(1) rotate(0deg)",
    filter: "brightness(1)",
  },
  "25%": {
    transform: "scale(1.03) rotate(-2deg)",
    filter: "brightness(1.2)",
  },
  "50%": {
    transform: "scale(1.05) rotate(2deg)",
    filter: "brightness(1.3)",
  },
  "75%": {
    transform: "scale(1.03) rotate(-2deg)",
    filter: "brightness(1.2)",
  },
  "100%": {
    transform: "scale(1) rotate(0deg)",
    filter: "brightness(1)",
  },
});

// Анимация удаления с мягким покачиванием (красная)
export const deletionAnimation = keyframes({
  "0%": {
    boxShadow:
      "0 0 20px rgba(244, 67, 54, 0.9), 0 0 30px rgba(244, 67, 54, 0.6), 0 0 40px rgba(244, 67, 54, 0.4), inset 0 0 10px rgba(244, 67, 54, 0.3)",
    transform: "scale(1) rotate(0deg)",
  },
  "33%": {
    boxShadow:
      "0 0 20px rgba(244, 67, 54, 0.9), 0 0 30px rgba(244, 67, 54, 0.6), 0 0 40px rgba(244, 67, 54, 0.4), inset 0 0 10px rgba(244, 67, 54, 0.3)",
    transform: "scale(1.03) rotate(-3deg)",
  },
  "66%": {
    boxShadow:
      "0 0 20px rgba(244, 67, 54, 0.9), 0 0 30px rgba(244, 67, 54, 0.6), 0 0 40px rgba(244, 67, 54, 0.4), inset 0 0 10px rgba(244, 67, 54, 0.3)",
    transform: "scale(1.05) rotate(3deg)",
  },
  "100%": {
    boxShadow:
      "0 0 20px rgba(244, 67, 54, 0.9), 0 0 30px rgba(244, 67, 54, 0.6), 0 0 40px rgba(244, 67, 54, 0.4), inset 0 0 10px rgba(244, 67, 54, 0.3)",
    transform: "scale(1) rotate(0deg)",
  },
});
