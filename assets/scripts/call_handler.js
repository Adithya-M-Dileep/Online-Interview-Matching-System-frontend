// Get the URL search parameters
const urlParams = new URLSearchParams(window.location.search);
var role= urlParams.get('role');

// var connection = new WebSocket('ws://localhost:8000');
var connection = new WebSocket('ws://oims-g554.onrender.com');
var Send_dataChannel, connectedUser, Receive_dataChannel;
var localId;
var remoteId;

var m_client_Video
var m_PeerVideo;
var flag_send_datachannel;
var conn_offer;

let current_client_stream;
let peerConnection;
let intervalId;

const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};
let constraints = {
    video:{
        width:{min:640, ideal:1920, max:1920},
        height:{min:480, ideal:1080, max:1080},
    },
    audio:true
}


var configuration = {
    "iceServers": [
        {
            "urls": "stun:stun.1.google.com:19302"
        },
        {
            urls: 'turn:192.158.29.39:3478?transport=tcp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        }
    ]
};  

connection.onerror = function () {
    populate_error("server");
    console.log("connection.onerror");
};
connection.onopen = function () {
    console.log("connection is fine");
};

connection.onmessage = function (message) {


    var data = JSON.parse(message.data);

    switch (data.type) {
        case "cliendId":
            setlocalId(data.clientId);
            break;

        case "set_candidate":
            onCandidate(data.candidate);
            clearPopup();  
            break;

        case "server_offer":
            stopInterviweeConnectionRequest();
            onOffer(data.cliendId,data.offer);
            break;

        case "server_answer":
            onAnswer(data.answer);
            break;

        case "server_userwanttoleave":
            RemoteUserLeft();
            break;
        default:
            break;
    }
};

function setlocalId(id){
    localId = id;
    console.log(localId);

    if(role=="interviewer"){
        startInterviewerConnection();
    }
    else if(role=="interviewee"){
        startIntervieweeConnection();
        intervalId = setInterval(startIntervieweeConnection, 5000);
    }
    else{
        console.log("error");
    }

}

function startInterviewerConnection(){
    // Create_Popup_Notifications();
    createPopup("Creating a connection... Please wait...");
    permission_camera_before_call(true);

}

function startIntervieweeConnection(){
    createPopup("Searching for a Interviewer... Please wait...");
    send({type:"interviewee_join",clientId:localId});
}

function stopInterviweeConnectionRequest(){
    clearInterval(intervalId);
}
/********************************************************************************************
 *  WebRTC related Functions (Creation of RTC peer connection, Offer, ICE, SDP, Answer etc..)
 *********************************************************************************************/

/**
 * This function will check webrtc Permissions.
 */
function hasRTCPeerConnection() {
    window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription;
    window.RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate;

    return !!window.RTCPeerConnection;
};

 /* 
 * This function will check camera permission.
 */
async function permission_camera_before_call(channel) {

    //get the client and peer video frames Id's
    m_client_Video = document.querySelector('#client_video_frame');
    m_PeerVideo = document.querySelector('#peer_video_frame');

    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Received local stream');

      } catch (e) {

        try {
            stream = await navigator.mediaDevices.getUserMedia({video:true, audio:false});
            console.log('Received local stream');
          } catch (e) {
    
            
            alert(`getUserMedia() error: ${e.name}`);
          }
      }


      m_client_Video.srcObject = stream;
      current_client_stream = stream;

      const videoTracks = current_client_stream.getVideoTracks();
      const audioTracks = current_client_stream.getAudioTracks();
      if (videoTracks.length > 0) {
        console.log(`Using video device: ${videoTracks[0].label}`);
      }
      if (audioTracks.length > 0) {
        console.log(`Using audio device: ${audioTracks[0].label}`);
      }

    peerConnection = new RTCPeerConnection(configuration);
    console.log('Created local peer connection object peerConnection');
    peerConnection.addEventListener('iceconnectionstatechange', e => onIceStateChange(peerConnection, e));
    current_client_stream.getTracks().forEach(track => peerConnection.addTrack(track, current_client_stream));
    peerConnection.addEventListener('track', gotRemoteStream);
    console.log('Added local stream to peerConnection');

    if(channel == false){
        console.log("Creating Answer..");
        peerConnection.ondatachannel = receiveChannelCallback;
        creating_answer();
        peerConnection.addEventListener('icecandidate', e => icecandidateAdded(e));  
    }

    if(channel == true){
        console.log("Creating Offer..");
        Create_DataChannel(localId);  
        creating_offer();
    }
}

