import json
import random
from pathlib import Path
from functools import lru_cache
from flask import Flask, render_template, request, jsonify
from transformers import MT5ForConditionalGeneration, MT5Tokenizer

app = Flask(__name__)

# Ścieżka do pliku z pytaniami
questions_path = Path("static/questions/ccsp_set1.json")

model_name = "sdadas/mt5-base-translator-en-pl"
model = MT5ForConditionalGeneration.from_pretrained(model_name)
tokenizer = MT5Tokenizer.from_pretrained(model_name)

def load_and_shuffle_questions(filepath: Path) -> list:
    """
    Ładuje pytania z pliku JSON i tasuje ich kolejność wraz z kolejnością odpowiedzi
    """
    with filepath.open('r', encoding='utf-8') as file:
        questions = json.load(file)
    for question in questions:
        random.shuffle(question['answers'])
    random.shuffle(questions)
    return questions

def process_questions(questions: list) -> list:
    """
    Zastępuje sekwencje '\n\n' na '<br><br>' i '\n' na '<br>'  w polach 'question' oraz 'answers[].text' każdego pytania
    """
    for q in questions:
        # Zamiana znaków nowej linii w samym pytaniu
        q['question'] = q['question'].replace('\n\n', '<br><br>').replace('\n', '<br>')

        # Zamiana znaków nowej linii w tekście odpowiedzi
        for ans in q['answers']:
            ans['text'] = ans['text'].replace('\n\n', '<br><br>').replace('\n', '<br>')

    return questions


@app.route("/", methods=["GET", "POST"])
def quiz():
    """
    Obsługuje stronę z quizem:
    - Na POST: filtruje błędne odpowiedzi i wyświetla je ponownie do poprawy
    - Na GET: wyświetla nowy zestaw potasowanych pytań
    """
    file_title = questions_path.stem.replace('-', ' ')
    if request.method == "POST":
        incorrect_answers_ids = request.form.getlist('incorrect_answers[]')
        if incorrect_answers_ids:
            questions = load_and_shuffle_questions(questions_path)
            questions = process_questions(questions)
            
            incorrect_questions = [q for q in questions if str(q['id']) in incorrect_answers_ids]
            if incorrect_questions:
                return render_template("quiz.html", questions=incorrect_questions, file_name=file_title)
            else:
                return render_template("congratulations.html", file_name=file_title)
        else:
            return render_template("congratulations.html", file_name=file_title)
    else:
        questions = load_and_shuffle_questions(questions_path)
        questions = process_questions(questions) 
        return render_template("quiz.html", questions=questions, file_name=file_title)


@lru_cache()
def translate_text(text: str, extra_length_factor: float = 1.5, min_length: int = 40) -> str:
    """
    Tłumaczy dany tekst przy użyciu załadowanego modelu i tokenizer'a. Wyniki są cachowane dla optymalizacji
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
    Endpoint API do tłumaczenia pytań i odpowiedzi. Oczekuje JSONa z kluczami "question" i "answers". Zwraca przetłumaczone pytanie oraz listę odpowiedzi w formacie JSON.
    """
    data = request.get_json()
    original_question = data.get("question")
    answers = data.get("answers")

    translated_question = translate_text(original_question)
    translated_answers = [translate_text(answer) for answer in answers]

    return jsonify(question=translated_question, answers=translated_answers)


if __name__ == "__main__":
    app.run(debug=True, port=4032)