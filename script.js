$(document).ready(function() {
    $('#chat-button').click(openChat);
    $('#send-button').click(sendMessage);
    $('#user-message').keypress(function(e) {
        if (e.which == 13) {
            sendMessage();
            return false;
        }
    });
    $('#clear-chat').click(clearChat);
    $('#voice-button').click(startVoiceInput);
    $('#back-button').click(closeChat);
    var isFirstMessage = true;
    
    function sendMessage() {
        var userInput = $('#user-message').val().trim();
        var language = $('#language-select').val();
        
        if (userInput === '') return;

        displayUserMessage(userInput);
        $('#user-message').val('');

        showThinking();

        $.ajax({
            url: '/get_response',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ 
                message: userInput, 
                language: language,
                is_first_message: isFirstMessage
            }),
            success: function(data) {
                hideThinking();
                if (data.error) {
                    displayBotMessage("I apologize, but I encountered an error: " + data.error + ". Please try again or contact support if the issue persists.", userInput);
                } else {
                    displayBotMessage(data.response, userInput);
                }
                isFirstMessage = false;
            },
            error: function(jqXHR, textStatus, errorThrown) {
                hideThinking();
                console.error("AJAX error: " + textStatus + ' : ' + errorThrown);
                displayBotMessage("I'm having trouble connecting to the server. Please check your internet connection and try again. If the problem persists, please contact support.", userInput);
            }
        });
    }
    $('#terminate-button').click(terminateMessage);
});
var isFirstMessage = true;


function openChat() {
    $('#chat-container').show();
    $('#chat-button').hide();
    
    if ($('#chatbox').is(':empty')) {
        displayBotMessage("Hi, I am .Saathi How may I help you?");
    }
}

function closeChat() {
    $('#chat-container').hide();
    $('#chat-button').show();
}

function sendMessage() {
    var userInput = $('#user-message').val().trim();
    var language = $('#language-select').val();
    
    if (userInput === '') return;

    displayUserMessage(userInput);
    $('#user-message').val('');

    showThinking();

    // Check if the user is providing a case number
    if (/^\d+$/.test(userInput) && $('.bot-message:last').text().includes("Please provide your case number")) {
        $.ajax({
            url: '/get_case_update',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ case_number: userInput }),
            success: function(data) {
                hideThinking();
                displayBotMessage(data.response, userInput);
            },
            error: function() {
                hideThinking();
                displayBotMessage("Sorry, I'm having trouble retrieving the case information. Please try again later.");
            }
        });
    } else {
        // Existing logic for general queries
        $.ajax({
            url: '/get_response',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ message: userInput, language: language }),
            success: function(data) {
                hideThinking();
                displayBotMessage(data.response, userInput);
            },
            error: function() {
                hideThinking();
                displayBotMessage("Sorry, I'm having trouble connecting to the server. Please try again later.");
            }
        });
    }
}

function displayUserMessage(message) {
    var messageContainer = $('<div class="message-container"></div>');
    messageContainer.append('<div class="message user-message">' + message + '</div>');
    $('#chatbox').append(messageContainer);
    $('#chatbox').scrollTop($('#chatbox')[0].scrollHeight);
}

function displayBotMessage(response, userInput) {
    var messageContainer = $('<div class="message-container"></div>');
    var botMessageContainer = $('<div class="bot-message-container"></div>');
    var botLogo = $('<img class="bot-logo" src="https://www.pngmart.com/files/16/Vector-Lawyer-Transparent-PNG.png" alt="bot-logo">');
    var botMessageDiv = $('<div class="message bot-message"></div>');

    botMessageContainer.append(botLogo);
    botMessageContainer.append(botMessageDiv);
    messageContainer.append(botMessageContainer);
    $('#chatbox').append(messageContainer);

    // Hide send and mic buttons, show terminate button
    $('#send-button, #voice-button').hide();
    $('#terminate-button').show();

    // Split the response into points
    var points = response.split('\n').filter(point => point.trim() !== '');

    function displayNextPoint(index) {
        if (index < points.length) {
            var pointDiv = $('<div class="bot-point"></div>');
            botMessageDiv.append(pointDiv);

            var currentPoint = points[index].replace(/^\s*[\*\-]\s*/, '');
            var pointText = (index + 1) + '. ' + currentPoint;

            pointText = pointText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            pointText = pointText.replace(/\*(.*?)\*\*/g, '<strong>$1</strong>');

            var charIndex = 0;
            var htmlContent = '';

            function displayNextCharacter() {
                if (charIndex < pointText.length && !window.terminateMessageFlag) {
                    if (pointText.substr(charIndex, 8) === '<strong>') {
                        htmlContent += '<strong>';
                        charIndex += 8;
                    } else if (pointText.substr(charIndex, 9) === '</strong>') {
                        htmlContent += '</strong>';
                        charIndex += 9;
                    } else {
                        htmlContent += pointText[charIndex];
                        charIndex++;
                    }
                    pointDiv.html(htmlContent);
                    
                    var chatbox = $('#chatbox')[0];
                    if (chatbox.scrollHeight - chatbox.scrollTop === chatbox.clientHeight) {
                        chatbox.scrollTop = chatbox.scrollHeight;
                    }
                    
                    setTimeout(displayNextCharacter, 30);
                } else {
                    if (!window.terminateMessageFlag) {
                        addDetailLink(pointDiv, currentPoint);
                        setTimeout(() => displayNextPoint(index + 1), 500);
                    } else {
                        finishMessageDisplay();
                    }
                }
            }

            displayNextCharacter();
        } else {
            finishMessageDisplay();
        }
    }

    displayNextPoint(0);
}

