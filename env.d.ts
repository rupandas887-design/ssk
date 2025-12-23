// Fix: Provide manual type declarations for environment variables to resolve the 'vite/client' reference error.
interface ImportMetaEnv {
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
