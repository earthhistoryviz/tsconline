import { Box, IconButton, useTheme } from "@mui/material";
import styles from "./TSCStepper.module.css";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { createGradient } from "../util/util";

type TSCStepperProps = {
  amountOfSteps: number;
  activeStep: number;
  setActiveStep: (step: number) => void;
  size?: number;
};
export const TSCStepper: React.FC<TSCStepperProps> = function TSCStepper({
  amountOfSteps,
  activeStep,
  setActiveStep,
  size
}) {
  const buttonSize = size ? `${size * 2}px` : "40px";
  const buttonDim = { width: buttonSize, height: buttonSize };
  const theme = useTheme();
  const gradient = createGradient(theme.palette.mainGradientLeft.main, theme.palette.mainGradientRight.main);
  return (
    <Box
      className={styles.container}
      sx={{
        gap: size ? `${size * 1.2}px` : "15px"
      }}>
      <IconButton sx={buttonDim} onClick={() => setActiveStep((activeStep - 1 + amountOfSteps) % amountOfSteps)}>
        <ChevronLeft sx={buttonDim} />
      </IconButton>
      {[...Array(amountOfSteps)].map((val, index) => (
        <Box
          key={index}
          onClick={() => setActiveStep(index)}
          className={styles.dot}
          sx={{
            transform: activeStep === index ? "scale(1.8)" : "scale(1)",
            ":hover": {
              transform: activeStep === index ? "scale(1.8)" : "scale(1.5)",
              backgroundColor: "button.main"
            },
            width: size || "10px",
            height: size || "10px",
            ...(activeStep === index ? { background: gradient.dark } : { backgroundColor: "disabled.main" })
          }}></Box>
      ))}
      <IconButton sx={buttonDim} onClick={() => setActiveStep((activeStep + 1) % amountOfSteps)}>
        <ChevronRight sx={buttonDim} />
      </IconButton>
    </Box>
  );
};
