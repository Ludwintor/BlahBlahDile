import { DrawCommand } from "./commands";
import { DrawState, DrawToolBase, Point } from "./drawtools";

export class Canvas {
    private _tempCanvas: HTMLCanvasElement;
    private _canvas: HTMLCanvasElement;
    private _tempCtx: CanvasRenderingContext2D;
    private _ctx: CanvasRenderingContext2D;

    public constructor(tempCanvas: HTMLCanvasElement, canvas: HTMLCanvasElement) {
        this._tempCanvas = tempCanvas;
        this._canvas = canvas;
        this._tempCtx = tempCanvas.getContext("2d");
        this._ctx = canvas.getContext("2d");
        this.setupContext(this._tempCtx);
        this.setupContext(this._ctx);
    }

    public get width(): number {
        return this._canvas.width;
    }

    public get height(): number {
        return this._canvas.height;
    }

    public get tempCtx(): CanvasRenderingContext2D {
        return this._tempCtx;
    }

    public get ctx(): CanvasRenderingContext2D {
        return this._ctx;
    }

    public get strokeColor(): string {
        return <string>this._ctx.strokeStyle;
    }

    public set strokeColor(color: string) {
        this._ctx.strokeStyle = color;
        this._tempCtx.strokeStyle = color;
    }

    public get lineWidth(): number {
        return this._ctx.lineWidth;
    }

    public set lineWidth(width: number) {
        this._ctx.lineWidth = width;
        this._tempCtx.lineWidth = width;
    }

    public get alpha(): number {
        return this._ctx.globalAlpha;
    }

    public set alpha(alpha: number) {
        this._ctx.globalAlpha = alpha;
        this._tempCtx.globalAlpha = alpha;
    }

    public clearTempCanvas() {
        this._tempCtx.clearRect(0, 0, this._tempCanvas.width, this._tempCanvas.height);
    }

    public clearCanvas() {
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }

    private setupContext(ctx: CanvasRenderingContext2D) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = 1;
    }
}

export class DrawingPlayer {
    private _id: string;
    private _tool: DrawToolBase;
    private _lastState: DrawState;
    private _redrawCommands: DrawCommand[];
    private _phase: DrawPhase;

    constructor(id: string, tool: DrawToolBase) {
        this._id = id;
        this._tool = tool;
        this._lastState = new DrawState();
        this._redrawCommands = [];
        this._phase = DrawPhase.End;
    }

    public get id(): string {
        return this._id;
    }

    public get tool(): DrawToolBase {
        return this._tool;
    }

    public get phase(): DrawPhase {
        return this._phase;
    }

    public set tool(value: DrawToolBase) {
        this._lastState.path = null;
        this._lastState.points = null;
        this._phase = DrawPhase.End;
        this._tool = value;
    }

    public get lastState(): DrawState {
        return this._lastState;
    }

    public drawStart(canvas: Canvas, x: number, y: number) {
        this._phase = DrawPhase.Start;
        this.applyState(canvas);
        this._tool.drawStart(canvas, new Point(x, y), this._lastState);
    }

    public drawing(canvas: Canvas, x: number, y: number) {
        this._phase = DrawPhase.Drawing;
        this.applyState(canvas);
        this._tool.drawing(canvas, new Point(x, y), this._lastState);
    }

    public drawFinish(canvas: Canvas, x: number, y: number) {
        this._phase = DrawPhase.End;
        this.applyState(canvas);
        this._tool.drawFinish(canvas, new Point(x, y), this._lastState);
        const command = new DrawCommand(this._tool, this._lastState);
        this._redrawCommands.push(command);
    }

    public draw(canvas: Canvas) {
        this.applyState(canvas)
        if (this._lastState.points.length > 0)
            this._tool.draw(canvas, this._lastState, this.phase);
    }

    public cancelDrawing() {
        this._phase = DrawPhase.End;
    }

    public redraw(canvas: Canvas) {
        for (const command of this._redrawCommands)
            command.draw(canvas);
    }

    public popCommand() {
        this._redrawCommands.pop();
    }

    private applyState(canvas: Canvas) {
        const state = this._lastState;
        canvas.strokeColor = state.color;
        canvas.lineWidth = state.lineWidth;
        canvas.alpha = state.alpha;
    }
}

export interface DrawData {
    x: number;
    y: number;
    color: string;
    width: number;
    alpha: number;
    phase: DrawPhase;
}

export enum DrawPhase {
    Start,
    Drawing,
    End
}