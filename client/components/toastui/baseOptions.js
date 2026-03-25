import codeSyntaxHighlight from "@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight-all.js";
import router from "../../router.js";

const customHTMLRenderer = {
  // Add id attribute to headings
  heading(node, { entering, getChildrenText, origin }) {
    const original = origin();
    if (entering) {
      original.attributes = {
        id: getChildrenText(node)
          .toLowerCase()
          .replace(/[^a-z0-9-\s]*/g, "")
          .trim()
          .replace(/\s/g, "-"),
      };
    }
    return original;
  },
  // Convert relative hash links to absolute links.
  // Only applies to true in-page anchors (e.g. #heading-id).
  // Hash-router paths like #/search?... are left unchanged so the
  // click handler in ToastViewer can navigate them via router.push().
  link(_, { entering, origin }) {
    const original = origin();
    if (entering) {
      const href = original.attributes.href;
      if (href.startsWith("#") && !href.startsWith("#/")) {
        const targetRoute = {
          ...router.currentRoute.value,
          hash: href,
        };
        original.attributes.href = router.resolve(targetRoute).href;
      }
    }
    return original;
  },
};

const baseOptions = {
  height: "100%",
  plugins: [codeSyntaxHighlight],
  customHTMLRenderer: customHTMLRenderer,
  // In this Electron desktop app all content is local.
  // The default sanitizer strips file:// URLs from img src, so we pass
  // the HTML through unchanged (same trust model as a native app).
  customHTMLSanitizer: (html) => html,
  usageStatistics: false,
};

export default baseOptions;
