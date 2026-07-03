# Breeze-dark-custom-cursor

A personalized fork of [BreezeX_Cursor](https://github.com/ful1e5/BreezeX_Cursor) by ful1e5 — with icon fixes, hotspot corrections, and native Plasma 6.2+ scalable-cursor (`cursors_scalable`) support layered on top.

## Prerequisites (Fedora KDE)

Before compiling the theme from source, you must install the native development libraries, Node.js environment, and Python-based cursor-building tools.

Open your terminal and run the following command to install the required packages on Fedora:

```Bash
# 1. Install system development libraries, Node.js, and Yarn
sudo dnf install libX11-devel libXcursor-devel libpng-devel nodejs yarn python3-pip

# 2. Install clickgen (the engine used to build the cursors)
pip install --user clickgen
```

## Quick Start (From the Beginning)

If you are setting this up on a fresh machine or starting completely from scratch:

#### 1. Clone the Repository

Clone the repository and navigate into the project root:

```Bash
git clone git@github.com:armaneousuf/Breeze-dark-custom-cursor.git
cd Breeze-dark-custom-cursor
```

#### 2. Install Project Dependencies

Use Yarn to install the node packages required for rendering:

```Bash
yarn install
```

#### 3. Build and Deploy

Use the included `deploy.sh` script to automate the remaining steps:

```Bash
chmod +x deploy.sh
./deploy.sh
```

`deploy.sh` runs the following in order, then installs the theme:

```Bash
#!/usr/bin/env bash
set -e

yarn render                          # renders svg/ -> bitmaps/ (per-theme PNGs + colors)
./build.sh                           # builds classic XCursor themes into themes/
node scripts/generate-scalable.js    # generates Plasma-native SVG cursors (see below)

cp -r themes/BreezeX-Dark ~/.icons/
sudo cp -r themes/BreezeX-Dark /usr/share/icons/  # needed so SDDM (login screen) can also use the theme
```

The order matters: `yarn render` has to run before the scalable-generation step, since it reads pixel dimensions from the rendered PNGs in `bitmaps/` to calculate correct cursor scaling. And the scalable-generation step has to run **after** `./build.sh`, not before — `build.sh` deletes and rebuilds the `themes/` directory from scratch every time, which would wipe out the scalable cursors if they existed already.

## SVG Cursors (Plasma 6.2+) — Fixing Blurry Cursors at Large Sizes

Plasma 6.2 introduced a second, parallel cursor format called `cursors_scalable`, which sits alongside the classic XCursor bitmap folder inside a theme. Instead of picking the nearest pre-rendered bitmap size and stretching it (which is what causes blur at fractional display scaling or unusual cursor sizes), Plasma renders the cursor straight from SVG at whatever exact pixel size it needs — no interpolation, no blur, ever.

Full background and the on-disk format spec is here: [SVG cursors: everything that you need to know about them](https://blog.vladzahorodnii.com/2024/10/06/svg-cursors-everything-that-you-need-to-know-about-them/).

This repo's XCursor build pipeline (`build.sh`, `configs/*.toml`) doesn't know anything about that format on its own — `scripts/generate-scalable.js` is what generates it, as a second, additive output next to `themes/<Theme>/cursors/`:

```
themes/BreezeX-Dark/
├── cursors/              # classic XCursor bitmaps (unchanged, from build.sh)
└── cursors_scalable/     # Plasma-native SVG cursors (new, from generate-scalable.js)
```

**What the script does:** it reads the same source files the XCursor pipeline already uses — `svg/*.svg`, `render.json` (for per-theme color variants), and `configs/x.build.toml` (for hotspots, cursor names, and alias symlinks) — and builds a `cursors_scalable/<name>/{metadata.json, *.svg}` folder per cursor shape, recoloring each SVG to match the target theme.

**The one non-obvious gotcha, in case this ever needs debugging again:** each cursor's `metadata.json` needs a `nominal_size` value telling Plasma what pixel size the image represents. It's tempting to assume this should match the SVG's own `viewBox`, but it doesn't — it has to match the **actual pixel dimensions of the master PNG** that `clickgen` loads for that cursor in `bitmaps/<theme>/<cursor>.png` (confirmed directly from `clickgen`'s source, `parser/png.py`, which validates and scales hotspot coordinates against that file's real size). The two can differ per cursor — e.g. `left_ptr.svg`'s own `viewBox` is `16×16`, but its rendered master PNG is `257×257`. Using the wrong one makes every cursor render at a wildly incorrect size (too large, and it won't shrink no matter what size you pick in System Settings) — which is exactly the bug this script's `getNominalSize()` function exists to avoid, by reading the real PNG dimensions instead of guessing from the SVG.

**Two cursors are intentionally excluded:** `wait` and `left_ptr_watch` are animated (60 frames each, in `svg/wait/` and `svg/left_ptr_watch/`) and are left as XCursor-only for now — they still work exactly as before, just without the vector-scaling benefit. Worth revisiting later if it becomes worth the added complexity.

**Maintenance note:** if you add, rename, or re-hotspot a cursor in `configs/x.build.toml`, re-run `node scripts/generate-scalable.js` afterward (after `yarn render` and `./build.sh`) to keep `cursors_scalable` in sync — it isn't automatic.

## Login Screen (SDDM) Note

Your login screen runs under a system user and cannot access your home folder (`~/.icons/`). The `deploy.sh` script (above) handles this automatically by also copying the theme to `/usr/share/icons/`, which the SDDM system user *can* read.

> This repository is a personalized version of the original theme, modified for my specific workflow and preferences. It doubles as a practical showcase for high-fidelity custom cursors that stay sharp and pixel-perfect even during scaling or "shake-to-find" animations.

---

## Cursor Icons Gallery

| Icon                                              | Name               | Icon                                                | Name                | Icon                                            | Name              |
| ------------------------------------------------- | ------------------ | --------------------------------------------------- | -------------------- | ----------------------------------------------- | ----------------- |
| ![X_cursor](svg/X_cursor.svg)                     | X_cursor           | ![all-scroll](svg/all-scroll.svg)                   | all-scroll          | ![bd_double_arrow](svg/bd_double_arrow.svg)     | bd_double_arrow   |
| ![bottom_left_corner](svg/bottom_left_corner.svg) | bottom_left_corner | ![bottom_right_corner](svg/bottom_right_corner.svg) | bottom_right_corner | ![bottom_side](svg/bottom_side.svg)             | bottom_side       |
| ![center_ptr](svg/center_ptr.svg)                 | center_ptr         | ![col-resize](svg/col-resize.svg)                   | col-resize          | ![color-picker](svg/color-picker.svg)           | color-picker      |
| ![context-menu](svg/context-menu.svg)             | context-menu       | ![copy](svg/copy.svg)                               | copy                | ![cross](svg/cross.svg)                         | cross             |
| ![crossed_circle](svg/crossed_circle.svg)         | crossed_circle     | ![dnd_no_drop](svg/dnd_no_drop.svg)                 | dnd_no_drop         | ![dotbox](svg/dotbox.svg)                       | dotbox            |
| ![fd_double_arrow](svg/fd_double_arrow.svg)       | fd_double_arrow    | ![hand1](svg/hand1.svg)                             | hand1               | ![hand2](svg/hand2.svg)                         | hand2             |
| ![left_ptr](svg/left_ptr.svg)                     | left_ptr           | ![left_side](svg/left_side.svg)                     | left_side           | ![link](svg/link.svg)                           | link              |
| ![move](svg/move.svg)                             | move               | ![pencil](svg/pencil.svg)                           | pencil              | ![person](svg/person.svg)                       | person            |
| ![pin](svg/pin.svg)                               | pin                | ![pirate](svg/pirate.svg)                           | pirate              | ![plus](svg/plus.svg)                           | plus              |
| ![question_arrow](svg/question_arrow.svg)         | question_arrow     | ![right_ptr](svg/right_ptr.svg)                     | right_ptr           | ![right_side](svg/right_side.svg)               | right_side        |
| ![row-resize](svg/row-resize.svg)                 | row-resize         | ![sb_down_arrow](svg/sb_down_arrow.svg)             | sb_down_arrow       | ![sb_h_double_arrow](svg/sb_h_double_arrow.svg) | sb_h_double_arrow |
| ![sb_left_arrow](svg/sb_left_arrow.svg)           | sb_left_arrow      | ![sb_right_arrow](svg/sb_right_arrow.svg)           | sb_right_arrow      | ![sb_up_arrow](svg/sb_up_arrow.svg)             | sb_up_arrow       |
| ![sb_v_double_arrow](svg/sb_v_double_arrow.svg)   | sb_v_double_arrow  | ![top_left_corner](svg/top_left_corner.svg)         | top_left_corner     | ![top_right_corner](svg/top_right_corner.svg)   | top_right_corner  |
| ![top_side](svg/top_side.svg)                     | top_side           | ![vertical-text](svg/vertical-text.svg)             | vertical-text       | ![wayland-cursor](svg/wayland-cursor.svg)       | wayland-cursor    |
| ![xterm](svg/xterm.svg)                           | xterm              | ![zoom-in](svg/zoom-in.svg)                         | zoom-in             | ![zoom-out](svg/zoom-out.svg)                   | zoom-out          |