import { CircleDrawTool, DrawState, DrawToolBase, Point } from "./drawtools";

export class DrawingPlayer {
    public phase: DrawPhase;

    private _id: string;
    private _tool: DrawToolBase;
    private _lastState: DrawState;

    constructor(id: string, tool: DrawToolBase) {
        this._id = id;
        this._tool = tool;
        this._lastState = new DrawState();
        this.phase = DrawPhase.End;
    }

    public drawStart(ctx: CanvasRenderingContext2D, x: number, y: number) {
        this._tool.drawStart(ctx, new Point(x, y), this._lastState);
    }

    public drawing(ctx: CanvasRenderingContext2D, x: number, y: number) {
        this._tool.drawing(ctx, new Point(x, y), this._lastState);
    }

    public drawFinish(ctx: CanvasRenderingContext2D, x: number, y: number) {
        this._tool.drawFinish(ctx, new Point(x, y), this._lastState);
    }

    public get id(): string {
        return this._id;
    }

    public get tool(): DrawToolBase {
        return this._tool;
    }

    public set tool(value: DrawToolBase) {
        this._lastState.path = null;
        this._lastState.points = null;
        this.phase = DrawPhase.End;
        this._tool = value;
    }

    public get lastState(): DrawState {
        return this._lastState;
    }
}

export interface DrawData {
    x: number;
    y: number;
    color: string;
    width: number;
    phase: DrawPhase;
}

export enum DrawPhase {
    Start,
    Drawing,
    End
}