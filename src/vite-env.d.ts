/// <reference types="vite/client" />

/* Without this, `import.meta.env.BASE_URL` does not typecheck — the project
   had no vite/client reference at all, which only surfaced the first time
   anything read the build's base. */
