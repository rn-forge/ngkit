# @rn-forge/ng/auth

Secondary entry point of `@rn-forge/ng`. It can be used by importing from `@rn-forge/ng/auth`.

`AuthBackendService` (used by `AuthComponent`'s login/logout) calls native
`HttpClient` directly and requires `backend.baseUrl` in `RnForgeAuthConfig` —
pass `''` for the current origin, or the backend's absolute URL:

```ts
provideRnForgeAuthConfig({
  backend: { baseUrl: '/api' },
});
```

It throws a clear error at construction if `backend.baseUrl` is left
`undefined`. Apps that never render `AuthComponent` don't need it.