/**
 * This function will handle when when we got ice candidate from another user.
 */
async function onCandidate(candidate) {
    try {
        await (peerConnection.addIceCandidate(candidate));
        onAddIceCandidateSuccess(peerConnection);
      } catch (e) {
        onAddIceCandidateError(peerConnection, e);
      }    
}
/**
 * This function will print the ICE candidate sucess
 */  
function onAddIceCandidateSuccess(pc) {
    console.log(` IceCandidate added successfully..`);
}
/**
 * This function will print the ICE candidate error
 */   
function onAddIceCandidateError(pc, error) {
    populate_error("connection_failed");
    console.log(` Failed to add ICE Candidate: ${error.toString()}`);
}
/**
 * This function will set the peer remote streams
 */ 
function gotRemoteStream(e) {
    if (m_PeerVideo.srcObject !== e.streams[0]) {
        m_PeerVideo.srcObject = e.streams[0];
      console.log('received remote stream..');
    }
}
/**
 * This function will handle the ICE state change
 */ 
function onIceStateChange(pc, event) {
    if (pc) {
      console.log(`ICE state: ${pc.iceConnectionState}`);
      console.log('ICE state change event: ', event);
    }
}
/**
 * This function will handle error message
 */ 
function errorMessage(message, e) {
    populate_error("connection_failed");
    console.error("error ***");
    console.error(message, typeof e == 'undefined' ? '' : e);
}
/**
 * This function will handle ICE candidate event. 
 */
function icecandidateAdded(ev) {
    if (ev.candidate && remoteId) {
        send({
            type: "candidate_exchange",
            clientId:remoteId,
            candidate: ev.candidate
        });
        console.log("ICE candidate has send to Server ..");
        clearPopup();  
    }
}
/**
 * This function will handle the data channel open callback.
 */
 var onSend_ChannelOpenState = function (event) {
    flag_send_datachannel = true;
    console.log("dataChannel.OnOpen", event);
    if (Send_dataChannel.readyState == "open") {
        /* Open state event*/
    }
};
/**
 * This function will handle the data channel message callback.
 */
 var onSend_ChannelMessageCallback = function (event) {
    UpdateChatMessages(event.data, false);
};
/**
 * This function will handle the data channel error callback.
 */
var onSend_ChannelErrorState = function (error) {
    populate_error("connection_failed");
    console.log("dataChannel.OnError:", error);
};
/**
 * This function will handle the data channel close callback.
 */
var onSend_ChannelCloseStateChange = function (event) {
    console.log("dataChannel.OnClose", event);
};
/**
 * This function will create data channel
 * when user want a room with other user.
 */
function Create_DataChannel(name) {

    const dataChannelOptions = {
        ordered: false,             // do not guarantee order
        maxPacketLifeTime: 3000,    // in milliseconds
    };

    var channelname = "webrtc_label_" + name;
    Send_dataChannel = peerConnection.createDataChannel(channelname, dataChannelOptions);
    console.log("Created DataChannel dataChannel = "+Send_dataChannel);

    Send_dataChannel.onerror = onSend_ChannelErrorState;
    Send_dataChannel.onmessage = onSend_ChannelMessageCallback;
    Send_dataChannel.onopen = onSend_ChannelOpenState;
    Send_dataChannel.onclose = onSend_ChannelCloseStateChange;
}

/**
 * This function will handle the data channel open callback.
 */
var onReceive_ChannelOpenState = function (event) {
    flag_send_datachannel = false;
    console.log("dataChannel.OnOpen", event);

    if (Receive_dataChannel.readyState == "open") {
        /* Open state */
    }
};
/**
 * This function will handle the data channel message callback (Peer user side).
 */
var onReceive_ChannelMessageCallback = function (event) {
    UpdateChatMessages(event.data, false);
};
/**
 * This function will handle the data channel error callback.
 */
var onReceive_ChannelErrorState = function (error) {
    populate_error("connection_failed");
    console.log("dataChannel.OnError:", error);
};
/**
 * This function will handle the data channel close callback.
 */
