# Flatnotes Desktop

<p align="center">
<img src="docs/logo.svg" width="200px"></img>
</p>

**Flatnotes Desktop** is a standalone, cross-platform version of the popular [flatnotes](https://github.com/dullage/flatnotes) web app. By wrapping the original experience in Electron, I brought the experience to the desktop as a native application.

# Features

This is an **independent fork** and will not be merged back into the original web repository. My goal is to maintain the desktop experience as a distinct entity.
- **Stable Foundation:** Built on the **highly stable v5.5.4** of the original flatnotes.
- **Local-First:** Designed to live on your machine, providing a "native" feel without the need for a self-hosted server environment.
- **Self-Sustaining:** All future updates, features, and fixes are managed exclusively within this repository.
- **Database-less:** Your notes are just a folder of .md files on your hard drive.
- **Powerful Search:** Instant full-text indexing (shortcut /).
- **Clean UI:** Distraction-free interface with Light and Dark mode support.
- **No Lock-in:** Move your files to any other markdown editor at any time.

# Why Desktop?

I just really liked **flatnotes** and wanted it as a proper app on my computer. I figured if I wanted a version that didn't require a whole server setup just to write down a few thoughts, other people probably did too.

Other reasons:
- You shouldn't need to be a Docker expert or manage a web server just to take notes. This is "plug and play".
- No accounts, no login screens, and zero dependency on the internet.
- A dedicated window for Windows, macOS, and Linux that stays out of browsers.

# Technical changes
The original **flatnotes** uses the [Woosh](https://whoosh.readthedocs.io/en/latest/intro.html) Python library for its search engine. Which is great, but for a desktop app, I didn't want to force you to maintain a Python API or a backend just to search your notes. 

I swapped that out for [**Lunr.js**](https://lunrjs.com/), allowing:
- **Native Search**: Runs directly in the app using JavaScript
- **No dependencies**: No need for a Python, Pip or any other runtime installed on the system.
- **Quite fast & powerfull**: Builds the search index locally and allows advanced search like Woosh does.

# Current Status

- [x] Stripped Logic: Removed Docker, server-side dependencies, and web deployment assets.
- [x] Native Window: Electron wrapper successfully initialized.
- [x] Local Storage: App selects a default local folder on initial launch (%documents%/flatnotes)
- [x] Markdown Engine: Core editing and viewing capabilities are functional.
- [x] Resilience: Handle errors if the notes folder is moved or deleted.
- [x] Code Cleanup: Remove remaining Auth tokens and web-only functions.
- [x] Core Parity: Attachment support within desktop notes.
- [x] Branding: Flatnotes app icons instead of Electron's.
- [x] Core Parity: Search & Tagging support within desktop notes.

# TODO
- [ ] Distribution: Multi-platform builds (.exe, .dmg, .deb).

## Beta testing

The first **beta version (v0.1.0-beta.1)** is availabe for download in the [releases](https://github.com/henriquealho/flatnotes-desktop/releases) section. 

I would greatly appreciate your help in testing this version. If you encounter any bugs or have suggestions for improvements, please feel free to open an issue.

# Getting Started

Prerequisites

- Node.js (v16+)
- npm

**Installation**

```
# Clone the fork
git clone https://github.com/henriquealho/flatnotes-desktop.git
cd flatnotes-desktop

# Install dependencies
npm install

# Launch in development mode
npm run electron-dev

# Alternatively, you can use electronmon for hot-reloading
npx electronmon .
```

**Building distributables**

```
npm run make
```

Artifacts will be output to `out/make/`.

> ```bash
> # bash / CMD
> NODE_TLS_REJECT_UNAUTHORIZED=0 npx electron-forge make
> ```

# Credits

This project is a desktop wrapper of the original flatnotes created by [@dullage](https://github.com/dullage). All core note-taking logic belongs to the original upstream repository.
