"""Synthetic training data for the safety model.

There is no public labelled corpus of school-chat grooming in English+Arabic,
so the data is generated from templates:
  * SAFE: realistic AKIS chat (homework, meeting links, exams, parents,
    greetings, Eid/Ramadan wishes) in English and Arabic, plus "hard
    negatives" that contain bad-looking substrings (Dickens, Sussex,
    analysis, therapist...) or innocent uses of risky words (alone, secret,
    photo of your homework).
  * UNSAFE: profanity/sexual words from the lexicon dropped into chat
    templates and disguised (leet, spacing, repeats), grooming and
    solicitation lines, threats and bullying.

The held-out TEST set uses different templates and different grooming
phrasings from TRAIN, so the reported numbers measure generalisation to
wording the model has never seen, not memorisation.
"""

import random

NAMES = ["Sahar", "Fatima", "Ahmed", "Omar", "Aisha", "Yusuf", "Maryam", "Ali", "Zainab", "Hassan", "Talal", "Noor"]
TITLES = ["miss", "sir", "teacher", "Ms Sahar", "Mr Ahmed", "ma'am", "Miss Fatima"]
SUBJECTS = ["Maths", "Arabic", "English", "Science", "Islamic Studies", "Quran", "Urdu", "Computer", "Art", "Social Studies"]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Sunday", "tomorrow", "next week"]
TIMES = ["8:00", "9:30 am", "10am", "11:15", "1 pm", "4:30pm", "7 pm"]
LINKS = [
    "https://meet.google.com/abc-defg-hij",
    "https://meet.google.com/kqx-ptua-wme",
    "https://zoom.us/j/93415572201?pwd=Xy12",
    "https://teams.microsoft.com/l/meetup-join/19%3ameeting_NjQ",
    "meet.google.com/rty-uiop-asd",
]
AR_TITLES = ["أستاذة", "أستاذ", "مس سحر", "أستاذ أحمد", "معلمتي"]
AR_SUBJECTS = ["الرياضيات", "اللغة العربية", "الإنجليزي", "العلوم", "التربية الإسلامية", "القرآن", "الحاسوب"]
AR_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "بكرة", "غدا"]

SAFE_TRAIN = [
    "Good morning {title}!", "Hi {name}, how are you?", "Assalamu alaikum {title}", "Hello everyone",
    "Thank you so much {title}", "Thanks!", "ok", "Okay {title}", "Sure, no problem", "See you {day}",
    "Please finish exercise {n} on page {p} for {day}", "The {subject} homework is due on {day}",
    "Did you finish the {subject} worksheet?", "I forgot my {subject} book at school",
    "Can you explain question {n} again please?", "I don't understand the {subject} homework",
    "Send me a photo of your homework when you finish", "Please send a picture of page {p}",
    "Upload your {subject} project before {day}", "Here is the link for today's {subject} class: {link}",
    "Join the meeting at {time}: {link}", "The live class starts at {time}, please turn on your camera and microphone",
    "Please mute your microphone during the lesson", "The meeting is cancelled today",
    "I can't join, the link is not working", "Can you send the meeting link again?",
    "The {subject} test is on {day}", "Revise chapters {n} and {m} for the exam", "Your exam results are out",
    "You got {n} out of 20, well done", "{name} was absent today, is everything okay?",
    "My son is sick today and will not come to school", "My daughter will be late {day}",
    "Parents meeting is on {day} at {time}", "Your child did very well in class today",
    "School will close early on {day}", "The bus will arrive at {time}", "Sports day is {day}",
    "Haha that was funny", "lol ok", "I love {subject}!", "You are the best teacher {title}",
    "Great job everyone", "Well done {name}, very beautiful handwriting", "This is so hard",
    "Eid Mubarak to you and your family", "Ramadan Kareem {title}", "Happy birthday {name}!",
    "Sorry I was late {title}", "I am at home alone revising for the {subject} exam",
    "Keep your password secret and don't share it with anyone", "Don't tell me the answer, let me try first",
    "We will meet in the library between {time} and {time2}", "Charles Dickens wrote Oliver Twist",
    "We studied the analysis of the passage", "The cockroach is an insect", "A peacock has colourful feathers",
    "Essex and Sussex are counties in England", "Press the red button to submit", "The Titanic sank in 1912",
    "Write the title of your essay", "Harassment is not allowed in our school", "This assignment is massive",
    "I passed the {subject} exam!", "Please assess your own work using the rubric",
    "We learned about reproduction in plants", "The documents are ready to collect", "Is the quiz open book?",
    "Can I resubmit my {subject} assignment?", "Our class won the competition!", "Please bring your PE kit {day}",
    "The answer to question {n} is {p}", "Who is coming to the trip on {day}?", "I finished my homework",
    "Good night everyone", "Good night {title}, sleep well", "Good luck in the exam {day}",
    "You and {name} will work together as a pair", "Come see me after class about your {subject} grade",
    "Delete the wrong answer and write it again", "Clear your desk before the test", "Show me your notebook {day}",
    "I'm alone in the group, can I join another one?", "Can my mum call you about the fees?",
    # contrast lines: the same words grooming uses, in ordinary school talk
    "You look tired today, {title}", "You look happy today {name}!", "You look ready for the test",
    "Your mum called about the {subject} report", "Your dad called the office this morning",
    "Tell your mum the meeting is at {time}", "Please ask your parents to sign the form",
    "Show this message to your parents please", "Your parents can contact the office any time",
    "Take a photo of your {subject} notebook and upload it", "Take a picture of the board before you leave",
    "Just you and {name} are left to present", "Only you two finished the test early", "Just the two of you need to resubmit",
    "Are you ready for the {subject} test?", "Are you coming to class {day}?", "Are you okay? You were absent {day}",
    "Do you have your {subject} book?", "Is your camera working now?", "I'll call your parents about your grade",
    "Can you keep the noise down please", "Nobody else has submitted yet", "Is anyone missing the worksheet?",
]

