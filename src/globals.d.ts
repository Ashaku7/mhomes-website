// Type declarations for global CSS imports
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
