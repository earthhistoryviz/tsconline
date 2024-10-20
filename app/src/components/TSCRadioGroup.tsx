import React from "react";
import {
  Radio,
  RadioProps,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  styled,
  RadioGroupProps,
  Button,
  Box,
  Typography
} from "@mui/material";
import "./TSCRadioGroup.css";
const width = 10;
const height = 10;

const UncheckedIcon = styled("span")({
  borderRadius: "50%",
  width,
  height,
  boxShadow: "0 0 0 1px rgb(16 22 26 / 40%)",
  backgroundColor: "#f5f8fa",
  backgroundImage: "linear-gradient(180deg,hsla(0,0%,100%,.05),hsla(0,0%,100%,0))",
  ".Mui-focusVisible &": {
    outline: "2px auto rgba(19,124, 189, .6)",
    outlineOffset: 2
  },
  "input:hover ~ &": {
    backgroundColor: "#d0dee7"
  },
  "input:disabled ~ &": {
    boxShadow: "none",
    background: "rgba(57,75,89,.5)"
  }
});

const CheckedIcon = styled(UncheckedIcon)({
  backgroundColor: "#137cbd",
  backgroundImage: "linear-gradient(180deg,hsla(0,0%,100%,.1),hsla(0,0%,100%,0))",
  "&::before": {
    display: "block",
    width,
    height,
    backgroundImage: "radial-gradient(#fff,#fff 28%,transparent 32%)",
    content: '""'
  },
  "input:hover ~ &": {
    backgroundColor: "#106ba3"
  },
  "input:disabled ~ &": {
    boxShadow: "none",
    background: "rgba(57,75,89,.5)"
  }
});

function TSCRadio(props: RadioProps) {
  return <Radio disableRipple color="default" checkedIcon={<CheckedIcon />} icon={<UncheckedIcon />} {...props} />;
}

type TSCRadioGroupProps = {
  name?: string;
  value: string | null;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  radioArray: {
    value: string;
    label?: string;
    imageSrc?: string;
    defaultChecked?: boolean;
  }[];
  disabled?: boolean;
  direction?: "horizontal" | "vertical";
  headerMargin?: string;
} & RadioGroupProps;

export const TSCRadioGroup: React.FC<TSCRadioGroupProps> = ({
  name,
  radioArray,
  value,
  onChange,
  onClear,
  disabled,
  direction = "vertical",
  headerMargin = "5px",
  ...props
}) => {
  if (radioArray.length === 0) return null;
  return (
    <FormControl disabled={disabled}>
      {name && (
        <FormLabel sx={{ margin: headerMargin }} focused={false}>
          {name}
        </FormLabel>
      )}
      <RadioGroup
        {...props}
        value={value}
        onChange={onChange}
        name="customized-radios"
        style={{ flexDirection: direction === "horizontal" ? "row" : "column" }}>
        {radioArray.map((radio, index) => (
          <FormControlLabel
            key={index}
            className="radio-form-label"
            value={radio.value}
            control={<TSCRadio />}
            defaultChecked={radio.defaultChecked}
            label={
              <div className="radio-label-information">
                {radio.imageSrc && <img src={radio.imageSrc} alt={radio.label} className="radio-img-label" />}
                {radio.label}
              </div>
            }
          />
        ))}
      </RadioGroup>
      {onClear && (
        <Box className="clear-button-radio-group-container">
          <Button disableRipple onClick={() => onClear()} className="clear-button-tsc-radio-group">
            <Typography className="clear-button-radio-group-typography">Clear</Typography>
          </Button>
        </Box>
      )}
    </FormControl>
  );
};
