import { Canvas, DrawPhase } from "./drawing";
import { DrawState, DrawToolBase } from "./drawtools";

export class DrawCommand {
    private _tool: DrawToolBase;
    private _state: DrawState;

    public constructor(tool: DrawToolBase, state: DrawState) {
        this._tool = tool;
        this._state = state.clone();
    }

    public draw(canvas: Canvas) {
        canvas.strokeColor = this._state.color;
        canvas.lineWidth = this._state.lineWidth;
        canvas.alpha = this._state.alpha;
        this._tool.draw(canvas, this._state, DrawPhase.End);
    }
}