var onReceive_ChannelCloseStateChange = function (event) {
    /* close event */
};
/**
 * Registration of data channel callbacks
 */
var receiveChannelCallback = function (event) {
    Receive_dataChannel = event.channel;
    Receive_dataChannel.onopen = onReceive_ChannelOpenState;
    Receive_dataChannel.onmessage = onReceive_ChannelMessageCallback;
    Receive_dataChannel.onerror = onReceive_ChannelErrorState;
    Receive_dataChannel.onclose = onReceive_ChannelCloseStateChange;
};

/**
 * This function will create the webRTC offer request for other user.
 */
async function creating_offer() {
    try {
        console.log('pc1 createOffer start');
        const offer = await peerConnection.createOffer(offerOptions);
        await onCreateOfferSuccess(offer);
      } catch (e) {
        onCreateSessionDescriptionError(e);
      }
}
/**
 * This function will set client local description of the webRTC 
 */
async function onCreateOfferSuccess(desc) {
    try {
        await peerConnection.setLocalDescription(desc);
        onSetLocalSuccess(peerConnection);
        console.log("sending offer to server..");
            send({
                type: "interviewer_join",
                clientId:localId,
                offer: desc
            });

        createPopup("Searching for a Interviewee... Please wait..."); 
    } catch (e) {
        onSetSessionDescriptionError(e);
    }
}
/**
 * This function will send webRTC answer to server for offer request.
 */
 function onOffer(cliendId,offer) {
    remoteId=cliendId;
    conn_offer=offer;
    createPopup("Creating a connection... Please wait..."); 
    permission_camera_before_call(false);
}
/**
 * This function will create the webRTC answer for offer.
 */
async function creating_answer() {
    try {
      await peerConnection.setRemoteDescription(conn_offer);
      onSetRemoteSuccess(peerConnection);
    } catch (e) {
      onSetSessionDescriptionError(e);
    //   clear_incoming_modal_popup(); /*remove modal when any error occurs */
    }
    console.log("creating answer..");
    try {
        const answer = await peerConnection.createAnswer();
        console.log(" answer created = "+ answer);
        await onCreateAnswerSuccess(answer);
      } catch (e) {
        onCreateSessionDescriptionError(e);
    }
}
/**
 * This function will handle local description of peer user
 */
async function onCreateAnswerSuccess(desc) {
    console.log('peer setLocalDescription start');
    try {
      await peerConnection.setLocalDescription(desc);
      onSetLocalSuccess(peerConnection);
    } catch (e) {
      onSetSessionDescriptionError(e);
    //   clear_incoming_modal_popup(); /*remove modal when any error occurs */
    }
    //store the answer
    conn_answer = desc;
    console.log("sending answer to server..");
    send({
             type: "interviewee_answer",
             clientId:remoteId,
             answer: conn_answer
        });  
  }
/**
 * This function will print log of local description error
 */
function onCreateSessionDescriptionError(error) {
    console.log(`Failed to create session description: ${error.toString()}`);
}
/**
 * This function will print log of local description sucess
 */
function onSetLocalSuccess(pc) {
    console.log(`setLocalDescription complete`);
}
/**
 * This function will print log of remote description sucess
 */ 
function onSetRemoteSuccess(pc) {
    console.log(`setRemoteDescription complete`);
}
/**
 * This function will print log of remote description error
 */  
function onSetSessionDescriptionError(error) {
    populate_error("connection_failed");
    console.log(`Failed to set session description: ${error.toString()}`);
}
/**
 * This function will handle when another user answers to our offer .
 */
 async function onAnswer(answer) { 
    try {
        await peerConnection.setRemoteDescription(answer);
        onSetRemoteSuccess(peerConnection);
      } catch (e) {
        onSetSessionDescriptionError(e);
      }

    peerConnection.addEventListener('icecandidate', e => icecandidateAdded(e)); 
}

function LocalUserWantToLeave(){
    console.log("User want to leave");
    send({
        type: "userwanttoleave",
        clientId:remoteId
    });
    Delete_webrtc_connection();
}

function RemoteUserLeft(){
    console.log("User want to leave");
    populate_error("user_unavailble");
    Delete_webrtc_connection();
}
/**
 * This function will delete the webRTC connections.
 */
