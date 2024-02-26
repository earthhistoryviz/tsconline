import { BoxProps, Box } from "@mui/material";

export const TSCIcon = ({
  src,
  alt,
  size = "100px",
  ...props
}: {
  src: string;
  alt?: string;
  size?: number | string;
} & BoxProps) => {
  return (
    <Box
      {...props}
      component="img"
      src={src}
      alt={alt}
      sx={{
        width: size,
        height: size,
      }}
    />
  );
};
