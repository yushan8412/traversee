/**
 * heic-decode ships no types. Declared narrowly to what this project calls
 * rather than as `any`, so a change in the library's shape fails the typecheck
 * instead of surfacing as a runtime error on somebody's upload.
 */
declare module 'heic-decode' {
  interface DecodeInput {
    buffer: Buffer | Uint8Array
  }

  interface DecodedImage {
    width: number
    height: number
    /** Raw RGBA pixels, four bytes each. */
    data: Uint8ClampedArray
  }

  export default function decode(input: DecodeInput): Promise<DecodedImage>
}
