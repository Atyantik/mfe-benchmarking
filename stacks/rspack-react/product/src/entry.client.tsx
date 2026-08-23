// A remote is never loaded standalone, but rsbuild needs an entry and MF needs it to
// contain no static import of a shared dep (trap 4). The CSS import is what makes rsbuild
// emit this remote's stylesheet; the shell links it per route.
export {};