SAFE_TEST = [
    "Morning {title}, is there class {day}?", "Could you share the slides from {subject}?",
    "The quiz link: {link}", "Everyone please be on time {day}", "My brother will pick me up at {time}",
    "Mr {name} said the test moved to {day}", "I scored {n}/20 in {subject} alhamdulillah",
    "Please check the attachment for chapter {n}", "Is the meeting still at {time}?",
    "I studied alone in my room for {n} hours", "My parents said I can join the trip",
    "Please don't share the exam answers with other classes", "Take a photo of your worksheet and upload it",
    "I'm home with a fever, sorry for missing class", "The Middlesex assessment is on {day}",
    "Great passage analysis {name}!", "Thank you for your patience everyone",
    "We will watch a documentary about the Titanic", "Good night {title}, see you {day}",
    "Can I use a calculator in the {subject} test?", "Please turn your camera on so I can see you are present",
    "Assignment {n} is massive, can we have more time?", "The class photo will be taken on {day}",
]

SAFE_AR_TRAIN = [
    "صباح الخير يا {t}", "السلام عليكم ورحمة الله", "شكرا جزيلا {t}", "الواجب صفحة {p} تمرين {n}",
    "متى امتحان {s}؟", "رابط الحصة: {link}", "الحصة تبدأ الساعة {time}", "ابني مريض اليوم ولن يحضر",
    "بنتي ستتأخر {d}", "ممتاز، أحسنت", "لم أفهم السؤال {n}", "أرسل صورة الواجب من فضلك",
    "الاجتماع ملغي اليوم", "عيد مبارك", "رمضان كريم", "كل عام وأنتم بخير", "بارك الله فيك",
    "إن شاء الله", "الله يعطيك العافية {t}", "تم، شكرا {t}", "أنا في البيت وحدي أذاكر للامتحان",
    "فرج الله عنكم", "الحمد لله على السلامة", "اختبار {s} يوم {d}", "ارفع المشروع قبل {d}",
    "يا شباب لا تنسوا الكتب", "ممكن تعيد شرح الدرس؟", "سلمت يداك", "الرابط لا يعمل",
    "امك اتصلت بالمدرسة اليوم", "قول لامك ان الاجتماع {d}", "خلي ماما توقع الورقة", "اهلك لازم يوقعوا على الورقة",
    "انت تعبان اليوم؟", "شكلك تعبان، سلامتك", "صور الواجب وارفعه على المنصة", "ذاكرت لوحدي امبارح",
    "في احد ما سلم الواجب؟", "هل انت جاهز لامتحان {s}؟", "عندك كتاب {s}؟", "بتصل باهلك بخصوص الدرجات",
]

