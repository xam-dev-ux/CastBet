// BigInt serialization polyfill for Next.js
// This allows BigInt values to be serialized in JSON

if (typeof BigInt !== 'undefined') {
  // @ts-ignore
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
}

export {};
