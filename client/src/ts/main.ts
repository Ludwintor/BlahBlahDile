import { DrawData, DrawPhase, DrawingPlayer } from "./drawing";
import { DrawCommandBase, DrawPolylineCommand } from "./commands";
import { DrawToolBase, PolylineDrawTool, LineDrawTool } from "./drawtools";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import "../css/style.css";

const DRAW_HUB_URL: string = "26.115.121.253:7777";

class DrawingApp {
    // TODO: Refactor canvases to single class (and move methods for drawing)
    private backCanvas: HTMLCanvasElement;
    private drawCanvas: HTMLCanvasElement;
    private backCtx: CanvasRenderingContext2D;
    private drawCtx: CanvasRenderingContext2D;
    private isPainting: boolean;
    private commands: DrawCommandBase[];

    private connection: HubConnection;
    private players: Map<string, DrawingPlayer>;
    private localPlayer: DrawingPlayer;

    constructor() {
        this.isPainting = false;
        this.commands = [];
        this.players = new Map();
        this.backCanvas = document.getElementById("canvas-back") as HTMLCanvasElement;
        this.drawCanvas = document.getElementById("canvas-draw") as HTMLCanvasElement;
        this.backCtx = this.backCanvas.getContext("2d");
        this.drawCtx = this.drawCanvas.getContext("2d");
        this.connection = new HubConnectionBuilder().withUrl(`http://${DRAW_HUB_URL}/draw`).build();
        this.setupContext(this.backCtx);
        this.setupContext(this.drawCtx);
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
            const path = player.tool.path;
            if (path != null) {
                this.drawCtx.stroke(path);
            }
        }
    }

    private applyDraw(path: Path2D) {
        if (path != null) {
            this.backCtx.stroke(path);
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
        this.connection.on("playerConnected", (id) => this.onPlayerConnected(id));
        this.connection.on("playerDisconnected", (id, msg) => this.onPlayerDisconnected(id, msg));
        this.connection.on("drawReceive", (id, data) => this.onDrawReceive(id, data));
        
        this.connection.start()
            .then(() => {
                const id = this.connection.connectionId;
                this.localPlayer = new DrawingPlayer(id);
                this.players.set(id, this.localPlayer);
            })
            .catch((err) => {
                console.error(err);
                console.log("Due to connection error starting offline session");
                const id = "offline";
                this.localPlayer = new DrawingPlayer(id);
                this.players.set(id, this.localPlayer);
            });
    }

    private onPointerDown(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        this.isPainting = true;
        this.clearCanvas(this.drawCtx);
        let path = this.localPlayer.tool.drawStart(e.offsetX, e.offsetY);
        if (path != null) {
            this.drawCtx.stroke(path);
            this.connection.send("drawSend", this.createData(e, this.drawCtx, DrawPhase.Start));
        }
        console.log("pointer down");
    }

    private onPointerUp(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (!this.isPainting)
            return;
        this.isPainting = false;
        this.clearCanvas(this.drawCtx);
        let path = this.localPlayer.tool.drawFinish(e.offsetX, e.offsetY);
        if (path != null) {
            this.backCtx.stroke(path);
            this.commands.push(new DrawPolylineCommand(path, this.backCtx.strokeStyle, this.backCtx.lineWidth))
            this.connection.send("drawSend", this.createData(e, this.drawCtx, DrawPhase.End));
        }
        console.log("pointer up");
    }

    private onPointerMove(e: PointerEvent) {
        if (!this.isPainting)
            return;
        this.clearCanvas(this.drawCtx);
        let path = this.localPlayer.tool.drawing(e.offsetX, e.offsetY);
        if (path != null) {
            this.drawCtx.stroke(path);
            this.connection.send("drawSend", this.createData(e, this.drawCtx, DrawPhase.Drawing));
        }
    }

    private onPointerOut(e: PointerEvent) {
        if (!this.isPainting)
            return;
        this.clearCanvas(this.drawCtx);
        this.isPainting = false;
        console.log("pointer out");
    }

    private onKeyDown(e: KeyboardEvent) {
        if (e.code == "KeyZ" && e.ctrlKey) {
            this.commands.splice(this.commands.length - 1, 1);
            this.redraw();
        }
        console.log("key down  Key: %s  Code: %s  Ctrl: %s  Shift: %s", e.key, e.code, e.ctrlKey, e.shiftKey);
    }

    private onPlayerConnected(id: string) {
        const player = new DrawingPlayer(id);
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
            player = new DrawingPlayer(id);
            this.players.set(id, player);
        }
        else {
            player = this.players.get(id);
        }
        switch (data.phase) {
            case DrawPhase.Start:
                player.tool.drawStart(data.x, data.y);
                player.phase = DrawPhase.Start;
                this.draw();
                break;
            case DrawPhase.Drawing:
                player.tool.drawing(data.x, data.y);
                player.phase = DrawPhase.Drawing;
                this.draw();
                break;
            case DrawPhase.End:
                const path = player.tool.drawFinish(data.x, data.y);
                player.phase = DrawPhase.End;
                this.draw();
                this.applyDraw(path);
                break;
            default:
                throw new Error("onDrawReceive received unknown DrawPhase");
        }
    }

    private createData(e: PointerEvent, ctx: CanvasRenderingContext2D, phase: DrawPhase): DrawData {
        return { x: e.offsetX, y: e.offsetY, color: <string>ctx.strokeStyle, width: ctx.lineWidth, phase: phase };
    }
}

new DrawingApp();