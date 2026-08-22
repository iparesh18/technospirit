import { useEffect } from "react";

/**
 * Per-route document title and meta description. Keeps each page individually
 * addressable for search and for screen readers announcing the document name.
 */
export default function usePageMeta({ title, description }) {
  useEffect(() => {
    if (title) document.title = title;

    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }
  }, [title, description]);
}
