
/**********************************************************************************
 *  Button Events and UI logics
 *********************************************************************************/


document.addEventListener('DOMContentLoaded', function() {
  
    document.getElementById('camera-btn').addEventListener('click', toggleCamera)
    document.getElementById('mic-btn').addEventListener('click', toggleMic)

    //leave call button
    document.getElementById('leave-btn').addEventListener('click',LocalUserWantToLeave);

    //Chat button
    const chatButton = document.getElementById('chat-btn');
    const chatWindow = document.getElementById('chat-window');
  
    chatButton.addEventListener('click', function() {
      if (chatWindow.style.display === 'none' || chatWindow.style.display === '') {
        chatWindow.style.display = 'block';
      } else {
        chatWindow.style.display = 'none';
      }
    });
  });

//send message
function addKeyPressListener() {
  const inputField = document.getElementById('txtMessage');

  inputField.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      SendMessage();
      // inputField.innerHTML='';
    }
  });
}

function createPopup(message){
  var dialog = document.getElementById("dialog-box");
  document.getElementById("dialog-box-content-text").innerHTML=message;
  dialog.style.display = "block";
}
function clearPopup(){
  var dialog = document.getElementById("dialog-box");
  dialog.style.display = "none";
}