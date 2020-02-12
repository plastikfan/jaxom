
// Need to create definitions for untyped external libs here ...
//

declare module '*.xml';

declare module 'fs-monkey' {
  function patchFs(vol: any, fs: any);
}
