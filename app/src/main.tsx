import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { context, initialContext } from './state';
import './main.css'
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <context.Provider value={initialContext}>

        <BrowserRouter>    
            <App />
        </BrowserRouter>

      </context.Provider>
    </React.StrictMode>,

)
