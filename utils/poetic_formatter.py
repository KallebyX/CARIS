def format_poetic_text(text, style='default'):
    """Format text with poetic styling."""
    if not text:
        return ""
    
    styles = {
        'default': lambda t: t,
        'contemplative': lambda t: f'"{t}"',
        'reflective': lambda t: f'... {t} ...',
        'emphatic': lambda t: f'— {t} —',
        'whisper': lambda t: t.lower(),
    }
    
    formatter = styles.get(style, styles['default'])
    return formatter(text)

def get_cycle_quote(cycle_name):
    """Return inspirational quote based on cycle."""
    quotes = {
        'Criar': "A criação é um ato de coragem que transforma o invisível em visível.",
        'Cuidar': "Cuidar é uma forma de amor que se manifesta na atenção aos detalhes.",
        'Crescer': "Crescer é abraçar a mudança como parte essencial da jornada.",
        'Curar': "A cura começa quando permitimos que a luz entre pelas fissuras."
    }
    
    return quotes.get(cycle_name, "A jornada é tão importante quanto o destino.")

def get_emotion_reflection(emotion):
    """Return reflective prompt based on emotion."""
    reflections = {
        'Alegria': "O que fez seu coração sorrir hoje?",
        'Serenidade': "Em que momento você sentiu paz interior?",
        'Entusiasmo': "O que despertou sua energia criativa?",
        'Gratidão': "Por quais pequenos detalhes você se sente grato?",
        'Amor': "Como você expressou ou recebeu amor hoje?",
        'Tristeza': "O que sua tristeza está tentando lhe ensinar?",
        'Melancolia': "Que memória trouxe esse sentimento à tona?",
        'Nostalgia': "Que parte do passado ecoa em você hoje?",
        'Ansiedade': "Qual incerteza está pedindo sua atenção?",
        'Medo': "O que você diria ao seu medo se pudesse dialogar com ele?",
        'Raiva': "Que limite importante foi ultrapassado?",
        'Frustração': "Que expectativa não foi atendida?",
        'Confusão': "Que clareza você busca neste momento?",
        'Esperança': "Que possibilidade está nascendo em você?",
        'Curiosidade': "O que está despertando seu desejo de explorar?",
        'Inspiração': "Que ideia está pedindo para ganhar forma?",
        'Determinação': "Que obstáculo você está pronto para superar?",
        'Contemplação': "O que você observa quando faz silêncio interior?",
        'Vulnerabilidade': "Que verdade está emergindo através desta abertura?",
        'Coragem': "Que passo corajoso você está considerando dar?"
    }
    
    return reflections.get(emotion, "O que este sentimento está revelando sobre sua jornada?")

def generate_writing_prompt(cycle_name=None, emotion=None):
    """Generate writing prompt based on cycle and emotion."""
    cycle_prompts = {
        'Criar': [
            "Que ideia está pedindo para nascer através de você?",
            "Que expressão criativa você tem negligenciado?",
            "Como você poderia trazer mais beleza ao mundo hoje?"
        ],
        'Cuidar': [
            "Que relacionamento precisa de sua atenção agora?",
            "Como você tem nutrido seu bem-estar recentemente?",
            "Que pequeno ato de cuidado poderia fazer grande diferença?"
        ],
        'Crescer': [
            "Que aprendizado está se revelando em sua vida agora?",
            "Que limite você está pronto para expandir?",
            "Como você tem abraçado a mudança em sua jornada?"
        ],
        'Curar': [
            "Que parte de você está pedindo por gentileza e aceitação?",
            "Que antiga narrativa está pronta para ser transformada?",
            "Como você poderia fazer as pazes com uma experiência difícil?"
        ]
    }
    
    if cycle_name and emotion:
        emotion_reflection = get_emotion_reflection(emotion)
        return f"{emotion_reflection} [{cycle_name}]"
    
    if cycle_name:
        import random
        prompts = cycle_prompts.get(cycle_name, ["O que você percebe quando observa sua jornada?"])
        return random.choice(prompts)
    
    if emotion:
        return get_emotion_reflection(emotion)
    
    return "O que emerge quando você faz silêncio e observa?"
