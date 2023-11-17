import React from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { observer } from 'mobx-react-lite';

const geoUrl = "/map";

const MapChart = observer(() => (
  <ComposableMap>
    <Geographies geography={geoUrl}>
      {({ geographies }) =>
        geographies.map(geo => (
          <Geography
            key={geo.rsmKey}
            geography={geo}
            onClick={() => {
              console.log(`Clicked on: ${geo.properties.name}`);
            }}
            style={{
              default: { outline: "none" },
              hover: { outline: "none" },
              pressed: { outline: "none" },
            }}
          />
        ))
      }
    </Geographies>
  </ComposableMap>
));
export default MapChart;