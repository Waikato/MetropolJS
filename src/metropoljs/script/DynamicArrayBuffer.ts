export type ArrayConstructorType = Float32ArrayConstructor|
    Uint8ArrayConstructor|Uint16ArrayConstructor|Uint32ArrayConstructor;

export type ArrayType = Float32Array|Uint8Array|Uint16Array|Uint32Array;

const DYNAMIC_INITIAL_LENGTH = 4096;

export class DynamicArrayBuffer<C extends ArrayConstructorType,
                                          A extends ArrayType> {
  private array: A;

  private currentPosition = 0;

  private updatedClient: boolean = false;

  constructor(private arrayConstructor: C, private elementSize: number) {
    this.array =
        new (this.arrayConstructor)(DYNAMIC_INITIAL_LENGTH * elementSize) as A;
  }

  push(...args: number[]): number {
    if (args.length + this.currentPosition > this.array.length) {
      this.expand();
    }

    const lastPosition = this.currentPosition;

    this.array.set(args, this.currentPosition);

    this.currentPosition += args.length;

    return lastPosition;
  }

  set(args: number[], offset: number) {
    this.array.set(args, offset);
  }

  getArray(): A|null {
    if (this.updatedClient) {
      return null;
    } else {
      this.updatedClient = true;
      return this.array;
    }
  }

  count() {
    return this.currentPosition - 1;
  }

  get(idx: number): number {
    return this.array[idx];
  }

  private expand() {
    const newSize = this.array.length * 2;
    const newArray = new (this.arrayConstructor)(newSize);
    newArray.set(this.array, 0);
    this.array = newArray as A;
    this.updatedClient = false;
  }
}

export type Float32DynamicArray =
    DynamicArrayBuffer<Float32ArrayConstructor, Float32Array>;
export type Uint8DynamicArray =
    DynamicArrayBuffer<Uint8ArrayConstructor, Uint8Array>;
export type Uint16DynamicArray =
    DynamicArrayBuffer<Uint16ArrayConstructor, Uint16Array>;
export type Uint32DynamicArray =
    DynamicArrayBuffer<Uint32ArrayConstructor, Uint32Array>;