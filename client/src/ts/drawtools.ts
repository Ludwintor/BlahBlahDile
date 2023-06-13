export const enum ToolType {
    Polyline,
    Line,
    Circle,
    FloodFill
}

export abstract class DrawToolBase {
    protected _isPathApplicable: boolean = true;

    /**
     * Draws with tool on drawing start
     * 
     * @param ctx canvas context to draw on
     * @param point current drawing point
     * @param state saved state of current drawing sequence
     */
    public abstract drawStart(ctx: CanvasRenderingContext2D, point: Point, state: DrawState): void;
    /**
     * Draws with tool on continuous drawing
     * 
     * @param ctx canvas context to draw on
     * @param point current drawing point
     * @param state saved state of current drawing sequence
     */
    public abstract drawing(ctx: CanvasRenderingContext2D, point: Point, state: DrawState): void;
    /**
     * Draws with tool on drawing finish
     * 
     * @param ctx canvas context to draw on
     * @param point current drawing point
     * @param state saved state of current drawing sequence
     */
    public abstract drawFinish(ctx: CanvasRenderingContext2D, point: Point, state: DrawState): void;
    public pointsToPath(points: Point[]): Path2D { return null };
}

export class PolylineDrawTool extends DrawToolBase {
    public drawStart(ctx: CanvasRenderingContext2D, point: Point, state: DrawState): void {
        state.path = new Path2D();
        state.points = [];
        this.drawing(ctx, point, state);
    }

    public drawing(ctx: CanvasRenderingContext2D, point: Point, state: DrawState): void {
        state.path.lineTo(point.x, point.y);
        state.points.push(point);
        ctx.stroke(state.path);
    }

    public drawFinish(ctx: CanvasRenderingContext2D, point: Point, state: DrawState): void {
        this.drawing(ctx, point, state);
    }

    public pointsToPath(points: Point[]): Path2D {
        const path = new Path2D();
        for (const point of points) {
            path.lineTo(point.x, point.y);
        }
        return path;
    }
}

export class LineDrawTool extends DrawToolBase {
    public drawStart(ctx: CanvasRenderingContext2D, point: Point, state: DrawState): void {
        state.path = null;
        state.points = [];
        state.points.push(point);
        state.points.push(point);
    }

    public drawing(ctx: CanvasRenderingContext2D, point: Point, state: DrawState): void {
        state.path = new Path2D();
        const start = state.points[0];
        state.path.moveTo(start.x, start.y);
        state.path.lineTo(point.x, point.y);
        state.points[1] = point;
        ctx.stroke(state.path);
    }

    public drawFinish(ctx: CanvasRenderingContext2D, point: Point, state: DrawState): void {
        this.drawing(ctx, point, state);
    }

    public pointsToPath(points: Point[]): Path2D {
        console.assert(points.length == 2, "[LineDrawTool.pointsToPath()] there are %d points but expected 2", points.length);
        const path = new Path2D();
        const start = points[0];
        const end = points[1];
        path.moveTo(start.x, start.y);
        path.lineTo(end.x, end.y);
        return path;
    }
}

export class CircleDrawTool extends DrawToolBase {
    public drawStart(ctx: CanvasRenderingContext2D, point: Point, state: DrawState): void {
        state.path = null;
        state.points = [];
        state.points.push(point);
        state.points.push(point);
    }

    public drawing(ctx: CanvasRenderingContext2D, point: Point, state: DrawState): void {
        state.path = new Path2D();
        const start = state.points[0];
        state.path.arc(start.x, start.y, Point.distance(start, point), 0, 2 * Math.PI);
        state.points[1] = point;
        ctx.stroke(state.path);
    }

    public drawFinish(ctx: CanvasRenderingContext2D, point: Point, state: DrawState): void {
        this.drawing(ctx, point, state);
    }

    public pointsToPath(points: Point[]): Path2D {
        console.assert(points.length == 2, "[CircleDrawTool.pointsToPath()] there are %d points but expected 2", points.length);
        const path = new Path2D();
        const start = points[0];
        const end = points[1];
        path.arc(start.x, start.y, Point.distance(start, end), 0, 2 * Math.PI);
        return path;
    }
}

export class FloodFillDrawTool extends DrawToolBase {
    protected _isPathApplicable: boolean = false;

    public drawStart(ctx: CanvasRenderingContext2D, point: Point, state: DrawState): void {
        state.path = null;
        state.points = [];
    }

    public drawing(ctx: CanvasRenderingContext2D, point: Point, state: DrawState): void {
    }

    public drawFinish(ctx: CanvasRenderingContext2D, point: Point, state: DrawState): void {
        this.floodFill(ctx, point, state);
        state.points.push(point);
    }

    public pointsToPath(points: Point[]): Path2D {
        return null;
    }

    private floodFill(ctx: CanvasRenderingContext2D, start: Point, state: DrawState) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const image = ctx.getImageData(0, 0, width, height);
        const data = { pixels: new Uint32Array(image.data.buffer), width: width, height: height};
        const originColor = this.getColor(data, start.x, start.y);
        const newColor = this.hexToColor(<string>ctx.strokeStyle);
        if (originColor == newColor)
            return;
        const stack = new Array<Point>();
        stack.push(start);
        // TODO: prob use more optimal scan-and-fill algorithm
        while (stack.length > 0) {
            const point = stack.pop();
            let lx = point.x - 1;
            while (this.matchPixel(data, originColor, lx, point.y)) {
                this.setColor(data, lx, point.y, newColor);
                lx--;
            }
            let rx = point.x;
            while (this.matchPixel(data, originColor, rx, point.y)) {
                this.setColor(data, rx, point.y, newColor);
                rx++;
            }
            this.scan(data, originColor, lx, rx - 1, point.y + 1, stack);
            this.scan(data, originColor, lx, rx - 1, point.y - 1, stack);
        }
        ctx.putImageData(image, 0, 0);
    }

    private scan(data: ImageData, originColor: number, lx: number, rx: number, y: number, stack: Array<Point>) {
        let added = false;
        for (let x = lx; x <= rx; x++) {
            if (!this.matchPixel(data, originColor, x, y)) {
                added = false;
            } else if (!added) {
                stack.push(new Point(x, y))
                added = true;
            }
        }
    }

    private matchPixel(data: ImageData, originColor: number, x: number, y: number): boolean {
        return this.isInBounds(x, y, data.width, data.height) && originColor == this.getColor(data, x, y);
    }

    private getColor(data: ImageData, x: number, y: number): number {
        return data.pixels[y * data.width + x];
    }

    private setColor(data: ImageData, x: number, y: number, color: number) {
        data.pixels[y * data.width + x] = color;
    }

    private isInBounds(x: number, y: number, width: number, height: number): boolean {
        return x > 0 && x < width && y > 0 && y < height;
    }

    private hexToColor(hex: string): number {
        return this.swap32((parseInt(`${hex.substring(1)}33`, 16)));
    }

    private swap32(value: number): number {
        return ((value & 0xFF) << 24) |
               ((value & 0xFF00) << 8) |
               ((value >> 8) & 0xFF00) |
               ((value >> 24) & 0xFF);
    }
}

export class Point {
    public x: number;
    public y: number;

    public constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public static sqrDistance(a: Point, b: Point) {
        return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
    }

    public static distance(a: Point, b: Point) {
        return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
    }
}

export class DrawState {
    public path: Path2D;
    public points: Point[];
}

interface ImageData {
    pixels: Uint32Array;
    width: number;
    height: number;
}
