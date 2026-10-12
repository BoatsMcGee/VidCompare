# Debugging VidCompare

This guide covers debugging the VidCompare Tauri application across all supported platforms.

## Prerequisites

### Windows
- **WebView2 Debugging**: Set environment variable `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222` before launching the app
- **Visual Studio** or **Build Tools** with C++ workload for `cppvsdbg` debugger
- **Rust toolchain** (MSVC target): `rustup target add x86_64-pc-windows-msvc`

### Linux
- **WebKit Inspector**: Set `WEBKIT_INSPECTOR_SERVER=127.0.0.1:9222` or use GTK inspector with `GTK_DEBUG=interactive`
- **GDB/LLDB** for Rust debugging
- **WebKitGTK** development packages

### macOS
- **Safari Web Inspector**: Enable "Show Develop menu in menu bar" in Safari → Settings → Advanced
- **LLDB** (included with Xcode Command Line Tools)
- **Rust toolchain**: `rustup target add aarch64-apple-darwin x86_64-apple-darwin`

## VS Code Debug Configurations

### 1. VidCompare: Debug Rust (CodeLLDB, recommended)
Uses CodeLLDB's native `cargo` support to build and launch the app **once**, under the debugger. Its `preLaunchTask` (`ui: dev server`) starts the Vite dev server first and waits for the "Local: http://localhost:1420" banner, so the WebView loads the dev frontend. It also sets `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222` so the WebView attach config works end-to-end.

### 2. VidCompare: Debug Rust (Windows)
Uses `cppvsdbg` (Visual Studio debugger, from the C/C++ extension pack) against a prebuilt debug binary (`preLaunchTask: cargo build (debug)`). Also sets the WebView2 remote-debugging env var.

### 3. VidCompare: Attach to WebView
Attaches the VS Code JS debugger (Edge/WebView2) to the renderer on port 9222. Only works when the app was launched with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222` — both Rust debug configs above set this automatically.

**Linux**: Set `WEBKIT_INSPECTOR_SERVER=127.0.0.1:9222` or launch with GTK inspector (`GTK_DEBUG=interactive`).

**macOS**: Use Safari's Develop menu to inspect the WebView.

### 4. VidCompare: Full Stack Debug (Compound)
Runs **Debug Rust** + **Attach to WebView** together with `stopAll: true`. Exactly one app instance is launched (by the Rust config); the WebView config only attaches. F5 on the compound gives you Rust breakpoints and frontend debugging in one shot.

## Debugging the Frontend (Svelte/TypeScript)

### VS Code JavaScript Debug Terminal
1. Open a JavaScript Debug Terminal (Terminal → New JavaScript Debug Terminal)
2. Run `npm run dev` or `npm test`
3. Set breakpoints in `.svelte` and `.ts` files

### Vitest Debugging
- Run `npm test` in a JavaScript Debug Terminal
- Or use "npm: test" task with breakpoints in test files
- For watch mode: "npm: test:watch" task

### Source Maps
The Vite dev server serves source maps automatically. Ensure `sourceMaps: true` in attach configuration (already set).

## Debugging the Rust Backend

### Cargo Tasks
- **cargo check**: Quick type-checking without full build
- **cargo build (debug)**: Builds debug binary with symbols
- **cargo test**: Runs Rust unit/integration tests

### Setting Breakpoints
1. Open Rust files in `src-tauri/src/`
2. Set breakpoints in the editor
3. Launch "VidCompare: Debug Rust (LLDB)" or "Debug Rust (Windows)"
4. The debugger will stop at breakpoints when the Rust code executes

### Environment Variables for Rust
```bash
# Enable Tauri logging
RUST_LOG=debug
TAURI_LOG=debug

# Enable WebView2 logging (Windows)
WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222 --enable-logging=stderr --v=1
```

## Troubleshooting

### Port Conflicts
- **Port 1420**: Vite dev server. If occupied, Vite will use next available port. Update `devUrl` in `tauri.conf.json` and launch config `url` accordingly.
- **Port 9222**: WebView debugging. Ensure no other Chrome/Edge instance uses it.

### Source Maps Not Working
- Verify `sourceMaps: true` in attach configuration
- Check `webRoot` points to `${workspaceFolder}/src`
- Clear WebView2 cache: `%LOCALAPPDATA%\Microsoft\EdgeWebView\Application\*` (Windows)

### WebView2 Cache Issues (Windows)
```powershell
# Clear WebView2 user data
Remove-Item "$env:LOCALAPPDATA\Microsoft\EdgeWebView" -Recurse -Force -ErrorAction SilentlyContinue
```

### Rust Debugger Not Attaching
- Ensure debug binary exists: `cargo build` in `src-tauri/`
- For `cppvsdbg`: Verify Visual Studio C++ tools installed
- For LLDB: Install CodeLLDB extension, ensure `lldb` in PATH

### Tauri Dev Not Starting
- Check `npm run dev` works standalone
- Check `cargo check` passes in `src-tauri/`
- Verify `@tauri-apps/cli` installed: `npx tauri --version`

## Other IDEs

### JetBrains (IntelliJ IDEA / RustRover / WebStorm)
- **Frontend**: Use built-in JavaScript debugger, attach to `http://localhost:1420` or port 9222
- **Rust**: RustRover / IntelliJ Rust plugin with LLDB/GDB
- **Tauri**: No official plugin; run `npx tauri dev` in terminal

### Neovim (nvim-dap)
```lua
-- dap configuration for Tauri
require('dap').configurations.typescript = {
  {
    type = 'chrome',
    request = 'attach',
    name = 'Attach to VidCompare WebView',
    port = 9222,
    url = 'http://localhost:1420',
    webRoot = vim.fn.getcwd() .. '/src',
    sourceMaps = true,
  }
}

-- Rust via codelldb
require('dap').configurations.rust = {
  {
    name = 'Debug VidCompare Rust',
    type = 'codelldb',
    request = 'launch',
    program = vim.fn.getcwd() .. '/src-tauri/target/debug/vidcompare',
    cwd = vim.fn.getcwd() .. '/src-tauri',
  }
}
```
Install `mfussenegger/nvim-dap`, `mfussenegger/nvim-dap-python`, and `jay-babu/mason-nvim-dap.nvim` with `codelldb`.

### VS Code (Alternative: Tauri CLI)
```bash
# Direct Tauri dev with debugging
npx tauri dev --debug
```

## Quick Reference

| Task               | Command               | VS Code Task          |
| ------------------ | --------------------- | --------------------- |
| Start dev          | `npx tauri dev`       | `tauri dev`           |
| Build frontend     | `npm run build`       | `npm: build`          |
| Check Rust         | `cargo check`         | `cargo check`         |
| Build Rust (debug) | `cargo build`         | `cargo build (debug)` |
| Test Rust          | `cargo test`          | `cargo test`          |
| Test JS (once)     | `npm test`            | `npm: test`           |
| Test JS (watch)    | `npm test -- --watch` | `npm: test:watch`     |