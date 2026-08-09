import nextConfig from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      // Natural English copy in JSX text (apostrophes, quotes) is fine —
      // don't force &apos;/&quot; escaping throughout the UI.
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