function Delete_webrtc_connection()
{
    if(flag_send_datachannel == true)
    {
        /* close the send datachannel */
        Send_dataChannel.close();
        flag_send_datachannel = false;
    }else
    {
        /* close the receive datachannel */
        if(Receive_dataChannel)
        {
            Receive_dataChannel.close();
        }
    }

    remoteId = null;
    m_PeerVideo.src = "";
    peerConnection.onicecandidate = null;
    peerConnection.onaddstream = null;
    
    /** stop the camera and return to normal status */
    m_client_Video.src = "";
    document.getElementById("peer_video_frame").style.display='none';
    // current_client_stream.getAudioTracks()[0].stop();
    // current_client_stream.getVideoTracks()[0].stop();

    /* close the RTCpeerConnection */
    peerConnection.close();
    peerConnection = null;
}

/**
 * This function will update the messages when user type any of 
 * the text and press enter/click send.
 */
function UpdateChatMessages(txtmessage, client) {

    var messageDisplay = '';

    if (client == true) {
        //count_message++;
        //console.log("count_message send = ",count_message);
        messageDisplay += `<div class="message__wrapper">
        <div class="message__body">
            <strong class="message__author">You</strong>
            <p class="message__text">${txtmessage}</p>
        </div>
    </div>`

        document.getElementById('text-messages').innerHTML += messageDisplay;
    }
    else {
        //count_message++;
        //console.log("count_message recivied = ",count_message);
        messageDisplay += `<div class="message__wrapper">
        <div class="message__body">
            <strong class="message__author__bot">${role=="interviewer"?"Interviewee": "Interviewer"}</strong>
            <p class="message__text">${txtmessage}</p>
        </div>
    </div>`;

        document.getElementById('text-messages').innerHTML += messageDisplay;
    }
    document.getElementById('text-messages').scrollTo(0, document.getElementById('text-messages').scrollHeight);
}
/**
 * This function will send the messages with webRTC data channel.
 */
function SendMessage() {

    var txtmessage = document.getElementById('txtMessage').value;
    if (txtmessage != '') {

        if (flag_send_datachannel == true) {
            Send_dataChannel.send(txtmessage);
            UpdateChatMessages(txtmessage, true);
            /* remove current text */
            document.getElementById('txtMessage').value = '';
            document.getElementById('txtMessage').focus();
        }
        else if (flag_send_datachannel == false)
        {
            Receive_dataChannel.send(txtmessage);
            UpdateChatMessages(txtmessage, true);
            /* remove current text */
            document.getElementById('txtMessage').value = '';
            document.getElementById('txtMessage').focus();
        }
        else
        {
            // update_connection_status("datachannel");
        }
    }
}


/**
 * This function will send the user message to server.
 * Sending message will be in JSON format.
 */
 function send(message) {

    connection.send(JSON.stringify(message));
};


// UI function
let toggleCamera = async () => {
    let videoTrack = current_client_stream.getTracks().find(track => track.kind === 'video')

    if(videoTrack.enabled){
        videoTrack.enabled = false
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)'
    }else{
        videoTrack.enabled = true
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)'
    }
}

let toggleMic = async () => {
    let audioTrack = current_client_stream.getTracks().find(track => track.kind === 'audio')

    if(audioTrack.enabled){
        audioTrack.enabled = false
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)'
    }else{
        audioTrack.enabled = true
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)'
    }
}

// Error handling
/**
 * This function will handle all the UI messages based on the scenario.
 */
function populate_error(errorid) {
    var msg = '';
    var text;
    var alertDialog = document.getElementById('alert-dialog');

    if (errorid == "server") {
        text = "Server is down, please try again later !!";
    }
    else if (errorid == "user_unavailble") {
        text = "Other user has left from the chat !!";
    }
    else if (errorid == "connection_failed") {
        text = "Failed to establish a connection !!";
    }
    else {
        text = "NA";
    }
    msg += '<button type="button" class="alert-button" onclick="closeAlert(this)">X</button><strong>NOTE:</strong>'+text;

    alertDialog.innerHTML = msg;
    alertDialog.style.display="block";
    
    alertDialog.style.opacity = 1;

    setTimeout(function() {
    alertDialog.style.opacity = 0;
        setTimeout(function() {
        alertDialog.style.display="none";
        }, 2000);
    }, 2000);
}
function closeAlert(element) {
    var alert = element.parentElement;
    alert.style.display = "none";
}
