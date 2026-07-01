# BreezeX Cursor

A clone of the repository [ful1e5](https://github.com/ful1e5/BreezeX_Cursor)

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

Clone the BreezeX Cursor repository and navigate into the project root:

```Bash
git clone git@github.com:armaneousuf/Breeze-dark-custom-cursor.git
cd BreezeX_Cursor
```

#### 2. Install Project Dependencies

Use Yarn to install the node packages required for rendering:

```Bash
yarn install
```

For next steps use the deploy.sh script by executing `chmod +x deploy.sh` then `./deploy.sh`

> NOTE: deploy.sh won't be there by default. It's a script to automate the work so one have to create it or copy paste from this repo

or you can manually do next steps:

```Bash
yarn render
./build.sh # depends where the build.sh is
cp -r themes/BreezeX-Dark ~/.icons/
sudo cp -r themes/BreezeX-Dark /usr/share/icons/ # only needed if you need to change SDDM cursors too
```

## Login Screen (SDDM) Note

Your login screen runs under a system user and cannot access your home folder (~/.icons/). The deploy.sh script automatically handles copying your cursor theme to /usr/share/icons/ so that your cursor theme is available for the login screen.

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