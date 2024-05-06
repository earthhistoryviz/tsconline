import React from "react";
import "./TSCRadioGroup.css";
import { Radio, RadioProps, FormControl, FormLabel, RadioGroup, FormControlLabel, styled } from "@mui/material";

const BpIcon = styled('span')({
  borderRadius: '50%',
  width: 16,
  height: 16,
  boxShadow: '0 0 0 1px rgb(16 22 26 / 40%)',
  backgroundColor: '#f5f8fa',
  backgroundImage:'linear-gradient(180deg,hsla(0,0%,100%,.05),hsla(0,0%,100%,0))',
  '.Mui-focusVisible &': {
    outline: '2px auto rgba(19,124, 189, .6)',
    outlineOffset: 2,
  },
  'input:hover ~ &': {
    backgroundColor:'#d0dee7',
  },
  'input:disabled ~ &': {
    boxShadow: 'none',
    background: 'rgba(57,75,89,.5)',
  },
});

const BpCheckedIcon = styled(BpIcon)({
  backgroundColor: '#137cbd',
  backgroundImage: 'linear-gradient(180deg,hsla(0,0%,100%,.1),hsla(0,0%,100%,0))',
  '&::before': {
    display: 'block',
    width: 16,
    height: 16,
    backgroundImage: 'radial-gradient(#fff,#fff 28%,transparent 32%)',
    content: '""',
  },
  'input:hover ~ &': {
    backgroundColor: '#106ba3',
  },
});


function TSCRadio(props: RadioProps) {
  return (
    <Radio
      disableRipple
      color="default"
      checkedIcon={<BpCheckedIcon/>}
      icon={<BpIcon/>}
      {...props}
    />
  );
}

type TSCRadioGroupProps = {
  name: string;
  radioArray: {
    value: string;
    label: string;
    imageSrc?: string;
  }[];
};

export const TSCRadioGroup: React.FC<TSCRadioGroupProps> = ({ name, radioArray }) => {
  if (radioArray.length === 0) return null;
  return (
    <FormControl>
      <FormLabel>{name}</FormLabel>
      <RadioGroup defaultValue={radioArray[0].value} name="customized-radios">
        {radioArray.map((radio, index) => (
          <FormControlLabel
            key={index}
            value={radio.value}
            control={<TSCRadio />}
            label={
              <div style={{ display: "flex", alignItems: "center" }}>
                {radio.imageSrc && (
                  <img
                    src={radio.imageSrc}
                    alt={radio.label}
                    style={{ width: "20px", height: "20px", marginRight: "8px" }}
                  />
                )}
                {radio.label}
              </div>
            }
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
};
