const major = Number(process.versions.node.split(".")[0]);

if (Number.isNaN(major) || major < 18 || major >= 23) {
  console.error(
    [
      "Unsupported Node.js version for frontend.",
      `Current: v${process.versions.node}`,
      "Required: >=18 <23 (recommended: 20 LTS).",
      "Switch Node version, then reinstall dependencies:"
    ].join("\n")
  );
  console.error("  1) nvm use 20");
  console.error("  2) rm -rf node_modules package-lock.json");
  console.error("  3) npm install");
  process.exit(1);
}
