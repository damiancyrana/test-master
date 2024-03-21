import json
import random
from pathlib import Path
from functools import lru_cache
from flask import Flask, render_template, request, jsonify
from transformers import MT5ForConditionalGeneration, MT5Tokenizer

app = Flask(__name__)

# Define the path to the questions file
questions_path = Path("static/questions/GCP-Cloud.json")


model_name = "sdadas/mt5-base-translator-en-pl"
model = MT5ForConditionalGeneration.from_pretrained(model_name)
tokenizer = MT5Tokenizer.from_pretrained(model_name)


def load_and_shuffle_questions(filepath: Path) -> list:
    """
    Loads questions from a JSON file and shuffles them, including their answers
    
    Args:
        filepath (Path): The path to the JSON file containing the questions
      
    Returns:
        list: A list of shuffled questions with shuffled answers
    """
    with filepath.open('r', encoding='utf-8') as file:
        questions = json.load(file)
    for question in questions:
        random.shuffle(question['answers'])
    random.shuffle(questions)
    return questions


@app.route("/", methods=["GET", "POST"])
def quiz():
    """
    Handles the quiz page. On POST, it filters and displays incorrect answers for retry
    On GET, it displays a new set of shuffled questions
    
    Returns:
        render_template: The quiz page with questions or the retry page with incorrect answers
    """
    file_title = questions_path.stem.replace('-', ' ')
    if request.method == "POST":
        incorrect_answers_ids = request.form.getlist('incorrect_answers[]')
        questions = load_and_shuffle_questions(questions_path)
        incorrect_questions = [q for q in questions if str(q['id']) in incorrect_answers_ids]
        return render_template("retry_quiz.html", questions=incorrect_questions, file_name=file_title)
    else:
        questions = load_and_shuffle_questions(questions_path)
        return render_template("quiz.html", questions=questions, file_name=file_title)


@lru_cache()
def translate_text(text: str, extra_length_factor: float = 1.5, min_length: int = 40) -> str:
    """
    Translates the given text using the loaded model and tokenizer. Results are cached for efficiency
    
    Args:
        text (str): The text to translate
        extra_length_factor (float): Factor to adjust the maximum length of the translation
        min_length (int): Minimum length of the translation to ensure quality
        
    Returns:
        str: The translated text
    """
    input_ids = tokenizer(text, return_tensors="pt").input_ids
    base_max_length = int(input_ids.shape[1] * extra_length_factor)
    max_length = max(base_max_length, min_length)
    translated_tokens = model.generate(input_ids, num_beams=4, max_length=max_length)
    translated_text = tokenizer.decode(translated_tokens[0], skip_special_tokens=True)
    return translated_text


@app.route("/translate", methods=["POST"])
def translate():
    """
    API endpoint for translating questions and answers. Expects a JSON payload with question and answers
    
    Returns:
        jsonify: The translated question and answers in JSON format
    """
    data = request.get_json()
    original_question = data.get("question")
    answers = data.get("answers")
    translated_question = translate_text(original_question)
    translated_answers = [translate_text(answer) for answer in answers]
    return jsonify(question=translated_question, answers=translated_answers)


if __name__ == "__main__":
    app.run(debug=True)
