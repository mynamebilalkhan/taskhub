# taskhub-app
TaskHub Desktop App Based on Tauri

## Set up

### MacOS

TODO: Add details

### Windows

1) Install deps from: https://v1.tauri.app/v1/guides/getting-started/prerequisites/ (rust, WebView2, node).

```
$ rustc --version
rustc 1.82.0 (f6e511eec 2024-10-15)
$ npm --version
npx --v10.8.2
$ npx --version
10.8.2
```

2) Use Visual Studio (Open Local Folder, and navigate to the `taskhub/`).
3) Open x64 Native Tools Command Prompt
4) from root, run `npm install -g @tauri-apps/cli`
5) install `sqlite3` https://www.sqlite.org/download.html (from the folder you put the dll run `lib /DEF:sqlite3.def /OUT:sqlite3.lib /MACHINE:x64`; and do not forget to put this folder into PATH).

## Build && run

On Windows, please use prompt from `Tools->CommandLine`.

```
 $ npx tauri build
```

Find the exe at: `taskhub-app\taskhub\src-tauri\target\release\` (or `debug\`)

On MacOS (this is example of debug build, we recommned it for development/change it with path that matches your PC):
```
 $ npx tauri build --debug && taskhub/src-tauri/target/debug/taskhub
```

### Rebuild

Sometimes, when rebuilding, you will need something like:

```
$ cd src-tauri 
$ cargo clean
```

### Windows possible build issues

1. `hashbrown-0.11.2\src\set.rs` package may need `+ use core::clone::Clone;`

## Build for ios

```
$ cd taskhub
$ tauri ios init
$ rustup update

$ cd src-tauri
$ cargo clean
$ cargo build

$ npm install
$ npm install --save-dev @tauri-apps/cli @tauri-apps/api
% npx tauri ios init

# npm run tauri ios dev

```

## Example of UI

<img width="1512" alt="Screenshot 2025-04-28 at 20 25 38" src="https://github.com/user-attachments/assets/0d670ea1-7568-4465-b9ac-4fc3eb8fa7ff" />

<img width="1512" alt="Screenshot 2025-04-28 at 20 26 04" src="https://github.com/user-attachments/assets/21971200-e34c-4f90-a7f0-b4b12c135336" />

