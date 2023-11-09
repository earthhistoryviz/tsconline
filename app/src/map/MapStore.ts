// mapStore.ts
import { makeAutoObservable } from 'mobx'
import L from 'leaflet'
import 'leaflet-draw'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

class MapStore {
  map: L.Map | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  initializeMap(elementId: string) {
    if (!this.map) {
      this.map = L.map(elementId, {
        center: [0, 0], // Update this to your desired center
        zoom: 2, // Update the zoom level as needed
      });

      // Add a blank tile layer
      L.tileLayer('', { attribution: '...' }).addTo(this.map);

      // Initialize the Leaflet draw control and add it to the map
      const drawControl = new L.Control.Draw({
        draw: {
          polygon: false,
          polyline: false,
          rectangle: false,
          circle: false,
          marker: false,
        },
      });
      this.map.addControl(drawControl);

      this.map.on(L.Draw.Event.CREATED, (event) => {
        const layer = event.layer;
        this.map?.addLayer(layer);
      });
    }
  }

  disposeMap() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}

export const mapStore = new MapStore();
