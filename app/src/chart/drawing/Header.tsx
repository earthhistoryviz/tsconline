import { observer } from "mobx-react-lite";
import { Layer, Text, Image } from "react-konva";
import useImage from "use-image";
import logo from "../../assets/TSCreatorLogo.png";
import { context } from "../../state";
import { useContext } from "react";
type HeaderProps = {
  title: string;
};
export const Header: React.FC<HeaderProps> = observer(function Header({ title }) {
  const { state } = useContext(context);
  const [image] = useImage(logo);
  const logoHeight = 50;
  const logoWidth = 50;
  const paddingX = 20;
  const paddingY = 20;
  const fontSize = 20;
  return (
    <Layer x={paddingX} y={paddingY}>
      <Text
        x={logoWidth}
        y={(logoHeight - fontSize) / 2}
        text={title}
        width={state.chart.width - 2 * (logoHeight + logoWidth)}
        fontSize={fontSize}
        fontFamily="Arial"
        fill="black"
        align="center"
        verticalAlign="center"
      />

      <Image image={image} width={logoWidth} height={logoHeight} />

      <Image image={image} x={state.chart.width - logoWidth - 2 * paddingX} width={logoWidth} height={logoHeight} />
    </Layer>
  );
});