function terminateMessage() {
    window.terminateMessageFlag = true;
}

function finishMessageDisplay() {
    addSuggestions($('.bot-message:last'));
    $('#send-button, #voice-button').show();
    $('#terminate-button').hide();
    window.terminateMessageFlag = false;
}

function addDetailLink(pointDiv, originalMessage) {
    var detailLink = $('<a href="#" class="detail-link">More Details</a>');
    pointDiv.append(' ');
    pointDiv.append(detailLink);

    detailLink.click(function(e) {
        e.preventDefault();
        requestMoreDetails(originalMessage);
    });
}

function requestMoreDetails(originalMessage) {
    showThinking();

    $.ajax({
        url: '/get_details',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ message: originalMessage }),
        success: function(data) {
            hideThinking();
            displayBotMessage(data.response, originalMessage);
        },
        error: function() {
            hideThinking();
            displayBotMessage("Sorry, I couldn't fetch more details at the moment. Please try again later.");
        }
    });
}

function showThinking() {
    var thinkingHtml = '<div class="thinking"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
    $('#chatbox').append(thinkingHtml);
    $('#chatbox').scrollTop($('#chatbox')[0].scrollHeight);
}

function hideThinking() {
    $('.thinking').remove();
}

function addSuggestions(messageDiv) {
    var allSuggestions = [
        { text: 'Current status of My cases', link: 'https://services.ecourts.gov.in/ecourtindia_v6/' },
        { text: 'Pending cases', link: 'https://ecourts.gov.in/ecourts_home/' },
        { text: 'Download ecourt service mobile app', link: 'https://play.google.com/store/apps/details?id=in.gov.ecourts.eCourtsServices&app_token=536ee5137075ebe5f197cd57ca8a0e5ff16dbead40da0e6b901285270e19902f' },
        { text: 'Division of doj', link: 'https://ecourts.gov.in/ecourts_home/' },
        { text: 'Know about judge and vacancies', link: 'https://doj.gov.in/national-judicial-data-grid-2/' },
        { text: 'Live streaming of court cases', link: 'https://doj.gov.in/live-streaming-of-court-cases/' },
        { text: 'Procedure to pay fine of traffic voilation', link: 'https://vcourts.gov.in/virtualcourt/' },
        { text: 'Fast track court', link: 'https://ecourts.gov.in/ecourts_home/' },
        { text: 'Efilling and epay', link: 'https://ecourts.gov.in/ecourts_home/' },
    ];

    var currentPage = 1;
    var suggestionsPerPage = 3; 

    function truncateText(text, maxLength) {
        if (text.length > maxLength) {
            return text.substring(0, maxLength - 3) + '...';
        }
        return text;
    }

    function displaySuggestions(page) {
        var start = (page - 1) * suggestionsPerPage;
        var end = start + suggestionsPerPage;
        var pageSuggestions = allSuggestions.slice(start, end);

        var suggestionsHtml = '<div class="suggestions">';
        pageSuggestions.forEach(function(suggestion) {
            suggestionsHtml += `
                <div class="suggestion-item" onclick="window.location.href='${suggestion.link}'">
                    ${truncateText(suggestion.text, 30)}
                </div>
            `;
        });

        var totalPages = Math.ceil(allSuggestions.length / suggestionsPerPage);
        suggestionsHtml += `
            <div class="suggestion-navigation">
                <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
                <span>${currentPage} / ${totalPages}</span>
                <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
            </div>
        `;

        suggestionsHtml += '</div>';
        messageDiv.append(suggestionsHtml);
    }

    function changePage(newPage) {
        if (newPage >= 1 && newPage <= Math.ceil(allSuggestions.length / suggestionsPerPage)) {
            currentPage = newPage;
            $('.suggestions').remove();
            displaySuggestions(currentPage);
        }
    }

    displaySuggestions(currentPage);

    // Make changePage function accessible globally
    window.changePage = changePage;
}

function startVoiceInput() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        var recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-IN';
        recognition.start();
        
        recognition.onresult = function(event) {
            var transcript = event.results[0][0].transcript;
            $('#user-message').val(transcript);
            sendMessage();
        };
    } else {
        alert("Sorry, your browser doesn't support speech recognition. Please try using a modern browser like Chrome.");
    }
}

function clearChat() {
    $('#chatbox').empty();
    displayBotMessage("Chat cleared. How else can I assist you?");
}
