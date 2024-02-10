import { assertChartConfigArray, assertIndexResponse, assertPresets, isServerResponseError } from '@tsconline/shared';
import { actions } from './index'
import { fetcher } from '../util';
import fetchTimescaleData from "../state/timeParser"
import React, { useState, useEffect } from "react";
import { TimescaleItem } from './state';

export async function initialize() {
  // If we're running in dev mode (yarn dev), then the app is not served from the same URL
  // as the server hosts the /charts endpoint.  So, we'll hard-code that for ourselves here.
  let response = await fetcher('/presets');
  const presets = await response.json();
  try {
    // console.log('Received response from server for presets: ', presets);
    assertPresets(presets);
    actions.loadPresets(presets);
    console.log('Presets loaded');
  } catch(e: any) {
    if (isServerResponseError(presets)) {
      console.log('Server FAILED to send presets with error: ', presets.error)
    } else {
    console.log('FAILED to retrieve presets.  Error was: ', e);
    }
  }
  response = await fetcher('/datapackinfoindex');
  const indexResponse = await response.json()
  try {
    assertIndexResponse(indexResponse)
    actions.loadIndexResponse(indexResponse)
    console.log('Datapacks loaded')
  } catch(e: any) {
    if (isServerResponseError(indexResponse)) {
      console.log('Server FAILED to send indexResponse with error: ', indexResponse.error)
    } else {
    console.log('FAILED to retrieve indexResponse.  Error was: ', e);
    }
  }

}

export const useTimescaleData = () => {
  const [timescaleData, setTimescaleData] = useState<TimescaleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // const { timescaleData, loading } = useTimescaleData();
  const [previousValues, setPreviousValues] = useState<Record<string, number | null>>({});

  useEffect(() => {
    const loadTimescaleData = async () => {
      try {
        const data = await fetchTimescaleData();
        setTimescaleData(data.stages || []);
        setLoading(false);
      } catch (error) {
        console.error('Error loading timescale data:', error);
        setLoading(false);
      }
    };
    loadTimescaleData(); 
  }, []);

  useEffect(() => {
    const calculatePreviousValues = () => {
      const previousValuesMap: Record<string, number | null> = {};
      timescaleData.forEach((item, index) => {
        if (index > 0) {
          previousValuesMap[item.key] = timescaleData[index - 1].value;
        } else {
          previousValuesMap[item.key] = null;
        }
      });
      setPreviousValues(previousValuesMap);
    };

    calculatePreviousValues();
  }, [timescaleData]);

  

  return { timescaleData, loading, previousValues };
};


