import { EXAMS } from './exams/registry.js';

export const ABOUT_DATE_MODIFIED = '2026-07-19';

const ABOUT_COPY = Object.freeze({
  en: copy({
    pageTitle: 'About Sense6 — experimental browser perception lab',
    description:
      'How Sense6 browser perception experiments work, who maintains them, and why every result is experimental, device-relative, and non-diagnostic.',
    eyebrow: 'About / method / boundaries',
    title: 'Careful experiments. Modest claims.',
    intro:
      'Sense6 is an independent collection of playful browser perception experiments. It is built for curiosity, personal exploration, and comparing your own runs under similar conditions.',
    updated: 'Content reviewed 19 July 2026',
    back: 'All tests',
    summaryTitle: 'The short version',
    summary:
      'Research informs the task designs, but Sense6 is not validated, certified, diagnostic, or intended to become a medical product.',
    facts: [
      ['Experimental', 'For curiosity and fun. No certification or formal validation is planned.'],
      [
        'Device-relative',
        'The browser, display, audio path, input, lighting, and setup affect every result.',
      ],
      ['Private', 'Answers and measurements stay in your browser unless you choose to export them.'],
      [
        'Non-diagnostic',
        'A Sense6 result is not a statement about health, ability, or whether anything is normal.',
      ],
    ],
    whyTitle: 'Why Sense6 exists',
    why: [
      'Perception is interesting, and small interactive experiments can make invisible differences easier to notice. Sense6 turns that curiosity into short, repeatable tasks without accounts, advertising trackers, or a universal score.',
      'The goal is not to classify people. It is to give you a careful description of one run and enough context to understand how the setup shaped it.',
    ],
    howTitle: 'How a browser experiment works',
    how: [
      'Most instruments use repeated forced choices and adaptive difficulty. The task changes after your responses so it can spend more time near the boundary observed in that run. Controls, uncertainty, and measurement bounds remain separate from the headline value.',
      'Consumer devices are not laboratory instruments. Sense6 therefore treats values as relative to the current device and setup. Repeated runs are most useful when the screen, audio level, input, correction, distance, and surroundings remain similar.',
    ],
    experimentsTitle: 'What each experiment explores — and what it cannot tell you',
    experimentsIntro:
      'Every instrument has a narrow question. None produces a diagnosis, certification, population rank, or suite-wide score.',
    exploresLabel: 'Explores',
    cannotLabel: 'Cannot tell you',
    experiments: {
      tetracromia: [
        'Small, reproducible colour differences on this display across three browser tasks.',
        'Whether you have tetrachromacy or anything about your cone biology.',
      ],
      'color-blindness': [
        'Display-relative colour directions while you locate a gap in luminance-noise dots.',
        'Whether you have a colour-vision deficiency or how a clinical test would classify you.',
      ],
      riflessi: [
        'Response timing, choice cost, and stability within one device-and-input session.',
        'Your intelligence, neurological health, driving fitness, or population rank.',
      ],
      udito: [
        'Relative audibility and pitch distinctions at the chosen device volume and audio setup.',
        'A hearing threshold in dB HL, hearing loss, hearing age, or headphone quality.',
      ],
      acutezza: [
        'Angular detail and low-contrast cost after browser calibration.',
        'Clinical visual acuity, 20/20 vision, a prescription, or whether you have astigmatism.',
      ],
    },
    qualityTitle: 'What the quality checks prove',
    quality: [
      'Automated tests cover the measurement algorithms, storage boundaries, routing, static pages, accessibility, responsive layouts, and complete browser journeys. These checks show that the software behaves as designed.',
      'They do not establish scientific or clinical validity. Published papers, standards, and health guidance are linked to explain design inspiration and limits; they do not endorse or validate this implementation.',
    ],
    maintainerTitle: 'Who maintains Sense6',
    maintainer: [
      'Sense6 is created and maintained by {profile}. It is an independent personal project operated in Switzerland, not a clinic, university study, or commercial testing service.',
    ],
    profileLabel: 'Zeno',
    privacyTitle: 'The privacy boundary',
    privacy: [
      'Test answers, measurements, and journal entries are processed locally. Sense6 stores only anonymous daily activity totals without identifiers, referrers, user agents, exact timestamps, answers, or results. Read the {privacy} for the complete boundary.',
    ],
    privacyLabel: 'privacy notice',
    changesTitle: 'Corrections and changes',
    changes: [
      'Methods and wording may change as the experiments evolve. A content-review date means that the page and its sources were checked for freshness; it is not expert approval. Questions and corrections can be raised through the {profile}.',
    ],
    researchTitle: 'Follow the research trail',
    researchIntro:
      'Each experiment publishes the sources that informed its task design together with its specific interpretation limits.',
    openExperiment: 'Read method and sources',
  }),
  it: copy({
    pageTitle: 'Sense6 — esperimenti di percezione nel browser',
    description:
      'Metodo, manutenzione e limiti degli esperimenti Sense6: risultati sperimentali, relativi al dispositivo e non diagnostici.',
    eyebrow: 'Informazioni / metodo / limiti',
    title: 'Esperimenti accurati. Affermazioni prudenti.',
    intro:
      'Sense6 è una raccolta indipendente di esperimenti giocosi sulla percezione nel browser. Nasce per la curiosità, l’esplorazione personale e il confronto tra le proprie sessioni svolte in condizioni simili.',
    updated: 'Contenuto revisionato il 19 luglio 2026',
    back: 'Tutti i test',
    summaryTitle: 'In breve',
    summary:
      'La ricerca ispira i compiti, ma Sense6 non è validato, certificato o diagnostico e non è destinato a diventare un prodotto medico.',
    facts: [
      [
        'Sperimentale',
        'Per curiosità e divertimento. Non sono previste certificazioni o validazioni formali.',
      ],
      [
        'Relativo al dispositivo',
        'Browser, schermo, percorso audio, input, illuminazione e configurazione influenzano ogni risultato.',
      ],
      ['Privato', 'Risposte e misurazioni restano nel browser, salvo una tua esportazione volontaria.'],
      ['Non diagnostico', 'Un risultato Sense6 non descrive la salute, le capacità o ciò che è normale.'],
    ],
    whyTitle: 'Perché esiste Sense6',
    why: [
      'La percezione è interessante e piccoli esperimenti interattivi possono rendere più visibili differenze difficili da notare. Sense6 trasforma questa curiosità in compiti brevi e ripetibili, senza account, traccianti pubblicitari o un punteggio universale.',
      'L’obiettivo non è classificare le persone. È descrivere con attenzione una singola sessione e offrire il contesto necessario per capire come la configurazione l’ha influenzata.',
    ],
    howTitle: 'Come funziona un esperimento nel browser',
    how: [
      'La maggior parte degli strumenti usa scelte forzate ripetute e difficoltà adattiva. Il compito cambia dopo le risposte per concentrarsi vicino al limite osservato in quella sessione. Controlli, incertezza e limiti di misura restano separati dal valore principale.',
      'I dispositivi di consumo non sono strumenti di laboratorio. Sense6 considera quindi i valori relativi al dispositivo e alla configurazione attuali. Le sessioni ripetute sono più utili quando schermo, livello audio, input, correzione, distanza e ambiente restano simili.',
    ],
    experimentsTitle: 'Cosa esplora ogni esperimento — e cosa non può dirti',
    experimentsIntro:
      'Ogni strumento pone una domanda limitata. Nessuno produce diagnosi, certificazioni, classifiche di popolazione o un punteggio complessivo.',
    exploresLabel: 'Esplora',
    cannotLabel: 'Non può dirti',
    experiments: {
      tetracromia: [
        'Piccole differenze cromatiche riproducibili su questo schermo attraverso tre compiti nel browser.',
        'Se possiedi tetracromia o qualsiasi informazione sulla biologia dei tuoi coni.',
      ],
      'color-blindness': [
        'Direzioni cromatiche relative allo schermo mentre individui un’apertura tra punti con rumore di luminanza.',
        'Se hai un deficit della visione dei colori o come ti classificherebbe un test clinico.',
      ],
      riflessi: [
        'Tempi di risposta, costo della scelta e stabilità in una sessione con lo stesso dispositivo e input.',
        'La tua intelligenza, salute neurologica, idoneità alla guida o posizione nella popolazione.',
      ],
      udito: [
        'Udibilità relativa e distinzioni di altezza al volume e con la configurazione audio scelti.',
        'Una soglia uditiva in dB HL, perdita uditiva, età uditiva o qualità delle cuffie.',
      ],
      acutezza: [
        'Dettaglio angolare e costo del basso contrasto dopo la calibrazione nel browser.',
        'Acuità visiva clinica, visione 20/20, una prescrizione o la presenza di astigmatismo.',
      ],
    },
    qualityTitle: 'Cosa dimostrano i controlli di qualità',
    quality: [
      'I test automatici coprono algoritmi di misura, limiti di archiviazione, percorsi, pagine statiche, accessibilità, layout responsivi e percorsi completi nel browser. Questi controlli mostrano che il software si comporta come progettato.',
      'Non stabiliscono validità scientifica o clinica. Articoli, standard e indicazioni sanitarie sono collegati per spiegare ispirazione e limiti; non approvano né validano questa implementazione.',
    ],
    maintainerTitle: 'Chi mantiene Sense6',
    maintainer: [
      'Sense6 è creato e mantenuto da {profile}. È un progetto personale indipendente gestito in Svizzera, non una clinica, uno studio universitario o un servizio commerciale di test.',
    ],
    profileLabel: 'Zeno',
    privacyTitle: 'Il confine della privacy',
    privacy: [
      'Risposte, misurazioni e voci del diario vengono elaborate localmente. Sense6 conserva soltanto totali giornalieri anonimi, senza identificatori, referrer, user agent, orari esatti, risposte o risultati. Leggi l’{privacy} per il quadro completo.',
    ],
    privacyLabel: 'informativa sulla privacy',
    changesTitle: 'Correzioni e modifiche',
    changes: [
      'Metodi e formulazioni possono cambiare con l’evoluzione degli esperimenti. La data di revisione indica che pagina e fonti sono state controllate per verificarne l’attualità; non è un’approvazione esperta. Domande e correzioni possono essere inviate tramite il {profile}.',
    ],
    researchTitle: 'Segui il percorso di ricerca',
    researchIntro:
      'Ogni esperimento pubblica le fonti che hanno ispirato il compito insieme ai suoi limiti specifici di interpretazione.',
    openExperiment: 'Leggi metodo e fonti',
  }),
  de: copy({
    pageTitle: 'Über Sense6 — Wahrnehmungsexperimente im Browser',
    description:
      'Wie die Wahrnehmungsexperimente von Sense6 funktionieren, wer sie pflegt und warum jedes Ergebnis experimentell, gerätebezogen und nicht diagnostisch ist.',
    eyebrow: 'Über uns / Methode / Grenzen',
    title: 'Sorgfältige Experimente. Bescheidene Aussagen.',
    intro:
      'Sense6 ist eine unabhängige Sammlung spielerischer Wahrnehmungsexperimente im Browser. Sie dient der Neugier, der persönlichen Erkundung und dem Vergleich eigener Durchläufe unter ähnlichen Bedingungen.',
    updated: 'Inhalt geprüft am 19. Juli 2026',
    back: 'Alle Tests',
    summaryTitle: 'Kurz gesagt',
    summary:
      'Forschung beeinflusst die Aufgaben, aber Sense6 ist weder validiert noch zertifiziert oder diagnostisch und soll kein Medizinprodukt werden.',
    facts: [
      [
        'Experimentell',
        'Für Neugier und Spaß. Eine Zertifizierung oder formale Validierung ist nicht vorgesehen.',
      ],
      [
        'Gerätebezogen',
        'Browser, Anzeige, Audiopfad, Eingabe, Licht und Einrichtung beeinflussen jedes Ergebnis.',
      ],
      ['Privat', 'Antworten und Messwerte bleiben im Browser, sofern Sie sie nicht selbst exportieren.'],
      [
        'Nicht diagnostisch',
        'Ein Sense6-Ergebnis sagt nichts über Gesundheit, Fähigkeit oder Normalität aus.',
      ],
    ],
    whyTitle: 'Warum Sense6 existiert',
    why: [
      'Wahrnehmung ist interessant. Kleine interaktive Experimente können schwer sichtbare Unterschiede greifbarer machen. Sense6 macht daraus kurze, wiederholbare Aufgaben ohne Konto, Werbetracker oder universelle Punktzahl.',
      'Das Ziel ist nicht, Menschen einzuordnen. Es geht um eine sorgfältige Beschreibung eines Durchlaufs und um den Kontext, wie die Einrichtung ihn beeinflusst hat.',
    ],
    howTitle: 'Wie ein Browserexperiment funktioniert',
    how: [
      'Die meisten Instrumente verwenden wiederholte Auswahlaufgaben und adaptive Schwierigkeit. Die Aufgabe passt sich nach Ihren Antworten an und konzentriert sich auf die in diesem Durchlauf beobachtete Grenze. Kontrollen, Unsicherheit und Messgrenzen bleiben vom Hauptwert getrennt.',
      'Verbrauchergeräte sind keine Laborinstrumente. Sense6 behandelt Werte deshalb als relativ zum aktuellen Gerät und Aufbau. Wiederholte Durchläufe sind am nützlichsten, wenn Anzeige, Lautstärke, Eingabe, Korrektur, Abstand und Umgebung ähnlich bleiben.',
    ],
    experimentsTitle: 'Was jedes Experiment untersucht — und was es nicht sagen kann',
    experimentsIntro:
      'Jedes Instrument stellt eine eng begrenzte Frage. Keines liefert Diagnose, Zertifizierung, Bevölkerungsrang oder Gesamtpunktzahl.',
    exploresLabel: 'Untersucht',
    cannotLabel: 'Kann nicht sagen',
    experiments: {
      tetracromia: [
        'Kleine, wiederholbare Farbunterschiede auf dieser Anzeige in drei Browseraufgaben.',
        'Ob Sie Tetrachromatie haben oder etwas über die Biologie Ihrer Zapfen.',
      ],
      'color-blindness': [
        'Anzeigebezogene Farbrichtungen beim Finden einer Lücke in Punkten mit Helligkeitsrauschen.',
        'Ob eine Farbsehschwäche vorliegt oder wie ein klinischer Test Sie einordnen würde.',
      ],
      riflessi: [
        'Reaktionszeit, Entscheidungskosten und Stabilität innerhalb einer Geräte- und Eingabesitzung.',
        'Intelligenz, neurologische Gesundheit, Fahrtauglichkeit oder Bevölkerungsrang.',
      ],
      udito: [
        'Relative Hörbarkeit und Tonhöhenunterschiede bei gewählter Lautstärke und Audioeinrichtung.',
        'Eine Hörschwelle in dB HL, Hörverlust, Höralter oder Kopfhörerqualität.',
      ],
      acutezza: [
        'Winkeldetail und Kontrastkosten nach Browserkalibrierung.',
        'Klinische Sehschärfe, 20/20-Sehen, eine Verordnung oder ob Astigmatismus vorliegt.',
      ],
    },
    qualityTitle: 'Was die Qualitätsprüfungen belegen',
    quality: [
      'Automatisierte Tests decken Messalgorithmen, Speichergrenzen, Routing, statische Seiten, Barrierefreiheit, responsive Layouts und vollständige Browserabläufe ab. Diese Prüfungen zeigen, dass sich die Software wie vorgesehen verhält.',
      'Sie belegen keine wissenschaftliche oder klinische Validität. Verlinkte Arbeiten, Standards und Gesundheitsinformationen erklären Inspiration und Grenzen; sie bestätigen oder validieren diese Umsetzung nicht.',
    ],
    maintainerTitle: 'Wer Sense6 pflegt',
    maintainer: [
      'Sense6 wird von {profile} entwickelt und gepflegt. Es ist ein unabhängiges persönliches Projekt aus der Schweiz, keine Klinik, Universitätsstudie oder kommerzielle Testleistung.',
    ],
    profileLabel: 'Zeno',
    privacyTitle: 'Die Datenschutzgrenze',
    privacy: [
      'Antworten, Messwerte und Journaleinträge werden lokal verarbeitet. Sense6 speichert nur anonyme Tagessummen ohne Kennungen, Referrer, User-Agents, genaue Zeitstempel, Antworten oder Ergebnisse. Die vollständige Grenze steht im {privacy}.',
    ],
    privacyLabel: 'Datenschutzhinweis',
    changesTitle: 'Korrekturen und Änderungen',
    changes: [
      'Methoden und Formulierungen können sich mit den Experimenten ändern. Ein Inhaltsprüfdatum bedeutet, dass Seite und Quellen auf Aktualität geprüft wurden; es ist keine fachliche Freigabe. Fragen und Korrekturen können über das {profile} eingereicht werden.',
    ],
    researchTitle: 'Der Forschungsspur folgen',
    researchIntro:
      'Jedes Experiment nennt die Quellen, die seine Aufgabe beeinflusst haben, und die eigenen Grenzen der Interpretation.',
    openExperiment: 'Methode und Quellen lesen',
  }),
  fr: copy({
    pageTitle: 'À propos de Sense6 — expériences de perception',
    description:
      'Méthode, maintenance et limites des expériences Sense6 : des résultats expérimentaux, liés à l’appareil et non diagnostiques.',
    eyebrow: 'À propos / méthode / limites',
    title: 'Des expériences soignées. Des conclusions modestes.',
    intro:
      'Sense6 est une collection indépendante d’expériences ludiques de perception dans le navigateur. Elle est conçue pour la curiosité, l’exploration personnelle et la comparaison de vos propres essais dans des conditions similaires.',
    updated: 'Contenu révisé le 19 juillet 2026',
    back: 'Tous les tests',
    summaryTitle: 'En bref',
    summary:
      'La recherche inspire les tâches, mais Sense6 n’est ni validé, ni certifié, ni diagnostique et n’a pas vocation à devenir un produit médical.',
    facts: [
      [
        'Expérimental',
        'Pour la curiosité et le plaisir. Aucune certification ou validation formelle n’est prévue.',
      ],
      [
        'Lié à l’appareil',
        'Le navigateur, l’écran, le chemin audio, la saisie, la lumière et la configuration influencent chaque résultat.',
      ],
      [
        'Privé',
        'Les réponses et mesures restent dans votre navigateur, sauf export volontaire de votre part.',
      ],
      [
        'Non diagnostique',
        'Un résultat Sense6 ne décrit ni votre santé, ni vos capacités, ni ce qui serait normal.',
      ],
    ],
    whyTitle: 'Pourquoi Sense6 existe',
    why: [
      'La perception est fascinante. De petites expériences interactives peuvent rendre visibles des différences difficiles à remarquer. Sense6 transforme cette curiosité en tâches courtes et répétables, sans compte, traceur publicitaire ou score universel.',
      'Le but n’est pas de classer les personnes. Il est de décrire soigneusement un essai et de donner assez de contexte pour comprendre l’influence de la configuration.',
    ],
    howTitle: 'Comment fonctionne une expérience dans le navigateur',
    how: [
      'La plupart des instruments utilisent des choix forcés répétés et une difficulté adaptative. La tâche évolue après vos réponses pour se concentrer près de la limite observée pendant cet essai. Les contrôles, l’incertitude et les bornes de mesure restent séparés de la valeur principale.',
      'Les appareils grand public ne sont pas des instruments de laboratoire. Sense6 traite donc les valeurs comme relatives à l’appareil et à la configuration actuels. Les essais répétés sont surtout utiles lorsque l’écran, le volume, la saisie, la correction, la distance et l’environnement restent similaires.',
    ],
    experimentsTitle: 'Ce que chaque expérience explore — et ce qu’elle ne peut pas vous dire',
    experimentsIntro:
      'Chaque instrument pose une question étroite. Aucun ne produit de diagnostic, certification, classement de population ou score global.',
    exploresLabel: 'Explore',
    cannotLabel: 'Ne peut pas indiquer',
    experiments: {
      tetracromia: [
        'De petites différences de couleur reproductibles sur cet écran au moyen de trois tâches dans le navigateur.',
        'Si vous êtes tétrachromate ou quoi que ce soit sur la biologie de vos cônes.',
      ],
      'color-blindness': [
        'Des directions colorées relatives à l’écran en repérant une ouverture dans des points avec bruit de luminance.',
        'Si vous avez une déficience de vision des couleurs ou comment un test clinique vous classerait.',
      ],
      riflessi: [
        'Le temps de réponse, le coût du choix et la stabilité pendant une session avec le même appareil et la même saisie.',
        'Votre intelligence, votre santé neurologique, votre aptitude à conduire ou votre classement dans la population.',
      ],
      udito: [
        'L’audibilité relative et les différences de hauteur au volume et avec la configuration audio choisis.',
        'Un seuil auditif en dB HL, une perte auditive, un âge auditif ou la qualité du casque.',
      ],
      acutezza: [
        'Le détail angulaire et le coût du faible contraste après étalonnage dans le navigateur.',
        'L’acuité visuelle clinique, une vision 20/20, une prescription ou la présence d’astigmatisme.',
      ],
    },
    qualityTitle: 'Ce que prouvent les contrôles qualité',
    quality: [
      'Les tests automatisés couvrent les algorithmes de mesure, les limites de stockage, le routage, les pages statiques, l’accessibilité, les mises en page adaptatives et les parcours complets dans le navigateur. Ils montrent que le logiciel se comporte comme prévu.',
      'Ils n’établissent aucune validité scientifique ou clinique. Les publications, normes et recommandations sanitaires liées expliquent l’inspiration et les limites; elles ne cautionnent ni ne valident cette réalisation.',
    ],
    maintainerTitle: 'Qui maintient Sense6',
    maintainer: [
      'Sense6 est créé et maintenu par {profile}. Il s’agit d’un projet personnel indépendant exploité en Suisse, et non d’une clinique, d’une étude universitaire ou d’un service commercial de test.',
    ],
    profileLabel: 'Zeno',
    privacyTitle: 'La frontière de confidentialité',
    privacy: [
      'Les réponses, mesures et entrées du journal sont traitées localement. Sense6 ne conserve que des totaux quotidiens anonymes, sans identifiants, référents, agents utilisateur, heures exactes, réponses ou résultats. Consultez la {privacy} pour tous les détails.',
    ],
    privacyLabel: 'notice de confidentialité',
    changesTitle: 'Corrections et modifications',
    changes: [
      'Les méthodes et formulations peuvent évoluer avec les expériences. Une date de révision indique que la page et ses sources ont été vérifiées pour leur actualité; ce n’est pas une approbation experte. Les questions et corrections peuvent être adressées via le {profile}.',
    ],
    researchTitle: 'Suivre la piste de recherche',
    researchIntro:
      'Chaque expérience publie les sources qui ont inspiré sa tâche ainsi que ses limites d’interprétation propres.',
    openExperiment: 'Lire la méthode et les sources',
  }),
  es: copy({
    pageTitle: 'Acerca de Sense6 — experimentos de percepción',
    description:
      'Cómo funcionan los experimentos de percepción de Sense6, quién los mantiene y por qué cada resultado es experimental, relativo al dispositivo y no diagnóstico.',
    eyebrow: 'Acerca de / método / límites',
    title: 'Experimentos cuidadosos. Afirmaciones modestas.',
    intro:
      'Sense6 es una colección independiente de experimentos lúdicos de percepción en el navegador. Está hecha para la curiosidad, la exploración personal y la comparación de tus propias sesiones en condiciones similares.',
    updated: 'Contenido revisado el 19 de julio de 2026',
    back: 'Todos los tests',
    summaryTitle: 'En pocas palabras',
    summary:
      'La investigación inspira las tareas, pero Sense6 no está validado, certificado ni es diagnóstico, y no pretende convertirse en un producto médico.',
    facts: [
      [
        'Experimental',
        'Para la curiosidad y la diversión. No se prevé ninguna certificación o validación formal.',
      ],
      [
        'Relativo al dispositivo',
        'El navegador, la pantalla, la ruta de audio, la entrada, la luz y la configuración influyen en cada resultado.',
      ],
      ['Privado', 'Las respuestas y mediciones permanecen en tu navegador, salvo que decidas exportarlas.'],
      ['No diagnóstico', 'Un resultado de Sense6 no describe tu salud, capacidad ni lo que es normal.'],
    ],
    whyTitle: 'Por qué existe Sense6',
    why: [
      'La percepción es interesante y los pequeños experimentos interactivos pueden hacer visibles diferencias difíciles de notar. Sense6 convierte esa curiosidad en tareas breves y repetibles, sin cuentas, rastreadores publicitarios ni una puntuación universal.',
      'El objetivo no es clasificar a las personas. Es describir cuidadosamente una sesión y ofrecer contexto suficiente para comprender cómo la configuración influyó en ella.',
    ],
    howTitle: 'Cómo funciona un experimento en el navegador',
    how: [
      'La mayoría de los instrumentos utiliza elecciones forzadas repetidas y dificultad adaptativa. La tarea cambia tras tus respuestas para concentrarse cerca del límite observado en esa sesión. Los controles, la incertidumbre y los límites de medición permanecen separados del valor principal.',
      'Los dispositivos de consumo no son instrumentos de laboratorio. Sense6 trata los valores como relativos al dispositivo y configuración actuales. Las sesiones repetidas son más útiles cuando la pantalla, el volumen, la entrada, la corrección, la distancia y el entorno se mantienen similares.',
    ],
    experimentsTitle: 'Qué explora cada experimento — y qué no puede decirte',
    experimentsIntro:
      'Cada instrumento plantea una pregunta limitada. Ninguno produce un diagnóstico, certificación, clasificación poblacional o puntuación global.',
    exploresLabel: 'Explora',
    cannotLabel: 'No puede decirte',
    experiments: {
      tetracromia: [
        'Pequeñas diferencias de color reproducibles en esta pantalla mediante tres tareas del navegador.',
        'Si tienes tetracromacia ni nada sobre la biología de tus conos.',
      ],
      'color-blindness': [
        'Direcciones de color relativas a la pantalla mientras localizas una abertura entre puntos con ruido de luminancia.',
        'Si tienes una deficiencia de visión cromática o cómo te clasificaría una prueba clínica.',
      ],
      riflessi: [
        'Tiempo de respuesta, coste de elección y estabilidad durante una sesión con el mismo dispositivo y entrada.',
        'Tu inteligencia, salud neurológica, aptitud para conducir o clasificación poblacional.',
      ],
      udito: [
        'Audibilidad relativa y distinciones de tono al volumen y con la configuración de audio elegidos.',
        'Un umbral auditivo en dB HL, pérdida auditiva, edad auditiva o calidad de los auriculares.',
      ],
      acutezza: [
        'Detalle angular y coste de bajo contraste tras la calibración del navegador.',
        'Agudeza visual clínica, visión 20/20, una prescripción o la presencia de astigmatismo.',
      ],
    },
    qualityTitle: 'Qué demuestran los controles de calidad',
    quality: [
      'Las pruebas automatizadas cubren los algoritmos de medición, los límites de almacenamiento, las rutas, las páginas estáticas, la accesibilidad, los diseños adaptables y los recorridos completos en el navegador. Estos controles muestran que el software se comporta según lo diseñado.',
      'No establecen validez científica ni clínica. Los artículos, normas y orientaciones sanitarias enlazados explican la inspiración y los límites; no respaldan ni validan esta implementación.',
    ],
    maintainerTitle: 'Quién mantiene Sense6',
    maintainer: [
      'Sense6 está creado y mantenido por {profile}. Es un proyecto personal independiente gestionado en Suiza, no una clínica, un estudio universitario ni un servicio comercial de pruebas.',
    ],
    profileLabel: 'Zeno',
    privacyTitle: 'El límite de privacidad',
    privacy: [
      'Las respuestas, mediciones y entradas del diario se procesan localmente. Sense6 solo conserva totales diarios anónimos, sin identificadores, referencias, agentes de usuario, horas exactas, respuestas ni resultados. Consulta el {privacy} para conocer el límite completo.',
    ],
    privacyLabel: 'aviso de privacidad',
    changesTitle: 'Correcciones y cambios',
    changes: [
      'Los métodos y textos pueden cambiar a medida que evolucionan los experimentos. Una fecha de revisión indica que la página y sus fuentes se comprobaron por actualidad; no es una aprobación experta. Las preguntas y correcciones pueden plantearse a través del {profile}.',
    ],
    researchTitle: 'Sigue el rastro de investigación',
    researchIntro:
      'Cada experimento publica las fuentes que inspiraron su tarea junto con sus límites específicos de interpretación.',
    openExperiment: 'Leer método y fuentes',
  }),
  pt: copy({
    pageTitle: 'Sobre a Sense6 — experiências de perceção',
    description:
      'Como funcionam as experiências de perceção da Sense6, quem as mantém e por que cada resultado é experimental, relativo ao dispositivo e não diagnóstico.',
    eyebrow: 'Sobre / método / limites',
    title: 'Experiências cuidadas. Afirmações modestas.',
    intro:
      'A Sense6 é uma coleção independente de experiências lúdicas de perceção no navegador. Foi criada para a curiosidade, a exploração pessoal e a comparação das suas próprias sessões em condições semelhantes.',
    updated: 'Conteúdo revisto em 19 de julho de 2026',
    back: 'Todos os testes',
    summaryTitle: 'Em resumo',
    summary:
      'A investigação inspira as tarefas, mas a Sense6 não é validada, certificada ou diagnóstica e não pretende tornar-se um produto médico.',
    facts: [
      ['Experimental', 'Para curiosidade e diversão. Não está prevista certificação ou validação formal.'],
      [
        'Relativa ao dispositivo',
        'O navegador, ecrã, percurso de áudio, entrada, luz e configuração influenciam cada resultado.',
      ],
      ['Privada', 'As respostas e medições ficam no navegador, salvo se decidir exportá-las.'],
      ['Não diagnóstica', 'Um resultado Sense6 não descreve a sua saúde, capacidade ou aquilo que é normal.'],
    ],
    whyTitle: 'Por que existe a Sense6',
    why: [
      'A perceção é interessante, e pequenas experiências interativas podem tornar visíveis diferenças difíceis de notar. A Sense6 transforma essa curiosidade em tarefas curtas e repetíveis, sem contas, rastreadores publicitários ou uma pontuação universal.',
      'O objetivo não é classificar pessoas. É descrever cuidadosamente uma sessão e dar contexto suficiente para compreender como a configuração a influenciou.',
    ],
    howTitle: 'Como funciona uma experiência no navegador',
    how: [
      'A maioria dos instrumentos utiliza escolhas forçadas repetidas e dificuldade adaptativa. A tarefa muda após as respostas para se concentrar perto do limite observado nessa sessão. Controlos, incerteza e limites de medição permanecem separados do valor principal.',
      'Os dispositivos de consumo não são instrumentos de laboratório. A Sense6 trata os valores como relativos ao dispositivo e à configuração atuais. Sessões repetidas são mais úteis quando o ecrã, volume, entrada, correção, distância e ambiente permanecem semelhantes.',
    ],
    experimentsTitle: 'O que cada experiência explora — e o que não lhe pode dizer',
    experimentsIntro:
      'Cada instrumento coloca uma questão limitada. Nenhum produz diagnóstico, certificação, classificação populacional ou pontuação global.',
    exploresLabel: 'Explora',
    cannotLabel: 'Não lhe pode dizer',
    experiments: {
      tetracromia: [
        'Pequenas diferenças de cor reproduzíveis neste ecrã através de três tarefas no navegador.',
        'Se tem tetracromacia ou qualquer informação sobre a biologia dos seus cones.',
      ],
      'color-blindness': [
        'Direções de cor relativas ao ecrã enquanto localiza uma abertura em pontos com ruído de luminância.',
        'Se tem uma deficiência da visão cromática ou como seria classificado por um teste clínico.',
      ],
      riflessi: [
        'Tempo de resposta, custo de escolha e estabilidade numa sessão com o mesmo dispositivo e entrada.',
        'A sua inteligência, saúde neurológica, aptidão para conduzir ou classificação populacional.',
      ],
      udito: [
        'Audibilidade relativa e diferenças de altura ao volume e com a configuração de áudio escolhidos.',
        'Um limiar auditivo em dB HL, perda auditiva, idade auditiva ou qualidade dos auscultadores.',
      ],
      acutezza: [
        'Detalhe angular e custo de baixo contraste após calibração no navegador.',
        'Acuidade visual clínica, visão 20/20, uma prescrição ou a presença de astigmatismo.',
      ],
    },
    qualityTitle: 'O que os controlos de qualidade demonstram',
    quality: [
      'Os testes automatizados cobrem algoritmos de medição, limites de armazenamento, rotas, páginas estáticas, acessibilidade, layouts responsivos e percursos completos no navegador. Estes controlos mostram que o software funciona como foi concebido.',
      'Não estabelecem validade científica ou clínica. Os artigos, normas e orientações de saúde ligados explicam a inspiração e os limites; não apoiam nem validam esta implementação.',
    ],
    maintainerTitle: 'Quem mantém a Sense6',
    maintainer: [
      'A Sense6 é criada e mantida por {profile}. É um projeto pessoal independente operado na Suíça, não uma clínica, estudo universitário ou serviço comercial de testes.',
    ],
    profileLabel: 'Zeno',
    privacyTitle: 'O limite de privacidade',
    privacy: [
      'As respostas, medições e entradas do diário são processadas localmente. A Sense6 guarda apenas totais diários anónimos, sem identificadores, referências, agentes de utilizador, horas exatas, respostas ou resultados. Leia o {privacy} para conhecer o limite completo.',
    ],
    privacyLabel: 'aviso de privacidade',
    changesTitle: 'Correções e alterações',
    changes: [
      'Os métodos e textos podem mudar à medida que as experiências evoluem. Uma data de revisão significa que a página e as fontes foram verificadas quanto à atualidade; não é aprovação especializada. Questões e correções podem ser apresentadas através do {profile}.',
    ],
    researchTitle: 'Siga o percurso da investigação',
    researchIntro:
      'Cada experiência publica as fontes que inspiraram a tarefa juntamente com os seus limites específicos de interpretação.',
    openExperiment: 'Ler método e fontes',
  }),
  'pt-br': copy({
    pageTitle: 'Sobre a Sense6 — experimentos de percepção',
    description:
      'Método, manutenção e limites dos experimentos Sense6: resultados experimentais, relativos ao dispositivo e não diagnósticos.',
    eyebrow: 'Sobre / método / limites',
    title: 'Experimentos cuidadosos. Afirmações modestas.',
    intro:
      'A Sense6 é uma coleção independente de experimentos lúdicos de percepção no navegador. Ela foi criada para a curiosidade, a exploração pessoal e a comparação das suas próprias sessões em condições semelhantes.',
    updated: 'Conteúdo revisado em 19 de julho de 2026',
    back: 'Todos os testes',
    summaryTitle: 'Em resumo',
    summary:
      'A pesquisa inspira as tarefas, mas a Sense6 não é validada, certificada ou diagnóstica e não pretende se tornar um produto médico.',
    facts: [
      ['Experimental', 'Para curiosidade e diversão. Não há certificação ou validação formal planejada.'],
      [
        'Relativa ao dispositivo',
        'O navegador, a tela, o caminho de áudio, a entrada, a iluminação e a configuração influenciam cada resultado.',
      ],
      ['Privada', 'Respostas e medições ficam no navegador, a menos que você decida exportá-las.'],
      ['Não diagnóstica', 'Um resultado da Sense6 não descreve sua saúde, capacidade ou o que é normal.'],
    ],
    whyTitle: 'Por que a Sense6 existe',
    why: [
      'A percepção é interessante, e pequenos experimentos interativos podem tornar diferenças difíceis de notar mais visíveis. A Sense6 transforma essa curiosidade em tarefas curtas e repetíveis, sem contas, rastreadores de publicidade ou uma pontuação universal.',
      'O objetivo não é classificar pessoas. É descrever cuidadosamente uma sessão e oferecer contexto suficiente para entender como a configuração a influenciou.',
    ],
    howTitle: 'Como funciona um experimento no navegador',
    how: [
      'A maioria dos instrumentos usa escolhas forçadas repetidas e dificuldade adaptativa. A tarefa muda após as respostas para se concentrar perto do limite observado naquela sessão. Controles, incerteza e limites de medição permanecem separados do valor principal.',
      'Dispositivos de consumo não são instrumentos de laboratório. Por isso, a Sense6 trata os valores como relativos ao dispositivo e à configuração atuais. Sessões repetidas são mais úteis quando tela, volume, entrada, correção, distância e ambiente permanecem semelhantes.',
    ],
    experimentsTitle: 'O que cada experimento explora — e o que ele não pode dizer',
    experimentsIntro:
      'Cada instrumento faz uma pergunta limitada. Nenhum produz diagnóstico, certificação, classificação populacional ou pontuação geral.',
    exploresLabel: 'Explora',
    cannotLabel: 'Não pode dizer',
    experiments: {
      tetracromia: [
        'Pequenas diferenças de cor reproduzíveis nesta tela por meio de três tarefas no navegador.',
        'Se você tem tetracromacia ou qualquer informação sobre a biologia dos seus cones.',
      ],
      'color-blindness': [
        'Direções de cor relativas à tela enquanto você localiza uma abertura em pontos com ruído de luminância.',
        'Se você tem uma deficiência de visão de cores ou como um teste clínico classificaria você.',
      ],
      riflessi: [
        'Tempo de resposta, custo de escolha e estabilidade em uma sessão com o mesmo dispositivo e método de entrada.',
        'Sua inteligência, saúde neurológica, aptidão para dirigir ou posição na população.',
      ],
      udito: [
        'Audibilidade relativa e diferenças de altura no volume e na configuração de áudio escolhidos.',
        'Um limiar auditivo em dB HL, perda auditiva, idade auditiva ou qualidade dos fones de ouvido.',
      ],
      acutezza: [
        'Detalhe angular e custo de baixo contraste após a calibração no navegador.',
        'Acuidade visual clínica, visão 20/20, uma prescrição ou a presença de astigmatismo.',
      ],
    },
    qualityTitle: 'O que as verificações de qualidade demonstram',
    quality: [
      'Testes automatizados cobrem algoritmos de medição, limites de armazenamento, rotas, páginas estáticas, acessibilidade, layouts responsivos e jornadas completas no navegador. Essas verificações mostram que o software se comporta como projetado.',
      'Elas não estabelecem validade científica ou clínica. Artigos, normas e orientações de saúde são vinculados para explicar inspiração e limites; eles não endossam nem validam esta implementação.',
    ],
    maintainerTitle: 'Quem mantém a Sense6',
    maintainer: [
      'A Sense6 é criada e mantida por {profile}. É um projeto pessoal independente operado na Suíça, não uma clínica, estudo universitário ou serviço comercial de testes.',
    ],
    profileLabel: 'Zeno',
    privacyTitle: 'O limite de privacidade',
    privacy: [
      'Respostas, medições e entradas do diário são processadas localmente. A Sense6 armazena apenas totais diários anônimos, sem identificadores, referências, agentes de usuário, horários exatos, respostas ou resultados. Leia o {privacy} para conhecer o limite completo.',
    ],
    privacyLabel: 'aviso de privacidade',
    changesTitle: 'Correções e mudanças',
    changes: [
      'Métodos e textos podem mudar conforme os experimentos evoluem. Uma data de revisão indica que a página e suas fontes foram verificadas quanto à atualidade; não é uma aprovação especializada. Perguntas e correções podem ser enviadas pelo {profile}.',
    ],
    researchTitle: 'Siga a trilha de pesquisa',
    researchIntro:
      'Cada experimento publica as fontes que inspiraram sua tarefa junto com seus limites específicos de interpretação.',
    openExperiment: 'Ler método e fontes',
  }),
  ar: copy({
    pageTitle: 'حول Sense6 — تجارب الإدراك في المتصفح',
    description: 'منهج تجارب Sense6 والمسؤول عنها وحدودها: نتائج تجريبية مرتبطة بالجهاز وغير تشخيصية.',
    eyebrow: 'حول / المنهج / الحدود',
    title: 'تجارب مدروسة. ادعاءات متواضعة.',
    intro:
      'Sense6 مجموعة مستقلة من تجارب الإدراك الممتعة في المتصفح. صُممت للفضول والاستكشاف الشخصي ومقارنة تجاربك في ظروف متشابهة.',
    updated: 'رُوجع المحتوى في 19 يوليو 2026',
    back: 'جميع الاختبارات',
    summaryTitle: 'الخلاصة',
    summary:
      'يسترشد تصميم المهام بالأبحاث، لكن Sense6 غير مُعتمدة أو مصدّقة أو تشخيصية، ولا يُقصد بها أن تصبح منتجًا طبيًا.',
    facts: [
      ['تجريبية', 'للفضول والمتعة. لا توجد خطط للحصول على اعتماد أو إجراء تحقق رسمي.'],
      ['مرتبطة بالجهاز', 'يؤثر المتصفح والشاشة ومسار الصوت وطريقة الإدخال والإضاءة والإعداد في كل نتيجة.'],
      ['خاصة', 'تبقى الإجابات والقياسات في متصفحك ما لم تختر تصديرها.'],
      ['غير تشخيصية', 'لا تصف نتيجة Sense6 صحتك أو قدرتك أو ما إذا كان شيء ما طبيعيًا.'],
    ],
    whyTitle: 'لماذا توجد Sense6',
    why: [
      'الإدراك ممتع، ويمكن للتجارب التفاعلية الصغيرة أن تجعل الفروق الخفية أسهل ملاحظة. تحوّل Sense6 هذا الفضول إلى مهام قصيرة قابلة للتكرار من دون حسابات أو متتبعات إعلانية أو درجة شاملة.',
      'الهدف ليس تصنيف الأشخاص، بل وصف تجربة واحدة بعناية وتوفير سياق كافٍ لفهم أثر الإعداد فيها.',
    ],
    howTitle: 'كيف تعمل تجربة في المتصفح',
    how: [
      'تستخدم معظم الأدوات اختيارات قسرية متكررة وصعوبة تكيفية. تتغير المهمة بعد إجاباتك للتركيز قرب الحد الملحوظ في تلك التجربة. تبقى الضوابط وعدم اليقين وحدود القياس منفصلة عن القيمة الرئيسية.',
      'الأجهزة الاستهلاكية ليست أدوات مختبرية. لذلك تتعامل Sense6 مع القيم على أنها مرتبطة بالجهاز والإعداد الحاليين. تكون التجارب المتكررة أكثر فائدة عندما تظل الشاشة ومستوى الصوت وطريقة الإدخال والتصحيح والمسافة والمحيط متشابهة.',
    ],
    experimentsTitle: 'ما الذي تستكشفه كل تجربة — وما الذي لا تستطيع إخبارك به',
    experimentsIntro:
      'لكل أداة سؤال محدود. لا تنتج أي منها تشخيصًا أو اعتمادًا أو ترتيبًا سكانيًا أو درجة شاملة.',
    exploresLabel: 'تستكشف',
    cannotLabel: 'لا تستطيع تحديد',
    experiments: {
      tetracromia: [
        'فروقًا لونية صغيرة قابلة للتكرار على هذه الشاشة عبر ثلاث مهام في المتصفح.',
        'ما إذا كان لديك إبصار رباعي الألوان أو أي شيء عن بيولوجيا الخلايا المخروطية لديك.',
      ],
      'color-blindness': [
        'اتجاهات لونية مرتبطة بالشاشة أثناء تحديد فجوة بين نقاط ذات ضوضاء في السطوع.',
        'ما إذا كان لديك قصور في رؤية الألوان أو كيف سيصنفك اختبار سريري.',
      ],
      riflessi: [
        'توقيت الاستجابة وتكلفة الاختيار والاستقرار ضمن جلسة واحدة بالجهاز وطريقة الإدخال نفسيهما.',
        'ذكاءك أو صحتك العصبية أو أهليتك للقيادة أو ترتيبك بين الناس.',
      ],
      udito: [
        'قابلية السماع النسبية وفروق النغمة عند مستوى الصوت وإعداد الصوت المختارين.',
        'عتبة سمع بوحدة dB HL أو فقدان السمع أو عمر السمع أو جودة سماعات الرأس.',
      ],
      acutezza: [
        'التفاصيل الزاوية وكلفة التباين المنخفض بعد معايرة المتصفح.',
        'حدة البصر السريرية أو رؤية 20/20 أو وصفة طبية أو وجود اللابؤرية.',
      ],
    },
    qualityTitle: 'ما الذي تثبته فحوص الجودة',
    quality: [
      'تغطي الاختبارات الآلية خوارزميات القياس وحدود التخزين والمسارات والصفحات الثابتة وإمكانية الوصول والتصميم المتجاوب والرحلات الكاملة في المتصفح. تُظهر هذه الفحوص أن البرنامج يعمل كما صُمم.',
      'لا تثبت صلاحية علمية أو سريرية. تشرح الأبحاث والمعايير والإرشادات الصحية المرتبطة مصادر الإلهام والحدود؛ وهي لا تؤيد هذا التطبيق أو تتحقق من صلاحيته.',
    ],
    maintainerTitle: 'من يدير Sense6',
    maintainer: [
      'ينشئ {profile} Sense6 ويديرها. وهي مشروع شخصي مستقل يُشغّل من سويسرا، وليست عيادة أو دراسة جامعية أو خدمة اختبارات تجارية.',
    ],
    profileLabel: 'Zeno',
    privacyTitle: 'حدود الخصوصية',
    privacy: [
      'تُعالج الإجابات والقياسات وسجلات اليوميات محليًا. لا تخزن Sense6 سوى إجماليات يومية مجهولة، من دون معرّفات أو مُحيلات أو وكلاء مستخدم أو أوقات دقيقة أو إجابات أو نتائج. اقرأ {privacy} لمعرفة الحدود كاملة.',
    ],
    privacyLabel: 'إشعار الخصوصية',
    changesTitle: 'التصحيحات والتغييرات',
    changes: [
      'قد تتغير المناهج والصياغة مع تطور التجارب. يعني تاريخ مراجعة المحتوى أن الصفحة ومصادرها فُحصت للتأكد من حداثتها؛ ولا يعني موافقة خبير. يمكن إرسال الأسئلة والتصحيحات عبر {profile}.',
    ],
    researchTitle: 'تتبّع المسار البحثي',
    researchIntro: 'تنشر كل تجربة المصادر التي استرشد بها تصميم مهمتها مع حدود تفسيرها الخاصة.',
    openExperiment: 'اقرأ المنهج والمصادر',
  }),
  ja: copy({
    pageTitle: 'Sense6について — ブラウザー知覚実験',
    description:
      'Sense6の知覚実験の方法、運営者、限界を説明します。結果は実験的で、デバイスに依存し、診断には使えません。',
    eyebrow: '概要 / 方法 / 限界',
    title: '丁寧な実験。控えめな主張。',
    intro:
      'Sense6は、ブラウザーで楽しむ独立した知覚実験集です。好奇心や個人的な探究、似た条件で行った自分自身の測定を比べるために作られています。',
    updated: '内容確認日：2026年7月19日',
    back: 'すべてのテスト',
    summaryTitle: '要点',
    summary:
      '研究を課題設計の参考にしていますが、Sense6は検証済み、認証済み、診断用ではなく、医療製品にする予定もありません。',
    facts: [
      ['実験的', '好奇心と楽しみのためのものです。認証や正式な妥当性検証の予定はありません。'],
      ['デバイス依存', 'ブラウザー、画面、音声経路、入力、照明、設定がすべての結果に影響します。'],
      ['非公開', '自分でエクスポートしない限り、回答と測定値はブラウザー内に残ります。'],
      ['診断ではない', 'Sense6の結果は、健康、能力、正常かどうかを示すものではありません。'],
    ],
    whyTitle: 'Sense6を作った理由',
    why: [
      '知覚は興味深く、小さな対話型実験によって見えにくい違いに気づきやすくなります。Sense6はその好奇心を、アカウント、広告トラッカー、総合点のない短く反復可能な課題にします。',
      '人を分類することが目的ではありません。1回の測定を丁寧に記述し、設定が結果にどう影響したかを理解できる文脈を示します。',
    ],
    howTitle: 'ブラウザー実験の仕組み',
    how: [
      '多くの測定では、選択を繰り返し、難易度を適応させます。回答に応じて課題を変え、その測定で観察された境界付近を詳しく調べます。確認項目、不確かさ、測定限界は主な値と分けて扱います。',
      '一般向けデバイスは実験室の測定器ではありません。そのため、Sense6の値は現在のデバイスと設定に依存します。画面、音量、入力方法、矯正、距離、周囲の条件を揃えた反復測定が最も役立ちます。',
    ],
    experimentsTitle: '各実験で分かること、分からないこと',
    experimentsIntro:
      '各測定が扱う問いは限定的です。診断、認証、集団内順位、全体スコアを出すものはありません。',
    exploresLabel: '調べること',
    cannotLabel: '分からないこと',
    experiments: {
      tetracromia: [
        'この画面上で再現できる小さな色差を、3つのブラウザー課題で調べます。',
        '4色型色覚かどうか、または錐体細胞の生物学的特徴。',
      ],
      'color-blindness': [
        '輝度ノイズの点の中から切れ目を探し、画面に依存する色方向を調べます。',
        '色覚特性があるかどうか、または臨床検査での分類。',
      ],
      riflessi: [
        '同じデバイスと入力方法での反応時間、選択コスト、1回の測定内の安定性。',
        '知能、神経学的健康、運転適性、集団内順位。',
      ],
      udito: [
        '選んだ音量と音声設定での相対的な可聴性と音程差。',
        'dB HLの聴覚閾値、難聴、聴覚年齢、ヘッドホンの品質。',
      ],
      acutezza: [
        'ブラウザー較正後の角度細部と低コントラストの影響。',
        '臨床的な視力、20/20視力、処方、乱視の有無。',
      ],
    },
    qualityTitle: '品質確認で証明できること',
    quality: [
      '自動テストは、測定アルゴリズム、保存範囲、ルーティング、静的ページ、アクセシビリティ、レスポンシブ表示、ブラウザー上の一連の操作を確認します。これはソフトウェアが設計どおり動くことを示します。',
      '科学的または臨床的な妥当性を示すものではありません。論文、規格、健康情報へのリンクは設計の参考と限界を説明するもので、この実装を推奨または検証するものではありません。',
    ],
    maintainerTitle: 'Sense6の運営者',
    maintainer: [
      'Sense6は{profile}が制作・運営しています。スイスで運営する独立した個人プロジェクトであり、診療所、大学研究、商用検査サービスではありません。',
    ],
    profileLabel: 'Zeno',
    privacyTitle: 'プライバシーの範囲',
    privacy: [
      '回答、測定値、ジャーナル項目は端末内で処理されます。Sense6が保存するのは匿名の日別合計だけで、識別子、参照元、ユーザーエージェント、正確な時刻、回答、結果は保存しません。詳しくは{privacy}をご覧ください。',
    ],
    privacyLabel: 'プライバシー通知',
    changesTitle: '訂正と変更',
    changes: [
      '実験の発展に伴い、方法や表現は変わることがあります。内容確認日はページと情報源の新しさを確認した日であり、専門家の承認ではありません。質問や訂正は{profile}から送れます。',
    ],
    researchTitle: '研究情報をたどる',
    researchIntro: '各実験は、課題設計の参考にした情報源と、その結果を解釈する際の限界を公開しています。',
    openExperiment: '方法と情報源を読む',
  }),
  ko: copy({
    pageTitle: 'Sense6 소개 — 브라우저 지각 실험',
    description:
      'Sense6 지각 실험의 방법, 운영자, 한계를 설명합니다. 결과는 실험적이고 기기에 따라 달라지며 진단용이 아닙니다.',
    eyebrow: '소개 / 방법 / 한계',
    title: '세심한 실험. 절제된 주장.',
    intro:
      'Sense6는 브라우저에서 즐기는 독립적인 지각 실험 모음입니다. 호기심과 개인적인 탐구, 비슷한 조건에서 수행한 자신의 측정을 비교하기 위해 만들었습니다.',
    updated: '콘텐츠 검토일: 2026년 7월 19일',
    back: '모든 테스트',
    summaryTitle: '요약',
    summary:
      '연구는 과제 설계에 참고되지만 Sense6는 검증, 인증 또는 진단을 위한 것이 아니며 의료 제품이 될 목적도 없습니다.',
    facts: [
      ['실험적', '호기심과 재미를 위한 것입니다. 인증이나 공식적인 타당성 검증 계획은 없습니다.'],
      ['기기 상대적', '브라우저, 화면, 오디오 경로, 입력, 조명, 설정이 모든 결과에 영향을 줍니다.'],
      ['비공개', '직접 내보내지 않는 한 답변과 측정값은 브라우저에 남습니다.'],
      ['비진단적', 'Sense6 결과는 건강, 능력 또는 정상 여부를 나타내지 않습니다.'],
    ],
    whyTitle: 'Sense6가 존재하는 이유',
    why: [
      '지각은 흥미롭고, 작은 대화형 실험은 알아차리기 어려운 차이를 더 잘 드러낼 수 있습니다. Sense6는 그 호기심을 계정, 광고 추적기, 종합 점수 없이 짧고 반복 가능한 과제로 바꿉니다.',
      '사람을 분류하는 것이 목표가 아닙니다. 한 번의 측정을 세심하게 설명하고 설정이 결과에 어떤 영향을 주었는지 이해할 맥락을 제공합니다.',
    ],
    howTitle: '브라우저 실험의 작동 방식',
    how: [
      '대부분의 도구는 반복 선택과 적응형 난이도를 사용합니다. 답변에 따라 과제가 변하면서 해당 측정에서 관찰된 경계 부근을 더 자세히 살핍니다. 확인 항목, 불확실성, 측정 한계는 주요 값과 분리합니다.',
      '일반 소비자용 기기는 실험실 장비가 아닙니다. 따라서 Sense6 값은 현재 기기와 설정에 따라 달라집니다. 화면, 음량, 입력, 교정, 거리, 주변 조건을 비슷하게 유지한 반복 측정이 가장 유용합니다.',
    ],
    experimentsTitle: '각 실험이 살펴보는 것과 알려 줄 수 없는 것',
    experimentsIntro:
      '각 도구는 제한된 질문만 다룹니다. 진단, 인증, 인구 집단 순위 또는 전체 점수를 제공하지 않습니다.',
    exploresLabel: '살펴보는 것',
    cannotLabel: '알 수 없는 것',
    experiments: {
      tetracromia: [
        '이 화면에서 재현 가능한 작은 색 차이를 세 가지 브라우저 과제로 살펴봅니다.',
        '사색형 색각 여부 또는 원추세포의 생물학적 특성.',
      ],
      'color-blindness': [
        '휘도 노이즈 점에서 틈을 찾으며 화면에 상대적인 색 방향을 살펴봅니다.',
        '색각 이상 여부 또는 임상 검사에서의 분류.',
      ],
      riflessi: [
        '같은 기기와 입력 방식에서의 반응 시간, 선택 비용, 한 측정 안의 안정성.',
        '지능, 신경 건강, 운전 적합성 또는 인구 집단 내 순위.',
      ],
      udito: [
        '선택한 음량과 오디오 설정에서의 상대적 가청성과 음높이 차이.',
        'dB HL 청력 역치, 청력 손실, 청력 나이 또는 헤드폰 품질.',
      ],
      acutezza: [
        '브라우저 보정 후의 각도 세부와 낮은 대비 비용.',
        '임상 시력, 20/20 시력, 처방 또는 난시 여부.',
      ],
    },
    qualityTitle: '품질 검사가 증명하는 것',
    quality: [
      '자동 테스트는 측정 알고리즘, 저장 범위, 라우팅, 정적 페이지, 접근성, 반응형 레이아웃, 전체 브라우저 흐름을 확인합니다. 이 검사는 소프트웨어가 설계대로 작동함을 보여 줍니다.',
      '과학적 또는 임상적 타당성을 입증하지는 않습니다. 연결된 논문, 표준, 건강 지침은 설계의 근거와 한계를 설명할 뿐 이 구현을 승인하거나 검증하지 않습니다.',
    ],
    maintainerTitle: 'Sense6 운영자',
    maintainer: [
      'Sense6는 {profile}가 만들고 운영합니다. 스위스에서 운영하는 독립적인 개인 프로젝트이며 병원, 대학 연구 또는 상업 검사 서비스가 아닙니다.',
    ],
    profileLabel: 'Zeno',
    privacyTitle: '개인정보 보호 범위',
    privacy: [
      '답변, 측정값, 저널 항목은 기기에서 처리됩니다. Sense6는 식별자, 참조 페이지, 사용자 에이전트, 정확한 시각, 답변, 결과 없이 익명의 일일 합계만 저장합니다. 전체 범위는 {privacy}에서 확인하세요.',
    ],
    privacyLabel: '개인정보 처리 안내',
    changesTitle: '수정과 변경',
    changes: [
      '실험이 발전하면서 방법과 표현이 바뀔 수 있습니다. 콘텐츠 검토일은 페이지와 출처의 최신성을 확인한 날짜이며 전문가 승인 뜻이 아닙니다. 질문과 수정 제안은 {profile}를 통해 보낼 수 있습니다.',
    ],
    researchTitle: '연구 근거 살펴보기',
    researchIntro: '각 실험은 과제 설계에 참고한 출처와 결과 해석의 구체적인 한계를 공개합니다.',
    openExperiment: '방법과 출처 읽기',
  }),
  hi: copy({
    pageTitle: 'Sense6 के बारे में — ब्राउज़र अनुभूति प्रयोग',
    description: 'Sense6 प्रयोगों की विधि, रखरखाव और सीमाएँ: परिणाम प्रयोगात्मक, डिवाइस-सापेक्ष और गैर-नैदानिक हैं।',
    eyebrow: 'परिचय / विधि / सीमाएँ',
    title: 'सावधानी से किए गए प्रयोग। सीमित दावे।',
    intro:
      'Sense6 ब्राउज़र में किए जाने वाले मनोरंजक अनुभूति प्रयोगों का एक स्वतंत्र संग्रह है। इसे जिज्ञासा, निजी खोज और समान परिस्थितियों में अपने परिणामों की तुलना के लिए बनाया गया है।',
    updated: 'सामग्री की समीक्षा: 19 जुलाई 2026',
    back: 'सभी परीक्षण',
    summaryTitle: 'संक्षेप में',
    summary:
      'शोध कार्यों की बनावट को दिशा देता है, लेकिन Sense6 सत्यापित, प्रमाणित या नैदानिक नहीं है और इसे चिकित्सा उत्पाद बनाने का इरादा नहीं है।',
    facts: [
      ['प्रयोगात्मक', 'जिज्ञासा और मनोरंजन के लिए। प्रमाणन या औपचारिक सत्यापन की कोई योजना नहीं है।'],
      ['डिवाइस-सापेक्ष', 'ब्राउज़र, स्क्रीन, ऑडियो पथ, इनपुट, रोशनी और सेटअप हर परिणाम को प्रभावित करते हैं।'],
      ['निजी', 'जब तक आप निर्यात न करें, उत्तर और माप आपके ब्राउज़र में रहते हैं।'],
      ['गैर-नैदानिक', 'Sense6 का परिणाम स्वास्थ्य, क्षमता या सामान्य होने का बयान नहीं है।'],
    ],
    whyTitle: 'Sense6 क्यों बनाया गया',
    why: [
      'अनुभूति दिलचस्प है, और छोटे संवादात्मक प्रयोग छिपे हुए अंतर को समझना आसान बना सकते हैं। Sense6 इस जिज्ञासा को बिना खाते, विज्ञापन ट्रैकर या एक साझा अंक के छोटे और दोहराए जा सकने वाले कार्यों में बदलता है।',
      'लोगों को वर्गीकृत करना लक्ष्य नहीं है। लक्ष्य एक सत्र का सावधानी से वर्णन करना और यह समझने के लिए पर्याप्त संदर्भ देना है कि सेटअप ने उसे कैसे प्रभावित किया।',
    ],
    howTitle: 'ब्राउज़र प्रयोग कैसे काम करता है',
    how: [
      'अधिकांश उपकरण बार-बार अनिवार्य विकल्प और अनुकूल कठिनाई इस्तेमाल करते हैं। आपके उत्तरों के बाद कार्य बदलता है ताकि उस सत्र में दिखी सीमा के पास अधिक समय दिया जा सके। नियंत्रण, अनिश्चितता और माप की सीमाएँ मुख्य मान से अलग रहती हैं।',
      'उपभोक्ता डिवाइस प्रयोगशाला उपकरण नहीं हैं। इसलिए Sense6 मानों को मौजूदा डिवाइस और सेटअप के सापेक्ष मानता है। दोहराए गए सत्र तब सबसे उपयोगी हैं जब स्क्रीन, आवाज़, इनपुट, सुधार, दूरी और वातावरण समान रहें।',
    ],
    experimentsTitle: 'हर प्रयोग क्या देखता है — और क्या नहीं बता सकता',
    experimentsIntro: 'हर उपकरण एक सीमित प्रश्न पूछता है। कोई भी निदान, प्रमाणन, जनसंख्या रैंक या समग्र अंक नहीं देता।',
    exploresLabel: 'क्या देखता है',
    cannotLabel: 'क्या नहीं बता सकता',
    experiments: {
      tetracromia: [
        'इस स्क्रीन पर तीन ब्राउज़र कार्यों में छोटे, दोहराए जा सकने वाले रंग अंतर।',
        'क्या आपके पास टेट्राक्रोमेसी है या आपकी शंकु कोशिकाओं की जीवविज्ञान।',
      ],
      'color-blindness': [
        'चमक-शोर वाले बिंदुओं में अंतर खोजते समय स्क्रीन-सापेक्ष रंग दिशाएँ।',
        'क्या आपको रंग-दृष्टि की कमी है या नैदानिक परीक्षण आपको कैसे वर्गीकृत करेगा।',
      ],
      riflessi: [
        'एक ही डिवाइस और इनपुट सत्र में प्रतिक्रिया समय, विकल्प लागत और स्थिरता।',
        'आपकी बुद्धि, तंत्रिका स्वास्थ्य, वाहन चलाने की योग्यता या जनसंख्या रैंक।',
      ],
      udito: [
        'चुनी गई आवाज़ और ऑडियो सेटअप पर सापेक्ष श्रव्यता और पिच अंतर।',
        'dB HL में सुनने की सीमा, श्रवण हानि, सुनने की उम्र या हेडफ़ोन की गुणवत्ता।',
      ],
      acutezza: [
        'ब्राउज़र कैलिब्रेशन के बाद कोणीय विवरण और कम-कंट्रास्ट लागत।',
        'नैदानिक दृष्टि तीक्ष्णता, 20/20 दृष्टि, पर्चा या दृष्टिवैषम्य की मौजूदगी।',
      ],
    },
    qualityTitle: 'गुणवत्ता जाँच क्या साबित करती है',
    quality: [
      'स्वचालित परीक्षण माप एल्गोरिदम, भंडारण सीमाएँ, रूटिंग, स्थिर पृष्ठ, सुलभता, उत्तरदायी लेआउट और पूरे ब्राउज़र प्रवाह को जाँचते हैं। ये जाँच दिखाती हैं कि सॉफ़्टवेयर तय डिज़ाइन के अनुसार काम करता है।',
      'वे वैज्ञानिक या नैदानिक वैधता स्थापित नहीं करते। जुड़े शोधपत्र, मानक और स्वास्थ्य मार्गदर्शन डिज़ाइन की प्रेरणा और सीमाएँ समझाते हैं; वे इस कार्यान्वयन का समर्थन या सत्यापन नहीं करते।',
    ],
    maintainerTitle: 'Sense6 का रखरखाव कौन करता है',
    maintainer: [
      'Sense6 को {profile} बनाते और संभालते हैं। यह स्विट्ज़रलैंड में संचालित एक स्वतंत्र निजी परियोजना है, कोई क्लिनिक, विश्वविद्यालय अध्ययन या व्यावसायिक परीक्षण सेवा नहीं।',
    ],
    profileLabel: 'Zeno',
    privacyTitle: 'गोपनीयता की सीमा',
    privacy: [
      'उत्तर, माप और जर्नल प्रविष्टियाँ स्थानीय रूप से संसाधित होती हैं। Sense6 केवल अनाम दैनिक कुल रखता है—कोई पहचानकर्ता, रेफ़रर, यूज़र एजेंट, सटीक समय, उत्तर या परिणाम नहीं। पूरी सीमा के लिए {privacy} पढ़ें।',
    ],
    privacyLabel: 'गोपनीयता सूचना',
    changesTitle: 'सुधार और बदलाव',
    changes: [
      'प्रयोगों के विकसित होने पर विधियाँ और शब्द बदल सकते हैं। सामग्री समीक्षा की तारीख का अर्थ है कि पृष्ठ और स्रोतों की नवीनता जाँची गई; यह विशेषज्ञ स्वीकृति नहीं है। प्रश्न और सुधार {profile} के माध्यम से भेजे जा सकते हैं।',
    ],
    researchTitle: 'शोध की कड़ी देखें',
    researchIntro:
      'हर प्रयोग अपने कार्य को प्रभावित करने वाले स्रोतों और परिणाम की व्याख्या की विशेष सीमाओं को प्रकाशित करता है।',
    openExperiment: 'विधि और स्रोत पढ़ें',
  }),
  'zh-hans': copy({
    pageTitle: '关于 Sense6 — 浏览器感知实验',
    description: '介绍 Sense6 感知实验的方法、维护者和边界：结果仅供实验探索，取决于设备，不能用于诊断。',
    eyebrow: '关于 / 方法 / 边界',
    title: '严谨实验，克制结论。',
    intro:
      'Sense6 是一组独立、有趣的浏览器感知实验，面向好奇心和个人探索，也方便你在相似条件下比较自己的多次结果。',
    updated: '内容复核日期：2026年7月19日',
    back: '所有测试',
    summaryTitle: '简要说明',
    summary: '研究资料为任务设计提供参考，但 Sense6 未经科学验证或认证，不用于诊断，也不打算成为医疗产品。',
    facts: [
      ['实验性质', '只为好奇和乐趣。没有认证或正式有效性验证计划。'],
      ['取决于设备', '浏览器、屏幕、音频路径、输入方式、光线和设置都会影响结果。'],
      ['数据私密', '除非你主动导出，否则回答和测量值只保留在浏览器中。'],
      ['不能诊断', 'Sense6 的结果不能说明健康、能力或某项表现是否正常。'],
    ],
    whyTitle: '为什么制作 Sense6',
    why: [
      '感知很有意思，小型互动实验能让难以察觉的差异变得更清楚。Sense6 把这种好奇转化为简短、可重复的任务，不需要账号，不使用广告跟踪，也不给出统一总分。',
      '目的不是给人分类，而是谨慎描述一次实验，并提供足够背景，帮助你理解设备和设置如何影响结果。',
    ],
    howTitle: '浏览器实验如何工作',
    how: [
      '大多数工具采用重复选择和自适应难度。任务会根据回答变化，把更多测量集中在本次实验观察到的边界附近。控制项、不确定性和测量上下限会与主要数值分开呈现。',
      '消费级设备不是实验室仪器，因此 Sense6 的数值只相对于当前设备和设置。重复实验时，尽量保持屏幕、音量、输入方式、矫正状态、距离和周围环境一致。',
    ],
    experimentsTitle: '每项实验探索什么，又不能说明什么',
    experimentsIntro: '每种工具只回答一个有限的问题。它们都不会给出诊断、认证、人群排名或整套实验的总分。',
    exploresLabel: '探索内容',
    cannotLabel: '不能说明',
    experiments: {
      tetracromia: [
        '通过三项浏览器任务，探索此屏幕上可重复的小幅颜色差异。',
        '你是否具有四色视觉，也不能说明视锥细胞的生物学特征。',
      ],
      'color-blindness': [
        '在亮度噪声点中寻找缺口时，探索相对于屏幕的颜色方向。',
        '你是否存在色觉缺陷，也不能替代临床测试的分类。',
      ],
      riflessi: [
        '在同一设备和输入方式下，探索反应时间、选择成本和一次实验内的稳定性。',
        '智力、神经健康、驾驶能力或在人群中的排名。',
      ],
      udito: [
        '在选定音量和音频设置下，探索相对可听范围和音高差异。',
        '以 dB HL 表示的听阈、听力损失、听觉年龄或耳机质量。',
      ],
      acutezza: ['浏览器校准后的角度细节和低对比度代价。', '临床视力、20/20 视力、处方或是否存在散光。'],
    },
    qualityTitle: '质量检查能证明什么',
    quality: [
      '自动化测试覆盖测量算法、存储边界、路由、静态页面、无障碍、响应式布局和完整浏览器流程。这些检查表明软件按设计运行。',
      '它们不能建立科学或临床有效性。链接的论文、标准和健康指南只用于解释设计参考和局限，并不认可或验证此实现。',
    ],
    maintainerTitle: '谁在维护 Sense6',
    maintainer: [
      'Sense6 由 {profile} 创建和维护。这是在瑞士运营的独立个人项目，不是诊所、大学研究或商业检测服务。',
    ],
    profileLabel: 'Zeno',
    privacyTitle: '隐私边界',
    privacy: [
      '回答、测量值和日志条目都在本地处理。Sense6 只保存匿名的每日总数，不保存标识符、来源页面、用户代理、精确时间、回答或结果。完整说明请阅读{privacy}。',
    ],
    privacyLabel: '隐私声明',
    changesTitle: '修正和变更',
    changes: [
      '随着实验演进，方法和措辞可能改变。内容复核日期表示页面和资料来源已检查时效性，并不代表专家批准。问题和修正建议可通过 {profile} 提交。',
    ],
    researchTitle: '查看研究依据',
    researchIntro: '每项实验都会公开影响任务设计的资料来源，以及解读结果时的具体限制。',
    openExperiment: '阅读方法和资料来源',
  }),
});

