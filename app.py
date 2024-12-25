from flask import Flask, request, jsonify, render_template
import re
import google.generativeai as genai
import requests
import logging

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Configure the Gemini AI
genai.configure(api_key='AIzaSyAO36_LDr2H1jojusoSo72mscY6lA6BQO4')
model = genai.GenerativeModel('gemini-pro')

responses = {
    
    r"divisions of doj|doj divisions": """The Department of Justice (DoJ) has several key divisions:

1. Legal Affairs Division
2. Judicial Appointments Division
3. Access to Justice Division
4. Infrastructure Development for Judiciary Division
5. Special Courts Division
6. eCourts Project Division
7. Legal Aid Division
8. Training and Education Division""",

}

def get_gemini_response(prompt):
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logging.error(f"Error in get_gemini_response: {str(e)}")
        return None

@app.route('/get_response', methods=['POST'])
def chatbot_response():
    try:
        user_input = request.json['message']
        is_first_message = request.json.get('is_first_message', False)
        logging.info(f"Received user input: {user_input}")
        
        response = get_response(user_input, is_first_message)
        
        if response is None:
            return jsonify({'error': 'Failed to generate response'}), 500
        
        logging.info(f"Sending response: {response}")
        return jsonify({'response': response})
    except Exception as e:
        logging.error(f"Error in chatbot_response: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def get_response(user_input, is_first_message):
    user_input = user_input.lower()
    
    # Check if it's the first message
    if is_first_message:
        return "Hi, I am Saathi. How may I help you?"
    
    # Check predefined responses
    for pattern, response in responses.items():
        if re.search(pattern, user_input):
            return response
    
    # If no predefined response, use Gemini
    gemini_prompt = f"""As Saathi, an AI assistant for the Department of Justice in India, provide a response to this query:
    {user_input}    
    
    Structure your response as follows:
    1. A brief, direct answer (1-2 sentences).
    2. If the topic requires more explanation, add "Here are some key points:" followed by 3-5 concise bullet points.
    
    Focus only on legal matters, court procedures, and DoJ services directly related to the question. 
    Use **bold** for key terms."""
    
    gemini_response = get_gemini_response(gemini_prompt)
    return gemini_response if gemini_response else "I'm sorry, I couldn't generate a response at the moment. Please try again."


@app.route('/get_details', methods=['POST'])
def get_details():
    message = request.json['message']
    gemini_prompt = f"""As Saathi, an AI assistant for the Department of Justice in India, provide more detailed information about this topic:
    {message}
    Focus on legal matters, court procedures, and DoJ services directly related to the topic. 
    Keep the response concise. Use **bold** for key terms."""
    
    gemini_response = get_gemini_response(gemini_prompt)
    return jsonify({'response': gemini_response})

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)



