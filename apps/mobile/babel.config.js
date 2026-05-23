module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: [
    "@babel/plugin-transform-export-namespace-from",
    [
      "module-resolver",
      {
        root: ["./"],
        alias: {
          "@": "./src",
        },
        extensions: [".ios.ts", ".android.ts", ".ts", ".tsx", ".js", ".jsx", ".json"],
      },
    ],
  ],
};
