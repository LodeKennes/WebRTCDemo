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
        for (const socketId of clients) {
            if (rtcPeerConnections[socketId] !== undefined || socketId === hubConnection.connectionId) continue;

            const connection = new RTCPeerConnection(peerConnectionConfig);
            rtcPeerConnections[socketId] = {
                connection
            };

            connection.onicecandidate = async function (event) {
                if (event.candidate === null) return;
                await hubConnection.send("Signal", socketId, JSON.stringify({ 'ice': event.candidate }));
            };

            connection.onaddstream = async function (event) {
                for (const key in rtcPeerConnections) {
                    if (key === socketId) {
                        rtcPeerConnections[key].stream = event.stream;
                        break;
                    } 
                }

                const container = document.getElementById("other-videos");
                const newVideo  = document.createElement("video");
                newVideo.setAttribute('muted', false);
                newVideo.setAttribute('autoplay', true);
                newVideo.setAttribute('id', 'video' + socketId);
                newVideo.srcObject = event.stream;
                container.appendChild(newVideo);
            };

            connection.addStream(stream);
        }

        if (count >= 2) {
            const connection = rtcPeerConnections[id]?.connection;

            if (connection !== undefined) {
                const offer = await connection.createOffer();
                await connection.setLocalDescription(offer);
                await hubConnection.send("Signal", id, JSON.stringify({'sdp': connection.localDescription}));
            }
        }
    });

    hubConnection.on("Signal", async function(from, message) {
        const signal = JSON.parse(message);

        if (from === hubConnection.connectionId) return;

        const connection = rtcPeerConnections[from].connection;

        if (signal.sdp) {
            await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));

            if (signal.sdp.type === 'offer') {
                const answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);
                await hubConnection.send("Signal", from, JSON.stringify({'sdp': connection.localDescription}));
            }
        }

        if (signal.ice) {
            await connection.addIceCandidate(new RTCIceCandidate(signal.ice));
        }
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

        await new Promise((resolve, reject) => {
            navigator.getUserMedia({
                video: true,
                audio: true
            }, (mediaStream) => {
                // Success
                stream = mediaStream;
                document.getElementById("own-video").srcObject = stream;
                resolve();
            },
                (e) => {
                    // Error
                    console.log(e);
                    reject(e);
                })
        });
        
        await hubConnection.start();

        await hubConnection.send("JoinGroup", roomid);
    };
})();