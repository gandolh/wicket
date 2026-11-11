import preset from "./vendor/house-style/knip.json" with { type: "json" };

// knip has no `extends`, so this spreads the house preset. Wicket adds the entry knip can't find on its
// own (the docs capture helper, run by hand) and leaves out docs-site/, a package with its own checks.
export default {
  ...preset,
  ignore: [...preset.ignore, "docs-site/**"],
  workspaces: { ".": { entry: ["docs/images/*.mjs"] } },
};
