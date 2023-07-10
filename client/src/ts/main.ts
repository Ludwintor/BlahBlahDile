import { Canvas, DrawData, DrawPhase, DrawingPlayer } from "./drawing";
import { DrawToolBase, PolylineDrawTool, LineDrawTool, ToolType, CircleDrawTool, FloodFillDrawTool, EraserDrawTool } from "./drawtools";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import "../css/style.css";

const DRAW_HUB_URL = "http://26.115.121.253:7777/draw";
const DEFAULT_COLOR = "black";
const DEFAULT_WIDTH = 5;

class DrawingApp {
    private canvas: Canvas;
    private messagesHolder: HTMLElement;
    private chatForm: HTMLFormElement;
    private chatInput: HTMLInputElement;
    private colorInput: HTMLInputElement;
    private previousToolElement: HTMLDivElement;
    private tools: Map<ToolType, DrawToolBase>;

    private connection: HubConnection;
    private players: Map<string, DrawingPlayer>;
    private localPlayer: DrawingPlayer;

    constructor() {
        this.players = new Map();
        this.tools = new Map();
        const backCanvas = document.getElementById("canvas-back") as HTMLCanvasElement;
        const drawCanvas = document.getElementById("canvas-draw") as HTMLCanvasElement;
        this.canvas = new Canvas(drawCanvas, backCanvas);
        this.messagesHolder = document.getElementById("messages");
        this.chatForm = document.getElementById("chat-form") as HTMLFormElement;
        this.chatInput = document.getElementById("chat-input") as HTMLInputElement;
        this.colorInput = document.getElementById("color-picker") as HTMLInputElement;
        this.connection = new HubConnectionBuilder().withUrl(DRAW_HUB_URL).build();
        this.prepareTools();
        this.createUserEvents(drawCanvas);
        this.createHubEvents();
    }

    private redrawTemp() {
        this.canvas.clearTempCanvas();
        for (let player of this.players.values()) {
            if (player.phase == DrawPhase.End)
                continue;
            player.draw(this.canvas);
        }
    }

    private redraw() {
        this.canvas.clearCanvas();
        for (const player of this.players.values())
            player.redraw(this.canvas);
    }

    private prepareTools() {
        this.tools.set(ToolType.Polyline, new PolylineDrawTool());
        this.tools.set(ToolType.Line, new LineDrawTool());
        this.tools.set(ToolType.Circle, new CircleDrawTool());
        this.tools.set(ToolType.FloodFill, new FloodFillDrawTool());
        this.tools.set(ToolType.Eraser, new EraserDrawTool());
    }

    private createUserEvents(drawCanvas: HTMLCanvasElement) {
        drawCanvas.addEventListener("pointerdown", e => this.onPointerDown(e));
        drawCanvas.addEventListener("pointerup", e => this.onPointerUp(e));
        drawCanvas.addEventListener("pointermove", e => this.onPointerMove(e));
        drawCanvas.addEventListener("pointerout", e => this.onPointerOut(e));
        drawCanvas.addEventListener("pointercancel", e => this.onPointerUp(e));
        drawCanvas.addEventListener("contextmenu", e => this.onPointerUp(<PointerEvent>e));
        document.addEventListener("keydown", e => this.onKeyDown(e));
        document.addEventListener("pointerup", e => this.onPointerUp(e));
        drawCanvas.addEventListener("lostpointercapture", e => {console.log("lost pointer")});
        drawCanvas.addEventListener("gotpointercapture", e => {console.log("got pointer")});

        const colors = document.getElementById("colors").children;
        for (let i = 0; i < colors.length; i++) {
            const color = colors[i] as HTMLDivElement;
            color.addEventListener("pointerup", e => this.onColorSelected(e));
        }
        this.colorInput.addEventListener("input", e => this.onColorPicker(e));

        const tools = document.getElementById("tools").children;
        this.previousToolElement = tools[0] as HTMLDivElement;
        this.previousToolElement.classList.add("selected-tool");
        for (let i = 0; i < tools.length; i++) {
            const tool = tools[i] as HTMLDivElement;
            tool.addEventListener("pointerup", e => this.onToolSelected(e));
        }

        this.chatForm.addEventListener("submit", e => this.onMessageSubmit(e));
    }

    private createHubEvents() {
        this.connection.start()
            .then(() => {
                const id = this.connection.connectionId;
                this.localPlayer = this.createPlayer(id);
                this.connection.on("playerConnected", id => this.onPlayerConnected(id));
                this.connection.on("playerDisconnected", (id, msg) => this.onPlayerDisconnected(id, msg));
                this.connection.on("drawReceive", (id, data) => this.onDrawReceive(id, data));
                this.connection.on("pickToolReceive", (id, toolType) => this.onPickToolReceive(id, toolType));
                this.connection.on("undoReceive", id => this.onUndoReceive(id));
                this.connection.on("chatMessageReceive", (id, message) => this.createMessage(id, message));
            })
            .catch((err) => {
                console.error(err);
                console.log("Due to connection error starting offline session");
                const id = "offline";
                this.localPlayer = this.createPlayer(id);
            });
    }

    private onPointerDown(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        this.canvas.clearTempCanvas();
        this.connection.send("drawSend", this.createData(e, this.canvas, DrawPhase.Start));
        this.localPlayer.drawStart(this.canvas, Math.floor(e.offsetX), Math.floor(e.offsetY));
        this.redrawTemp();
        console.log("pointer down");
    }

