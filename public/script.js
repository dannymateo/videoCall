$(document).ready(function () {
  const socket = io("/");
  const chatInputBox = $("#chat_message");
  const all_messages = $("#all_messages");
  const main__chat__window = $("#main__chat__window");
  const videoGrid = $("#video-grid");
  const myVideo = $("<video muted></video>")[0];
  const shareScreenButton = $("#shareScreenButton");

  var peer = new Peer(undefined, {
    path: "/peerjs",
    host: "/",
    port: "3030",
  });

  const peers = {}; // Object to store peers

  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .then((stream) => {
      myVideoStream = stream;
      addVideoStream(myVideo, stream, peer.id); // Usa el ID de peer aquí

      peer.on("call", (call) => {
        call.answer(stream);
        const video = $("<video></video>")[0];

        call.on("stream", (userVideoStream) => {
          addVideoStream(video, userVideoStream, call.peer);
        });
      });

      socket.on("user-connected", ({ userId, userName }) => {
        connectToNewUser(userId, userName, stream);
      });

      $(document).on("keydown", (e) => {
        if (e.which === 13 && chatInputBox.val() != "") {
          socket.emit("message", chatInputBox.val());
          chatInputBox.val("");
        }
      });

      socket.on("createMessage", (msg) => {
        let li = $("<li></li>").text(msg);
        all_messages.append(li);
        main__chat__window.scrollTop(main__chat__window[0].scrollHeight);
      });

      socket.on("user-muted", (userId) => {
        // Handle user muted event
        console.log(`User ${userId} has muted their mic.`);
      });

      socket.on("user-unmuted", (userId) => {
        // Handle user unmuted event
        console.log(`User ${userId} has unmuted their mic.`);
      });

      socket.on("user-video-paused", (userId) => {
        // Handle user video paused event
        console.log(`User ${userId} has paused their video.`);
      });

      socket.on("user-video-resumed", (userId) => {
        // Handle user video resumed event
        console.log(`User ${userId} has resumed their video.`);
      });

      shareScreenButton.on("click", () => {
        navigator.mediaDevices.getDisplayMedia({ video: true })
          .then((stream) => {
            const screenTrack = stream.getVideoTracks()[0];
            myVideoStream.getVideoTracks()[0].stop();
            myVideoStream.removeTrack(myVideoStream.getVideoTracks()[0]);
            myVideoStream.addTrack(screenTrack);
            addVideoStream(myVideo, stream, peer.id);

            screenTrack.onended = () => {
              navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then((stream) => {
                  myVideoStream = stream;
                  addVideoStream(myVideo, stream, peer.id);
                });
            };

            peer.on("call", (call) => {
              call.answer(stream);
              const video = $("<video></video>")[0];

              call.on("stream", (userVideoStream) => {
                addVideoStream(video, userVideoStream, call.peer);
              });
            });

            socket.on("user-connected", (userId, userName) => {
              connectToNewUser(userId, userName, stream);
            });
          })
          .catch((error) => {
            console.error("Error sharing screen:", error);
          });
      });

    });

  peer.on("call", function (call) {
    navigator.mediaDevices.getUserMedia(
      { video: true, audio: true }
    ).then((stream) => {
      call.answer(stream); // Answer the call with an A/V stream.
      const video = $("<video></video>")[0];
      call.on("stream", function (remoteStream) {
        addVideoStream(video, remoteStream, call.peer);
      });
    }).catch((err) => {
      console.log("Failed to get local stream", err);
    });
  });

  peer.on("open", (id) => {
    // Asegúrate de que el peer ID esté listo antes de usarlo
    socket.emit("join-room", ROOM_ID, id, prompt("Por favor, ingresa tu nombre:"));
  });

  socket.on("user-disconnected", (userId) => {
    if (peers[userId]) peers[userId].close();
    $(`video[data-peer-id="${userId}"]`).remove(); // Remove video element of disconnected user
  });

  const connectToNewUser = (userId, userName, streams) => {
    alert(`Se ha conectado ${userName}`)

    // Verificar si userId es válido
    if (!userId) {
      console.error('userId is null or undefined');
      return;
    }
  
    // Realizar la llamada al nuevo usuario
    var call = peer.call(userId, streams);
  
    // Verificar si la llamada se realizó correctamente
    if (!call) {
      console.error('Failed to call new user');
      return;
    }
  
    var video = $("<video></video>")[0];
  
    // Manejar el evento de stream del usuario
    call.on("stream", (userVideoStream) => {
      console.log('Call from peer:', call.peer);
      addVideoStream(video, userVideoStream, call.peer);
    });
  
    // Manejar el evento de cierre de la llamada
    call.on("close", () => {
      $(video).remove();
    });
  
    // Almacenar la llamada en el objeto peers
    peers[userId] = call;
  };
  

  const addVideoStream = (videoEl, stream, userId) => {
    videoEl.srcObject = stream;
    videoEl.setAttribute('data-peer-id', userId || 'unknown'); // Assign user ID to video element
    $(videoEl).on("loadedmetadata", () => {
      videoEl.play();
    });
    videoGrid.append(videoEl);
    let totalUsers = $("video").length;
    if (totalUsers > 1) {
      $("video").each(function (index, video) {
        $(video).css("width", 100 / totalUsers + "%");
      });
    }
  };

  $("#muteButton").click(() => {
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
      myVideoStream.getAudioTracks()[0].enabled = false;
      socket.emit("mic-muted");
      setUnmuteButton();
    } else {
      myVideoStream.getAudioTracks()[0].enabled = true;
      socket.emit("mic-unmuted");
      setMuteButton();
    }
  });

  $("#playPauseVideo").click(() =>{
    let enabled = myVideoStream.getVideoTracks()[0].enabled;
    if (enabled) {
      myVideoStream.getVideoTracks()[0].enabled = false;
      socket.emit("video-paused");
      setPlayVideo();
    } else {
      myVideoStream.getVideoTracks()[0].enabled = true;
      socket.emit("video-resumed");
      setStopVideo();
    }
  });

  const setPlayVideo = () => {
    const html = `<i class="unmute fa fa-pause-circle"></i>
    <span class="unmute">Resume Video</span>`;
    $("#playPauseVideo").html(html);
  };

  const setStopVideo = () => {
    const html = `<i class=" fa fa-video-camera"></i>
    <span class="">Pause Video</span>`;
    $("#playPauseVideo").html(html);
  };

  const setUnmuteButton = () => {
    const html = `<i class="unmute fa fa-microphone-slash"></i>
    <span class="unmute">Unmute</span>`;
    $("#muteButton").html(html);
  };

  const setMuteButton = () => {
    const html = `<i class="fa fa-microphone"></i>
    <span>Mute</span>`;
    $("#muteButton").html(html);
  };
});