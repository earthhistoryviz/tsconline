import { useContext } from 'react';
import { context } from './state';

export function Settings() {
  const { state, actions } = useContext(context);
  return (
    <div>
      This is the settings page.  You can paste settings here for now until we get the UI done:
      <br/>
      <textarea style={{ minWidth: '800px', height: '300px' }} onChange={evt => actions.settingsXML(evt.target.value)}>
        {state.settingsXML}
      </textarea>
    </div>
  );
}