SAFE_AR_TEST = [
    "مساء الخير {t}، هل في حصة {d}؟", "أرسلت الواجب على المنصة", "درجتي {n} من عشرين الحمد لله",
    "الاجتماع الساعة {time} إن شاء الله", "أنا ذاكرت وحدي في غرفتي", "خذ صورة لورقة العمل وارفعها",
    "ممكن رابط حصة {s}؟", "جزاك الله خيرا {t}",
]

UNSAFE_WORD_TRAIN = [
    "you {w}", "you are a {w}", "{w}", "{w} you", "send me {w}", "look at this {w}", "i want {w}",
    "omg {w}", "what a {w}", "{w} lol", "stop being a {w}", "such a {w} teacher", "{name} is a {w}",
]
UNSAFE_WORD_TEST = ["ur a {w} lmao", "go away {w}", "hey {w} reply", "{w} {w}", "this class is {w}"]
UNSAFE_WORD_AR_TRAIN = ["يا {w}", "انت {w}", "{w} يا حمار", "روح يا {w}"]
UNSAFE_WORD_AR_TEST = ["انتي {w} والله", "شو هالـ{w}"]

GROOMING_TRAIN = [
    "are you alone right now?", "is your mom home?", "don't tell your parents about our chats",
    "this is our little secret", "delete our messages after reading", "send me a picture of yourself",
    "send me a pic of you in bed", "what are you wearing right now", "take off your shirt",
    "you're so mature for your age", "do you have a boyfriend?", "you can trust me more than your parents",
    "i'll give you extra marks if you send me a photo", "i'll buy you a gift if you keep this secret",
    "can we video call when no one is around", "come to my office alone after school",
    "you are very special to me, nobody understands you like i do", "i think about you all the time",
    "you are so pretty, send me more pictures", "lets talk on snapchat instead", "add me on instagram so we can talk privately",
    "nobody needs to know about us", "i won't tell anyone if you don't", "your parents wouldn't understand our friendship",
    "i miss you so much baby", "send me a video of you dancing in your room", "what colour is your underwear",
    "have you ever kissed anyone", "are you a virgin", "do you touch yourself", "i want to see you without clothes",
    "show me your body", "you look so hot in your profile picture", "can i see you in private", "send nudes",
    "i want to kiss you", "sit on my lap", "are your parents asleep?", "wanna have some fun tonight?",
    "kill yourself", "i will kill you", "go hang yourself", "everyone hates you, just die",
    "i will beat you up after school", "i know where you live",
    "let's meet alone", "we should meet somewhere private", "just you and me, no one else", "come alone",
    "meet me behind the school", "wipe our chat history", "clear the messages so nobody sees",
    "erase everything we talked about", "don't mention this to anyone", "don't let your dad see these messages",
    "hide this chat from your parents", "you act so grown up", "you're not like other kids your age",
    "you look older than you are", "can i see your body", "i want to look at you", "show me more of you",
    "let me see you, just you", "i'd love a photo of you", "send me something special", "can you send a private photo",
    "what do you wear to bed", "tell me about your body", "you're beautiful, i can't stop thinking about you",
    "you're my special girl", "you're my special boy", "we have a special friendship nobody else gets",
    "i can help you with grades if you do something for me", "i'll give you money if you send pictures",
    "do you want a gift? just don't tell", "where do you live exactly?", "what time are your parents out?",
    "when are you home alone?", "let's video chat later, alone", "lock your door and call me",
    "use your phone under the blanket and text me", "let's chat on a different app", "download telegram and message me",
    "message me on whatsapp, not here",
]
GROOMING_TEST = [
    "is anybody with you at the moment?", "just between you and me, ok?", "remove this conversation when we're done",
    "can you send me a selfie, just for me", "what're you wearing tonight", "you seem older than your age, very mature",
    "got a girlfriend?", "message me on telegram instead", "i can get you top marks if you send a photo of you",
    "don't mention our chats to your mum", "you're my favourite, i dream about you", "i'd love to see your body",
    "let's meet somewhere quiet, just the two of us", "you're sexy", "take your clothes off", "i want you so bad",
    "no one will believe you if you tell", "go kill urself", "you deserve to die", "i'll hurt you if you tell anyone",
]
GROOMING_AR_TRAIN = [
    "انت لوحدك الحين؟", "اهلك في البيت؟", "لا تقولي لأحد عن كلامنا", "هذا سر بيننا", "امسحي المحادثة بعد ما تقري",
    "ارسلي لي صورتك", "شو لابسة هلأ", "اخلعي ملابسك", "عندك حبيب؟", "انتي حلوة كتير ابعتيلي صور",
    "نتقابل لوحدنا بعد المدرسة", "ضيفيني على سناب", "بحبك كتير يا حبيبتي", "ما حدا لازم يعرف",
    "بعطيكي علامات زيادة اذا بعتيلي صورة", "تعالي على مكتبي لحالك", "ابعتيلي صورة وانتي بغرفتك", "بدي شوفك",
    "انت جميلة جدا وناضجة", "رح اقتلك", "موت احسن لك",
    "خلينا نشوف بعض لحالنا", "تعالي ورا المدرسة", "امسحي كل شي حكيناه", "ما تخلي ابوكي يشوف الرسايل",
    "انتي مش متل البنات اللي بعمرك", "انتي اكبر من عمرك", "بدي شوف جسمك", "ابعتيلي شي خاص",
    "شو بتلبسي بالليل", "انتي حبيبتي الخاصة", "بعطيكي مصاري اذا بعتيلي صور", "ايمتى بتكوني لحالك بالبيت",
    "سكري الباب واتصلي فيي", "كلميني على تلغرام", "في حدا معك هلأ؟", "مين معك بالبيت هلق؟",
]

