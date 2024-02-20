import { actions } from './index'
import { fetcher } from '../util';
// import fetchTimescaleData from "./TimeParser"
// import React, { useState, useEffect } from "react";
import { TimescaleItem } from '@tsconline/shared';


export async function initialize() {
    // If we're running in dev mode (yarn dev), then the app is not served from the same URL
    // as the server hosts the /charts endpoint.  So, we'll hard-code that for ourselves here.
    actions.fetchDatapackInfo();
    actions.fetchPresets();
    actions.fetchTimescaleDataAction();
  }