export function renderAbout(context) {
  const { app, locale, localeHref } = context;
  if (!app.querySelector(`:scope > [data-sense6-view="about"][data-sense6-locale="${locale}"]`)) {
    app.innerHTML = aboutMarkup(locale, localeHref);
  }
  return () => {};
}

/** @param {string} locale */
export function aboutCopy(locale) {
  return ABOUT_COPY[locale] ?? ABOUT_COPY.en;
}

/** @param {string} locale @param {(route: string) => string} [hrefFor] */
export function aboutMarkup(locale, hrefFor = (route) => `/${locale}/${route ? `${route}/` : ''}`) {
  const page = aboutCopy(locale);
  return `<article class="about-view ui-container ui-container--wide" data-sense6-view="about" data-sense6-locale="${locale}">
    <a class="back-link about-view__back" data-sense6-route="" href="${escapeAttribute(hrefFor(''))}"><span aria-hidden="true">←</span> ${escapeHtml(page.back)}</a>
    <header class="about-hero">
      <div><p class="ui-eyebrow">${escapeHtml(page.eyebrow)}</p><h1>${escapeHtml(page.title)}</h1><p class="about-hero__lede">${escapeHtml(page.intro)}</p><p class="about-hero__updated">${escapeHtml(page.updated)}</p></div>
      <div class="about-hero__instrument">
        <div class="about-orbit" aria-hidden="true"><span>S6</span>${Array.from({ length: 6 }, (_, index) => `<i style="--signal:${index}"></i>`).join('')}</div>
        <aside class="about-summary" aria-labelledby="about-summary-title"><span aria-hidden="true">S6</span><div><h2 id="about-summary-title">${escapeHtml(page.summaryTitle)}</h2><p>${escapeHtml(page.summary)}</p></div></aside>
      </div>
    </header>
    <div class="about-signal" aria-hidden="true">${EXAMS.map((exam, index) => `<span style="--experiment-accent:${escapeAttribute(exam.accent)};--position:${index}"><i>${escapeHtml(exam.glyph)}</i></span>`).join('')}</div>
    <section class="about-facts" aria-label="${escapeAttribute(page.summaryTitle)}">${page.facts
      .map(
        ([title, body]) =>
          `<article class="ui-card"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></article>`,
      )
      .join('')}</section>
    <div class="about-sections">
      ${sectionMarkup('01', page.whyTitle, page.why, page, hrefFor)}
      ${sectionMarkup('02', page.howTitle, page.how, page, hrefFor)}
      <section class="about-section" aria-labelledby="about-experiments-title"><span class="about-section__number" aria-hidden="true">03</span><div><h2 id="about-experiments-title">${escapeHtml(page.experimentsTitle)}</h2><p>${escapeHtml(page.experimentsIntro)}</p><div class="about-experiments">${EXAMS.map(
        (exam) => experimentMarkup(exam, page, hrefFor),
      ).join('')}</div></div></section>
      ${sectionMarkup('04', page.qualityTitle, page.quality, page, hrefFor)}
      ${sectionMarkup('05', page.maintainerTitle, page.maintainer, page, hrefFor)}
      ${sectionMarkup('06', page.privacyTitle, page.privacy, page, hrefFor)}
      ${sectionMarkup('07', page.changesTitle, page.changes, page, hrefFor)}
      <section class="about-section" aria-labelledby="about-research-title"><span class="about-section__number" aria-hidden="true">08</span><div><h2 id="about-research-title">${escapeHtml(page.researchTitle)}</h2><p>${escapeHtml(page.researchIntro)}</p><ul class="about-research">${EXAMS.map(
        (exam) =>
          `<li><a data-sense6-route="${escapeAttribute(exam.route)}" href="${escapeAttribute(hrefFor(exam.route))}"><strong>${escapeHtml(exam.name)}</strong><span>${escapeHtml(page.openExperiment)} →</span></a></li>`,
      ).join('')}</ul></div></section>
    </div>
  </article>`;
}

