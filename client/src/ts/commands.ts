export abstract class DrawCommandBase {
    public abstract draw(ctx: CanvasRenderingContext2D): void;
}

export class DrawPolylineCommand extends DrawCommandBase {
    private path: Path2D;
    private color: string | CanvasGradient | CanvasPattern;
    private lineWidth: number;

    public constructor(path: Path2D, color: string | CanvasGradient | CanvasPattern, lineWidth: number) {
        super();
        this.path = path;
        this.color = color;
        this.lineWidth = lineWidth;
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke(this.path);
    }
}