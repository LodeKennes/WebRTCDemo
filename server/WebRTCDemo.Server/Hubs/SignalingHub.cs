using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace WebRTCDemo.Server.Hubs
{
    public class SignalingHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            await Clients.All.SendAsync("UserConnected");
            await base.OnConnectedAsync();
        }

        public async Task Sdp(string message)
        {
            await Clients.Others.SendAsync("Sdp", message);
        }
        
        public async Task Ice(string message)
        {
            await Clients.Others.SendAsync("Ice", message);
        }
    }
}