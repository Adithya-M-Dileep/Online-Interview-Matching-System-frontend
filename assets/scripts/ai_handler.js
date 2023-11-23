
let messages=[
    {'role': 'system', 'content': " You're the InterviewBot, designed to conduct interviews based on the candidate's expertise. \
    Upon receiving the candidate's self-introduction, your goal is to delve deeper into their area of interest. \
    Ask specific questions related to their expertise, tailoring each follow-up question based on their previous responses. \
    Ensure to incorporate industry-standard queries relevant to the candidate's field to make the interview comprehensive and realistic. \
    Craft questions that align with their mentioned skills and experiences, adapting the conversation flow accordingly. \
    " },
    {'role':'interviewer','content':'Hello, I am your interviewer. Please introduce yourself and briefly describe your background, expertise, and areas of interest. Let\'s start!'},
];
const BASE_URL="https://oims-g554.onrender.com";
// const BASE_URL="https://localhost:8000/";


async function SendMessage() {

    var txtmessage = document.getElementById('txtMessage').value;
    if (txtmessage != '') {

        messages.push({'role':'user','content':txtmessage})
        UpdateChatMessages(txtmessage, true);
        /* remove current text */
        document.getElementById('txtMessage').value = '';
        document.getElementById('txtMessage').focus();

        fetch(BASE_URL+'/api/endpoint', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({'messages':messages}),
        })
        .then(response => response.json())
        .then(data => {
            const txtReply=data.message;
            if (txtReply){
            messages.push({'role':'interviewer','content':txtReply});
            UpdateChatMessages(txtmessage, false);
            }
            else{
                UpdateChatMessages("Something went wrong in the server side.", false);
            }
            })
            .catch(error => {
            console.error('Error:', error);
            });
    }
}

function UpdateChatMessages(txtmessage, client) {

    var messageDisplay = '';

    if (client == true) {
        //count_message++;
        //console.log("count_message send = ",count_message);
        messageDisplay += 
        `<div class="message__wrapper message__wrapper__author">
            <div class="message__body">
                <strong class="message__author">You</strong>
                <p class="message__text">
                ${txtmessage}
                </p>
            </div>
        </div>`;

        document.getElementById('text-messages').innerHTML += messageDisplay;
    }
    else {
        //count_message++;
        //console.log("count_message recivied = ",count_message);
        messageDisplay += `        
        <div class="message__wrapper message__wrapper__bot">
            <div class="message__body">
            <strong class="message__bot">interviewer</strong>
            <p class="message__text">
            ${txtmessage}
            </p>
            </div>
        </div>`;

        document.getElementById('text-messages').innerHTML += messageDisplay;
    }
    document.getElementById('text-messages').scrollTo(0, document.getElementById('text-messages').scrollHeight);
}

//send message
function addKeyPressListener() {
    const inputField = document.getElementById('txtMessage');
    
    inputField.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
        SendMessage();
        }
    });
    }