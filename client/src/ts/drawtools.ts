export abstract class DrawToolBase {
    protected _path: Path2D;

    public abstract drawStart(x: number, y: number): Path2D;
    public abstract drawing(x: number, y: number): Path2D;
    public abstract drawFinish(x: number, y: number): Path2D;
    
    public get path(): Path2D {
        return this._path;
    }
}

export class PolylineDrawTool extends DrawToolBase {
    public drawStart(x: number, y: number): Path2D {
        this._path = new Path2D();
        this._path.lineTo(x, y);
        return this._path;
    }

    public drawing(x: number, y: number): Path2D {
        this._path.lineTo(x, y);
        return this._path;
    }

    public drawFinish(x: number, y: number): Path2D {
        this._path.lineTo(x, y);
        return this._path;
    }
}

export class LineDrawTool extends DrawToolBase {
    private startX: number;
    private startY: number;

    public drawStart(x: number, y: number): Path2D {
        this._path = null;
        this.startX = x;
        this.startY = y;
        return null;
    }
    public drawing(x: number, y: number): Path2D {
        this._path = new Path2D();
        this._path.moveTo(this.startX, this.startY);
        this._path.lineTo(x, y);
        return this._path;
    }
    public drawFinish(x: number, y: number): Path2D {
        return this._path;
    }

}

