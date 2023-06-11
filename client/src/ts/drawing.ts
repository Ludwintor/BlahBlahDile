import { DrawToolBase, PolylineDrawTool } from "./drawtools";

export class DrawingPlayer {
    public phase: DrawPhase;

    private _id: string;
    private _tool: DrawToolBase

    constructor(id: string) {
        this._id = id;
        this._tool = new PolylineDrawTool(); // TODO: Generalize
        this.phase = DrawPhase.End;
    }

    public get id(): string {
        return this._id;
    }

    public get tool(): DrawToolBase {
        return this._tool;
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