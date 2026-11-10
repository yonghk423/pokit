# Storage audit — 2026-11-09

Read-only audit. No files or dependencies were removed.

## Local development storage

| Area | Size | Meaning |
|---|---:|---|
| .git | 1.9 GB | History: 1.59 GiB packed + 332 MiB loose objects; not installed app content. Do not delete history. |
| ios/Pods | 1.3 GB | Build dependencies including prebuilt React Native and Hermes archives; reinstallable but needed for native builds. |
| node_modules | 1.0 GB | Development dependencies; full directory is not shipped in the app. |
| .expo | 143 MB | Includes 121 MB development logs and 11 MB web cache. |
| output | 14 MB | Generated working output; inspect before cleanup. |
| coverage | 1.8 MB | Regenerable test coverage. |

## Asset inventory

725 files, 35.09 MiB. Files without static runtime references total 10.79 MiB, including licenses, generation inputs and remote theme sources. This is NOT a guaranteed app-size saving.

| Candidate | MiB | Review |
|---|---:|---|
| assets/wallpapers/ivory-linen-v1.png | 2.704 | No static runtime reference found; check dynamic paths before deletion. |
| assets/splash-artwork.png | 2.547 | No static runtime reference found; check dynamic paths before deletion. |
| assets/fonts/cafe24-shiningstar/License-Shiningstar.pdf | 1.937 | License/source documentation: preserve; can move outside app asset folder after checking terms. |
| assets/fonts/cafe24-syongsyong/License-Syongsyong.pdf | 1.838 | License/source documentation: preserve; can move outside app asset folder after checking terms. |
| assets/wallpapers/ivory-linen-v1.webp | 0.299 | No static runtime reference found; check dynamic paths before deletion. |
| assets/wallpapers/gray-duvet-v1.jpg | 0.287 | No static runtime reference found; check dynamic paths before deletion. |
| assets/control-illustrations/nikon-fm2-duvet.png | 0.220 | No static runtime reference found; check dynamic paths before deletion. |
| assets/wallpapers/gray-duvet-light-v2.jpg | 0.149 | No static runtime reference found; check dynamic paths before deletion. |
| assets/help-videos/results/writing.jpg | 0.123 | Guide generation inputs, dynamic script references; preserve if regenerating guides. |
| assets/calendar-illustrations/autumn-wind-test.webp | 0.091 | No static runtime reference found; check dynamic paths before deletion. |
| assets/control-illustrations/polaroid-overview-photo.webp | 0.090 | No static runtime reference found; check dynamic paths before deletion. |
| assets/activity-illustrations/prompts.md | 0.082 | No static runtime reference found; check dynamic paths before deletion. |
| assets/help-videos/photos/group.jpg | 0.070 | Guide generation inputs, dynamic script references; preserve if regenerating guides. |
| assets/help-videos/photos/landscape.jpg | 0.057 | Guide generation inputs, dynamic script references; preserve if regenerating guides. |
| assets/help-videos/photos/woman-2.jpg | 0.057 | Guide generation inputs, dynamic script references; preserve if regenerating guides. |
| assets/help-videos/photos/portrait.jpg | 0.034 | Guide generation inputs, dynamic script references; preserve if regenerating guides. |
| assets/help-videos/photos/woman.jpg | 0.033 | Guide generation inputs, dynamic script references; preserve if regenerating guides. |
| assets/help-videos/photos/man.jpg | 0.020 | Guide generation inputs, dynamic script references; preserve if regenerating guides. |
| assets/calendar-illustrations/city-animation-cover.webp | 0.015 | No static runtime reference found; check dynamic paths before deletion. |
| assets/calendar-illustrations/autumn-crosswalk/leaf.webp | 0.014 | May be remote theme upload source; not a deletion recommendation. |
| assets/calendar-illustrations/city-animation/02-office-presentation/leaf.webp | 0.014 | May be remote theme upload source; not a deletion recommendation. |
| assets/calendar-illustrations/city-animation/05-proud-promotion/leaf.webp | 0.014 | May be remote theme upload source; not a deletion recommendation. |
| assets/calendar-illustrations/city-animation/04-lunch-rooftop/leaf.webp | 0.014 | May be remote theme upload source; not a deletion recommendation. |
| assets/calendar-illustrations/city-animation/01-rush-hour-commute/leaf.webp | 0.014 | May be remote theme upload source; not a deletion recommendation. |
| assets/calendar-illustrations/city-animation/03-spilled-coffee-report/leaf.webp | 0.014 | May be remote theme upload source; not a deletion recommendation. |
| assets/.DS_Store | 0.012 | No static runtime reference found; check dynamic paths before deletion. |
| assets/widget/comic-check-checked.png | 0.006 | No static runtime reference found; check dynamic paths before deletion. |
| assets/fonts/cafe24-shiningstar/LICENSE.txt | 0.004 | License/source documentation: preserve; can move outside app asset folder after checking terms. |
| assets/fonts/cafe24-syongsyong/Cafe24Syongsyong-LICENSE.txt | 0.004 | License/source documentation: preserve; can move outside app asset folder after checking terms. |
| assets/tab-icons/today@3x.webp | 0.004 | No static runtime reference found; check dynamic paths before deletion. |
| assets/widget/comic-check-unchecked.png | 0.003 | No static runtime reference found; check dynamic paths before deletion. |
| assets/tab-icons/story-pen.svg | 0.003 | No static runtime reference found; check dynamic paths before deletion. |
| assets/tab-icons/story@3x.webp | 0.003 | No static runtime reference found; check dynamic paths before deletion. |
| assets/tab-icons/comic@3x.webp | 0.002 | No static runtime reference found; check dynamic paths before deletion. |
| assets/tab-icons/today@2x.webp | 0.002 | No static runtime reference found; check dynamic paths before deletion. |
| assets/tab-icons/story@2x.webp | 0.002 | No static runtime reference found; check dynamic paths before deletion. |
| assets/tab-icons/packed-backpack.svg | 0.001 | No static runtime reference found; check dynamic paths before deletion. |
| assets/tab-icons/comic@2x.webp | 0.001 | No static runtime reference found; check dynamic paths before deletion. |
| assets/textures/polaroid-handled-v1.md | 0.001 | No static runtime reference found; check dynamic paths before deletion. |
| assets/wallpapers/gray-duvet-v1.prompt.txt | 0.001 | No static runtime reference found; check dynamic paths before deletion. |
| assets/guide/README.md | 0.001 | No static runtime reference found; check dynamic paths before deletion. |
| assets/wallpapers/README.md | 0.001 | No static runtime reference found; check dynamic paths before deletion. |
| assets/fonts/cafe24-shiningstar/SOURCE.txt | 0.001 | License/source documentation: preserve; can move outside app asset folder after checking terms. |
| assets/tab-icons/today.webp | 0.001 | No static runtime reference found; check dynamic paths before deletion. |
| assets/fonts/ownglyph-corncorn/SOURCE.txt | 0.001 | License/source documentation: preserve; can move outside app asset folder after checking terms. |
| assets/help-videos/results/README.md | 0.001 | Guide generation inputs, dynamic script references; preserve if regenerating guides. |
| assets/wallpapers/gray-duvet-light-v2.prompt.txt | 0.001 | No static runtime reference found; check dynamic paths before deletion. |
| assets/tab-icons/story.webp | 0.001 | No static runtime reference found; check dynamic paths before deletion. |
| assets/tab-icons/comic.webp | 0.000 | No static runtime reference found; check dynamic paths before deletion. |
| assets/control-illustrations/personal-photo-invitation.prompt.txt | 0.000 | No static runtime reference found; check dynamic paths before deletion. |
| assets/fonts/cafe24-syongsyong/SOURCE.txt | 0.000 | License/source documentation: preserve; can move outside app asset folder after checking terms. |
| assets/control-illustrations/personal-photo-silhouette.prompt.txt | 0.000 | No static runtime reference found; check dynamic paths before deletion. |
| assets/control-illustrations/coming-soon-woman.prompt.txt | 0.000 | No static runtime reference found; check dynamic paths before deletion. |
| assets/control-illustrations/personal-camera-hands.prompt.txt | 0.000 | No static runtime reference found; check dynamic paths before deletion. |
| assets/control-illustrations/personal-photo-empty.prompt.txt | 0.000 | No static runtime reference found; check dynamic paths before deletion. |
| assets/activity-illustrations/index.html | 0.000 | No static runtime reference found; check dynamic paths before deletion. |
| assets/activity-illustrations/representatives.json | 0.000 | No static runtime reference found; check dynamic paths before deletion. |

