import { Canvas, DrawPhase } from "./drawing";
import { hexToColor32, ImageData32 } from "./utils";

export enum ToolType {
    Polyline,
    Line,
    Circle,
    FloodFill,
    Eraser
}

export abstract class DrawToolBase {
    /**
     * Simulate draw with tool on drawing start event
     * 
     * @param canvas canvas to draw on
     * @param point current drawing point
     * @param state saved state of current drawing sequence
     */
    public abstract drawStart(canvas: Canvas, point: Point, state: DrawState): void
    /**
     * Simulate draw with tool on continuous drawing event
     * 
     * @param canvas canvas to draw on
     * @param point current drawing point
     * @param state saved state of current drawing sequence
     */
    public abstract drawing(canvas: Canvas, point: Point, state: DrawState): void
    /**
     * Simulate draw with tool on drawing finish event
     * 
     * @param canvas canvas to draw on
     * @param point current drawing point
     * @param state saved state of current drawing sequence
     */
    public abstract drawFinish(canvas: Canvas, point: Point, state: DrawState): void;
    /**
     * Actually draws with tool based on provided state
     * 
     * @param canvas canvas to draw on
     * @param state state that contains data to draw with
     */
    public abstract draw(canvas: Canvas, state: DrawState, phase: DrawPhase): void;

    protected getCtx(canvas: Canvas, phase: DrawPhase): CanvasRenderingContext2D {
        return phase == DrawPhase.End ? canvas.ctx : canvas.tempCtx;
    }
}

export class PolylineDrawTool extends DrawToolBase {
    public drawStart(canvas: Canvas, point: Point, state: DrawState): void {
        state.path = new Path2D();
        state.points = [];
        state.points.push(point);
    }

    public drawing(canvas: Canvas, point: Point, state: DrawState): void {
        state.points.push(point);
    }

    public drawFinish(canvas: Canvas, point: Point, state: DrawState): void {
        state.points.push(point);
    }

    public draw(canvas: Canvas, state: DrawState, phase: DrawPhase): void {
        if (state.path == null) {
            state.path = new Path2D();
            for (const point of state.points)
                state.path.lineTo(point.x, point.y);
        } else {
            const lastPoint = state.points[state.points.length - 1];
            state.path.lineTo(lastPoint.x, lastPoint.y);
        }
        this.getCtx(canvas, phase).stroke(state.path);
    }
}

export class LineDrawTool extends DrawToolBase {
    public drawStart(canvas: Canvas, point: Point, state: DrawState): void {
        state.path = null;
        state.points = [];
        state.points.push(point);
        state.points.push(point);
    }

    public drawing(canvas: Canvas, point: Point, state: DrawState): void {
        state.path = null;
        state.points[1] = point;
    }

    public drawFinish(canvas: Canvas, point: Point, state: DrawState): void {
        state.points[1] = point;
    }

    public draw(canvas: Canvas, state: DrawState, phase: DrawPhase): void {
        console.assert(state.points.length == 2, "[LineDrawTool.draw()] there are %d points but expected 2", state.points.length);
        if (state.path == null) {
            state.path = new Path2D();
            const start = state.points[0];
            const end = state.points[1];
            state.path.moveTo(start.x, start.y);
            state.path.lineTo(end.x, end.y);
        }
        this.getCtx(canvas, phase).stroke(state.path);
    }
}

export class CircleDrawTool extends DrawToolBase {
    public drawStart(canvas: Canvas, point: Point, state: DrawState): void {
        state.path = null;
        state.points = [];
        state.points.push(point);
        state.points.push(point);
    }

    public drawing(canvas: Canvas, point: Point, state: DrawState): void {
        state.path = null;
        state.points[1] = point;
    }

    public drawFinish(canvas: Canvas, point: Point, state: DrawState): void {
        state.points[1] = point;
    }

    public draw(canvas: Canvas, state: DrawState, phase: DrawPhase): void {
        console.assert(state.points.length == 2, "[CircleDrawTool.draw()] there are %d points but expected 2", state.points.length);
        if (state.path == null) {
            state.path = new Path2D();
            const start = state.points[0];
            const end = state.points[1];
            state.path.arc(start.x, start.y, Point.distance(start, end), 0, 2 * Math.PI);
        }
        this.getCtx(canvas, phase).stroke(state.path);
    }
}

