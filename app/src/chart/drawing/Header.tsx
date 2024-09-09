import { observer } from 'mobx-react-lite';
import { Layer, Text, Image } from 'react-konva';
import useImage from 'use-image';
import logo from "../../assets/TSCreatorLogo.png"
import { context } from '../../state';
import { useContext } from 'react';
import { StateService } from 'ag-grid-community/dist/types/core/misc/state/stateService';
export const Header = observer(function Header() {
    const { state } = useContext(context);
    const [image] = useImage(logo);
    return (
        <Layer>
        <Text
          x={state.chart.width / 2}
          y={20}
          text="Chart Title"
          fontSize={24}
          fontFamily="Arial"
          fill="black"
          width={200}
          align="center"
          offsetX={100} // Center the text based on its width
        />

        <Image
          image={image}
          x={20}
          y={20}
          width={50}
          height={50}
        />

        <Image
          image={image}
          x={state.chart.width - 70} 
          y={20}
          width={50}
          height={50}
        />
        </Layer>
    );
});