<template>
  <RouterLink
    :to="{
      name: 'search',
      query: {
        [params.searchTerm]: `#${tag}`,
        [params.sortBy]: searchSortOptions.title,
      },
    }"
    class="rounded-full bg-theme-brand px-2 text-xs text-white"
    @click.stop
    >#{{ tag }}</RouterLink
  >
</template>

<script setup>
import { RouterLink } from "vue-router";
defineProps({
  tag: String,
});
</script>
