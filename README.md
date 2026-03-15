# RedBlurer

A program I use, as a BYOD student in school, to blur stuff when browsing social media in case anything that could raise the admins' eyebrows would show up on my feed, despite my 10+ hours of doomscrollong did not show any signs of this happening, but better safe than sorry. It is a Chrome extension that automatically blurs images and videos on specified websites, with options to reveal them on hover or keep them blurred for privacy.

You would enjoy tweaking it. Built by students, for students. 

> **Heads-up**
>
> This project is heavily vibe-coded (LLM-assisted). It may contain bugs, edge cases, and unpolished code paths. I would really appreciate community fixes, reviews, and refactors.

## Features

- Automatic blur on `<img>`, `<video>`, and background-image elements.
- Hover-to-reveal (optional), persistent unblur mode, and “never unblur on hover” safety mode.
- Pauses videos and blocks autoplay while blurred, even when sites try to force playback.
- Domain allowlist-style control: blur everywhere or only on selected hosts.
- Export/import configuration to keep settings in sync across browsers.

## Getting Started

1. Clone the repo:

   ```bash
   git clone https://github.com/lzccr/RedBlurer.git
   cd RedBlurer
   ```

2. Load the extension:

   - Open `chrome://extensions/`.
   - Enable **Developer mode**.
   - Click **Load unpacked** and select the `src` directory.

3. Pin the extension (optional) so the popup is a click away.

## Usage

- Use the popup toggle to enable/disable blurring globally.
- “Block on all sites” forces blurring everywhere; otherwise, provide one domain per line in the domain list.
- “Keep media unblurred” remembers once-revealed items.
- “Never unblur on hover” keeps everything blurred unless you disable the feature.
- Export/Import lets you save a JSON snapshot of settings.

## Contributing

LLM-generated code benefits from human review—please file issues, suggest improvements, or open pull requests. Tests, refactors, accessibility tweaks, and performance improvements are all welcome.

## License

Licensed under the [MIT License](LICENSE). See the license file for details.