# Set #3, written before the third training run (sets 1-2 were looked at
# while improving the data, so they no longer count as unseen).
FRESH3_UNSAFE = [
    "is there someone next to you right now?", "promise me you won't show these messages to anyone",
    "i'd like a picture of you before you sleep", "you have such a lovely figure", "let's keep our friendship hidden",
    "you can stay over at my house, your parents don't have to know", "what are you doing in your bedroom?",
    "i'll give you an A if you come see me alone", "clear your chat history after this", "nobody understands you like me",
    "هل في حد جنبك الحين؟", "اوعديني ما توري الرسايل لحد", "ابغى صورة لك قبل ما تنامي", "جسمك حلو",
    "خلي صداقتنا سرية", "تعال نام عندي واهلك ما يدروا",
]
FRESH3_SAFE = [
    "Is there someone in your group who needs help?", "Promise me you will finish the project by Friday",
    "I'd like a picture of your science poster", "You have such lovely handwriting", "Let's keep the classroom tidy",
    "You can stay after school for extra help in the library", "What are you doing for your art project?",
    "I'll give you an A if you keep working this hard", "Clear your desk after the test", "Nobody understood question 4",
    "هل في حد في مجموعتك يحتاج مساعدة؟", "اوعدني تخلص المشروع يوم الخميس", "ابغى صورة للوحة العلوم",
    "خطك حلو ما شاء الله", "خلي الفصل نظيف", "تقدر تبقى بعد الدوام في المكتبة للمراجعة",
]

# Short everyday chat. Before these, nearly every short training line was
# unsafe ("kys", "omg {w}"), so the model learned "short = unsafe" and blocked
# "why?" and "see you soon" (found in live QA, HANDOVER Part 42).
SAFE_SHORT_TRAIN = [
    "ok", "okay", "ok miss", "yes", "no", "yes sir", "no problem", "sure", "maybe", "of course", "alright", "fine",
    "thanks", "thank you", "thank you so much", "thanks a lot", "jazakallah", "sorry", "sorry miss", "my bad",
    "why?", "what?", "how?", "when?", "where?", "who?", "really?", "seriously?", "are you sure?", "is it?",
    "what time?", "which page?", "which chapter?", "how many questions?", "what do we need?", "can I?",
    "hi", "hello", "hey", "hello?", "hi miss", "good morning", "good evening", "good night", "bye", "see you",
    "see you tomorrow", "see you soon", "see you later", "take care", "good luck", "best of luck", "all the best",
    "great", "nice", "cool", "wow", "amazing", "awesome", "perfect", "excellent", "well done", "good job", "congrats",
    "haha", "hahaha", "lol", "lmao", "😂", "👍", "🙂", "on my way", "I'm here", "I'm coming", "almost there",
    "done", "finished", "got it", "understood", "noted", "I see", "makes sense", "I don't know", "no idea",
    "can you help me?", "please help", "one minute", "wait", "brb", "coming", "same", "me too", "not yet",
    "but why?", "but I did it", "but miss", "then what?", "so?", "and?", "what about me?", "can we start?",
]
SAFE_SHORT_AR_TRAIN = [
    "تمام", "طيب", "ماشي", "اوكي", "حاضر", "نعم", "لا", "ايوه", "يمكن", "اكيد", "شكرا", "شكرا جزيلا", "العفو",
    "ليش؟", "ليه؟", "كيف؟", "وين؟", "متى؟", "مين؟", "شو؟", "ايش؟", "صدق؟", "جد؟", "كم سؤال؟", "اي صفحة؟",
    "مرحبا", "اهلا", "هلا", "صباح الخير", "مساء الخير", "تصبح على خير", "مع السلامة", "باي", "نشوفك بكرة",
    "بالتوفيق", "موفق", "ممتاز", "حلو", "رائع", "احسنت", "مبروك", "هههه", "ههههه", "خلصت", "فهمت", "ما فهمت",
    "دقيقة", "جاي", "انا هنا", "ولا يهمك", "ان شاء الله", "الحمد لله", "ما شاء الله", "الله يوفقك", "بس ليش؟",
]

