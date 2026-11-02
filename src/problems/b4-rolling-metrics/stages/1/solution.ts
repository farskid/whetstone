function checkValue(x: number) {
  if (typeof x !== 'number' || Number.isNaN(x)) throw new RangeError(`Expected a number, got ${String(x)}`);
}

export class RollingWindow {
  private buf: number[];
  private start = 0;
  private n = 0;
  private sum = 0;

  constructor(private size: number) {
    if (!(Number.isInteger(size) && size >= 1)) throw new RangeError('size must be a positive integer');
    this.buf = new Array(size);
  }

  push(x: number): void {
    checkValue(x);
    if (this.n === this.size) {
      this.sum -= this.buf[this.start];
      this.buf[this.start] = x;
      this.start = (this.start + 1) % this.size;
    } else {
      this.buf[(this.start + this.n) % this.size] = x;
      this.n++;
    }
    this.sum += x;
  }

  toArray(): number[] {
    return Array.from({ length: this.n }, (_, i) => this.buf[(this.start + i) % this.size]);
  }

  count(): number { return this.n; }
  avg(): number | undefined { return this.n ? this.sum / this.n : undefined; }
}
