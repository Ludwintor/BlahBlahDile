import { Point } from "./drawtools";

export abstract class DrawCommandBase {
    private _points: Point[];
    private _color: string;
    private _lineWidth: number;

    public constructor(points: Point[], color: string, lineWidth: number) {
        this._points = points;
        this._color = color;
        this._lineWidth = lineWidth;
    }

    public get points(): Point[] {
        return this._points;
    }

    public get color(): string {
        return this._color;
    }
    
    public get lineWidth(): number {
        return this._lineWidth;
    }

    public abstract draw(ctx: CanvasRenderingContext2D): void;
}

export class DrawCommand extends DrawCommandBase {
    private path: Path2D;

    public constructor(points: Point[], color: string, lineWidth: number, path: Path2D) {
        super(points, color, lineWidth);
        this.path = path;
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke(this.path);
    }
}

export class FillCommand extends DrawCommandBase {
    public draw(ctx: CanvasRenderingContext2D): void {
        throw new Error("Not implemented");
    }
}