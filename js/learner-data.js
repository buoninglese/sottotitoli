/* ═══ Learner — Corso di italiano (course data) ═══
 * Structured Italian course for the "Learner" tab.
 * Model (mirrors the LinguaLeap prototype):
 *   levels[].units[].lessons[].vocabulary[] + phrases[] + conversations[]
 * Every item: { it, en, exampleIt?, exampleEn? }
 */
(function (w) {
  'use strict';

  // Compact helper: build a vocab/phrase item
  function V(it, en, exampleIt, exampleEn) {
    return { it: it, en: en, exampleIt: exampleIt || '', exampleEn: exampleEn || '' };
  }

  // Conversation helper: [role, text, translation]
  function C(role, text, translation) {
    return { role: role, text: text, translation: translation };
  }

  var COURSE = {
    name: 'Corso di italiano',
    nameEn: 'Italian Course',
    levels: [
      /* ────────────────────────── PRINCIPIANTE ────────────────────────── */
      {
        id: 'beginner',
        label: 'Principiante',
        labelEn: 'Beginner',
        color: '#22c55e',
        icon: '🌱',
        units: [
          {
            id: 'b1',
            title: 'Primi Passi',
            titleEn: 'First Steps',
            subtitle: 'Saluti, presentazioni e numeri.',
            subtitleEn: 'Greetings, introductions and numbers.',
            color: '#22c55e',
            icon: '👋',
            lessons: [
              {
                id: 'b1-1',
                title: 'Saluti e cortesia',
                titleEn: 'Greetings & politeness',
                description: 'Le parole per salutare e ringraziare.',
                descriptionEn: 'The words to greet and thank.',
                vocabulary: [
                  V('ciao', 'hello / hi', 'Ciao, come stai?', 'Hi, how are you?'),
                  V('buongiorno', 'good morning', 'Buongiorno a tutti!', 'Good morning everyone!'),
                  V('buonasera', 'good evening', 'Buonasera, signora.', 'Good evening, madam.'),
                  V('buonanotte', 'good night', 'Buonanotte, a domani.', 'Good night, see you tomorrow.'),
                  V('arrivederci', 'goodbye (formal)', 'Arrivederci e grazie.', 'Goodbye and thank you.'),
                  V('grazie', 'thank you', 'Grazie mille!', 'Thank you very much!'),
                  V('prego', "you're welcome", '— Grazie. — Prego.', '— Thanks. — You’re welcome.'),
                  V('per favore', 'please', 'Un caffè, per favore.', 'A coffee, please.'),
                  V('scusa', 'sorry (informal)', 'Scusa, arrivo tardi.', 'Sorry, I’m late.'),
                  V('scusi', 'excuse me (formal)', 'Scusi, dov\'è la banca?', 'Excuse me, where is the bank?'),
                ],
                phrases: [
                  V('Come stai?', 'How are you? (informal)', 'Ciao! Come stai oggi?', 'Hi! How are you today?'),
                  V('Bene, grazie.', "I'm fine, thank you.", 'Bene, grazie, e tu?', 'Fine, thanks, and you?'),
                  V('Piacere di conoscerti.', 'Nice to meet you.', 'Piacere di conoscerti, Maria.', 'Nice to meet you, Maria.'),
                  V('A domani!', 'See you tomorrow!', 'A domani, amico mio!', 'See you tomorrow, my friend!'),
                ],
              },
              {
                id: 'b1-2',
                title: 'Presentarsi',
                titleEn: 'Introducing yourself',
                description: 'Come dire chi sei e da dove vieni.',
                descriptionEn: 'How to say who you are and where you’re from.',
                vocabulary: [
                  V('io', 'I', 'Io sono Anna.', 'I am Anna.'),
                  V('tu', 'you (informal)', 'Tu sei molto gentile.', 'You are very kind.'),
                  V('il nome', 'name (first)', 'Il mio nome è Marco.', 'My first name is Marco.'),
                  V('il cognome', 'surname', 'Qual è il tuo cognome?', 'What is your surname?'),
                  V('la nazionalità', 'nationality', 'Qual è la tua nazionalità?', 'What is your nationality?'),
                  V('abitare', 'to live', 'Abito a Milano.', 'I live in Milan.'),
                  V('lavorare', 'to work', 'Lavoro in un ufficio.', 'I work in an office.'),
                  V('lo studente', 'student (m)', 'Sono uno studente.', 'I am a student.'),
                ],
                phrases: [
                  V('Come ti chiami?', 'What’s your name?', 'Come ti chiami, scusa?', 'What’s your name, sorry?'),
                  V('Mi chiamo…', 'My name is…', 'Mi chiamo Giulia.', 'My name is Giulia.'),
                  V('Quanti anni hai?', 'How old are you?', 'Quanti anni hai tu?', 'How old are you?'),
                  V('Abito a Roma.', 'I live in Rome.', 'Abito a Roma da due anni.', 'I’ve lived in Rome for two years.'),
                ],
              },
              {
                id: 'b1-3',
                title: 'Primi numeri',
                titleEn: 'First numbers',
                description: 'I numeri da uno a dieci.',
                descriptionEn: 'Numbers from one to ten.',
                vocabulary: [
                  V('uno', 'one', 'Un caffè, per favore.', 'One coffee, please.'),
                  V('due', 'two', 'Due biglietti, grazie.', 'Two tickets, thanks.'),
                  V('tre', 'three', 'Ho tre fratelli.', 'I have three brothers.'),
                  V('quattro', 'four', 'La stanza numero quattro.', 'Room number four.'),
                  V('cinque', 'five', 'Sono le cinque.', 'It’s five o’clock.'),
                  V('sei', 'six', 'Sei euro, per favore.', 'Six euros, please.'),
                  V('sette', 'seven', 'La settimana ha sette giorni.', 'The week has seven days.'),
                  V('otto', 'eight', 'Partenza alle otto.', 'Departure at eight.'),
                  V('nove', 'nine', 'Nove persone al tavolo.', 'Nine people at the table.'),
                  V('dieci', 'ten', 'Dieci minuti, grazie.', 'Ten minutes, thanks.'),
                ],
                phrases: [
                  V('Quanto costa?', 'How much does it cost?', 'Quanto costa questo libro?', 'How much does this book cost?'),
                  V('Ho due fratelli.', 'I have two brothers.', 'Ho due fratelli e una sorella.', 'I have two brothers and one sister.'),
                  V('Sono le tre.', 'It’s three o’clock.', 'Sono le tre in punto.', 'It’s exactly three o’clock.'),
                ],
                conversations: [
                  {
                    id: 'b1-c1',
                    title: 'In piazza',
                    titleEn: 'In the square',
                    speakers: [
                      C('A', 'Ciao! Come stai?', 'Hi! How are you?'),
                      C('B', 'Bene, grazie, e tu?', 'Fine, thanks, and you?'),
                      C('A', 'Tutto bene. Come ti chiami?', 'All good. What’s your name?'),
                      C('B', 'Mi chiamo Sara, piacere.', 'My name is Sara, nice to meet you.'),
                      C('A', 'Piacere, io sono Luca.', 'Nice to meet you, I’m Luca.'),
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: 'b2',
            title: 'Vita Quotidiana',
            titleEn: 'Daily Life',
            subtitle: 'Famiglia, cibo e casa.',
            subtitleEn: 'Family, food and home.',
            color: '#0ea5e9',
            icon: '🏠',
            lessons: [
              {
                id: 'b2-1',
                title: 'La famiglia',
                titleEn: 'Family',
                description: 'I membri della famiglia.',
                descriptionEn: 'Family members.',
                vocabulary: [
                  V('la famiglia', 'family', 'La mia famiglia è grande.', 'My family is big.'),
                  V('il padre', 'father', 'Mio padre è un medico.', 'My father is a doctor.'),
                  V('la madre', 'mother', 'Mia madre cucina bene.', 'My mother cooks well.'),
                  V('il fratello', 'brother', 'Mio fratello è più piccolo.', 'My brother is younger.'),
                  V('la sorella', 'sister', 'Mia sorella studia a Bologna.', 'My sister studies in Bologna.'),
                  V('il nonno', 'grandfather', 'Mio nonno ha ottant\'anni.', 'My grandfather is eighty.'),
                  V('la nonna', 'grandmother', 'La nonna fa la torta.', 'Grandma makes the cake.'),
                  V('il figlio', 'son', 'Hanno un figlio e una figlia.', 'They have a son and a daughter.'),
                  V('il marito', 'husband', 'Mio marito è simpatico.', 'My husband is nice.'),
                  V('la moglie', 'wife', 'Sua moglie è italiana.', 'His wife is Italian.'),
                ],
                phrases: [
                  V('Hai fratelli?', 'Do you have siblings?', 'Hai fratelli o sorelle?', 'Do you have brothers or sisters?'),
                  V('Ho una sorella.', 'I have one sister.', 'Ho una sorella che vive a Torino.', 'I have a sister who lives in Turin.'),
                  V('La mia famiglia è grande.', 'My family is big.', 'La mia famiglia è grande e allegra.', 'My family is big and cheerful.'),
                ],
              },
              {
                id: 'b2-2',
                title: 'Il cibo e le bevande',
                titleEn: 'Food & drink',
                description: 'Cibo, bevande e pasti.',
                descriptionEn: 'Food, drinks and meals.',
                vocabulary: [
                  V('il pane', 'bread', 'Compro il pane al forno.', 'I buy bread at the bakery.'),
                  V('l\'acqua', 'water', 'Un bicchiere d\'acqua, grazie.', 'A glass of water, please.'),
                  V('il caffè', 'coffee', 'Il caffè italiano è forte.', 'Italian coffee is strong.'),
                  V('il latte', 'milk', 'Prendo il latte a colazione.', 'I have milk at breakfast.'),
                  V('la frutta', 'fruit', 'La frutta è sana.', 'Fruit is healthy.'),
                  V('la verdura', 'vegetables', 'Mangio molta verdura.', 'I eat a lot of vegetables.'),
                  V('la carne', 'meat', 'La carne è al forno.', 'The meat is roasted.'),
                  V('il pesce', 'fish', 'Il pesce è fresco.', 'The fish is fresh.'),
                  V('la colazione', 'breakfast', 'La colazione è alle otto.', 'Breakfast is at eight.'),
                  V('il pranzo', 'lunch', 'Il pranzo è alle una.', 'Lunch is at one.'),
                ],
                phrases: [
                  V('Vorrei un caffè.', 'I’d like a coffee.', 'Vorrei un caffè, per favore.', 'I’d like a coffee, please.'),
                  V('Che cosa mangi a colazione?', 'What do you eat for breakfast?', 'Che cosa mangi di solito a colazione?', 'What do you usually eat for breakfast?'),
                  V('Il conto, per favore.', 'The bill, please.', 'Il conto, per favore. Siamo in due.', 'The bill, please. We are two.'),
                ],
              },
              {
                id: 'b2-3',
                title: 'La casa',
                titleEn: 'Home',
                description: 'Le stanze e gli oggetti della casa.',
                descriptionEn: 'Rooms and objects in the house.',
                vocabulary: [
                  V('la casa', 'house / home', 'La mia casa è in campagna.', 'My house is in the countryside.'),
                  V('la camera', 'room / bedroom', 'La camera è luminosa.', 'The room is bright.'),
                  V('la cucina', 'kitchen', 'La cucina è grande.', 'The kitchen is big.'),
                  V('il bagno', 'bathroom', 'Il bagno è al piano di sopra.', 'The bathroom is upstairs.'),
                  V('il salotto', 'living room', 'Il salotto ha un divano rosso.', 'The living room has a red sofa.'),
                  V('la finestra', 'window', 'La finestra dà sul giardino.', 'The window overlooks the garden.'),
                  V('la porta', 'door', 'Chiudi la porta, per favore.', 'Close the door, please.'),
                  V('il letto', 'bed', 'Il letto è comodo.', 'The bed is comfortable.'),
                  V('il tavolo', 'table', 'Il tavolo è in cucina.', 'The table is in the kitchen.'),
                  V('la sedia', 'chair', 'C\'è una sedia al tavolo.', 'There is a chair at the table.'),
                ],
                phrases: [
                  V('Dove abiti?', 'Where do you live?', 'Dove abiti adesso?', 'Where do you live now?'),
                  V('Vivo in un appartamento.', 'I live in an apartment.', 'Vivo in un appartamento in centro.', 'I live in an apartment in the centre.'),
                  V('La mia camera è piccola.', 'My room is small.', 'La mia camera è piccola ma accogliente.', 'My room is small but cosy.'),
                ],
                conversations: [
                  {
                    id: 'b2-c1',
                    title: 'Il nuovo appartamento',
                    titleEn: 'The new apartment',
                    speakers: [
                      C('A', 'Dove abiti ora?', 'Where do you live now?'),
                      C('B', 'Abito in un appartamento in centro.', 'I live in an apartment in the centre.'),
                      C('A', 'È grande?', 'Is it big?'),
                      C('B', 'No, è piccolo ma carino.', 'No, it’s small but nice.'),
                      C('A', 'Quante camere ha?', 'How many rooms does it have?'),
                      C('B', 'Due camere e una cucina moderna.', 'Two rooms and a modern kitchen.'),
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: 'b3',
            title: 'In Giro',
            titleEn: 'Getting Around',
            subtitle: 'Città, trasporti e indicazioni.',
            subtitleEn: 'Cities, transport and directions.',
            color: '#f59e0b',
            icon: '🚶',
            lessons: [
              {
                id: 'b3-1',
                title: 'La città',
                titleEn: 'The city',
                description: 'I luoghi della città.',
                descriptionEn: 'Places in the city.',
                vocabulary: [
                  V('la città', 'city', 'Milano è una grande città.', 'Milan is a big city.'),
                  V('la strada', 'street', 'La strada è molto trafficata.', 'The street is very busy.'),
                  V('la piazza', 'square', 'La piazza è piena di gente.', 'The square is full of people.'),
                  V('il negozio', 'shop', 'Il negozio chiude alle otto.', 'The shop closes at eight.'),
                  V('il ristorante', 'restaurant', 'Il ristorante è famoso.', 'The restaurant is famous.'),
                  V('il bar', 'café / bar', 'Andiamo al bar per un caffè.', 'Let’s go to the café for a coffee.'),
                  V('il museo', 'museum', 'Il museo è aperto oggi.', 'The museum is open today.'),
                  V('il parco', 'park', 'Il parco è vicino a casa.', 'The park is near home.'),
                  V('la chiesa', 'church', 'La chiesa è antica.', 'The church is ancient.'),
                  V('il supermercato', 'supermarket', 'Compro tutto al supermercato.', 'I buy everything at the supermarket.'),
                ],
                phrases: [
                  V('Dov\'è la stazione?', 'Where is the station?', 'Mi scusi, dov\'è la stazione?', 'Excuse me, where is the station?'),
                  V('Il museo è vicino.', 'The museum is nearby.', 'Il museo è vicino alla piazza.', 'The museum is near the square.'),
                  V('C\'è un bar qui vicino?', 'Is there a café nearby?', 'Scusa, c\'è un bar qui vicino?', 'Sorry, is there a café nearby?'),
                ],
              },
              {
                id: 'b3-2',
                title: 'Mezzi di trasporto',
                titleEn: 'Transport',
                description: 'Autobus, treni e biglietti.',
                descriptionEn: 'Buses, trains and tickets.',
                vocabulary: [
                  V('l\'autobus', 'bus', 'L\'autobus numero 5 va in centro.', 'Bus number 5 goes downtown.'),
                  V('il treno', 'train', 'Il treno ha dieci minuti di ritardo.', 'The train is ten minutes late.'),
                  V('il taxi', 'taxi', 'Prendo un taxi per l\'aeroporto.', 'I take a taxi to the airport.'),
                  V('l\'aereo', 'plane', 'L\'aereo parte alle nove.', 'The plane leaves at nine.'),
                  V('la macchina', 'car', 'La macchina è nel garage.', 'The car is in the garage.'),
                  V('la metro', 'underground / subway', 'La metro è veloce.', 'The subway is fast.'),
                  V('la bicicletta', 'bicycle', 'Vado al lavoro in bicicletta.', 'I go to work by bicycle.'),
                  V('il biglietto', 'ticket', 'Il biglietto costa due euro.', 'The ticket costs two euros.'),
                  V('la stazione', 'station', 'Ci vediamo alla stazione.', 'See you at the station.'),
                  V('l\'aeroporto', 'airport', 'L\'aeroporto è fuori città.', 'The airport is outside the city.'),
                ],
                phrases: [
                  V('Il treno parte alle otto.', 'The train leaves at eight.', 'Il treno parte alle otto in punto.', 'The train leaves at exactly eight.'),
                  V('Quanto costa il biglietto?', 'How much is the ticket?', 'Quanto costa il biglietto per Roma?', 'How much is the ticket to Rome?'),
                  V('Vado in centro in autobus.', 'I go downtown by bus.', 'Di solito vado in centro in autobus.', 'I usually go downtown by bus.'),
                ],
              },
              {
                id: 'b3-3',
                title: 'Chiedere indicazioni',
                titleEn: 'Asking directions',
                description: 'Come chiedere e capire le indicazioni.',
                descriptionEn: 'How to ask for and understand directions.',
                vocabulary: [
                  V('a destra', 'to the right', 'Il bar è a destra.', 'The café is on the right.'),
                  V('a sinistra', 'to the left', 'Gira a sinistra qui.', 'Turn left here.'),
                  V('dritto', 'straight ahead', 'Vai sempre dritto.', 'Go straight ahead.'),
                  V('vicino', 'near', 'La banca è vicina.', 'The bank is near.'),
                  V('lontano', 'far', 'L\'aeroporto è lontano.', 'The airport is far.'),
                  V('qui', 'here', 'Aspetta qui.', 'Wait here.'),
                  V('lì', 'there', 'Il ristorante è lì.', 'The restaurant is over there.'),
                  V('all\'angolo', 'at the corner', 'Il negozio è all\'angolo.', 'The shop is on the corner.'),
                  V('a piedi', 'on foot', 'Vado a piedi.', 'I go on foot.'),
                ],
                phrases: [
                  V('Scusi, dove sono i bagni?', 'Excuse me, where are the restrooms?', 'Scusi, dove sono i bagni, per favore?', 'Excuse me, where are the restrooms, please?'),
                  V('È lontano da qui?', 'Is it far from here?', 'Scusi, è lontano da qui il museo?', 'Excuse me, is the museum far from here?'),
                  V('Gira a destra.', 'Turn right.', 'Alla piazza, gira a destra.', 'At the square, turn right.'),
                ],
                conversations: [
                  {
                    id: 'b3-c1',
                    title: 'Per la stazione',
                    titleEn: 'To the station',
                    speakers: [
                      C('A', 'Scusi, per la stazione?', 'Excuse me, how do I get to the station?'),
                      C('B', 'Vai dritto e poi gira a destra.', 'Go straight and then turn right.'),
                      C('A', 'È lontano?', 'Is it far?'),
                      C('B', 'No, è vicino, cinque minuti a piedi.', 'No, it’s near, five minutes on foot.'),
                      C('A', 'Grazie mille!', 'Thank you very much!'),
                      C('B', 'Prego, buona giornata!', 'You’re welcome, have a good day!'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },

      /* ────────────────────────── INTERMEDIO ────────────────────────── */
      {
        id: 'intermediate',
        label: 'Intermedio',
        labelEn: 'Intermediate',
        color: '#8b5cf6',
        icon: '🌿',
        units: [
          {
            id: 'i1',
            title: 'Conversazioni',
            titleEn: 'Conversations',
            subtitle: 'Ristorante, acquisti e telefono.',
            subtitleEn: 'Restaurants, shopping and phone.',
            color: '#8b5cf6',
            icon: '💬',
            lessons: [
              {
                id: 'i1-1',
                title: 'Al ristorante',
                titleEn: 'At the restaurant',
                description: 'Ordinare e chiedere il conto.',
                descriptionEn: 'Ordering and asking for the bill.',
                vocabulary: [
                  V('il cameriere', 'waiter', 'Il cameriere è molto gentile.', 'The waiter is very kind.'),
                  V('il menù', 'menu', 'Posso vedere il menù?', 'Can I see the menu?'),
                  V('l\'antipasto', 'starter / appetizer', 'L\'antipasto è per due.', 'The starter is for two.'),
                  V('il primo', 'first course', 'Il primo è pasta al pomodoro.', 'The first course is pasta with tomato.'),
                  V('il secondo', 'second course', 'Il secondo è pesce alla griglia.', 'The second course is grilled fish.'),
                  V('il contorno', 'side dish', 'Vorrei un contorno di verdure.', 'I’d like a side of vegetables.'),
                  V('il dolce', 'dessert', 'Il dolce è tiramisù.', 'The dessert is tiramisu.'),
                  V('il vino', 'wine', 'Un bicchiere di vino rosso.', 'A glass of red wine.'),
                  V('la prenotazione', 'reservation', 'Ho una prenotazione per due.', 'I have a reservation for two.'),
                  V('il conto', 'bill', 'Il conto, per favore.', 'The bill, please.'),
                ],
                phrases: [
                  V('Vorrei prenotare un tavolo.', 'I’d like to book a table.', 'Vorrei prenotare un tavolo per stasera.', 'I’d like to book a table for tonight.'),
                  V('Che cosa mi consiglia?', 'What do you recommend?', 'Che cosa mi consiglia, lo chef?', 'What do you recommend, chef?'),
                  V('Il conto, per favore.', 'The bill, please.', 'Il conto e un tè, per favore.', 'The bill and a tea, please.'),
                ],
              },
              {
                id: 'i1-2',
                title: 'Fare acquisti',
                titleEn: 'Shopping',
                description: 'Prezzi, taglie e pagamenti.',
                descriptionEn: 'Prices, sizes and payments.',
                vocabulary: [
                  V('comprare', 'to buy', 'Voglio comprare una giacca.', 'I want to buy a jacket.'),
                  V('il prezzo', 'price', 'Il prezzo è troppo alto.', 'The price is too high.'),
                  V('lo sconto', 'discount', 'C\'è uno sconto del venti per cento.', 'There is a twenty per cent discount.'),
                  V('la taglia', 'size', 'Che taglia porti?', 'What size do you wear?'),
                  V('la borsa', 'bag', 'Questa borsa è di pelle.', 'This bag is leather.'),
                  V('i soldi', 'money', 'Non ho abbastanza soldi.', 'I don’t have enough money.'),
                  V('il mercato', 'market', 'Al mercato i prezzi sono bassi.', 'At the market the prices are low.'),
                  V('pagare', 'to pay', 'Dove posso pagare?', 'Where can I pay?'),
                  V('la carta di credito', 'credit card', 'Posso pagare con la carta di credito?', 'Can I pay with a credit card?'),
                  V('in contanti', 'in cash', 'Preferisco pagare in contanti.', 'I prefer to pay in cash.'),
                ],
                phrases: [
                  V('Quanto costa questo?', 'How much is this?', 'Quanto costa questo cappotto?', 'How much is this coat?'),
                  V('Posso pagare con la carta?', 'Can I pay by card?', 'Posso pagare con la carta di credito?', 'Can I pay with a credit card?'),
                  V('Cerco una taglia più grande.', 'I’m looking for a bigger size.', 'Cerco una taglia più grande, per favore.', 'I’m looking for a bigger size, please.'),
                ],
              },
              {
                id: 'i1-3',
                title: 'Al telefono',
                titleEn: 'On the phone',
                description: 'Rispondere e chiamare al telefono.',
                descriptionEn: 'Answering and calling on the phone.',
                vocabulary: [
                  V('il telefono', 'telephone', 'Il telefono squilla.', 'The phone is ringing.'),
                  V('la telefonata', 'phone call', 'Ho fatto una lunga telefonata.', 'I made a long phone call.'),
                  V('il numero', 'number', 'Qual è il tuo numero?', 'What is your number?'),
                  V('il messaggio', 'message', 'Ti lascio un messaggio.', 'I’ll leave you a message.'),
                  V('rispondere', 'to answer', 'Nessuno risponde.', 'Nobody answers.'),
                  V('chiamare', 'to call', 'Ti chiamo stasera.', 'I’ll call you tonight.'),
                  V('occupato', 'busy', 'Il telefono è occupato.', 'The line is busy.'),
                  V('richiamare', 'to call back', 'Richiamo più tardi.', 'I’ll call back later.'),
                  V('il cellulare', 'mobile phone', 'Ho perso il cellulare.', 'I lost my mobile phone.'),
                ],
                phrases: [
                  V('Pronto?', 'Hello? (answering the phone)', 'Pronto? Chi parla?', 'Hello? Who is speaking?'),
                  V('Posso parlare con Anna?', 'Can I speak with Anna?', 'Buongiorno, posso parlare con Anna?', 'Good morning, can I speak with Anna?'),
                  V('Ti richiamo più tardi.', 'I’ll call you back later.', 'Ti richiamo più tardi, ok?', 'I’ll call you back later, ok?'),
                ],
                conversations: [
                  {
                    id: 'i1-c1',
                    title: 'Una chiamata',
                    titleEn: 'A phone call',
                    speakers: [
                      C('A', 'Pronto?', 'Hello?'),
                      C('B', 'Ciao, sono Marco. Posso parlare con Anna?', 'Hi, it’s Marco. Can I speak with Anna?'),
                      C('A', 'Un momento, te la passo.', 'One moment, I’ll put her through.'),
                      C('B', 'Grazie.', 'Thanks.'),
                      C('A', 'Mi dispiace, non risponde.', 'Sorry, she’s not answering.'),
                      C('B', 'Va bene, richiamo più tardi.', 'OK, I’ll call back later.'),
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: 'i2',
            title: 'Lavoro e Studio',
            titleEn: 'Work & Study',
            subtitle: 'Ufficio, università e tempo.',
            subtitleEn: 'Office, university and weather.',
            color: '#f43f5e',
            icon: '💼',
            lessons: [
              {
                id: 'i2-1',
                title: 'L\'ufficio',
                titleEn: 'The office',
                description: 'Il mondo del lavoro.',
                descriptionEn: 'The world of work.',
                vocabulary: [
                  V('il lavoro', 'job / work', 'Il lavoro mi piace molto.', 'I like my job a lot.'),
                  V('l\'ufficio', 'office', 'L\'ufficio è al terzo piano.', 'The office is on the third floor.'),
                  V('il collega', 'colleague', 'I miei colleghi sono simpatici.', 'My colleagues are nice.'),
                  V('il capo', 'boss', 'Il capo è in riunione.', 'The boss is in a meeting.'),
                  V('la riunione', 'meeting', 'La riunione dura un\'ora.', 'The meeting lasts an hour.'),
                  V('il computer', 'computer', 'Il computer non funziona.', 'The computer is not working.'),
                  V('l\'email', 'email', 'Ti mando un\'email.', 'I’ll send you an email.'),
                  V('il documento', 'document', 'Il documento è pronto.', 'The document is ready.'),
                  V('l\'orario', 'schedule / hours', 'L\'orario di lavoro è flessibile.', 'Working hours are flexible.'),
                  V('lo stipendio', 'salary', 'Lo stipendio è buono.', 'The salary is good.'),
                ],
                phrases: [
                  V('Che lavoro fai?', 'What do you do for work?', 'Che lavoro fai in Italia?', 'What do you do for work in Italy?'),
                  V('Ho una riunione alle tre.', 'I have a meeting at three.', 'Ho una riunione alle tre del pomeriggio.', 'I have a meeting at three in the afternoon.'),
                  V('Mando un\'email al collega.', 'I send an email to my colleague.', 'Mando un\'email al collega con il progetto.', 'I send an email to my colleague with the project.'),
                ],
              },
              {
                id: 'i2-2',
                title: 'L\'università',
                titleEn: 'University',
                description: 'Studiare e dare esami.',
                descriptionEn: 'Studying and taking exams.',
                vocabulary: [
                  V('l\'università', 'university', 'L\'università è antica.', 'The university is ancient.'),
                  V('la lezione', 'lesson / lecture', 'La lezione inizia alle nove.', 'The lecture starts at nine.'),
                  V('il corso', 'course', 'Frequento un corso di italiano.', 'I attend an Italian course.'),
                  V('l\'esame', 'exam', 'L\'esame è difficile.', 'The exam is hard.'),
                  V('il libro', 'book', 'Il libro è in biblioteca.', 'The book is in the library.'),
                  V('la biblioteca', 'library', 'Studio in biblioteca.', 'I study in the library.'),
                  V('la laurea', 'degree', 'Ha una laurea in economia.', 'He has a degree in economics.'),
                  V('studiare', 'to study', 'Devo studiare ogni giorno.', 'I have to study every day.'),
                  V('superare', 'to pass (an exam)', 'Ho superato l\'esame!', 'I passed the exam!'),
                ],
                phrases: [
                  V('Studio italiano all\'università.', 'I study Italian at university.', 'Studio italiano all\'università di Bologna.', 'I study Italian at the University of Bologna.'),
                  V('Domani ho un esame.', 'I have an exam tomorrow.', 'Domani ho un esame di grammatica.', 'I have a grammar exam tomorrow.'),
                  V('Devo studiare molto.', 'I have to study a lot.', 'Devo studiare molto per superare l\'esame.', 'I have to study a lot to pass the exam.'),
                ],
              },
              {
                id: 'i2-3',
                title: 'Il tempo',
                titleEn: 'The weather',
                description: 'Parlare del tempo atmosferico.',
                descriptionEn: 'Talking about the weather.',
                vocabulary: [
                  V('il tempo', 'weather / time', 'Il tempo oggi è bello.', 'The weather today is nice.'),
                  V('il sole', 'sun', 'Il sole splende.', 'The sun is shining.'),
                  V('la pioggia', 'rain', 'La pioggia è forte.', 'The rain is heavy.'),
                  V('la neve', 'snow', 'La neve copre le montagne.', 'Snow covers the mountains.'),
                  V('il vento', 'wind', 'Il vento è freddo.', 'The wind is cold.'),
                  V('la nuvola', 'cloud', 'Il cielo è pieno di nuvole.', 'The sky is full of clouds.'),
                  V('caldo', 'hot', 'Oggi fa caldo.', 'It’s hot today.'),
                  V('freddo', 'cold', 'Fa molto freddo.', 'It’s very cold.'),
                  V('la temperatura', 'temperature', 'La temperatura è di venti gradi.', 'The temperature is twenty degrees.'),
                  V('l\'ombrello', 'umbrella', 'Prendi l\'ombrello!', 'Take the umbrella!'),
                ],
                phrases: [
                  V('Che tempo fa?', 'How’s the weather?', 'Che tempo fa a Milano oggi?', 'How’s the weather in Milan today?'),
                  V('Oggi fa caldo.', 'It’s hot today.', 'Oggi fa caldo, andiamo al mare.', 'It’s hot today, let’s go to the sea.'),
                  V('Domani piove.', 'It rains tomorrow.', 'Domani piove, secondo le previsioni.', 'It rains tomorrow, according to the forecast.'),
                ],
                conversations: [
                  {
                    id: 'i2-c1',
                    title: 'Che tempo fa?',
                    titleEn: 'How’s the weather?',
                    speakers: [
                      C('A', 'Che tempo fa oggi?', 'How’s the weather today?'),
                      C('B', 'Fa molto freddo e piove.', 'It’s very cold and rainy.'),
                      C('A', 'Prendi l\'ombrello!', 'Take the umbrella!'),
                      C('B', 'Sì, hai ragione.', 'Yes, you’re right.'),
                      C('A', 'Spero che domani ci sia il sole.', 'I hope the sun comes out tomorrow.'),
                      C('B', 'Anch\'io!', 'Me too!'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },

      /* ────────────────────────── AVANZATO ────────────────────────── */
      {
        id: 'advanced',
        label: 'Avanzato',
        labelEn: 'Advanced',
        color: '#14b8a6',
        icon: '🔥',
        units: [
          {
            id: 'a1',
            title: 'Viaggi e Cultura',
            titleEn: 'Travel & Culture',
            subtitle: 'Aeroporto, albergo e cultura.',
            subtitleEn: 'Airports, hotels and culture.',
            color: '#14b8a6',
            icon: '✈️',
            lessons: [
              {
                id: 'a1-1',
                title: 'In aeroporto',
                titleEn: 'At the airport',
                description: 'Voli, bagagli e partenze.',
                descriptionEn: 'Flights, luggage and departures.',
                vocabulary: [
                  V('il volo', 'flight', 'Il volo è in ritardo.', 'The flight is delayed.'),
                  V('il biglietto aereo', 'plane ticket', 'Il biglietto aereo è caro.', 'The plane ticket is expensive.'),
                  V('il passaporto', 'passport', 'Dov\'è il mio passaporto?', 'Where is my passport?'),
                  V('la valigia', 'suitcase', 'La valigia è pesante.', 'The suitcase is heavy.'),
                  V('il bagaglio', 'luggage', 'Il bagaglio è al check-in.', 'The luggage is at check-in.'),
                  V('la partenza', 'departure', 'La partenza è alle sette.', 'The departure is at seven.'),
                  V('l\'arrivo', 'arrival', 'L\'arrivo è previsto alle dieci.', 'The arrival is expected at ten.'),
                  V('il check-in', 'check-in', 'Il check-in chiude tra un\'ora.', 'Check-in closes in an hour.'),
                  V('la dogana', 'customs', 'La dogana è al piano terra.', 'Customs is on the ground floor.'),
                  V('l\'imbarco', 'boarding', 'L\'imbarco è al gate 12.', 'Boarding is at gate 12.'),
                ],
                phrases: [
                  V('A che ora parte il volo?', 'What time does the flight leave?', 'A che ora parte il volo per Roma?', 'What time does the flight to Rome leave?'),
                  V('Ho perso la valigia.', 'I lost my suitcase.', 'Mi scusi, ho perso la valigia.', 'Excuse me, I lost my suitcase.'),
                  V('Dove faccio il check-in?', 'Where do I check in?', 'Dove faccio il check-in per il volo 401?', 'Where do I check in for flight 401?'),
                ],
              },
              {
                id: 'a1-2',
                title: 'In albergo',
                titleEn: 'At the hotel',
                description: 'Camere, servizi e colazioni.',
                descriptionEn: 'Rooms, services and breakfast.',
                vocabulary: [
                  V('la camera', 'room', 'La camera è al quarto piano.', 'The room is on the fourth floor.'),
                  V('la prenotazione', 'booking / reservation', 'La prenotazione è per due notti.', 'The booking is for two nights.'),
                  V('la chiave', 'key', 'La chiave della camera, grazie.', 'The room key, please.'),
                  V('la reception', 'reception', 'Chiedi alla reception.', 'Ask at the reception.'),
                  V('il servizio', 'service', 'Il servizio è eccellente.', 'The service is excellent.'),
                  V('la colazione', 'breakfast', 'La colazione è servita alle sette.', 'Breakfast is served at seven.'),
                  V('la doccia', 'shower', 'La doccia è calda.', 'The shower is hot.'),
                  V('la vista', 'view', 'La vista sul mare è stupenda.', 'The sea view is wonderful.'),
                  V('gratuito', 'free (of charge)', 'Il Wi-Fi è gratuito.', 'The Wi-Fi is free.'),
                  V('incluso', 'included', 'La colazione è inclusa.', 'Breakfast is included.'),
                ],
                phrases: [
                  V('Ho una prenotazione a nome Rossi.', 'I have a reservation under the name Rossi.', 'Buongiorno, ho una prenotazione a nome Rossi.', 'Good morning, I have a reservation under the name Rossi.'),
                  V('La colazione è inclusa?', 'Is breakfast included?', 'La colazione è inclusa nel prezzo?', 'Is breakfast included in the price?'),
                  V('Posso avere una camera con vista?', 'Can I have a room with a view?', 'Posso avere una camera con vista sul lago?', 'Can I have a room with a lake view?'),
                ],
              },
              {
                id: 'a1-3',
                title: 'La cultura italiana',
                titleEn: 'Italian culture',
                description: 'Arte, cucina e tradizioni.',
                descriptionEn: 'Art, cuisine and traditions.',
                vocabulary: [
                  V('la cultura', 'culture', 'La cultura italiana è ricca.', 'Italian culture is rich.'),
                  V('la storia', 'history', 'Mi piace la storia.', 'I like history.'),
                  V('l\'arte', 'art', 'L\'arte italiana è famosa.', 'Italian art is famous.'),
                  V('la musica', 'music', 'La musica italiana è bellissima.', 'Italian music is beautiful.'),
                  V('la cucina', 'cuisine', 'La cucina toscana è deliziosa.', 'Tuscan cuisine is delicious.'),
                  V('la moda', 'fashion', 'L\'Italia è capitale della moda.', 'Italy is the fashion capital.'),
                  V('il cinema', 'cinema', 'Il cinema italiano è famoso nel mondo.', 'Italian cinema is world-famous.'),
                  V('la letteratura', 'literature', 'La letteratura italiana è antica.', 'Italian literature is ancient.'),
                  V('la tradizione', 'tradition', 'La tradizione è importante.', 'Tradition is important.'),
                  V('la festa', 'celebration / party', 'La festa dura tutta la notte.', 'The celebration lasts all night.'),
                ],
                phrases: [
                  V('L\'Italia è famosa per la cucina.', 'Italy is famous for its cuisine.', 'L\'Italia è famosa per la cucina e l\'arte.', 'Italy is famous for its cuisine and art.'),
                  V('Mi piace molto l\'arte italiana.', 'I really like Italian art.', 'Mi piace molto l\'arte italiana del Rinascimento.', 'I really like Renaissance Italian art.'),
                  V('Dovresti visitare Firenze.', 'You should visit Florence.', 'Dovresti visitare Firenze quest\'estate.', 'You should visit Florence this summer.'),
                ],
                conversations: [
                  {
                    id: 'a1-c1',
                    title: 'Che cosa pensi?',
                    titleEn: 'What do you think?',
                    speakers: [
                      C('A', 'Cosa pensi della cultura italiana?', 'What do you think of Italian culture?'),
                      C('B', 'Adoro la cucina e l\'arte.', 'I love the cuisine and the art.'),
                      C('A', 'Hai visitato Roma?', 'Have you visited Rome?'),
                      C('B', 'No, ma voglio andarci l\'anno prossimo.', 'No, but I want to go next year.'),
                      C('A', 'Ti consiglio il Colosseo.', 'I recommend the Colosseum.'),
                      C('B', 'Grazie, ci andrò di sicuro!', 'Thanks, I’ll definitely go!'),
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: 'a2',
            title: 'Conversazioni Complesse',
            titleEn: 'Complex Conversations',
            subtitle: 'Opinioni, progetti e racconti.',
            subtitleEn: 'Opinions, plans and stories.',
            color: '#6366f1',
            icon: '🗣️',
            lessons: [
              {
                id: 'a2-1',
                title: 'Opinioni e sentimenti',
                titleEn: 'Opinions & feelings',
                description: 'Esprimere cosa pensi e provi.',
                descriptionEn: 'Expressing what you think and feel.',
                vocabulary: [
                  V('pensare', 'to think', 'Penso che sia una buona idea.', 'I think it’s a good idea.'),
                  V('credere', 'to believe', 'Credo in te.', 'I believe in you.'),
                  V('sentire', 'to feel', 'Mi sento felice oggi.', 'I feel happy today.'),
                  V('felice', 'happy', 'Sono molto felice.', 'I am very happy.'),
                  V('triste', 'sad', 'Perché sei triste?', 'Why are you sad?'),
                  V('stanco', 'tired', 'Sono stanco dopo il lavoro.', 'I’m tired after work.'),
                  V('arrabbiato', 'angry', 'Non essere arrabbiato.', 'Don’t be angry.'),
                  V('preoccupato', 'worried', 'Sono preoccupato per l\'esame.', 'I’m worried about the exam.'),
                  V('l\'opinione', 'opinion', 'Qual è la tua opinione?', 'What is your opinion?'),
                  V('secondo me', 'in my opinion', 'Secondo me, è giusto.', 'In my opinion, it’s right.'),
                ],
                phrases: [
                  V('Secondo me, hai ragione.', 'In my opinion, you’re right.', 'Secondo me, hai ragione su questo punto.', 'In my opinion, you’re right on this point.'),
                  V('Sono felice di vederti.', 'I’m happy to see you.', 'Sono felice di vederti qui.', 'I’m happy to see you here.'),
                  V('Che ne pensi?', 'What do you think?', 'Che ne pensi di questa idea?', 'What do you think of this idea?'),
                ],
              },
              {
                id: 'a2-2',
                title: 'Progetti futuri',
                titleEn: 'Future plans',
                description: 'Parlare di piani e sogni.',
                descriptionEn: 'Talking about plans and dreams.',
                vocabulary: [
                  V('il futuro', 'future', 'Il futuro è incerto.', 'The future is uncertain.'),
                  V('il piano', 'plan', 'Qual è il tuo piano?', 'What is your plan?'),
                  V('il progetto', 'project', 'Il progetto è ambizioso.', 'The project is ambitious.'),
                  V('sperare', 'to hope', 'Spero di rivederti.', 'I hope to see you again.'),
                  V('sognare', 'to dream', 'Sogno di vivere in Italia.', 'I dream of living in Italy.'),
                  V('decidere', 'to decide', 'Devo decidere presto.', 'I have to decide soon.'),
                  V('partire', 'to leave', 'Parto domani mattina.', 'I leave tomorrow morning.'),
                  V('rimanere', 'to stay', 'Rimango a casa stasera.', 'I’m staying home tonight.'),
                  V('diventare', 'to become', 'Voglio diventare medico.', 'I want to become a doctor.'),
                ],
                phrases: [
                  V('L\'anno prossimo andrò in Italia.', 'Next year I’ll go to Italy.', 'L\'anno prossimo andrò in Italia per tre mesi.', 'Next year I’ll go to Italy for three months.'),
                  V('Spero di trovare un lavoro.', 'I hope to find a job.', 'Spero di trovare un lavoro a Milano.', 'I hope to find a job in Milan.'),
                  V('Voglio diventare traduttore.', 'I want to become a translator.', 'Voglio diventare traduttore di italiano.', 'I want to become an Italian translator.'),
                ],
              },
              {
                id: 'a2-3',
                title: 'Raccontare una storia',
                titleEn: 'Telling a story',
                description: 'Narrare fatti ed esperienze.',
                descriptionEn: 'Narrating facts and experiences.',
                vocabulary: [
                  V('raccontare', 'to tell', 'Ti racconto una storia.', 'Let me tell you a story.'),
                  V('la storia', 'story', 'La storia è interessante.', 'The story is interesting.'),
                  V('succedere', 'to happen', 'È successo ieri.', 'It happened yesterday.'),
                  V('ricordare', 'to remember', 'Ricordo quel giorno.', 'I remember that day.'),
                  V('dimenticare', 'to forget', 'Non dimenticare le chiavi!', 'Don’t forget the keys!'),
                  V('aspettare', 'to wait', 'Aspetto l\'autobus.', 'I’m waiting for the bus.'),
                  V('arrivare', 'to arrive', 'Sono arrivato in ritardo.', 'I arrived late.'),
                  V('iniziare', 'to begin', 'La lezione inizia alle nove.', 'The lesson begins at nine.'),
                  V('finire', 'to finish', 'Il film finisce alle undici.', 'The film ends at eleven.'),
                  V('all\'improvviso', 'suddenly', 'All\'improvviso ha iniziato a piovere.', 'Suddenly it started to rain.'),
                ],
                phrases: [
                  V('Ti racconto una storia.', 'Let me tell you a story.', 'Ti racconto una storia divertente.', 'Let me tell you a funny story.'),
                  V('È successo ieri sera.', 'It happened last night.', 'È successo ieri sera vicino a casa.', 'It happened last night near home.'),
                  V('Alla fine, tutto è andato bene.', 'In the end, everything went well.', 'Alla fine, tutto è andato bene come sempre.', 'In the end, everything went well as always.'),
                ],
                conversations: [
                  {
                    id: 'a2-c1',
                    title: 'La vacanza',
                    titleEn: 'The holiday',
                    speakers: [
                      C('A', 'Raccontami della tua vacanza!', 'Tell me about your holiday!'),
                      C('B', 'È stata fantastica.', 'It was fantastic.'),
                      C('A', 'Che cosa hai fatto?', 'What did you do?'),
                      C('B', 'Ho visitato tanti posti e ho mangiato benissimo.', 'I visited many places and ate very well.'),
                      C('A', 'Dove sei stato?', 'Where did you go?'),
                      C('B', 'In Toscana, tra Firenze e Siena.', 'In Tuscany, between Florence and Siena.'),
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

  // Flattened helpers used by the Learner engine
  function allUnits() {
    var out = [];
    COURSE.levels.forEach(function (lv) {
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
    COURSE.levels.forEach(function (lv) {
      lv.units.forEach(function (u) {
        if (u.id === id) found = u;
      });
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
    COURSE.levels.forEach(function (lv) {
      lv.units.forEach(function (u) {
        u.lessons.forEach(function (l) {
          (l.vocabulary || []).forEach(function (v) { words.push(v); });
          (l.phrases || []).forEach(function (p) { words.push(p); });
        });
      });
    });
    return words;
  }

  w.LEARNER_COURSE = COURSE;
  w.LEARNER_UNITS = allUnits();
  w.LEARNER_UNIT_BY_ID = unitById;
  w.LEARNER_LESSON_BY_ID = lessonById;
  w.LEARNER_ALL_WORDS = allWords;
})(window);
