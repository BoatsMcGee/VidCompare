import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // Static site deployed to GitHub Pages under https://BoatsMcGee.github.io/VidCompare/
    // Forks: change paths.base below to match your repo name (GitHub Pages project sites
    // are served under /<repo-name>/).
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: undefined,
      precompress: false,
      strict: true
    }),
    paths: {
      base: '/VidCompare'
    },
    prerender: {
      // Screenshots are dropped in by CI (website/static/screenshots) and may be
      // absent in a fresh checkout; <img> references to them must not fail the build.
      handleHttpError: ({ path, message }) => {
        if (path.startsWith('/VidCompare/screenshots/')) {
          console.warn(`screenshot not present yet: ${path}`);
          return;
        }
        throw new Error(message);
      }
    }
  }
};

export default config;
