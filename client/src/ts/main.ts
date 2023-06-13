import { DrawData, DrawPhase, DrawingPlayer } from "./drawing";
import { DrawCommandBase, DrawCommand } from "./commands";
import { DrawToolBase, PolylineDrawTool, LineDrawTool, ToolType, CircleDrawTool, FloodFillDrawTool } from "./drawtools";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import "../css/style.css";

const DRAW_HUB_URL: string = "26.115.121.253:7777";

class DrawingApp {
    // TODO: Refactor canvases to single class (and move methods for drawing)
    private backCanvas: HTMLCanvasElement;
    private drawCanvas: HTMLCanvasElement;
    private backCtx: CanvasRenderingContext2D;
    private drawCtx: CanvasRenderingContext2D;
    private tools: Map<ToolType, DrawToolBase>;
    private commands: DrawCommandBase[];

    private connection: HubConnection;
    private players: Map<string, DrawingPlayer>;
    private localPlayer: DrawingPlayer;
    private localTool: number;

    constructor() {
        this.commands = [];
        this.players = new Map();
        this.tools = new Map();
        this.localTool = 0; // TODO: Make that all players holds only tool type, not tools itself
        this.backCanvas = document.getElementById("canvas-back") as HTMLCanvasElement;
        this.drawCanvas = document.getElementById("canvas-draw") as HTMLCanvasElement;
        this.backCtx = this.backCanvas.getContext("2d");
        this.drawCtx = this.drawCanvas.getContext("2d");
        this.connection = new HubConnectionBuilder().withUrl(`http://${DRAW_HUB_URL}/draw`).build();
        this.setupContext(this.backCtx);
        this.setupContext(this.drawCtx);
        this.prepareTools();
        this.createUserEvents();
        this.createHubEvents();
    }

    private setupContext(backCtx: CanvasRenderingContext2D) {
        backCtx.lineCap = "round";
        backCtx.lineJoin = "round";
        backCtx.strokeStyle = "red";
        backCtx.globalAlpha = 0.2;
        backCtx.lineWidth = 5;
    }

    private draw() {
        this.clearCanvas(this.drawCtx);
        for (let player of this.players.values()) {
            if (player.phase == DrawPhase.End)
                continue;
            const path = player.lastState.path;
            if (path != null) {
                this.drawCtx.stroke(path);
            }
        }
    }

    private clearCanvas(backCtx: CanvasRenderingContext2D) {
        backCtx.clearRect(0, 0, backCtx.canvas.width, backCtx.canvas.height);
    }

    private redraw() {
        this.backCtx.clearRect(0, 0, this.backCanvas.width, this.backCanvas.height);
        for (const command of this.commands)
            command.draw(this.backCtx);
    }

    private prepareTools() {
        this.tools.set(ToolType.Polyline, new PolylineDrawTool());
        this.tools.set(ToolType.Line, new LineDrawTool());
        this.tools.set(ToolType.Circle, new CircleDrawTool());
        this.tools.set(ToolType.FloodFill, new FloodFillDrawTool());
    }

    private createUserEvents() {
        this.drawCanvas.addEventListener("pointerdown", e => this.onPointerDown(e));
        this.drawCanvas.addEventListener("pointerup", e => this.onPointerUp(e));
        this.drawCanvas.addEventListener("pointermove", e => this.onPointerMove(e));
        this.drawCanvas.addEventListener("pointerout", e => this.onPointerOut(e));
        document.addEventListener("keydown", e => this.onKeyDown(e));
        this.drawCanvas.addEventListener("lostpointercapture", e => {console.log("lost pointer")});
        this.drawCanvas.addEventListener("gotpointercapture", e => {console.log("got pointer")});
    }

    private createHubEvents() {
        this.connection.start()
            .then(() => {
                const id = this.connection.connectionId;
                this.localPlayer = new DrawingPlayer(id, this.tools.get(ToolType.Polyline));
                this.players.set(id, this.localPlayer);
                this.connection.on("playerConnected", (id) => this.onPlayerConnected(id));
                this.connection.on("playerDisconnected", (id, msg) => this.onPlayerDisconnected(id, msg));
                this.connection.on("drawReceive", (id, data) => this.onDrawReceive(id, data));
            })
            .catch((err) => {
                console.error(err);
                console.log("Due to connection error starting offline session");
                const id = "offline";
                this.localPlayer = new DrawingPlayer(id, this.tools.get(ToolType.Polyline));
                this.players.set(id, this.localPlayer);
            });
    }

