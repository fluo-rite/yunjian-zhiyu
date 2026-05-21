const path = require("path");

const enrichedMarkdownRoot = path.resolve(__dirname, "node_modules/react-native-enriched-markdown");

function toCmakePath(targetPath) {
  return targetPath.replace(/\\/g, "/");
}

module.exports = {
  dependencies: {
    "react-native-enriched-markdown": {
      root: enrichedMarkdownRoot,
      platforms: {
        android: {
          sourceDir: toCmakePath(path.join(enrichedMarkdownRoot, "android")),
          cmakeListsPath: toCmakePath(
            path.join(enrichedMarkdownRoot, "android", "src", "main", "jni", "CMakeLists.txt"),
          ),
          packageImportPath: "import com.swmansion.enriched.markdown.EnrichedMarkdownTextPackage;",
          packageInstance: "new EnrichedMarkdownTextPackage()",
          libraryName: "EnrichedMarkdownTextSpec",
          componentDescriptors: [
            "EnrichedMarkdownTextComponentDescriptor",
            "EnrichedMarkdownComponentDescriptor",
            "EnrichedMarkdownTextInputComponentDescriptor",
          ],
        },
      },
    },
  },
};
