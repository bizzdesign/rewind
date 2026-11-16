/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UNIFY_GRAPHQL_URL?: string;
  readonly VITE_COGNITO_DOMAIN?: string;
  readonly VITE_COGNITO_USER_POOL_ID?: string;
  readonly VITE_COGNITO_CLIENT_ID?: string;
  /** Names or user ids of accounts that aren't people (comma-separated). */
  readonly VITE_REWIND_NOT_PEOPLE?: string;
}