    private onPointerUp(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (this.localPlayer.phase == DrawPhase.End)
            return;
        this.canvas.clearTempCanvas();
        this.connection.send("drawSend", this.createData(e, this.canvas, DrawPhase.End));
        this.localPlayer.drawFinish(this.canvas, Math.floor(e.offsetX), Math.floor(e.offsetY));
        this.localPlayer.draw(this.canvas);
        console.log("pointer up");
    }

    private onPointerMove(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (this.localPlayer.phase == DrawPhase.End)
            return;
        this.canvas.clearTempCanvas();
        this.connection.send("drawSend", this.createData(e, this.canvas, DrawPhase.Drawing));
        this.localPlayer.drawing(this.canvas, Math.floor(e.offsetX), Math.floor(e.offsetY));
        this.redrawTemp();
    }

    private onPointerOut(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (this.localPlayer.phase == DrawPhase.End)
            return;
        this.canvas.clearTempCanvas();
        this.localPlayer.cancelDrawing();
        console.log("pointer out");
    }

    private onKeyDown(e: KeyboardEvent) {
        if (e.code == "KeyZ" && e.ctrlKey) {
            this.connection.send("undoSend");
            this.localPlayer.popCommand();
            this.redraw();
        }
        console.log("key down  Key: %s  Code: %s  Ctrl: %s  Shift: %s", e.key, e.code, e.ctrlKey, e.shiftKey);
    }

    private onMessageSubmit(e: SubmitEvent) {
        e.preventDefault();
        const message = this.chatInput.value;
        if (message != "") {
            this.connection.send("chatMessageSend", message);
            this.chatInput.value = "";
        }
    }

    private createMessage(id: string, message: string) {
        const item = document.createElement("li");
        item.textContent = `Player ${id.slice(0, 4)}: ${message}`;
        this.messagesHolder.appendChild(item);
        this.messagesHolder.scrollTop = this.messagesHolder.scrollHeight;
    }

    private onColorSelected(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        const color = (<HTMLDivElement>e.target).style.backgroundColor;
        this.localPlayer.lastState.color = color;
    }

    private onColorPicker(e: Event) {
        this.localPlayer.lastState.color = this.colorInput.value;
    }

    private onToolSelected(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        const toolElement = e.currentTarget as HTMLDivElement;
        const tool = toolElement.getAttribute("data-tool");
        const toolType = ToolType[tool];
        if (toolType == null)
            return;
        this.connection.send("pickToolSend", toolType);
        this.localPlayer.tool = this.tools.get(toolType);
        this.previousToolElement.classList.remove("selected-tool");
        toolElement.classList.add("selected-tool");
        this.previousToolElement = toolElement;
        console.log("Current drawing tool: %s", toolType);
    }

    private onPlayerConnected(id: string) {
        this.createPlayer(id);
        console.log("playerConnected  Id: %s", id);
    }

    private onPlayerDisconnected(id: string, msg?: string) {
        this.players.delete(id);
        console.log("playerDisconnected  Id: %s  Reason: %s", id, msg);
    }

    private onDrawReceive(id: string, data: DrawData) {
        let player: DrawingPlayer;
        if (this.players.has(id)) {
            player = this.players.get(id);
        } else {
            player = this.createPlayer(id);
        }
        player.lastState.color = data.color;
        player.lastState.lineWidth = data.width;
        player.lastState.alpha = data.alpha;
        switch (data.phase) {
            case DrawPhase.Start:
                player.drawStart(this.canvas, data.x, data.y);
                this.redrawTemp();
                break;
            case DrawPhase.Drawing:
                player.drawing(this.canvas, data.x, data.y);
                this.redrawTemp();
                break;
            case DrawPhase.End:
                player.drawFinish(this.canvas, data.x, data.y);
                this.redrawTemp();
                player.draw(this.canvas);
                break;
            default:
                throw new Error("onDrawReceive received unknown DrawPhase");
        }
    }

    private onPickToolReceive(id: string, toolType: ToolType) {
        let player: DrawingPlayer;
        if (this.players.has(id)) {
            player = this.players.get(id);
        } else {
            player = this.createPlayer(id);
        }
        player.tool = this.tools.get(toolType);
        console.log("Player %s picked %s tool", id, ToolType[toolType]);
    }

    private onUndoReceive(id: string) {
        let player: DrawingPlayer;
        if (this.players.has(id)) {
            player = this.players.get(id);
        } else {
            player = this.createPlayer(id);
        }
        player.popCommand();
        this.redraw();
        console.log("Player %s used undo", id);
    }

    // TODO: Probably better convert string hex color to uint32 and pass it
    private createData(e: PointerEvent, canvas: Canvas, phase: DrawPhase): DrawData {
        return { x: e.offsetX, y: e.offsetY, color: canvas.strokeColor, width: canvas.lineWidth, alpha: canvas.alpha, phase: phase };
    }

    private createPlayer(id: string): DrawingPlayer {
        const player = new DrawingPlayer(id, this.tools.get(ToolType.Polyline));
        player.lastState.color = DEFAULT_COLOR;
        player.lastState.lineWidth = DEFAULT_WIDTH;
        this.players.set(id, player);
        return player;
    }
}

new DrawingApp();