## Used but large

- Polaroid textures: handled PNG 2.14 MiB + stock PNG 1.90 MiB. Re-encoding/downsizing requires visual verification; currently used.
- Fonts: Shiningstar ~3.7 MB, Syongsyong ~1.9 MB, Corncorn ~1.5 MB. Used fonts, not deletion candidates. Subsetting requires character coverage and licensing checks.
- Old AI guide videos/posters still referenced by HeroAiVideoGuide. Removing the gallery tab alone does not prove these are unreachable; complete import reachability analysis is needed before removal.

## Dependency review

Literal-reference candidates: @expo/config-plugins, @react-navigation/bottom-tabs, @react-navigation/elements, @react-navigation/native, expo-dev-client, expo-system-ui, react-dom, react-native-worklets.
None is confirmed removable: Expo native config, navigation peers, web runtime, worklets and dev client can require packages without application imports.

## Device storage accumulation

- illustrationCalendarAssets stores revisioned calendar downloads under documentDirectory/calendar-themes. Installation removes a specific legacy city-animation-v2 folder, not every older revision. Old revisions can remain until explicit removeIllustrationCalendarDownloads clears the root.
- Actual saved photos, imported AI files, orphaned files and image disk-cache sizes were not read from the device. Do not delete user photos based on repository references.

## Limits

- Static scan covers app/src/modules/plugins/config/scripts and Metro density variants. Dynamic references and inactive feature imports can produce false positives/negatives.
- No release bundle, IPA or APK was generated. Exact installed-app savings require release artifact inspection.
- Native generated icon/splash duplicates are normal resources. Do not remove just because their hashes match.
- JSON companion contains exact byte counts and duplicate groups.
