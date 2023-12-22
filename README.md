# SSG POC

This provides an example for custom, bare-bones SSG of React pages that rely on React-Query for data fetching.

The app runs in the regular way (`npm run dev` based on Vite), but the `npm run ssg` custom npm script performs a custom SSG of per-character HTML files for every instance of the `<Character/>` component.

It accomplishes that by prefetching relevant queries, using the appropriate query keys, in a unified query client used by the page wrapper that renders each page.

Because these are all public pages and every query has a unique URL and key, there is zero need to create individual query clients per page.

> ⚠️ Prefetching currently parallelizes **all** queries ahead of the rendering loop, but this might be unduly large for production use-cases and would likely require batch processing with subsequent clearing to avoid OOM issues (and also provide progression feedback).