function sectionMarkup(number, title, paragraphs, page, hrefFor) {
  return `<section class="about-section" aria-labelledby="about-section-${number}"><span class="about-section__number" aria-hidden="true">${number}</span><div><h2 id="about-section-${number}">${escapeHtml(title)}</h2>${paragraphs
    .map((paragraph) => `<p>${aboutHtml(paragraph, page, hrefFor)}</p>`)
    .join('')}</div></section>`;
}

function experimentMarkup(exam, page, hrefFor) {
  const boundary = page.experiments[exam.id];
  return `<article class="about-experiment ui-card" style="--experiment-accent:${escapeAttribute(exam.accent)}"><div class="about-experiment__signal" aria-hidden="true"><span>${escapeHtml(exam.glyph)}</span><i></i></div><div class="about-experiment__copy"><h3><a data-sense6-route="${escapeAttribute(exam.route)}" href="${escapeAttribute(hrefFor(exam.route))}">${escapeHtml(exam.name)}</a></h3><dl><div><dt>${escapeHtml(page.exploresLabel)}</dt><dd>${escapeHtml(boundary[0])}</dd></div><div><dt>${escapeHtml(page.cannotLabel)}</dt><dd>${escapeHtml(boundary[1])}</dd></div></dl></div></article>`;
}

function aboutHtml(text, page, hrefFor) {
  const links = {
    profile: `<a href="https://personal.brontolotto.observer" rel="author">${escapeHtml(page.profileLabel)}</a>`,
    privacy: `<a data-sense6-route="privacy" href="${escapeAttribute(hrefFor('privacy'))}">${escapeHtml(page.privacyLabel)}</a>`,
  };
  return Object.entries(links).reduce(
    (output, [name, link]) => output.replaceAll(`{${name}}`, link),
    escapeHtml(text),
  );
}

function copy(value) {
  return Object.freeze({
    ...value,
    facts: Object.freeze(value.facts.map((fact) => Object.freeze(fact))),
    why: Object.freeze(value.why),
    how: Object.freeze(value.how),
    experiments: Object.freeze(
      Object.fromEntries(
        Object.entries(value.experiments).map(([id, boundary]) => [id, Object.freeze(boundary)]),
      ),
    ),
    quality: Object.freeze(value.quality),
    maintainer: Object.freeze(value.maintainer),
    privacy: Object.freeze(value.privacy),
    changes: Object.freeze(value.changes),
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('\n', ' ');
}
