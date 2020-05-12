using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace WebRTCDemo.Server.Hubs
{
    public class SignalingHub : Hub
    {
        private static readonly ConcurrentDictionary<string, List<string>> ClientGroups;

        static SignalingHub()
        {
            ClientGroups = new ConcurrentDictionary<string, List<string>>();
        }

        private string GroupKey(bool remove)
        {
            string groupKey = null;
            foreach (var (key, value) in ClientGroups)
            {
                if (!value.Contains(Context.ConnectionId)) continue;
                groupKey = key;

                if (remove)
                {
                    value.Remove(Context.ConnectionId);
                }
                
                break;
            }

            return groupKey;
        }
        
        private IClientProxy UserGroup(bool remove = false)
        {
            var groupKey = GroupKey(remove);

            return groupKey != null ? Clients.Group(groupKey) : null;
        }
        
        private IClientProxy UserGroupOthers()
        {
            var groupKey = GroupKey(false);

            return groupKey != null ? Clients.OthersInGroup(groupKey) : null;
        }

        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();
        }

        public async Task JoinGroup(string groupName)
        {
            if (!ClientGroups.ContainsKey(groupName))
            {
                ClientGroups.TryAdd(groupName, new List<string>
                {
                    Context.ConnectionId
                });
            }
            else
            {
                ClientGroups[groupName].Add(Context.ConnectionId);
            }

            var group = ClientGroups[groupName];

            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            await Clients.Group(groupName).SendAsync("ClientJoined", Context.ConnectionId, group.Count, group);
        }

        public async Task Signal(string toId, string message)
        {
            await Clients.Client(toId).SendAsync("Signal", Context.ConnectionId, message);
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var userGroup = UserGroup();
            if (userGroup != null)
            {
                await userGroup.SendAsync("ClientLeft", Context.ConnectionId);
            }
            
            foreach (var (_, connections) in ClientGroups.Where(group => @group.Value.Contains(Context.ConnectionId)))
            {
                connections.Remove(Context.ConnectionId);
            }
            
            await base.OnDisconnectedAsync(exception);
        }
    }
}