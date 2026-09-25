/* ═══ Learner — English course (course data) ═══
 * The English counterpart of js/learner-data.js, for learners whose target language is English
 * (SOTTOTITOLI_STUDY_LANG === 'en'). Same model as the Italian course:
 *   levels[].units[].lessons[].vocabulary[] + phrases[] + conversations[]
 *
 * ⚠️ THE V() FIELD NAMES ARE LEGACY AND READ BACKWARDS HERE. The renderer treats `.it` as the
 * TARGET — the word shown big, spoken aloud, matched, and expected in the speak step — and `.en`
 * as the TRANSLATION. In the Italian course that happened to line up with the field names. In
 * THIS course the target is English, so:
 *      V(it, en, exampleIt, exampleEn)
 *      V('good morning', 'buongiorno', 'Good morning everyone!', 'Buongiorno a tutti!')
 *          ^ target (English)   ^ translation (Italian)
 * The speak step shows `.en` (Italian) and expects `.it` (English) — which is correct behaviour,
 * just confusingly named. Do not "fix" the names without changing the shared renderer too.
 *
 * Unit ids are prefixed `e` (lessons `e1-1`) so progress keys (`unitId:lessonId`) can never
 * collide with the Italian course's `b1-1` in the same user's stored progress.
 */
(function (w) {
  'use strict';

  // Target (English) + translation (Italian) + an example pair. See the header note.
  function V(it, en, exampleIt, exampleEn) {
    return { it: it, en: en, exampleIt: exampleIt || '', exampleEn: exampleEn || '' };
  }

  // Conversation helper: [role, target-language line, translation]
  function C(role, text, translation) {
    return { role: role, text: text, translation: translation };
  }

  var COURSE_EN = {
    name: 'English Course',
    nameEn: 'Corso di inglese',
    levels: [
      /* ────────────────────────── BEGINNER ────────────────────────── */
      {
        id: 'beginner',
        label: 'Beginner',
        labelEn: 'Principiante',
        color: '#22c55e',
        icon: '🌱',
        units: [
          {
            id: 'e1',
            title: 'First Steps',
            titleEn: 'First Steps',
            subtitle: 'Greetings, introductions and numbers.',
            subtitleEn: 'Greetings, introductions and numbers.',
            color: '#22c55e',
            icon: '👋',
            lessons: [
              {
                id: 'e1-1',
                title: 'Greetings & politeness',
                titleEn: 'Greetings & politeness',
                description: 'The words to greet and thank.',
                descriptionEn: 'The words to greet and thank.',
                vocabulary: [
                  V('hello / hi', 'ciao', 'Hello, how are you?', 'Ciao, come stai?'),
                  V('good morning', 'buongiorno', 'Good morning everyone!', 'Buongiorno a tutti!'),
                  V('good evening', 'buonasera', 'Good evening, madam.', 'Buonasera, signora.'),
                  V('good night', 'buonanotte', 'Good night, see you tomorrow.', 'Buonanotte, a domani.'),
                  V('goodbye', 'arrivederci', 'Goodbye and thank you.', 'Arrivederci e grazie.'),
                  V('thank you', 'grazie', 'Thank you very much!', 'Grazie mille!'),
                  V('you’re welcome', 'prego', '— Thank you. — You’re welcome.', '— Grazie. — Prego.'),
                  V('please', 'per favore', 'A coffee, please.', 'Un caffè, per favore.'),
                  V('sorry', 'scusa', 'Sorry, I’m late.', 'Scusa, arrivo tardi.'),
                  V('excuse me', 'scusi', 'Excuse me, where is the bank?', 'Scusi, dov\'è la banca?'),
                ],
                phrases: [
                  V('How are you?', 'Come stai?', 'Hi! How are you today?', 'Ciao! Come stai oggi?'),
                  V('I’m fine, thank you.', 'Bene, grazie.', 'Fine, thanks, and you?', 'Bene, grazie, e tu?'),
                  V('Nice to meet you.', 'Piacere di conoscerti.', 'Nice to meet you, Maria.', 'Piacere di conoscerti, Maria.'),
                  V('See you tomorrow!', 'A domani!', 'See you tomorrow, my friend!', 'A domani, amico mio!'),
                ],
              },
              {
                id: 'e1-2',
                title: 'Introducing yourself',
                titleEn: 'Introducing yourself',
                description: 'How to say who you are and where you’re from.',
                descriptionEn: 'How to say who you are and where you’re from.',
                vocabulary: [
                  V('I', 'io', 'I am Anna.', 'Io sono Anna.'),
                  V('you', 'tu', 'You are very kind.', 'Tu sei molto gentile.'),
                  V('first name', 'il nome', 'My first name is Marco.', 'Il mio nome è Marco.'),
                  V('surname', 'il cognome', 'What is your surname?', 'Qual è il tuo cognome?'),
                  V('nationality', 'la nazionalità', 'What is your nationality?', 'Qual è la tua nazionalità?'),
                  V('to live', 'abitare', 'I live in Milan.', 'Abito a Milano.'),
                  V('to work', 'lavorare', 'I work in an office.', 'Lavoro in un ufficio.'),
                  V('student', 'lo studente', 'I am a student.', 'Sono uno studente.'),
                ],
                phrases: [
                  V('What’s your name?', 'Come ti chiami?', 'What’s your name, sorry?', 'Come ti chiami, scusa?'),
                  V('My name is…', 'Mi chiamo…', 'My name is Giulia.', 'Mi chiamo Giulia.'),
                  V('How old are you?', 'Quanti anni hai?', 'How old are you?', 'Quanti anni hai tu?'),
                  V('I live in Rome.', 'Abito a Roma.', 'I’ve lived in Rome for two years.', 'Abito a Roma da due anni.'),
                ],
              },
              {
                id: 'e1-3',
                title: 'First numbers',
                titleEn: 'First numbers',
                description: 'Numbers from one to ten.',
                descriptionEn: 'Numbers from one to ten.',
                vocabulary: [
                  V('one', 'uno', 'One coffee, please.', 'Un caffè, per favore.'),
                  V('two', 'due', 'Two tickets, thanks.', 'Due biglietti, grazie.'),
                  V('three', 'tre', 'I have three brothers.', 'Ho tre fratelli.'),
                  V('four', 'quattro', 'Room number four.', 'La stanza numero quattro.'),
                  V('five', 'cinque', 'It’s five o’clock.', 'Sono le cinque.'),
                  V('six', 'sei', 'Six euros, please.', 'Sei euro, per favore.'),
                  V('seven', 'sette', 'The week has seven days.', 'La settimana ha sette giorni.'),
                  V('eight', 'otto', 'Departure at eight.', 'Partenza alle otto.'),
                  V('nine', 'nove', 'Nine people at the table.', 'Nove persone al tavolo.'),
                  V('ten', 'dieci', 'Ten minutes, thanks.', 'Dieci minuti, grazie.'),
                ],
                phrases: [
                  V('How much does it cost?', 'Quanto costa?', 'How much does this book cost?', 'Quanto costa questo libro?'),
                  V('I have two brothers.', 'Ho due fratelli.', 'I have two brothers and one sister.', 'Ho due fratelli e una sorella.'),
                  V('It’s three o’clock.', 'Sono le tre.', 'It’s exactly three o’clock.', 'Sono le tre in punto.'),
                ],
                conversations: [
                  {
                    id: 'e1-c1',
                    title: 'In the square',
                    titleEn: 'In the square',
                    speakers: [
                      C('A', 'Hi! How are you?', 'Ciao! Come stai?'),
                      C('B', 'Fine, thanks, and you?', 'Bene, grazie, e tu?'),
                      C('A', 'All good. What’s your name?', 'Tutto bene. Come ti chiami?'),
                      C('B', 'My name is Sara, nice to meet you.', 'Mi chiamo Sara, piacere.'),
                      C('A', 'Nice to meet you, I’m Luca.', 'Piacere, io sono Luca.'),
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: 'e2',
            title: 'Daily Life',
            titleEn: 'Daily Life',
            subtitle: 'Family, food and home.',
            subtitleEn: 'Family, food and home.',
            color: '#0ea5e9',
            icon: '🏠',
            lessons: [
              {
                id: 'e2-1',
                title: 'Family',
                titleEn: 'Family',
                description: 'The members of the family.',
                descriptionEn: 'The members of the family.',
                vocabulary: [
                  V('family', 'la famiglia', 'My family lives in Rome.', 'La mia famiglia vive a Roma.'),
                  V('mother', 'la madre', 'My mother is a teacher.', 'Mia madre è insegnante.'),
                  V('father', 'il padre', 'His father works here.', 'Suo padre lavora qui.'),
                  V('brother', 'il fratello', 'I have one brother.', 'Ho un fratello.'),
                  V('sister', 'la sorella', 'My sister is older.', 'Mia sorella è più grande.'),
                  V('son', 'il figlio', 'Their son is ten.', 'Loro figlio ha dieci anni.'),
                  V('daughter', 'la figlia', 'My daughter studies English.', 'Mia figlia studia inglese.'),
                  V('parents', 'i genitori', 'My parents live nearby.', 'I miei genitori abitano qui vicino.'),
                  V('husband', 'il marito', 'Her husband is a doctor.', 'Suo marito è medico.'),
                  V('wife', 'la moglie', 'His wife is Italian.', 'Sua moglie è italiana.'),
                ],
                phrases: [
                  V('I have two sisters.', 'Ho due sorelle.', 'I have two sisters and no brothers.', 'Ho due sorelle e nessun fratello.'),
                  V('Do you have children?', 'Hai figli?', 'Do you have children, Marco?', 'Hai figli, Marco?'),
                  V('We are a big family.', 'Siamo una famiglia numerosa.', 'We are a big family, eight of us.', 'Siamo una famiglia numerosa, in otto.'),
                ],
              },
              {
                id: 'e2-2',
                title: 'Food & drinks',
                titleEn: 'Food & drinks',
                description: 'Food, drinks and meals.',
                descriptionEn: 'Food, drinks and meals.',
                vocabulary: [
                  V('water', 'l’acqua', 'A glass of water, please.', 'Un bicchiere d’acqua, per favore.'),
                  V('bread', 'il pane', 'Fresh bread every morning.', 'Pane fresco ogni mattina.'),
                  V('coffee', 'il caffè', 'An espresso, please.', 'Un caffè, per favore.'),
                  V('tea', 'il tè', 'Tea with lemon.', 'Tè al limone.'),
                  V('milk', 'il latte', 'Milk in the coffee?', 'Latte nel caffè?'),
                  V('wine', 'il vino', 'A glass of red wine.', 'Un bicchiere di vino rosso.'),
                  V('breakfast', 'la colazione', 'Breakfast is at eight.', 'La colazione è alle otto.'),
                  V('lunch', 'il pranzo', 'Lunch at one o’clock.', 'Pranzo all\'una.'),
                  V('dinner', 'la cena', 'Dinner with friends.', 'Cena con gli amici.'),
                  V('to eat', 'mangiare', 'I eat at home.', 'Mangio a casa.'),
                ],
                phrases: [
                  V('I’m hungry.', 'Ho fame.', 'I’m hungry, let’s eat.', 'Ho fame, mangiamo.'),
                  V('The bill, please.', 'Il conto, per favore.', 'The bill, please, when you can.', 'Il conto, per favore, quando può.'),
                  V('I don’t eat meat.', 'Non mangio carne.', 'I don’t eat meat or fish.', 'Non mangio carne né pesce.'),
                ],
              },
              {
                id: 'e2-3',
                title: 'The house',
                titleEn: 'The house',
                description: 'Rooms and things at home.',
                descriptionEn: 'Rooms and things at home.',
                vocabulary: [
                  V('house', 'la casa', 'This house is old.', 'Questa casa è vecchia.'),
                  V('flat', 'l’appartamento', 'A flat in the centre.', 'Un appartamento in centro.'),
                  V('kitchen', 'la cucina', 'The kitchen is small.', 'La cucina è piccola.'),
                  V('bedroom', 'la camera da letto', 'Two bedrooms upstairs.', 'Due camere da letto al piano di sopra.'),
                  V('bathroom', 'il bagno', 'The bathroom is on the left.', 'Il bagno è a sinistra.'),
                  V('living room', 'il soggiorno', 'We watch TV in the living room.', 'Guardiamo la TV in soggiorno.'),
                  V('door', 'la porta', 'Close the door, please.', 'Chiudi la porta, per favore.'),
                  V('window', 'la finestra', 'Open the window.', 'Apri la finestra.'),
                  V('table', 'il tavolo', 'Put it on the table.', 'Mettilo sul tavolo.'),
                  V('chair', 'la sedia', 'This chair is broken.', 'Questa sedia è rotta.'),
                ],
                phrases: [
                  V('I live in a small flat.', 'Vivo in un piccolo appartamento.', 'I live in a small flat near the station.', 'Vivo in un piccolo appartamento vicino alla stazione.'),
                  V('Where is the bathroom?', 'Dov’è il bagno?', 'Excuse me, where is the bathroom?', 'Scusi, dov’è il bagno?'),
                  V('Make yourself at home.', 'Fai come se fossi a casa tua.', 'Make yourself at home, please.', 'Fai come se fossi a casa tua, prego.'),
                ],
                conversations: [
                  {
                    id: 'e2-c1',
                    title: 'At home',
                    titleEn: 'At home',
                    speakers: [
                      C('A', 'Where do you live?', 'Dove abiti?'),
                      C('B', 'I live in a small flat near the station.', 'Vivo in un piccolo appartamento vicino alla stazione.'),
                      C('A', 'Is it big?', 'È grande?'),
                      C('B', 'No, but the kitchen is nice.', 'No, ma la cucina è bella.'),
                      C('A', 'Do you have a balcony?', 'Hai un balcone?'),
                      C('B', 'Yes, one small balcony.', 'Sì, un piccolo balcone.'),
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: 'e3',
            title: 'Out and About',
            titleEn: 'Out and About',
            subtitle: 'City, transport and directions.',
            subtitleEn: 'City, transport and directions.',
            color: '#f59e0b',
            icon: '🚉',
            lessons: [
              {
                id: 'e3-1',
                title: 'The city',
                titleEn: 'The city',
                description: 'Places in the city.',
                descriptionEn: 'Places in the city.',
                vocabulary: [
                  V('city', 'la città', 'Milan is a big city.', 'Milano è una grande città.'),
                  V('street', 'la strada', 'Which street is it?', 'Qual è la strada?'),
                  V('square', 'la piazza', 'The square is full of people.', 'La piazza è piena di gente.'),
                  V('bank', 'la banca', 'The bank opens at nine.', 'La banca apre alle nove.'),
                  V('pharmacy', 'la farmacia', 'Is there a pharmacy near here?', 'C’è una farmacia qui vicino?'),
                  V('supermarket', 'il supermercato', 'The supermarket closes at eight.', 'Il supermercato chiude alle otto.'),
                  V('station', 'la stazione', 'The station is that way.', 'La stazione è da quella parte.'),
                  V('park', 'il parco', 'We walk in the park.', 'Passeggiamo nel parco.'),
                  V('museum', 'il museo', 'The museum is free on Sunday.', 'Il museo è gratis la domenica.'),
                  V('market', 'il mercato', 'The market is on Saturday.', 'Il mercato è il sabato.'),
                ],
                phrases: [
                  V('Is there a bank near here?', 'C’è una banca qui vicino?', 'Excuse me, is there a bank near here?', 'Scusi, c’è una banca qui vicino?'),
                  V('I’m looking for the station.', 'Sto cercando la stazione.', 'I’m looking for the station, can you help me?', 'Sto cercando la stazione, mi può aiutare?'),
                  V('It’s not far from here.', 'Non è lontano da qui.', 'It’s not far from here, ten minutes.', 'Non è lontano da qui, dieci minuti.'),
                ],
              },
              {
                id: 'e3-2',
                title: 'Transport',
                titleEn: 'Transport',
                description: 'Buses, trains and tickets.',
                descriptionEn: 'Buses, trains and tickets.',
                vocabulary: [
                  V('bus', 'l’autobus', 'The bus is late.', 'L’autobus è in ritardo.'),
                  V('train', 'il treno', 'The train leaves at six.', 'Il treno parte alle sei.'),
                  V('underground', 'la metropolitana', 'Take the underground.', 'Prendi la metropolitana.'),
                  V('ticket', 'il biglietto', 'A ticket to Rome, please.', 'Un biglietto per Roma, per favore.'),
                  V('platform', 'il binario', 'Platform nine.', 'Binario nove.'),
                  V('airport', 'l’aeroporto', 'How do I get to the airport?', 'Come arrivo all’aeroporto?'),
                  V('car', 'la macchina', 'We go by car.', 'Andiamo in macchina.'),
                  V('bicycle', 'la bicicletta', 'I cycle to work.', 'Vado al lavoro in bicicletta.'),
                  V('to leave', 'partire', 'We leave tomorrow.', 'Partiamo domani.'),
                  V('to arrive', 'arrivare', 'We arrive at eight.', 'Arriviamo alle otto.'),
                ],
                phrases: [
                  V('Two tickets, please.', 'Due biglietti, per favore.', 'Two tickets to Florence, please.', 'Due biglietti per Firenze, per favore.'),
                  V('Which platform?', 'Quale binario?', 'Which platform for Naples?', 'Quale binario per Napoli?'),
                  V('The train is late.', 'Il treno è in ritardo.', 'The train is twenty minutes late.', 'Il treno è in ritardo di venti minuti.'),
                ],
              },
              {
                id: 'e3-3',
                title: 'Asking for directions',
                titleEn: 'Asking for directions',
                description: 'How to ask for and understand directions.',
                descriptionEn: 'How to ask for and understand directions.',
                vocabulary: [
                  V('left', 'sinistra', 'Turn left at the corner.', 'Gira a sinistra all’angolo.'),
                  V('right', 'destra', 'The bank is on the right.', 'La banca è a destra.'),
                  V('straight on', 'sempre dritto', 'Go straight on for 200 metres.', 'Vai sempre dritto per 200 metri.'),
                  V('near', 'vicino', 'Is it near?', 'È vicino?'),
                  V('far', 'lontano', 'It’s too far to walk.', 'È troppo lontano per andare a piedi.'),
                  V('corner', 'l’angolo', 'At the next corner.', 'Al prossimo angolo.'),
                  V('opposite', 'di fronte', 'Opposite the church.', 'Di fronte alla chiesa.'),
                  V('on foot', 'a piedi', 'It’s ten minutes on foot.', 'Sono dieci minuti a piedi.'),
                  V('to turn', 'girare', 'Turn right after the bridge.', 'Gira a destra dopo il ponte.'),
                  V('to cross', 'attraversare', 'Cross the square.', 'Attraversa la piazza.'),
                ],
                phrases: [
                  V('How do I get to the station?', 'Come arrivo alla stazione?', 'Sorry, how do I get to the station?', 'Scusi, come arrivo alla stazione?'),
                  V('Is it far from here?', 'È lontano da qui?', 'Is it far from here on foot?', 'È lontano da qui a piedi?'),
                  V('I think I’m lost.', 'Credo di essermi perso.', 'I think I’m lost, can you help?', 'Credo di essermi perso, mi può aiutare?'),
                  V('Go straight, then turn left.', 'Vada dritto, poi giri a sinistra.', 'Go straight, then turn left at the lights.', 'Vada dritto, poi giri a sinistra al semaforo.'),
                ],
                conversations: [
                  {
                    id: 'e3-c1',
                    title: 'Asking the way',
                    titleEn: 'Asking the way',
                    speakers: [
                      C('A', 'Excuse me, how do I get to the station?', 'Scusi, come arrivo alla stazione?'),
                      C('B', 'Go straight on, then turn right at the corner.', 'Vada sempre dritto, poi giri a destra all’angolo.'),
                      C('A', 'Is it far?', 'È lontano?'),
                      C('B', 'No, about ten minutes on foot.', 'No, circa dieci minuti a piedi.'),
                      C('A', 'And is there a pharmacy near the station?', 'E c’è una farmacia vicino alla stazione?'),
                      C('B', 'Yes, opposite the entrance.', 'Sì, di fronte all’ingresso.'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      /* ────────────────────────── INTERMEDIATE ────────────────────────── */
      {
        id: 'intermediate',
        label: 'Intermediate',
        labelEn: 'Intermedio',
        color: '#8b5cf6',
        icon: '🌿',
        units: [
          {
            id: 'e4',
            title: 'Conversations',
            titleEn: 'Conversations',
            subtitle: 'Restaurant, shopping and the phone.',
            subtitleEn: 'Restaurant, shopping and the phone.',
            color: '#8b5cf6',
            icon: '🍽️',
            lessons: [
              {
                id: 'e4-1',
                title: 'At the restaurant',
                titleEn: 'At the restaurant',
                description: 'Ordering and asking for the bill.',
                descriptionEn: 'Ordering and asking for the bill.',
                vocabulary: [
                  V('menu', 'il menù', 'Could I see the menu?', 'Posso vedere il menù?'),
                  V('to order', 'ordinare', 'We’d like to order.', 'Vorremmo ordinare.'),
                  V('waiter', 'il cameriere', 'The waiter is coming.', 'Il cameriere sta arrivando.'),
                  V('bill', 'il conto', 'Could we have the bill?', 'Ci porta il conto?'),
                  V('starter', 'l’antipasto', 'The starter was excellent.', 'L’antipasto era ottimo.'),
                  V('main course', 'il secondo', 'For the main course, fish.', 'Come secondo, pesce.'),
                  V('dessert', 'il dolce', 'Do you have dessert?', 'Avete dolci?'),
                  V('to book a table', 'prenotare un tavolo', 'I booked a table for two.', 'Ho prenotato un tavolo per due.'),
                  V('house wine', 'il vino della casa', 'A carafe of house wine.', 'Una caraffa di vino della casa.'),
                  V('tip', 'la mancia', 'Is the tip included?', 'La mancia è inclusa?'),
                ],
                phrases: [
                  V('A table for two, please.', 'Un tavolo per due, per favore.', 'A table for two, please, by the window.', 'Un tavolo per due, per favore, vicino alla finestra.'),
                  V('What do you recommend?', 'Cosa consiglia?', 'What do you recommend as a starter?', 'Cosa consiglia come antipasto?'),
                  V('I have a reservation.', 'Ho una prenotazione.', 'I have a reservation under Rossi.', 'Ho una prenotazione a nome Rossi.'),
                ],
              },
              {
                id: 'e4-2',
                title: 'Shopping',
                titleEn: 'Shopping',
                description: 'Prices, sizes and paying.',
                descriptionEn: 'Prices, sizes and paying.',
                vocabulary: [
                  V('price', 'il prezzo', 'What a good price!', 'Che buon prezzo!'),
                  V('size', 'la taglia', 'Do you have a larger size?', 'Avete una taglia più grande?'),
                  V('to try on', 'provare', 'Can I try it on?', 'Posso provarlo?'),
                  V('cash', 'contanti', 'I’ll pay in cash.', 'Pago in contanti.'),
                  V('credit card', 'carta di credito', 'Do you take credit cards?', 'Accettate carte di credito?'),
                  V('receipt', 'lo scontrino', 'Can I have a receipt?', 'Mi dà lo scontrino?'),
                  V('discount', 'lo sconto', 'Is there a discount?', 'C’è uno sconto?'),
                  V('shop assistant', 'il commesso', 'The shop assistant was helpful.', 'Il commesso è stato gentile.'),
                  V('to exchange', 'cambiare', 'Can I exchange it?', 'Posso cambiarlo?'),
                  V('sale', 'i saldi', 'The sales start in January.', 'I saldi iniziano a gennaio.'),
                ],
                phrases: [
                  V('How much is it?', 'Quanto costa?', 'How much is this jacket?', 'Quanto costa questa giacca?'),
                  V('It’s too expensive.', 'È troppo caro.', 'It’s too expensive for me.', 'È troppo caro per me.'),
                  V('I’m just looking, thanks.', 'Sto solo guardando, grazie.', 'I’m just looking, thanks.', 'Sto solo guardando, grazie.'),
                ],
              },
              {
                id: 'e4-3',
                title: 'On the phone',
                titleEn: 'On the phone',
                description: 'Answering, calling and messages.',
                descriptionEn: 'Answering, calling and messages.',
                vocabulary: [
                  V('to answer', 'rispondere', 'Nobody answered the phone.', 'Nessuno ha risposto al telefono.'),
                  V('to call back', 'richiamare', 'I’ll call back later.', 'Richiamo più tardi.'),
                  V('message', 'il messaggio', 'Can I leave a message?', 'Posso lasciare un messaggio?'),
                  V('to hang up', 'riagganciare', 'Don’t hang up, please.', 'Non riagganciare, per favore.'),
                  V('wrong number', 'numero sbagliato', 'Sorry, wrong number.', 'Scusi, numero sbagliato.'),
                  V('voicemail', 'la segreteria', 'It went to voicemail.', 'È andata in segreteria.'),
                  V('to hold on', 'attendere', 'Hold on a moment, please.', 'Attenda un momento, per favore.'),
                  V('appointment', 'l’appuntamento', 'I’d like an appointment.', 'Vorrei un appuntamento.'),
                  V('to confirm', 'confermare', 'Can you confirm by email?', 'Può confermare via email?'),
                  V('to reschedule', 'spostare', 'Can we reschedule for Friday?', 'Possiamo spostare a venerdì?'),
                ],
                phrases: [
                  V('Can I speak to…?', 'Posso parlare con…?', 'Good morning, can I speak to Mr Rossi?', 'Buongiorno, posso parlare con il signor Rossi?'),
                  V('Speaking.', 'Sono io.', 'Hello, this is Rossi speaking.', 'Pronto, sono io Rossi.'),
                  V('Could you say that again?', 'Può ripetere?', 'Sorry, could you say that again, more slowly?', 'Scusi, può ripetere, più lentamente?'),
                ],
                conversations: [
                  {
                    id: 'e4-c1',
                    title: 'A phone call',
                    titleEn: 'A phone call',
                    speakers: [
                      C('A', 'Good morning, can I speak to Ms Bianchi?', 'Buongiorno, posso parlare con la signora Bianchi?'),
                      C('B', 'Speaking. How can I help you?', 'Sono io. Come posso aiutarla?'),
                      C('A', 'I’d like to book an appointment for Thursday.', 'Vorrei prenotare un appuntamento per giovedì.'),
                      C('B', 'Thursday morning is full. Would Friday work?', 'Giovedì mattina è pieno. Venerdì andrebbe bene?'),
                      C('A', 'Friday is fine, thank you.', 'Venerdì va bene, grazie.'),
                      C('B', 'Could you confirm by email?', 'Può confermare via email?'),
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: 'e5',
            title: 'Work & Study',
            titleEn: 'Work & Study',
            subtitle: 'Office, university and the weather.',
            subtitleEn: 'Office, university and the weather.',
            color: '#6366f1',
            icon: '💼',
            lessons: [
              {
                id: 'e5-1',
                title: 'The office',
                titleEn: 'The office',
                description: 'Words for working life.',
                descriptionEn: 'Words for working life.',
                vocabulary: [
                  V('office', 'l’ufficio', 'I work in an office.', 'Lavoro in un ufficio.'),
                  V('meeting', 'la riunione', 'The meeting starts at ten.', 'La riunione inizia alle dieci.'),
                  V('colleague', 'il collega', 'My colleague is on holiday.', 'Il mio collega è in ferie.'),
                  V('boss', 'il capo', 'My boss is fair.', 'Il mio capo è giusto.'),
                  V('email', 'l’email', 'I’ll send you an email.', 'Ti mando un’email.'),
                  V('deadline', 'la scadenza', 'The deadline is Friday.', 'La scadenza è venerdì.'),
                  V('to book', 'prenotare', 'I booked the meeting room.', 'Ho prenotato la sala riunioni.'),
                  V('project', 'il progetto', 'The project is going well.', 'Il progetto va bene.'),
                  V('salary', 'lo stipendio', 'The salary is paid monthly.', 'Lo stipendio è pagato mensilmente.'),
                  V('to hire', 'assumere', 'They’re hiring two people.', 'Assumono due persone.'),
                ],
                phrases: [
                  V('I’m in a meeting.', 'Sono in riunione.', 'I’m in a meeting, can I call you back?', 'Sono in riunione, posso richiamarla?'),
                  V('Can we move the meeting?', 'Possiamo spostare la riunione?', 'Can we move the meeting to Tuesday?', 'Possiamo spostare la riunione a martedì?'),
                  V('I’ll get back to you.', 'Ti faccio sapere.', 'I’ll get back to you by tomorrow.', 'Ti faccio sapere entro domani.'),
                ],
              },
              {
                id: 'e5-2',
                title: 'University',
                titleEn: 'University',
                description: 'Studying and exams.',
                descriptionEn: 'Studying and exams.',
                vocabulary: [
                  V('university', 'l’università', 'She studies at university.', 'Studia all’università.'),
                  V('degree', 'la laurea', 'He has a degree in law.', 'Ha una laurea in giurisprudenza.'),
                  V('lecture', 'la lezione', 'The lecture is at nine.', 'La lezione è alle nove.'),
                  V('exam', 'l’esame', 'I have an exam tomorrow.', 'Ho un esame domani.'),
                  V('to study', 'studiare', 'I study every evening.', 'Studio ogni sera.'),
                  V('library', 'la biblioteca', 'The library is open late.', 'La biblioteca è aperta fino a tardi.'),
                  V('essay', 'il saggio', 'The essay is due Monday.', 'Il saggio va consegnato lunedì.'),
                  V('term', 'il semestre', 'The term starts in October.', 'Il semestre inizia a ottobre.'),
                  V('notes', 'gli appunti', 'Can I borrow your notes?', 'Posso prendere i tuoi appunti?'),
                  V('to pass', 'superare', 'I passed the exam!', 'Ho superato l’esame!'),
                ],
                phrases: [
                  V('I have to study for an exam.', 'Devo studiare per un esame.', 'I have to study for an exam on Friday.', 'Devo studiare per un esame venerdì.'),
                  V('Did you pass?', 'Hai superato?', 'Did you pass the exam?', 'Hai superato l’esame?'),
                  V('I’m writing my thesis.', 'Sto scrivendo la tesi.', 'I’m writing my thesis this year.', 'Sto scrivendo la tesi quest’anno.'),
                ],
              },
              {
                id: 'e5-3',
                title: 'The weather',
                titleEn: 'The weather',
                description: 'Talking about the weather.',
                descriptionEn: 'Talking about the weather.',
                vocabulary: [
                  V('weather', 'il tempo', 'The weather is lovely today.', 'Oggi il tempo è bellissimo.'),
                  V('sun', 'il sole', 'There’s sun all week.', 'C’è il sole tutta la settimana.'),
                  V('rain', 'la pioggia', 'The rain won’t stop.', 'La pioggia non smette.'),
                  V('snow', 'la neve', 'Snow in the mountains.', 'Neve in montagna.'),
                  V('wind', 'il vento', 'The wind is strong.', 'Il vento è forte.'),
                  V('cloud', 'la nuvola', 'Not a cloud in the sky.', 'Neanche una nuvola.'),
                  V('hot', 'caldo', 'It’s too hot to walk.', 'È troppo caldo per camminare.'),
                  V('cold', 'freddo', 'It’s cold this morning.', 'Fa freddo stamattina.'),
                  V('forecast', 'le previsioni', 'The forecast says rain.', 'Le previsioni dicono pioggia.'),
                  V('degrees', 'i gradi', 'Twenty degrees today.', 'Oggi venti gradi.'),
                ],
                phrases: [
                  V('What’s the weather like?', 'Com’è il tempo?', 'What’s the weather like in Rome?', 'Com’è il tempo a Roma?'),
                  V('It’s going to rain.', 'Sta per piovere.', 'Take an umbrella, it’s going to rain.', 'Prendi l’ombrello, sta per piovere.'),
                  V('It’s warmer than yesterday.', 'Fa più caldo di ieri.', 'It’s warmer than yesterday, isn’t it?', 'Fa più caldo di ieri, vero?'),
                ],
                conversations: [
                  {
                    id: 'e5-c1',
                    title: 'At the office',
                    titleEn: 'At the office',
                    speakers: [
                      C('A', 'Are you free for the meeting at ten?', 'Sei libero per la riunione alle dieci?'),
                      C('B', 'I’m in a meeting until half past.', 'Sono in riunione fino alle dieci e mezza.'),
                      C('A', 'Can we move it to eleven?', 'Possiamo spostarla alle undici?'),
                      C('B', 'Eleven works. Did you book the room?', 'Alle undici va bene. Hai prenotato la sala?'),
                      C('A', 'Yes, and I sent the agenda by email.', 'Sì, e ho mandato l’ordine del giorno via email.'),
                      C('B', 'Perfect, see you then.', 'Perfetto, ci vediamo allora.'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      /* ────────────────────────── ADVANCED ────────────────────────── */
      {
        id: 'advanced',
        label: 'Advanced',
        labelEn: 'Avanzato',
        color: '#14b8a6',
        icon: '🔥',
        units: [
          {
            id: 'e6',
            title: 'Travel & Culture',
            titleEn: 'Travel & Culture',
            subtitle: 'Airport, hotel and culture.',
            subtitleEn: 'Airport, hotel and culture.',
            color: '#14b8a6',
            icon: '✈️',
            lessons: [
              {
                id: 'e6-1',
                title: 'At the airport',
                titleEn: 'At the airport',
                description: 'Flights, luggage and departures.',
                descriptionEn: 'Flights, luggage and departures.',
                vocabulary: [
                  V('flight', 'il volo', 'The flight is boarding.', 'Il volo sta imbarcando.'),
                  V('boarding pass', 'la carta d’imbarco', 'Show your boarding pass.', 'Mostri la carta d’imbarco.'),
                  V('luggage', 'i bagagli', 'My luggage didn’t arrive.', 'I miei bagagli non sono arrivati.'),
                  V('gate', 'il gate', 'The gate changed.', 'Il gate è cambiato.'),
                  V('delay', 'il ritardo', 'A two-hour delay.', 'Un ritardo di due ore.'),
                  V('customs', 'la dogana', 'Nothing to declare at customs.', 'Niente da dichiarare in dogana.'),
                  V('passport', 'il passaporto', 'Your passport, please.', 'Il passaporto, per favore.'),
                  V('to take off', 'decollare', 'We take off at seven.', 'Decolliamo alle sette.'),
                  V('to land', 'atterrare', 'We land in Madrid.', 'Atterriamo a Madrid.'),
                  V('departure', 'la partenza', 'Departure is delayed.', 'La partenza è in ritardo.'),
                ],
                phrases: [
                  V('Where is the gate?', 'Dov’è il gate?', 'Excuse me, where is the gate for Rome?', 'Scusi, dov’è il gate per Roma?'),
                  V('I’ve missed my connection.', 'Ho perso la coincidenza.', 'I’ve missed my connection, what can I do?', 'Ho perso la coincidenza, cosa posso fare?'),
                  V('Is the flight on time?', 'Il volo è in orario?', 'Is the flight on time or delayed?', 'Il volo è in orario o in ritardo?'),
                ],
              },
              {
                id: 'e6-2',
                title: 'At the hotel',
                titleEn: 'At the hotel',
                description: 'Rooms, services and breakfast.',
                descriptionEn: 'Rooms, services and breakfast.',
                vocabulary: [
                  V('reservation', 'la prenotazione', 'I have a reservation.', 'Ho una prenotazione.'),
                  V('room', 'la camera', 'A quiet room, please.', 'Una camera tranquilla, per favore.'),
                  V('key', 'la chiave', 'The key doesn’t work.', 'La chiave non funziona.'),
                  V('breakfast included', 'colazione inclusa', 'Is breakfast included?', 'La colazione è inclusa?'),
                  V('check-in', 'il check-in', 'Check-in is from two.', 'Il check-in è dalle due.'),
                  V('check-out', 'il check-out', 'Check-out is at eleven.', 'Il check-out è alle undici.'),
                  V('lift', 'l’ascensore', 'The lift is out of order.', 'L’ascensore è fuori servizio.'),
                  V('towel', 'l’asciugamano', 'Could I have another towel?', 'Potrei avere un altro asciugamano?'),
                  V('view', 'la vista', 'A room with a view.', 'Una camera con vista.'),
                  V('to complain', 'reclamare', 'I’d like to complain.', 'Vorrei reclamare.'),
                ],
                phrases: [
                  V('I have a reservation under Rossi.', 'Ho una prenotazione a nome Rossi.', 'Good evening, I have a reservation under Rossi.', 'Buonasera, ho una prenotazione a nome Rossi.'),
                  V('Could I have a late check-out?', 'Posso fare il check-out più tardi?', 'Could I have a late check-out tomorrow?', 'Posso fare il check-out più tardi domani?'),
                  V('The room is noisy.', 'La camera è rumorosa.', 'The room is noisy, could we move?', 'La camera è rumorosa, possiamo cambiare?'),
                ],
              },
              {
                id: 'e6-3',
                title: 'British culture',
                titleEn: 'British culture',
                description: 'Art, cuisine and traditions.',
                descriptionEn: 'Art, cuisine and traditions.',
                vocabulary: [
                  V('art', 'l’arte', 'Modern art is not for me.', 'L’arte moderna non fa per me.'),
                  V('gallery', 'la galleria', 'The gallery is free.', 'La galleria è gratuita.'),
                  V('tradition', 'la tradizione', 'It’s an old tradition.', 'È una vecchia tradizione.'),
                  V('festival', 'il festival', 'The festival lasts a week.', 'Il festival dura una settimana.'),
                  V('queue', 'la fila', 'There’s a long queue.', 'C’è una lunga fila.'),
                  V('tea time', 'l’ora del tè', 'Tea time is at five.', 'L’ora del tè è alle cinque.'),
                  V('countryside', 'la campagna', 'We spent a week in the countryside.', 'Abbiamo passato una settimana in campagna.'),
                  V('humour', 'l’umorismo', 'British humour takes getting used to.', 'L’umorismo britannico va capito.'),
                  V('heritage', 'il patrimonio', 'A rich cultural heritage.', 'Un ricco patrimonio culturale.'),
                  V('to queue', 'fare la fila', 'People queue for everything.', 'La gente fa la fila per tutto.'),
                ],
                phrases: [
                  V('It’s worth a visit.', 'Vale una visita.', 'The museum is worth a visit.', 'Il museo vale una visita.'),
                  V('I’m not used to it yet.', 'Non ci sono ancora abituato.', 'The accent, I’m not used to it yet.', 'L’accento, non ci sono ancora abituato.'),
                  V('What’s it famous for?', 'Per cosa è famoso?', 'What’s this city famous for?', 'Per cosa è famosa questa città?'),
                ],
                conversations: [
                  {
                    id: 'e6-c1',
                    title: 'Checking in',
                    titleEn: 'Checking in',
                    speakers: [
                      C('A', 'Good evening, I have a reservation under Rossi.', 'Buonasera, ho una prenotazione a nome Rossi.'),
                      C('B', 'Welcome. Two nights, is that right?', 'Benvenuto. Due notti, giusto?'),
                      C('A', 'Yes. Is breakfast included?', 'Sì. La colazione è inclusa?'),
                      C('B', 'It is, until half past ten.', 'Sì, fino alle dieci e mezza.'),
                      C('A', 'And could I have a late check-out?', 'E posso fare il check-out più tardi?'),
                      C('B', 'Of course, until one o’clock.', 'Certamente, fino all’una.'),
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: 'e7',
            title: 'Complex Conversations',
            titleEn: 'Complex Conversations',
            subtitle: 'Opinions, plans and stories.',
            subtitleEn: 'Opinions, plans and stories.',
            color: '#f43f5e',
            icon: '🗣️',
            lessons: [
              {
                id: 'e7-1',
                title: 'Opinions & feelings',
                titleEn: 'Opinions & feelings',
                description: 'Saying what you think and feel.',
                descriptionEn: 'Saying what you think and feel.',
                vocabulary: [
                  V('I think', 'penso', 'I think you’re right.', 'Penso che tu abbia ragione.'),
                  V('in my opinion', 'secondo me', 'In my opinion, it’s too early.', 'Secondo me è troppo presto.'),
                  V('to agree', 'essere d’accordo', 'I agree with you.', 'Sono d’accordo con te.'),
                  V('to disagree', 'non essere d’accordo', 'I’m afraid I disagree.', 'Temo di non essere d’accordo.'),
                  V('worried', 'preoccupato', 'I’m worried about the deadline.', 'Sono preoccupato per la scadenza.'),
                  V('excited', 'entusiasta', 'She’s excited about the trip.', 'È entusiasta del viaggio.'),
                  V('disappointed', 'deluso', 'I was disappointed by the film.', 'Sono rimasto deluso dal film.'),
                  V('proud', 'orgoglioso', 'I’m proud of this work.', 'Sono orgoglioso di questo lavoro.'),
                  V('to mind', 'dispiacere', 'Do you mind if I open the window?', 'Ti dispiace se apro la finestra?'),
                  V('to doubt', 'dubitare', 'I doubt it will work.', 'Dubito che funzioni.'),
                ],
                phrases: [
                  V('I see your point, but…', 'Capisco il tuo punto, ma…', 'I see your point, but I still disagree.', 'Capisco il tuo punto, ma non sono d’accordo.'),
                  V('It depends.', 'Dipende.', 'It depends on the price.', 'Dipende dal prezzo.'),
                  V('That’s a good question.', 'Buona domanda.', 'That’s a good question, let me think.', 'Buona domanda, fammi pensare.'),
                ],
              },
              {
                id: 'e7-2',
                title: 'Future plans',
                titleEn: 'Future plans',
                description: 'Talking about plans and dreams.',
                descriptionEn: 'Talking about plans and dreams.',
                vocabulary: [
                  V('I’m going to', 'ho intenzione di', 'I’m going to change jobs.', 'Ho intenzione di cambiare lavoro.'),
                  V('I’d like to', 'vorrei', 'I’d like to learn Portuguese.', 'Vorrei imparare il portoghese.'),
                  V('goal', 'l’obiettivo', 'My goal is to speak fluently.', 'Il mio obiettivo è parlare fluentemente.'),
                  V('to plan', 'programmare', 'We’re planning a trip.', 'Stiamo programmando un viaggio.'),
                  V('ambition', 'l’ambizione', 'Her ambition is to open a café.', 'La sua ambizione è aprire un caffè.'),
                  V('to hope', 'sperare', 'I hope it works out.', 'Spero che funzioni.'),
                  V('soon', 'presto', 'See you soon.', 'A presto.'),
                  V('eventually', 'prima o poi', 'Eventually I’ll move abroad.', 'Prima o poi mi trasferisco all’estero.'),
                  V('opportunity', 'l’opportunità', 'It’s a great opportunity.', 'È una grande opportunità.'),
                  V('to achieve', 'raggiungere', 'She achieved her goal.', 'Ha raggiunto il suo obiettivo.'),
                ],
                phrases: [
                  V('What are your plans?', 'Quali sono i tuoi piani?', 'What are your plans for the summer?', 'Quali sono i tuoi piani per l’estate?'),
                  V('I’m thinking about it.', 'Ci sto pensando.', 'I’m thinking about it, nothing decided.', 'Ci sto pensando, niente di deciso.'),
                  V('Let’s see how it goes.', 'Vediamo come va.', 'Let’s see how it goes first.', 'Vediamo prima come va.'),
                ],
              },
              {
                id: 'e7-3',
                title: 'Telling a story',
                titleEn: 'Telling a story',
                description: 'Narrating events and experiences.',
                descriptionEn: 'Narrating events and experiences.',
                vocabulary: [
                  V('once upon a time', 'c’era una volta', 'Once upon a time, in a small town…', 'C’era una volta, in un piccolo paese…'),
                  V('then', 'poi', 'Then everything changed.', 'Poi è cambiato tutto.'),
                  V('afterwards', 'dopo', 'Afterwards we went home.', 'Dopo siamo andati a casa.'),
                  V('suddenly', 'improvvisamente', 'Suddenly the lights went out.', 'Improvvisamente si sono spente le luci.'),
                  V('finally', 'alla fine', 'Finally, we arrived.', 'Alla fine siamo arrivati.'),
                  V('meanwhile', 'nel frattempo', 'Meanwhile, I waited outside.', 'Nel frattempo aspettavo fuori.'),
                  V('to realise', 'rendersi conto', 'I realised I was wrong.', 'Mi sono reso conto di sbagliarmi.'),
                  V('to remember', 'ricordare', 'I remember that day well.', 'Ricordo bene quel giorno.'),
                  V('to happen', 'succedere', 'What happened next?', 'Cos’è successo dopo?'),
                  V('at that moment', 'in quel momento', 'At that moment, it started to rain.', 'In quel momento ha iniziato a piovere.'),
                ],
                phrases: [
                  V('To cut a long story short…', 'Per farla breve…', 'To cut a long story short, we missed the train.', 'Per farla breve, abbiamo perso il treno.'),
                  V('It turned out well.', 'È andata bene.', 'It turned out well in the end.', 'È andata bene alla fine.'),
                  V('I’ll never forget it.', 'Non lo dimenticherò mai.', 'I’ll never forget that evening.', 'Non dimenticherò mai quella sera.'),
                  V('That reminds me of…', 'Questo mi ricorda…', 'That reminds me of my first job.', 'Questo mi ricorda il mio primo lavoro.'),
                ],
                conversations: [
                  {
                    id: 'e7-c1',
                    title: 'A story from a trip',
                    titleEn: 'A story from a trip',
                    speakers: [
                      C('A', 'How was your trip to London?', 'Com’è andato il viaggio a Londra?'),
                      C('B', 'Let me tell you. To cut a long story short, we missed the train.', 'Te lo racconto. Per farla breve, abbiamo perso il treno.'),
                      C('A', 'Oh no. What happened then?', 'Oh no. E poi cos’è successo?'),
                      C('B', 'Meanwhile, my phone was dead. At that moment, it started to rain.', 'Nel frattempo il telefono era scarico. In quel momento ha iniziato a piovere.'),
                      C('A', 'So what did you do?', 'E quindi cosa avete fatto?'),
                      C('B', 'A taxi driver helped us. It turned out well in the end.', 'Un tassista ci ha aiutato. È andata bene alla fine.'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  /* ── Same API surface as js/learner-data.js, so learner.js can treat the two
   *    courses identically. Everything is derived from COURSE_EN, never hard-coded. */
  function allUnits() {
    var out = [];
    COURSE_EN.levels.forEach(function (lv) {
      lv.units.forEach(function (u) {
        u.level = lv.id;
        u.levelLabel = lv.label;
        u.levelLabelEn = lv.labelEn;
        out.push(u);
      });
    });
    return out;
  }

  function unitById(id) {
    var found = null;
    COURSE_EN.levels.forEach(function (lv) {
      lv.units.forEach(function (u) { if (u.id === id) found = u; });
    });
    return found;
  }

  function lessonById(unitId, lessonId) {
    var u = unitById(unitId);
    if (!u) return null;
    for (var i = 0; i < u.lessons.length; i++) {
      if (u.lessons[i].id === lessonId) return u.lessons[i];
    }
    return null;
  }

  // Every word in the whole course (for distractor generation)
  function allWords() {
    var words = [];
    COURSE_EN.levels.forEach(function (lv) {
      lv.units.forEach(function (u) {
        u.lessons.forEach(function (l) {
          (l.vocabulary || []).forEach(function (v) { words.push(v); });
          (l.phrases || []).forEach(function (p) { words.push(p); });
        });
      });
    });
    return words;
  }

  w.LEARNER_COURSE_EN = COURSE_EN;
  w.LEARNER_UNITS_EN = allUnits();
  w.LEARNER_UNIT_BY_ID_EN = unitById;
  w.LEARNER_LESSON_BY_ID_EN = lessonById;
  w.LEARNER_ALL_WORDS_EN = allWords;
})(window);
