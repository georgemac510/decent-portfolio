// Type stub for @orbitdb/core, which ships as untyped JavaScript.
// We declare a permissive shape; the real types may eventually come from
// @orbitdb/core-types once that package stabilizes.

declare module '@orbitdb/core' {
    export function createOrbitDB(options: { ipfs: unknown; directory?: string; id?: string }): Promise<any>;
    export function IPFSAccessController(options?: { write?: string[] }): any;
    export function OrbitDBAccessController(options?: { write?: string[] }): any;
    export function Documents(options?: { indexBy?: string }): any;
  }