// A remote is never loaded standalone in this study, but rsbuild needs an entry and
// MF needs it to contain no static import of a shared dep (trap 4).
export {};
