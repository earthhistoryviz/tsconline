import { Box, Button, Typography, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import { useState } from "react";
import styles from "./TSCAnimatedTabs.module.css";
import Color from "color";

type AnimatedTabsProps = {
  tabs: {
    id: string;
    label: string;
  }[];
  onChange?: (id: string) => void;
};

export const AnimatedTabs: React.FC<AnimatedTabsProps> = ({ tabs, onChange }) => {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const theme = useTheme();
  return (
    <Box
      className={styles.container}
      style={{
        backgroundColor: Color(theme.palette.button.main).alpha(0.15).string()
      }}>
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          onClick={() => {
            setActiveTab(tab.id);
            if (onChange) {
              onChange(tab.id);
            }
          }}
          className={styles.button}>
          {activeTab === tab.id && (
            <motion.span
              layoutId="bubble"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              className={styles.indicator}
              style={{
                backgroundColor: theme.palette.button.main
              }}
            />
          )}
          <Typography
            className={styles.label}
            sx={{
              color: activeTab === tab.id ? theme.palette.button.contrastText : theme.palette.text.primary
            }}>
            {tab.label}
          </Typography>
        </Button>
      ))}
    </Box>
  );
};
