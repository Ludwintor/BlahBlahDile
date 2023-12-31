﻿using Microsoft.AspNetCore.SignalR;

namespace BlahBlahDile.Hubs
{
    public class DrawHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            await Clients.Others.SendAsync("playerConnected", Context.ConnectionId);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await Clients.Others.SendAsync("playerDisconnected", Context.ConnectionId, exception?.Message);
        }

        [HubMethodName("drawSend")]
        public async ValueTask Draw(DrawData data)
        {
            await Clients.Others.SendAsync("drawReceive", Context.ConnectionId, data);
        }

        [HubMethodName("pickToolSend")]
        public async ValueTask PickTool(ToolType tool)
        {
            await Clients.Others.SendAsync("pickToolReceive", Context.ConnectionId, tool);
        }

        [HubMethodName("undoSend")]
        public async ValueTask Undo()
        {
            await Clients.Others.SendAsync("undoReceive", Context.ConnectionId);
        }

        [HubMethodName("chatMessageSend")]
        public async ValueTask ChatMessage(string message)
        {
            await Clients.All.SendAsync("chatMessageReceive", Context.ConnectionId, message);
        }

        public class DrawData
        {
            public int X { get; set; }
            public int Y { get; set; }
            public string? Color { get; set; }
            public int Width { get; set; }
            public DrawPhase Phase { get; set; }

            public enum DrawPhase
            {
                Start,
                Drawing,
                End
            }
        }

        public enum ToolType
        {
            Polyline,
            Line,
            Circle,
            Floodfill
        }
    }
}
