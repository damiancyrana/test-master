import json


def generate_blank_template(number_of_questions, add_ids=False):
    questions = []
    for i in range(number_of_questions):
        question = {
            "question": "",
            "answers": [
                {"text": "", "is_correct": False},
                {"text": "", "is_correct": False},
                {"text": "", "is_correct": False},
                {"text": "", "is_correct": False}
            ]
        }
        if add_ids:
            question['id'] = i + 1
        questions.append(question)
    return questions


def save_questions_to_file(questions, file_name):
    with open(file_name, 'w', encoding='utf-8') as file:
        json.dump(questions, file, indent=4, ensure_ascii=False)
    print(f"File saved: {file_name}")


def main():
    number_of_questions = int(input("How many questions do you want to generate? "))
    add_ids = input("Do you want to add IDs to questions? (Yes/No): ").lower() == 'yes' or 'y'
    file_name = input("Please enter the file name (without extension): ") + '.json'
    
    questions_template = generate_blank_template(number_of_questions, add_ids=add_ids)
    save_questions_to_file(questions_template, file_name)
    
    print(f"File '{file_name}' has been successfully created with {number_of_questions} questions.")

if __name__ == "__main__":
    main()