// TODO: Try add support for Path2D caching (if possible)
export class FloodFillDrawTool extends DrawToolBase {
    public drawStart(canvas: Canvas, point: Point, state: DrawState): void {
        state.path = null;
        state.points = [];
    }

    public drawing(canvas: Canvas, point: Point, state: DrawState): void {
    }

    public drawFinish(canvas: Canvas, point: Point, state: DrawState): void {
        state.points.push(point);
    }

    public draw(canvas: Canvas, state: DrawState, phase: DrawPhase): void {
        console.assert(state.points.length == 1, "[FloodFillDrawTool.draw()] there are %d points but expected 1", state.points.length);
        this.floodFill(canvas, state);
    }

    private floodFill(canvas: Canvas, state: DrawState) {
        const start = state.points[0];
        const width = canvas.width;
        const height = canvas.height;
        const image = canvas.ctx.getImageData(0, 0, width, height);
        const data = new ImageData32(image);
        const originColor = data.getPixel(start.x, start.y);
        const newColor = hexToColor32(canvas.strokeColor + Math.floor(canvas.alpha * 255).toString(16));
        if (originColor == newColor)
            return;
        const stack = new Array<Point>();
        stack.push(start);
        // TODO: prob use more optimal scan-and-fill algorithm
        while (stack.length > 0) {
            const point = stack.pop();
            let lx = point.x - 1;
            while (this.matchPixel(data, originColor, lx, point.y)) {
                data.setPixel(lx, point.y, newColor);
                lx--;
            }
            let rx = point.x;
            while (this.matchPixel(data, originColor, rx, point.y)) {
                data.setPixel(rx, point.y, newColor);
                rx++;
            }
            this.scan(data, originColor, lx, rx - 1, point.y + 1, stack);
            this.scan(data, originColor, lx, rx - 1, point.y - 1, stack);
        }
        canvas.ctx.putImageData(image, 0, 0);
    }

    private scan(data: ImageData32, originColor: number, lx: number, rx: number, y: number, stack: Array<Point>) {
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

    private matchPixel(data: ImageData32, originColor: number, x: number, y: number): boolean {
        return this.isInBounds(x, y, data.width, data.height) && originColor == data.getPixel(x, y);
    }

    private isInBounds(x: number, y: number, width: number, height: number): boolean {
        return x > 0 && x < width && y > 0 && y < height;
    }
}

export class EraserDrawTool extends DrawToolBase {
    public drawStart(canvas: Canvas, point: Point, state: DrawState): void {
        state.path = new Path2D();
        state.points = [];
        state.points.push(point);
    }

    public drawing(canvas: Canvas, point: Point, state: DrawState): void {
        state.points.push(point);
    }

    public drawFinish(canvas: Canvas, point: Point, state: DrawState): void {
        state.points.push(point);
    }

    public draw(canvas: Canvas, state: DrawState, phase: DrawPhase): void {
        if (state.path == null) {
            state.path = new Path2D();
            for (const point of state.points)
                state.path.lineTo(point.x, point.y);
        } else {
            const lastPoint = state.points[state.points.length - 1];
            state.path.lineTo(lastPoint.x, lastPoint.y);
        }
        canvas.strokeColor = "white";
        if (phase == DrawPhase.End) {
            canvas.ctx.globalCompositeOperation = "destination-out";
            canvas.ctx.stroke(state.path);
            canvas.ctx.globalCompositeOperation = "source-over";
        } else {
            canvas.tempCtx.stroke(state.path);
        }
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
    public color: string;
    public lineWidth: number;
    public alpha: number;

    public clone(): DrawState {
        const state = new DrawState();
        state.path = this.path == null ? null : new Path2D(this.path);
        state.points = this.points.slice();
        state.color = this.color;
        state.lineWidth = this.lineWidth;
        state.alpha = this.alpha;
        return state;
    }
}
