(async function () {
    let stream;

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
            })
    });

    let remoteStream;
    const peerConnectionConfig = {
        'iceServers': [
            { 'urls': 'stun:stun.services.mozilla.com' },
            { 'urls': 'stun:stun.l.google.com:19302' },
        ]
    };

    const rtcPeerConnection = new RTCPeerConnection(peerConnectionConfig);

    const connection = new signalR.HubConnectionBuilder()
        .withUrl("https://localhost:5001/signaling")
        .configureLogging(signalR.LogLevel.Debug)
        .build();

    connection.on("UserConnected", async function () {
        console.log("user connected");
        rtcPeerConnection.onicecandidate = function (event) {
            if (event.candidate === null) return;
            connection.send("Ice", JSON.stringify(event.candidate));
        };

        rtcPeerConnection.onaddstream = function (event) {
            console.log('got stream');
            remoteStream = event.stream;
            document.getElementById("remote-video").srcObject = remoteStream;
        };

        rtcPeerConnection.addStream(stream);

        const offer = await rtcPeerConnection.createOffer();
        await rtcPeerConnection.setLocalDescription(offer);
        await connection.send("Sdp", JSON.stringify(rtcPeerConnection.localDescription));
    });

    connection.on("Sdp", async function (sdp) {
        const deserialized = JSON.parse(sdp);
        console.log("SDP", sdp);

        const remoteDescription = rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(deserialized));

        if (deserialized.type !== 'offer') return;
        const answer = await rtcPeerConnection.createAnswer();
        await rtcPeerConnection.setLocalDescription(answer);
        await connection.send("Sdp", JSON.stringify(rtcPeerConnection.localDescription));
    });

    connection.on("Ice", async function (ice) {
        console.log("ICE", ice);
        const deserialized = JSON.parse(ice);
        await rtcPeerConnection.addIceCandidate(new RTCIceCandidate(deserialized));
    });

    await connection.start();
})();