(async function () {
    let stream;
    const peerConnectionConfig = {
        'iceServers': [
            { 'urls': 'stun:stun.services.mozilla.com' },
            { 'urls': 'stun:stun.l.google.com:19302' },
        ]
    };
    const rtcPeerConnections = {};

    const hubConnection = new signalR.HubConnectionBuilder()
        .withUrl("https://webrtcdemoserver.azurewebsites.net/signaling")
        .configureLogging(signalR.LogLevel.Debug)
        .build();

    hubConnection.on("ClientJoined", async function(id, count, clients) {
        // 2. Client joined
    });

    hubConnection.on("Signal", async function(from, message) {
        const signal = JSON.parse(message);

        // 3. Signal received
    });

    hubConnection.on("ClientLeft", async function(id) {
        delete rtcPeerConnections[id];
        const item = document.getElementById("video" + id);

        if (item === undefined) return;

        item.parentNode.removeChild(item);
    });

    document.getElementById("start").onclick = async function() {
        const roomid = document.getElementById("roomid").value;

        if (!roomid) return;

        const setup = document.getElementById("setup");
        setup.parentNode.removeChild(setup);

        // 1. Get user media
        
        await hubConnection.start();

        await hubConnection.send("JoinGroup", roomid);
    };
})();