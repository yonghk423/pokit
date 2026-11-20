# AI mock portrait replacement

Generated 49 new fictional adult female lifestyle photographs using the built-in image_gen tool, with no input photographs or identity references. The complete final prompt set is in `prompts.json`; per-image generated PNG provenance is in `generated/`.

The workspace PNG masters are retained in `output/ai-mock-portraits-v1/masters/`. Final 1536×2048 quality-92 WebP files are in `assets/development/mock-diary/ai-portraits/`; the manifest records native generation dimensions separately from export dimensions, file hashes, and sizes. Review all 49 in `review.png`.

All 49 former `korean-*.webp` portrait files were removed from the bundled selected-photo folder and its manifest. The 50 portrait slots (one photo appears twice) now reference generated assets. Existing food, cafe, and scenery images remain unchanged.

Fresh `selected-ai-v1-` filenames avoid previous native image and thumbnail caches. Bootstrap migrates recognized old portrait artwork/original-artwork references by their actual filename, preserving text, scene order, personal photos, and photo-fit settings. Former portrait copies and cached previews are removed after all replacements are installed. Failed copies retry on the next bootstrap. All three former display-only portrait blur integrations were removed.

Validation: 49 distinct WebP hashes and dimensions verified; all mock asset references resolve; former portrait file count is zero. TypeScript passed. Five focused Jest suites / 23 tests passed, covering saved-reference migration, failure recovery, personal photo preservation, fixture paths, iOS container rebasing, and restored-scene rendering.

The currently installed Device Hub app still displayed its older bundled portraits during visual inspection. This change requires loading the updated bundle/build; the installed app was not rebuilt in this task.
