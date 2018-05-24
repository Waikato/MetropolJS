import {Vector3} from 'three';

interface Triangle {
  a: Vector3;
  b: Vector3;
  c: Vector3;
  normal: Vector3;
}

export class STLFile {
  private _triangles: Triangle[] = [];

  addTriangle(a: Vector3, b: Vector3, c: Vector3, normal: Vector3) {
    this._triangles.push({a, b, c, normal});
  }

  addRectangle(
      a: Vector3, b: Vector3, c: Vector3, d: Vector3, normal: Vector3) {
    this.addTriangle(a, b, d, normal);
    this.addTriangle(a, d, c, normal);
  }

  export(): Uint8Array {
    const ret = new Uint8Array(this.getByteLength());

    const buff = Buffer.from(ret.buffer);

    let position = 80;

    buff.writeUInt32LE(this._triangles.length, (position += 4, position - 4));

    for (const triangle of this._triangles) {
      // Write normal
      buff.writeFloatLE(triangle.normal.x, (position += 4, position - 4));
      buff.writeFloatLE(triangle.normal.y, (position += 4, position - 4));
      buff.writeFloatLE(triangle.normal.z, (position += 4, position - 4));

      // Write normal
      buff.writeFloatLE(triangle.a.x, (position += 4, position - 4));
      buff.writeFloatLE(triangle.a.y, (position += 4, position - 4));
      buff.writeFloatLE(triangle.a.z, (position += 4, position - 4));

      // Write normal
      buff.writeFloatLE(triangle.b.x, (position += 4, position - 4));
      buff.writeFloatLE(triangle.b.y, (position += 4, position - 4));
      buff.writeFloatLE(triangle.b.z, (position += 4, position - 4));

      // Write normal
      buff.writeFloatLE(triangle.c.x, (position += 4, position - 4));
      buff.writeFloatLE(triangle.c.y, (position += 4, position - 4));
      buff.writeFloatLE(triangle.c.z, (position += 4, position - 4));

      position += 2;  // Empty attribute
    }

    return ret;
  }

  private getByteLength() {
    return (this._triangles.length * ((3 * 4 * 4) + 2)) + 4 + 80;
  }
}
