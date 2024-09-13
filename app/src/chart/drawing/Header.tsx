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
  const { chartState } = useContext(context);
  const [image] = useImage(logo);
  return (
    <Layer x={chartState.header.paddingX} y={chartState.header.paddingY}>
      <Text
        x={chartState.header.logoWidth}
        y={(chartState.header.logoHeight - chartState.header.fontSize) / 2}
        text={title}
        width={chartState.width - 2 * (chartState.header.logoHeight + chartState.header.logoWidth)}
        fontSize={chartState.header.fontSize}
        fontFamily="Arial"
        fill="black"
        align="center"
        verticalAlign="center"
      />

      <Image image={image} width={chartState.header.logoWidth} height={chartState.header.logoHeight} />

      <Image
        image={image}
        x={chartState.width - chartState.header.logoWidth - 2 * chartState.header.paddingX}
        width={chartState.header.logoWidth}
        height={chartState.header.logoHeight}
      />
    </Layer>
  );
});
