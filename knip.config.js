import preset from "./vendor/house-style/knip.json" with { type: "json" };

// knip has no `extends`, so this spreads the house preset. Wicket adds the entry knip can't find on its
// own (the docs capture helper, run by hand) and leaves out docs-site/, a package with its own checks, and design/, the redesign board's reference copy.
export default {
  ...preset,
  ignore: [...preset.ignore, "docs-site/**", "design/**"],
  workspaces: { ".": { entry: ["docs/images/*.mjs"] } },
};