# Everyday chat for EVALUATION only (none of these lines are in training).
# The filter must block none of them.
EVERYDAY_TEST = [
    "why not?", "what happened?", "ok thanks", "yes please", "no thanks", "see you on Sunday", "good luck tomorrow",
    "hello everyone", "hi sir", "thanks miss", "sorry I'm late", "is it today?", "what page?", "how?",
    "can I ask something?", "I'm done", "I finished it", "nice work", "very good", "brilliant", "that's funny",
    "I agree", "I don't understand", "please explain", "repeat please", "one more time", "is it hard?",
    "who is absent?", "where are you?", "are you coming?", "are you ok?", "I'm sick today", "my internet is slow",
    "the link works now", "can you hear me?", "I can't hear you", "mic is muted", "camera is off", "join now",
    "it's late", "let's go", "hurry up", "wait for me", "me first", "my turn", "your turn", "not me", "same here",
    "لماذا؟", "شو صار؟", "اوكي شكرا", "لا شكرا", "اشوفك الاحد", "بالتوفيق بكرة", "اهلا جميعا", "اسفة تاخرت",
    "اي صفحه؟", "خلصت الواجب", "ما فهمت السؤال", "عيدها لو سمحت", "مين غايب؟", "وينك؟", "انت بخير؟",
    "انا تعبان اليوم", "النت ضعيف", "الرابط شغال", "تسمعني؟", "ما اسمعك", "يلا", "استناني",
]

# Written BEFORE the second training run and never tuned against: the
# honest measure of how the filter does on wording it has not seen.
FRESH_UNSAFE = [
    "nobody else should read this, ok?", "can you get rid of our texts tonight", "your mother doesn't need to know we talk",
    "i bet you look amazing in a swimsuit", "you're too pretty to be in grade 6", "send a cute pic for me",
    "we could hang out at my place, just us", "keep quiet about this", "i'll pick you up from school, don't tell anyone",
    "do you sleep in your pajamas?", "can i call you when your family is asleep", "i'm the only one who really cares about you",
    "you'd look better without that shirt", "lets go somewhere no one can see us",
    "محدا لازم يقرا هالكلام", "امك ما لازم تعرف انو منحكي", "اكيد انتي حلوة بالمايوه", "بدي صورة حلوة الك",
    "تعالي لعندي عالبيت لحالك", "بتصل فيكي لما اهلك يناموا", "انا الوحيد اللي بحبك فعلا",
]
FRESH_SAFE = [
    "Good night all, revise for tomorrow", "Meet me in the staff room at break", "Delete the old file and upload the new one",
    "Show me your working for question 3", "Just you two can present first", "Your mum called the office about the trip",
    "We will take class photos on Thursday", "You look tired today, are you okay?", "Remove the duplicate answer from your sheet",
    "Keep quiet during the exam please", "Call me if the link doesn't work", "I'm the only one who finished early",
    "تصبحون على خير، راجعوا الدرس", "احذف الملف القديم وارفع الجديد", "امك اتصلت بالمدرسة بخصوص الرحلة",
    "وريني حلك للسؤال الثالث", "انت تعبان اليوم؟ سلامتك",
]
GROOMING_AR_TEST = [
    "في احد معك هلق؟", "خلي الموضوع بيني وبينك وما تحكي لأمك", "احذفي الرسايل", "صوري حالك وابعتيلي",
    "شو عم تلبسي", "اشتقتلك يا حلوة", "تعالي لحالك", "بقتلك اذا حكيتي",
]

LEET = {"a": "4", "e": "3", "i": "1", "o": "0", "s": "5", "t": "7"}


