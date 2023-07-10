export function hexToColor32(hex: string): number {
    return swapEndians((parseInt(hex.substring(1), 16)));
}

export class ImageData32 {
    private _pixels: Uint32Array;
    private _width: number;
    private _height: number;

    public constructor(image: ImageData) {
        this._pixels = new Uint32Array(image.data.buffer);
        this._width = image.width;
        this._height = image.height;
    }

    public get width(): number {
        return this._width;
    }

    public get height(): number {
        return this._height;
    }

    public getPixel(x: number, y: number): number {
        return this._pixels[y * this._width + x] >>> 0; // >>> 0 does something like "cast" to 32 bit int
    }

    public setPixel(x: number, y: number, color: number) {
        this._pixels[y * this._width + x] = color;
    }
    
    public setPixelHex(x: number, y: number, hexColor: string) {
        this._pixels[y * this._width + x] = hexToColor32(hexColor);
    }
}

function swapEndians(value: number): number {
    return ((value & 0xFF) << 24) |
        ((value & 0xFF00) << 8) |
        ((value >> 8) & 0xFF00) |
        ((value >> 24) & 0xFF);
}