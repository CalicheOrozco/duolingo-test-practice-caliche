import json

JSON_PATH = r"./dataReadAndComplete.json"
#json_path = r"./dataFillIntheBlanks.json"
def visible_letters(word_length):
    if word_length == 0:
        return 0
    if word_length == 2:
        return 0
    if word_length == 3:
        return 1
    elif word_length == 4:
        return 2
    elif word_length == 5:
        return 2
    elif word_length == 6:
        return 3
    elif word_length == 7:
        return 3
    elif word_length == 8:
        return 4
    elif word_length == 9:
        return 4
    else:  # 10 o más
        return 5
    

    #if word_length == 3:
        #return 1
    #elif word_length == 4:
        #return 2
    #elif word_length == 5:
        #return 3
    #elif word_length == 6:
        #return 4
    #elif word_length == 7:
        #return 5
    #elif word_length == 8:
        #return 5
    #elif word_length == 9:
        #return 6
    #else:  # 10 o más
        #return 6
medium_exercises = 0
updated_words = 0

with open(JSON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

def process_item(item):
    global medium_exercises, updated_words

    if item.get("difficulty") == "medium":
        medium_exercises += 1
        for ans in item.get("correct_answers", []):
            word = ans.get("word", "")
            new_start = visible_letters(len(word))

            if ans.get("start") != new_start:
                ans["start"] = new_start
                updated_words += 1

# Soporta JSON como lista o como objeto
if isinstance(data, list):
    for item in data:
        process_item(item)
else:
    process_item(data)

with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("✅ Actualización completada")
print(f"📘 Ejercicios 'medium' procesados: {medium_exercises}")
print(f"✏️  Palabras actualizadas: {updated_words}")