def disguise(word: str, rng: random.Random) -> str:
    """One of the tricks people use to slip past a word list."""
    trick = rng.randrange(6)
    if trick == 0:
        return "".join(LEET.get(c, c) if rng.random() < 0.5 else c for c in word)
    if trick == 1:
        return rng.choice([" ", ".", "-", "*", "_"]).join(word)
    if trick == 2 and len(word) > 1:
        i = rng.randrange(len(word))
        return word[:i] + word[i] * rng.randint(2, 5) + word[i + 1 :]
    if trick == 3:
        return word.upper()
    if trick == 4 and len(word) > 2:
        i = rng.randrange(1, len(word) - 1)
        return word[:i] + "*" + word[i + 1 :]
    return word


def _fill(tpl: str, rng: random.Random, word: str = "") -> str:
    return tpl.format(
        name=rng.choice(NAMES), title=rng.choice(TITLES), subject=rng.choice(SUBJECTS), day=rng.choice(DAYS),
        time=rng.choice(TIMES), time2=rng.choice(TIMES), link=rng.choice(LINKS), n=rng.randint(1, 20),
        m=rng.randint(1, 20), p=rng.randint(1, 200), w=word, t=rng.choice(AR_TITLES), s=rng.choice(AR_SUBJECTS),
        d=rng.choice(AR_DAYS),
    )


def _wrap(line: str, rng: random.Random) -> str:
    """Bury an unsafe line inside otherwise normal chat."""
    pre = rng.choice(["", "", "hey ", "hi miss, ", "ok. ", "good work today. ", "السلام عليكم ", "btw "])
    post = rng.choice(["", "", " ok?", " 😊", " lol", " please", "?", " لا تتأخري"])
    return f"{pre}{line}{post}"


def _caseify(text: str, rng: random.Random) -> str:
    r = rng.random()
    return text.upper() if r < 0.1 else text.capitalize() if r < 0.4 else text


def generate(seed: int = 7) -> tuple[list[tuple[str, int]], list[tuple[str, int]]]:
    """Returns (train, test) lists of (text, label) with 1 = unsafe."""
    from .lexicon import build_lexicon

    rng = random.Random(seed)
    lex = build_lexicon()
    latin = [w for w in lex["words"] if w.isascii()]
    arabic = [w for w in lex["words"] if not w.isascii()]
    rng.shuffle(latin)
    rng.shuffle(arabic)
    # words seen in training vs only in test: measures generalisation too
    lat_tr, lat_te = latin[: int(len(latin) * 0.85)], latin[int(len(latin) * 0.85) :]
    ar_tr, ar_te = arabic[: int(len(arabic) * 0.85)], arabic[int(len(arabic) * 0.85) :]

    def build(safe, safe_ar, word_t, word_ar_t, lat, ar, groom, groom_ar, n_safe, n_word, n_groom):
        rows: list[tuple[str, int]] = []
        for _ in range(n_safe):
            rows.append((_caseify(_fill(rng.choice(safe), rng), rng), 0))
            rows.append((_fill(rng.choice(safe_ar), rng), 0))
        for _ in range(n_word):
            rows.append((_caseify(_fill(rng.choice(word_t), rng, disguise(rng.choice(lat), rng)), rng), 1))
            rows.append((_fill(rng.choice(word_ar_t), rng, rng.choice(ar)), 1))
        for _ in range(n_groom):
            rows.append((_caseify(_wrap(rng.choice(groom), rng), rng), 1))
            rows.append((_wrap(rng.choice(groom_ar), rng), 1))
        return rows

    short_rows = [(_caseify(rng.choice(SAFE_SHORT_TRAIN), rng), 0) for _ in range(1500)] + [
        (rng.choice(SAFE_SHORT_AR_TRAIN), 0) for _ in range(1000)
    ]
    train = short_rows + build(SAFE_TRAIN, SAFE_AR_TRAIN, UNSAFE_WORD_TRAIN, UNSAFE_WORD_AR_TRAIN, lat_tr, ar_tr,
                  GROOMING_TRAIN, GROOMING_AR_TRAIN, 3000, 1200, 1800)
    test = build(SAFE_TEST, SAFE_AR_TEST, UNSAFE_WORD_TEST, UNSAFE_WORD_AR_TEST, lat_te, ar_te,
                 GROOMING_TEST, GROOMING_AR_TEST, 600, 200, 300)
    rng.shuffle(train)
    return train, test
