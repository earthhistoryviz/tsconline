import { HTMLAttributes, useState } from "react";
import "./TSCCustomTabs.css";
type CustomTabsProps = {
  tabs: string[];
  value?: number;
  onChange?: (index: number) => void;
  width?: number;
  height?: number;
  tabIndicatorLength?: number;
  centered?: boolean;
  orientation?: "horizontal" | "vertical-left" | "vertical-right";
} & Omit<HTMLAttributes<HTMLDivElement>, "onChange">;
export const CustomTabs: React.FC<CustomTabsProps> = ({
  tabs,
  value = 0,
  orientation = "horizontal",
  width = 80,
  height = 40,
  tabIndicatorLength,
  centered = false,
  onChange,
  ...props
}) => {
  const [selectedTab, setSelectedTab] = useState<number>(value);
  const handleTabClick = (index: number) => {
    setSelectedTab(index);
  };
  height = Math.min(height, 100);
  width = Math.min(width, 200);
  let tabIndicatorLengthDiff;
  // to center the tab indicator
  if (orientation === "vertical-left" || orientation === "vertical-right") {
    tabIndicatorLength = tabIndicatorLength || height;
    tabIndicatorLengthDiff = Math.abs(tabIndicatorLength - height);
  } else {
    tabIndicatorLength = tabIndicatorLength || width;
    tabIndicatorLengthDiff = Math.abs(tabIndicatorLength - width);
  }
  const horizontalOrientation = {
    transform: `translateX(calc(${selectedTab * width}px + ${tabIndicatorLengthDiff / 2}px))`,
    height: `2px`,
    top: `${height}px`,
    width: `${tabIndicatorLength}px`
  };
  const verticalOrientation = {
    transform: `translateY(calc(${selectedTab * height}px + ${tabIndicatorLengthDiff / 2}px))`,
    height: `${tabIndicatorLength}px`,
    width: `2px`,
    left: `${orientation === "vertical-left" ? "0" : `${width}px`}`
  };
  return (
    <div className="tsc-custom-tabs" {...props}>
      <div className="tsc-tab-buttons" style={{ flexDirection: `${orientation === "horizontal" ? "row" : "column"}` }}>
        <div
          className={`tsc-tab-indicator`}
          style={orientation === "horizontal" ? horizontalOrientation : verticalOrientation}
        />
        {tabs.map((tab, index) => (
          <button
            key={tab}
            tabIndex={0}
            style={{
              width: `${width}px`,
              height: `${height}px`,
              textAlign: `${centered ? "center" : "left"}`,
              padding: `${centered ? "0" : orientation === "vertical-left" ? "10px 5px 10px 15px" : "10px 15px 10px 5px"}`
            }}
            className={`tsc-tab-panel ${selectedTab === index ? "tsc-tab-panel-selected" : ""}`}
            onClick={() => {
              handleTabClick(index);
              if (onChange) onChange(index);
            }}>
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};
