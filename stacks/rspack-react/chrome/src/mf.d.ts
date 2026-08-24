declare const __MF_HYDRATION__: 'off' | 'deferred-idle' | 'deferred-visible' | 'full';
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
