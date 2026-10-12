import { mount } from 'svelte'
// Registers the WebdriverIO execute/mock bridge used by E2E tests
// (@wdio/tauri-service); inert outside a tauri-driver session.
import '@wdio/tauri-plugin'
import './styles/theme.css'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
