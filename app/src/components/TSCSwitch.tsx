import { useState } from "react";
import "./TSCSwitch.css";

type SwitchProps = {
  isOn: boolean;
  handleToggle: () => void;
  label?: string;
  size?: "small" | "medium" | "large";
};
const Switch: React.FC<SwitchProps> = ({ isOn, handleToggle, label, size }) => {
  return (
    <div className="switch-container">
      <label className={`custom-switch ${size && `custom-switch-${size}`}`}>
        <input checked={isOn} onChange={handleToggle} className="switch-checkbox" type="checkbox" />
        <span className={`switch-button`} />
      </label>
      {label && <label>{label}</label>}
    </div>
  );
};

export default Switch;
