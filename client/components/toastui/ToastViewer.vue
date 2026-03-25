<template>
  <div ref="viewerElement" @click.capture="handleClick"></div>
</template>

<script setup>
import Viewer from "@toast-ui/editor/dist/toastui-editor-viewer";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import baseOptions from "./baseOptions.js";
import extendedAutolinks from "./extendedAutolinks.js";

const props = defineProps({
  initialValue: String,
});

const viewerElement = ref();
const router = useRouter();

function handleClick(event) {
  const anchor = event.target.closest("a");
  if (!anchor) return;
  const href = anchor.getAttribute("href");
  // Intercept internal hash-router links (e.g. #/search?... or #/note/...)
  // and navigate via Vue Router instead of relying on browser href navigation.
  if (href && href.startsWith("#/")) {
    event.preventDefault();
    router.push(href.slice(1)); // strip leading '#' -> '/search?...'
  }
}

onMounted(() => {
  new Viewer({
    ...baseOptions,
    extendedAutolinks,
    el: viewerElement.value,
    initialValue: props.initialValue,
  });
});
</script>

<style>
@import "@toast-ui/editor/dist/toastui-editor-viewer.css";
@import "prismjs/themes/prism.css";
@import "@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight.css";
@import "./toastui-editor-overrides.scss";
</style>