    private onPointerDown(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        this.localPlayer.phase = DrawPhase.Start;
        this.clearCanvas(this.drawCtx);
        this.connection.send("drawSend", this.createData(e, this.drawCtx, DrawPhase.Start));
        this.localPlayer.drawStart(this.drawCtx, Math.floor(e.offsetX), Math.floor(e.offsetY));
        console.log("pointer down");
    }

    private onPointerUp(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (this.localPlayer.phase == DrawPhase.End)
            return;
        this.localPlayer.phase = DrawPhase.End;
        this.clearCanvas(this.drawCtx);
        this.connection.send("drawSend", this.createData(e, this.drawCtx, DrawPhase.End));
        this.localPlayer.drawFinish(this.backCtx, Math.floor(e.offsetX), Math.floor(e.offsetY));
        console.log("pointer up");
    }

    private onPointerMove(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (this.localPlayer.phase == DrawPhase.End)
            return;
        this.localPlayer.phase = DrawPhase.Drawing;
        this.clearCanvas(this.drawCtx);
        this.connection.send("drawSend", this.createData(e, this.drawCtx, DrawPhase.Drawing));
        this.localPlayer.drawing(this.drawCtx, Math.floor(e.offsetX), Math.floor(e.offsetY));
    }

    private onPointerOut(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (this.localPlayer.phase == DrawPhase.End)
            return;
        this.clearCanvas(this.drawCtx);
        this.localPlayer.phase = DrawPhase.End;
        console.log("pointer out");
    }

    private onKeyDown(e: KeyboardEvent) {
        if (e.code == "KeyZ" && e.ctrlKey) {
            this.commands.splice(this.commands.length - 1, 1);
            this.redraw();
        }
        if (e.code == "Space") {
            this.localTool = (this.localTool + 1) % this.tools.size;
            this.localPlayer.tool = this.tools.get(this.localTool);
        }
        console.log("key down  Key: %s  Code: %s  Ctrl: %s  Shift: %s", e.key, e.code, e.ctrlKey, e.shiftKey);
    }

    private onPlayerConnected(id: string) {
        const player = new DrawingPlayer(id, this.tools.get(ToolType.Polyline));
        this.players.set(id, player);
        console.log("playerConnected  Id: %s", id);
    }

    private onPlayerDisconnected(id: string, msg?: string) {
        this.players.delete(id);
        console.log("playerDisconnected  Id: %s  Reason: %s", id, msg);
    }

    private onDrawReceive(id: string, data: DrawData) {
        let player: DrawingPlayer;
        if (!this.players.has(id)) {
            player = new DrawingPlayer(id, this.tools.get(ToolType.Polyline));
            this.players.set(id, player);
        }
        else {
            player = this.players.get(id);
        }
        switch (data.phase) {
            case DrawPhase.Start:
                player.drawStart(this.drawCtx, data.x, data.y);
                player.phase = DrawPhase.Start;
                this.draw();
                break;
            case DrawPhase.Drawing:
                player.drawing(this.drawCtx, data.x, data.y);
                player.phase = DrawPhase.Drawing;
                this.draw();
                break;
            case DrawPhase.End:
                player.drawFinish(this.backCtx, data.x, data.y);
                player.phase = DrawPhase.End;
                this.draw();
                break;
            default:
                throw new Error("onDrawReceive received unknown DrawPhase");
        }
    }

    // TODO: Probably better convert string hex color to uint32 and pass it
    private createData(e: PointerEvent, ctx: CanvasRenderingContext2D, phase: DrawPhase): DrawData {
        return { x: e.offsetX, y: e.offsetY, color: <string>ctx.strokeStyle, width: ctx.lineWidth, phase: phase };
    }
}

new DrawingApp();