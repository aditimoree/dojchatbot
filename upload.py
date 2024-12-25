from flask import Flask, render_template, request, jsonify
import pandas as pd
import os

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'pdf'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('upload.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'})
    if file and allowed_file(file.filename):
        filename = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filename)
        return jsonify({'message': 'File successfully uploaded'})
    return jsonify({'error': 'File type not allowed'})

@app.route('/get_case_info', methods=['POST'])
def get_case_info():
    case_number = request.json['case_number']
    # Search for the case number in the uploaded files
    for filename in os.listdir(app.config['UPLOAD_FOLDER']):
        if filename.endswith('.xlsx') or filename.endswith('.xls'):
            df = pd.read_excel(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        elif filename.endswith('.csv'):
            df = pd.read_csv(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        else:
            continue
        
        if 'Case Number' in df.columns and case_number in df['Case Number'].values:
            case_info = df[df['Case Number'] == case_number].to_dict('records')[0]
            return jsonify(case_info)
    
    return jsonify({'error': 'Case not found'})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
