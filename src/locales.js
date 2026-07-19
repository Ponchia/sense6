export const LOCALES = Object.freeze([
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'it', label: 'Italiano', short: 'IT' },
  { code: 'de', label: 'Deutsch', short: 'DE' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'pt', label: 'Português', short: 'PT' },
]);

export const DEFAULT_LOCALE = 'en';
export const LOCALE_CODES = new Set(LOCALES.map((locale) => locale.code));

const rows = [];

function message(en, it, de, fr, es, pt) {
  rows.push({ en, it, de, fr, es, pt });
}

// Shared shell and gallery.
message(
  'Skip to content',
  'Vai al contenuto',
  'Zum Inhalt springen',
  'Aller au contenu',
  'Ir al contenido',
  'Ir para o conteúdo',
);
message(
  'Sense6 — all tests',
  'Sense6 — tutti i test',
  'Sense6 — alle Tests',
  'Sense6 — tous les tests',
  'Sense6 — todas las pruebas',
  'Sense6 — todos os testes',
);
message(
  'Checking display…',
  'Verifica dello schermo…',
  'Bildschirm wird geprüft…',
  'Vérification de l’écran…',
  'Comprobando la pantalla…',
  'A verificar o ecrã…',
);
message('P3 reported', 'P3 rilevato', 'P3 erkannt', 'P3 détecté', 'P3 detectado', 'P3 detetado');
message('sRGB reported', 'sRGB rilevato', 'sRGB erkannt', 'sRGB détecté', 'sRGB detectado', 'sRGB detetado');
message(
  'Color gamut unknown',
  'Gamma cromatica sconosciuta',
  'Farbraum unbekannt',
  'Gamme de couleurs inconnue',
  'Gama de color desconocida',
  'Gama de cores desconhecida',
);
message(
  'Toggle light and dark theme',
  'Alterna tema chiaro e scuro',
  'Helles und dunkles Design wechseln',
  'Basculer entre les thèmes clair et sombre',
  'Cambiar entre tema claro y oscuro',
  'Alternar entre tema claro e escuro',
);
message('Theme', 'Tema', 'Design', 'Thème', 'Tema', 'Tema');
message('Language', 'Lingua', 'Sprache', 'Langue', 'Idioma', 'Idioma');
message(
  'Perception lab',
  'Laboratorio della percezione',
  'Wahrnehmungslabor',
  'Laboratoire de perception',
  'Laboratorio de percepción',
  'Laboratório de perceção',
);
message(
  'Measure carefully. Keep it private.',
  'Misura con cura. Mantieni tutto privato.',
  'Sorgfältig messen. Privat bleiben.',
  'Mesurez avec soin. Gardez vos données privées.',
  'Mide con cuidado. Mantén tus datos privados.',
  'Meça com cuidado. Mantenha tudo privado.',
);
message('All tests', 'Tutti i test', 'Alle Tests', 'Tous les tests', 'Todas las pruebas', 'Todos os testes');
message('Source', 'Codice sorgente', 'Quellcode', 'Code source', 'Código fuente', 'Código-fonte');
message(
  'Sense6 — measure what your senses notice',
  'Sense6 — misura ciò che i tuoi sensi percepiscono',
  'Sense6 — messen, was Ihre Sinne wahrnehmen',
  'Sense6 — mesurez ce que vos sens perçoivent',
  'Sense6 — mide lo que perciben tus sentidos',
  'Sense6 — meça o que os seus sentidos percebem',
);
message(
  'Sense6 / private perception lab',
  'Sense6 / laboratorio privato della percezione',
  'Sense6 / privates Wahrnehmungslabor',
  'Sense6 / laboratoire privé de perception',
  'Sense6 / laboratorio privado de percepción',
  'Sense6 / laboratório privado de perceção',
);
message(
  'Measure what your',
  'Misura ciò che i tuoi',
  'Messen, was Ihre',
  'Mesurez ce que vos',
  'Mide lo que tus',
  'Meça o que os seus',
);
message(
  'senses notice.',
  'sensi percepiscono.',
  'Sinne wahrnehmen.',
  'sens perçoivent.',
  'sentidos perciben.',
  'sentidos percebem.',
);
message(
  'Short, careful tests that turn what you notice into honest, device-relative results.',
  'Test brevi e accurati che trasformano ciò che percepisci in risultati onesti e relativi al dispositivo.',
  'Kurze, sorgfältige Tests machen Ihre Wahrnehmung als ehrliche, gerätebezogene Ergebnisse sichtbar.',
  'Des tests courts et rigoureux transforment vos perceptions en résultats honnêtes, liés à votre appareil.',
  'Pruebas breves y cuidadosas convierten lo que percibes en resultados honestos y relativos al dispositivo.',
  'Testes breves e cuidadosos transformam o que percebe em resultados honestos e relativos ao dispositivo.',
);
message(
  'No account, no upload, no diagnosis theatre.',
  'Nessun account, nessun caricamento, nessuna finta diagnosi.',
  'Kein Konto, kein Upload, keine Scheindiagnose.',
  'Aucun compte, aucun envoi, aucune mise en scène diagnostique.',
  'Sin cuenta, sin envíos y sin teatro diagnóstico.',
  'Sem conta, sem envios e sem teatro de diagnóstico.',
);
message('Try Udito', 'Prova Udito', 'Udito starten', 'Essayer Udito', 'Probar Udito', 'Experimentar Udito');
message(
  'Explore all four tests',
  'Esplora tutti e quattro i test',
  'Alle vier Tests ansehen',
  'Explorer les quatre tests',
  'Explorar las cuatro pruebas',
  'Explorar os quatro testes',
);
message(
  'Live now',
  'Disponibili ora',
  'Jetzt verfügbar',
  'Disponibles',
  'Disponibles ahora',
  'Disponíveis agora',
);
message('tests', 'test', 'Tests', 'tests', 'pruebas', 'testes');
message('Time for all', 'Tempo totale', 'Gesamtdauer', 'Durée totale', 'Tiempo total', 'Tempo total');
message(
  'Data uploaded',
  'Dati caricati',
  'Hochgeladene Daten',
  'Données envoyées',
  'Datos enviados',
  'Dados enviados',
);
message('None', 'Nessuno', 'Keine', 'Aucune', 'Ninguno', 'Nenhum');
message('Live signal', 'Segnale attivo', 'Live-Signal', 'Signal actif', 'Señal activa', 'Sinal ativo');
message(
  'Device relative',
  'Relativo al dispositivo',
  'Gerätebezogen',
  'Lié à l’appareil',
  'Relativo al dispositivo',
  'Relativo ao dispositivo',
);
message(
  'device relative',
  'relativo al dispositivo',
  'gerätebezogen',
  'lié à l’appareil',
  'relativo al dispositivo',
  'relativo ao dispositivo',
);
message('Colour', 'Colore', 'Farbe', 'Couleur', 'Color', 'Cor');
message('Hearing', 'Udito', 'Hören', 'Audition', 'Audición', 'Audição');
message('Threshold', 'Soglia', 'Schwelle', 'Seuil', 'Umbral', 'Limiar');
message('Pattern', 'Schema', 'Muster', 'Motif', 'Patrón', 'Padrão');
message('Profile', 'Profilo', 'Profil', 'Profil', 'Perfil', 'Perfil');
message(
  'Ready now / choose a test',
  'Disponibili ora / scegli un test',
  'Jetzt bereit / Test auswählen',
  'Disponibles / choisissez un test',
  'Disponibles / elige una prueba',
  'Disponíveis / escolha um teste',
);
message(
  'Start with what you want to learn.',
  'Inizia da ciò che vuoi scoprire.',
  'Beginnen Sie mit dem, was Sie erfahren möchten.',
  'Commencez par ce que vous souhaitez découvrir.',
  'Empieza por lo que quieres descubrir.',
  'Comece pelo que deseja descobrir.',
);
message(
  'Each test explains its limits before you begin and gives you a result you can actually interpret afterwards.',
  'Ogni test spiega i propri limiti prima di iniziare e offre un risultato che puoi interpretare davvero.',
  'Jeder Test erklärt vorab seine Grenzen und liefert anschließend ein verständliches Ergebnis.',
  'Chaque test explique ses limites avant de commencer et fournit ensuite un résultat réellement interprétable.',
  'Cada prueba explica sus límites antes de empezar y ofrece un resultado que puedes interpretar.',
  'Cada teste explica os seus limites antes de começar e apresenta um resultado que pode interpretar.',
);
message(
  'Next in the lab',
  'Prossimamente nel laboratorio',
  'Als Nächstes im Labor',
  'Bientôt au laboratoire',
  'Próximamente en el laboratorio',
  'A seguir no laboratório',
);
message(
  'More senses, same standard.',
  'Altri sensi, lo stesso rigore.',
  'Mehr Sinne, derselbe Anspruch.',
  'Plus de sens, la même exigence.',
  'Más sentidos, el mismo rigor.',
  'Mais sentidos, o mesmo rigor.',
);
message(
  'In development — visible here as direction, not as something you can start yet.',
  'In sviluppo: qui indica la direzione, ma non è ancora possibile iniziare.',
  'In Entwicklung — hier als Ausblick sichtbar, aber noch nicht startbereit.',
  'En développement — présenté comme orientation, mais pas encore disponible.',
  'En desarrollo: se muestra como orientación, pero aún no se puede iniciar.',
  'Em desenvolvimento — apresentado como direção, mas ainda não disponível.',
);
message(
  'Calibrated sharpness & meridional clarity',
  'Nitidezza calibrata e chiarezza meridionale',
  'Kalibrierte Sehschärfe und meridionale Klarheit',
  'Netteté calibrée et clarté méridienne',
  'Nitidez calibrada y claridad meridional',
  'Nitidez calibrada e clareza meridional',
);
message(
  'Useful because the limits are visible',
  'Utile perché i limiti sono visibili',
  'Nützlich, weil die Grenzen sichtbar sind',
  'Utile parce que les limites sont visibles',
  'Útil porque los límites son visibles',
  'Útil porque os limites são visíveis',
);
message(
  'Careful by construction.',
  'Accurato per progettazione.',
  'Von Grund auf sorgfältig.',
  'Rigoureux par conception.',
  'Riguroso por diseño.',
  'Rigoroso desde a conceção.',
);
message(
  'Private in practice',
  'Privato nella pratica',
  'Praktisch privat',
  'Privé en pratique',
  'Privado en la práctica',
  'Privado na prática',
);
message(
  'Your session stays in this browser. There is no account and nothing is uploaded.',
  'La sessione rimane in questo browser. Non serve un account e nulla viene caricato.',
  'Ihre Sitzung bleibt in diesem Browser. Es gibt kein Konto und nichts wird hochgeladen.',
  'Votre session reste dans ce navigateur. Aucun compte et aucun envoi.',
  'Tu sesión permanece en este navegador. No hay cuenta y no se envía nada.',
  'A sua sessão fica neste navegador. Não há conta e nada é enviado.',
);
message(
  'Honest about hardware',
  'Onesto sull’hardware',
  'Ehrlich zur Hardware',
  'Transparent sur le matériel',
  'Honesto sobre el hardware',
  'Honesto sobre o equipamento',
);
message(
  'Your screen, audio hardware, room and attention affect results. Every test exposes its setup limits.',
  'Schermo, hardware audio, ambiente e attenzione influenzano i risultati. Ogni test mostra i limiti della configurazione.',
  'Bildschirm, Audiogeräte, Raum und Aufmerksamkeit beeinflussen die Ergebnisse. Jeder Test zeigt seine Einrichtungsgrenzen.',
  'Écran, matériel audio, environnement et attention influencent les résultats. Chaque test expose les limites de l’installation.',
  'Pantalla, equipo de audio, entorno y atención afectan los resultados. Cada prueba muestra los límites de la configuración.',
  'Ecrã, equipamento áudio, ambiente e atenção afetam os resultados. Cada teste mostra os limites da configuração.',
);
message(
  'Insight, not a label',
  'Informazione, non un’etichetta',
  'Erkenntnis statt Etikett',
  'Un éclairage, pas une étiquette',
  'Información, no una etiqueta',
  'Informação, não um rótulo',
);
message(
  'Results describe this run and this setup. They never pretend to replace calibrated clinical work.',
  'I risultati descrivono questa sessione e questa configurazione. Non sostituiscono mai una valutazione clinica calibrata.',
  'Die Ergebnisse beschreiben diesen Durchlauf und diese Einrichtung. Sie ersetzen niemals kalibrierte klinische Verfahren.',
  'Les résultats décrivent cette session et cette installation. Ils ne remplacent jamais un examen clinique étalonné.',
  'Los resultados describen esta sesión y esta configuración. Nunca sustituyen una evaluación clínica calibrada.',
  'Os resultados descrevem esta sessão e esta configuração. Nunca substituem uma avaliação clínica calibrada.',
);
message('Open test', 'Apri il test', 'Test öffnen', 'Ouvrir le test', 'Abrir la prueba', 'Abrir o teste');
message(
  'What this test includes',
  'Contenuto del test',
  'Inhalt dieses Tests',
  'Contenu du test',
  'Contenido de la prueba',
  'Conteúdo do teste',
);

// Gallery cards.
message(
  'How finely do you see colour?',
  'Quanto finemente distingui i colori?',
  'Wie fein unterscheiden Sie Farben?',
  'Avec quelle finesse distinguez-vous les couleurs ?',
  '¿Con qué precisión distingues los colores?',
  'Com que precisão distingue as cores?',
);
message(
  'An adaptive colour-discrimination lab: three instruments measure the smallest hue steps you can resolve on this screen.',
  'Un laboratorio adattivo di discriminazione cromatica: tre strumenti misurano i più piccoli intervalli di tonalità distinguibili su questo schermo.',
  'Ein adaptives Farbdiskriminationslabor: Drei Instrumente messen die kleinsten auf diesem Bildschirm erkennbaren Farbtonschritte.',
  'Un laboratoire adaptatif de discrimination des couleurs : trois instruments mesurent les plus petits écarts de teinte visibles sur cet écran.',
  'Un laboratorio adaptativo de discriminación del color: tres instrumentos miden los menores cambios de tono visibles en esta pantalla.',
  'Um laboratório adaptativo de discriminação de cores: três instrumentos medem os menores intervalos de matiz visíveis neste ecrã.',
);
message(
  'Colour discrimination',
  'Discriminazione cromatica',
  'Farbdiskrimination',
  'Discrimination des couleurs',
  'Discriminación del color',
  'Discriminação de cores',
);
message(
  'Adaptive difficulty',
  'Difficoltà adattiva',
  'Adaptive Schwierigkeit',
  'Difficulté adaptative',
  'Dificultad adaptativa',
  'Dificuldade adaptativa',
);
message(
  'Detailed profile',
  'Profilo dettagliato',
  'Detailliertes Profil',
  'Profil détaillé',
  'Perfil detallado',
  'Perfil detalhado',
);
message(
  'Adaptive browser colour-vision experiment',
  'Esperimento adattivo di visione cromatica nel browser',
  'Adaptives Browserexperiment zum Farbsehen',
  'Expérience adaptative de vision des couleurs dans le navigateur',
  'Experimento adaptativo de visión cromática en el navegador',
  'Experiência adaptativa de visão cromática no navegador',
);
message(
  'Find a gap hidden in luminance-noise dots while three display-relative colour directions adapt independently.',
  'Trova un’apertura nascosta tra punti con rumore di luminanza mentre tre direzioni cromatiche relative allo schermo si adattano in modo indipendente.',
  'Finden Sie eine Lücke in Punkten mit Luminanzrauschen, während sich drei bildschirmbezogene Farbrichtungen unabhängig anpassen.',
  'Repérez une ouverture parmi des points au bruit de luminance tandis que trois directions chromatiques liées à l’écran s’adaptent séparément.',
  'Encuentra una abertura oculta entre puntos con ruido de luminancia mientras tres direcciones cromáticas relativas a la pantalla se adaptan por separado.',
  'Encontre uma abertura entre pontos com ruído de luminância enquanto três direções cromáticas relativas ao ecrã se adaptam separadamente.',
);
message(
  'Colour-vision experiment',
  'Esperimento di visione cromatica',
  'Farbsehexperiment',
  'Expérience de vision des couleurs',
  'Experimento de visión cromática',
  'Experiência de visão cromática',
);
message(
  'Adaptive thresholds',
  'Soglie adattive',
  'Adaptive Schwellen',
  'Seuils adaptatifs',
  'Umbrales adaptativos',
  'Limiares adaptativos',
);
message(
  '3 display directions',
  '3 direzioni dello schermo',
  '3 Bildschirmrichtungen',
  '3 directions d’écran',
  '3 direcciones de pantalla',
  '3 direções do ecrã',
);
message(
  'Run-relative result',
  'Risultato relativo alla sessione',
  'Laufbezogenes Ergebnis',
  'Résultat lié à la session',
  'Resultado relativo a la sesión',
  'Resultado relativo à sessão',
);
message(
  'Response speed, choice cost & consistency',
  'Velocità di risposta, costo della scelta e costanza',
  'Reaktionsgeschwindigkeit, Wahlkosten und Konstanz',
  'Vitesse de réponse, coût du choix et régularité',
  'Velocidad de respuesta, coste de elección y constancia',
  'Velocidade de resposta, custo da escolha e consistência',
);
message(
  'Three short instruments separate a simple visual response from decision cost and within-run stability.',
  'Tre brevi strumenti separano la risposta visiva semplice dal costo decisionale e dalla stabilità nella sessione.',
  'Drei kurze Instrumente trennen einfache visuelle Reaktion, Entscheidungskosten und Stabilität innerhalb des Laufs.',
  'Trois instruments courts séparent la réponse visuelle simple, le coût de décision et la stabilité pendant la session.',
  'Tres instrumentos breves separan la respuesta visual simple, el coste de decisión y la estabilidad durante la sesión.',
  'Três instrumentos breves separam a resposta visual simples, o custo da decisão e a estabilidade durante a sessão.',
);
message(
  'Response timing',
  'Tempi di risposta',
  'Reaktionszeit',
  'Temps de réponse',
  'Tiempo de respuesta',
  'Tempo de resposta',
);
message(
  'Device-relative timing',
  'Tempi relativi al dispositivo',
  'Gerätebezogene Zeitmessung',
  'Mesure liée à l’appareil',
  'Medición relativa al dispositivo',
  'Medição relativa ao dispositivo',
);
message(
  'No composite score',
  'Nessun punteggio composito',
  'Kein Gesamtwert',
  'Aucun score composite',
  'Sin puntuación compuesta',
  'Sem pontuação composta',
);
message(
  'Headphone confidence, audibility & pitch',
  'Affidabilità delle cuffie, udibilità e intonazione',
  'Kopfhörer-Konfidenz, Hörbarkeit und Tonhöhe',
  'Confiance casque, audibilité et hauteur',
  'Confianza en auriculares, audibilidad y tono',
  'Confiança nos auscultadores, audibilidade e altura',
);
message(
  'Three listening instruments map this setup without pretending an uncalibrated browser is an audiometer.',
  'Tre strumenti di ascolto descrivono questa configurazione senza fingere che un browser non calibrato sia un audiometro.',
  'Drei Hörinstrumente erfassen diese Einrichtung, ohne einen unkalibrierten Browser als Audiometer auszugeben.',
  'Trois instruments d’écoute décrivent cette installation sans faire passer un navigateur non étalonné pour un audiomètre.',
  'Tres instrumentos auditivos describen esta configuración sin fingir que un navegador sin calibrar sea un audiómetro.',
  'Três instrumentos auditivos descrevem esta configuração sem fingir que um navegador não calibrado é um audiómetro.',
);
message(
  'Listening experiment',
  'Esperimento di ascolto',
  'Hörexperiment',
  'Expérience d’écoute',
  'Experimento auditivo',
  'Experiência auditiva',
);
message(
  'Volume safety contract',
  'Accordo sul volume sicuro',
  'Sicherheitsvereinbarung zur Lautstärke',
  'Contrat de volume sûr',
  'Compromiso de volumen seguro',
  'Acordo de volume seguro',
);
message(
  'No hearing label',
  'Nessuna etichetta uditiva',
  'Keine Hörbewertung',
  'Aucune étiquette auditive',
  'Sin etiqueta auditiva',
  'Sem rótulo auditivo',
);
message('3 instruments', '3 strumenti', '3 Instrumente', '3 instruments', '3 instrumentos', '3 instrumentos');

// Udito.
message(
  'Listening lab / three instruments / about 6 minutes',
  'Laboratorio di ascolto / tre strumenti / circa 6 minuti',
  'Hörlabor / drei Instrumente / etwa 6 Minuten',
  'Laboratoire d’écoute / trois instruments / environ 6 minutes',
  'Laboratorio auditivo / tres instrumentos / unos 6 minutos',
  'Laboratório auditivo / três instrumentos / cerca de 6 minutos',
);
message(
  'Listen for the boundary.',
  'Ascolta il limite.',
  'Hören Sie auf die Grenze.',
  'Écoutez la limite.',
  'Escucha el límite.',
  'Escute o limite.',
);
message(
  'Keep the limits audible.',
  'Rendi udibili i limiti.',
  'Grenzen hörbar halten.',
  'Gardez les limites audibles.',
  'Mantén audibles los límites.',
  'Mantenha os limites audíveis.',
);
message(
  'Udito checks headphone-like presentation, maps an upper audibility boundary, and estimates pitch discrimination at two frequencies. Every result belongs to this device, volume, room, and run.',
  'Udito verifica una presentazione compatibile con le cuffie, individua un limite superiore di udibilità e stima la discriminazione dell’intonazione a due frequenze. Ogni risultato appartiene a questo dispositivo, volume, ambiente e sessione.',
  'Udito prüft eine kopfhörerähnliche Wiedergabe, erfasst eine obere Hörbarkeitsgrenze und schätzt die Tonhöhenunterscheidung bei zwei Frequenzen. Jedes Ergebnis gehört zu diesem Gerät, dieser Lautstärke, diesem Raum und diesem Durchlauf.',
  'Udito vérifie une présentation compatible avec un casque, repère une limite supérieure d’audibilité et estime la discrimination de hauteur à deux fréquences. Chaque résultat dépend de cet appareil, de ce volume, de cette pièce et de cette session.',
  'Udito comprueba una presentación similar a auriculares, traza un límite superior de audibilidad y estima la discriminación de tono en dos frecuencias. Cada resultado pertenece a este dispositivo, volumen, entorno y sesión.',
  'O Udito verifica uma apresentação semelhante a auscultadores, determina um limite superior de audibilidade e estima a discriminação de altura em duas frequências. Cada resultado pertence a este dispositivo, volume, ambiente e sessão.',
);
message(
  'Prepare the sound lab',
  'Prepara il laboratorio audio',
  'Hörlabor vorbereiten',
  'Préparer le laboratoire sonore',
  'Preparar el laboratorio auditivo',
  'Preparar o laboratório auditivo',
);
message(
  'See the method',
  'Vedi il metodo',
  'Methode ansehen',
  'Voir la méthode',
  'Ver el método',
  'Ver o método',
);
message(
  'No dB HL, hearing age, diagnosis, or population score.',
  'Nessun dB HL, età uditiva, diagnosi o punteggio di popolazione.',
  'Keine dB HL, kein Höralter, keine Diagnose und kein Bevölkerungswert.',
  'Aucun dB HL, âge auditif, diagnostic ou score de population.',
  'Sin dB HL, edad auditiva, diagnóstico ni puntuación poblacional.',
  'Sem dB HL, idade auditiva, diagnóstico ou pontuação populacional.',
);
message('Output', 'Uscita', 'Ausgabe', 'Sortie', 'Salida', 'Saída');
message(
  'Method and limits',
  'Metodo e limiti',
  'Methode und Grenzen',
  'Méthode et limites',
  'Método y límites',
  'Método e limites',
);
message(
  'Three questions. No synthetic score.',
  'Tre domande. Nessun punteggio sintetico.',
  'Drei Fragen. Kein Gesamtwert.',
  'Trois questions. Aucun score global.',
  'Tres preguntas. Sin puntuación global.',
  'Três perguntas. Sem pontuação global.',
);
message(
  'The instruments stay separate because confidence in the setup is not the same thing as audibility or pitch discrimination.',
  'Gli strumenti restano separati perché l’affidabilità della configurazione non equivale all’udibilità o alla discriminazione dell’intonazione.',
  'Die Instrumente bleiben getrennt, weil Vertrauen in die Einrichtung nicht dasselbe ist wie Hörbarkeit oder Tonhöhenunterscheidung.',
  'Les instruments restent séparés car la confiance dans l’installation n’est pas l’audibilité ni la discrimination de hauteur.',
  'Los instrumentos permanecen separados porque la confianza en la configuración no equivale a audibilidad o discriminación de tono.',
  'Os instrumentos permanecem separados porque a confiança na configuração não equivale à audibilidade ou à discriminação de altura.',
);
message(
  'Headphone confidence',
  'Affidabilità delle cuffie',
  'Kopfhörer-Konfidenz',
  'Confiance casque',
  'Confianza en auriculares',
  'Confiança nos auscultadores',
);
message(
  'Upper audibility boundary',
  'Limite superiore di udibilità',
  'Obere Hörbarkeitsgrenze',
  'Limite supérieure d’audibilité',
  'Límite superior de audibilidad',
  'Limite superior de audibilidade',
);
message(
  'Pitch discrimination',
  'Discriminazione dell’intonazione',
  'Tonhöhenunterscheidung',
  'Discrimination de hauteur',
  'Discriminación de tono',
  'Discriminação de altura',
);
message(
  'Which tone is quietest?',
  'Quale tono è più debole?',
  'Welcher Ton ist am leisesten?',
  'Quel son est le plus faible ?',
  '¿Qué tono es más bajo?',
  'Qual é o tom mais baixo?',
);
message(
  'Which interval contains the tone?',
  'Quale intervallo contiene il tono?',
  'Welches Intervall enthält den Ton?',
  'Quel intervalle contient le son ?',
  '¿Qué intervalo contiene el tono?',
  'Qual intervalo contém o tom?',
);
message(
  'Which tone was higher?',
  'Quale tono era più acuto?',
  'Welcher Ton war höher?',
  'Quel son était le plus aigu ?',
  '¿Qué tono era más agudo?',
  'Qual tom era mais agudo?',
);
message(
  'Before listening',
  'Prima dell’ascolto',
  'Vor dem Hören',
  'Avant l’écoute',
  'Antes de escuchar',
  'Antes de ouvir',
);
message(
  'Comfort sets the ceiling.',
  'Il comfort stabilisce il limite.',
  'Komfort setzt die Obergrenze.',
  'Le confort fixe la limite.',
  'La comodidad fija el límite.',
  'O conforto define o limite.',
);
message(
  'Start with device volume low. Raise it only until the reference is quiet and comfortable, never beyond about 60%. Then lock it for the whole run.',
  'Inizia con il volume basso. Alzalo solo finché il riferimento è debole e confortevole, mai oltre il 60% circa. Poi non modificarlo per tutta la sessione.',
  'Beginnen Sie mit niedriger Gerätelautstärke. Erhöhen Sie sie nur, bis die Referenz leise und angenehm ist, niemals über etwa 60 %. Lassen Sie sie dann unverändert.',
  'Commencez avec un volume faible. Augmentez-le seulement jusqu’à ce que la référence soit faible et confortable, jamais au-delà d’environ 60 %. Ne le modifiez plus ensuite.',
  'Empieza con el volumen bajo. Súbelo solo hasta que la referencia sea suave y cómoda, nunca por encima del 60 % aproximadamente. Después no lo cambies.',
  'Comece com o volume baixo. Aumente-o apenas até a referência ficar baixa e confortável, nunca acima de cerca de 60%. Depois não o altere.',
);
message(
  'Never raise volume to chase a missing high tone. Stop immediately for discomfort, pain, pressure, or ringing.',
  'Non aumentare mai il volume per inseguire un tono acuto assente. Interrompi subito in caso di fastidio, dolore, pressione o fischi.',
  'Erhöhen Sie niemals die Lautstärke, um einen fehlenden hohen Ton zu finden. Stoppen Sie sofort bei Unbehagen, Schmerzen, Druck oder Ohrgeräuschen.',
  'N’augmentez jamais le volume pour poursuivre un son aigu absent. Arrêtez immédiatement en cas d’inconfort, douleur, pression ou sifflement.',
  'Nunca subas el volumen para perseguir un tono agudo ausente. Detente de inmediato si notas molestias, dolor, presión o zumbidos.',
  'Nunca aumente o volume para procurar um tom agudo ausente. Pare imediatamente perante desconforto, dor, pressão ou zumbido.',
);
message(
  'Research trail',
  'Percorso di ricerca',
  'Forschungsgrundlage',
  'Parcours de recherche',
  'Base científica',
  'Base científica',
);
message(
  'What informed Udito.',
  'Le basi di Udito.',
  'Grundlagen von Udito.',
  'Les bases d’Udito.',
  'Fundamentos de Udito.',
  'Fundamentos do Udito.',
);
message(
  'Read the primary source',
  'Leggi la fonte primaria',
  'Primärquelle lesen',
  'Lire la source primaire',
  'Leer la fuente primaria',
  'Ler a fonte primária',
);
message(
  'Safe listening',
  'Ascolto sicuro',
  'Sicheres Hören',
  'Écoute sûre',
  'Escucha segura',
  'Audição segura',
);
message(
  'Audio setup / volume locks after this screen',
  'Configurazione audio / il volume si blocca dopo questa schermata',
  'Audioeinrichtung / Lautstärke danach unverändert',
  'Configuration audio / volume verrouillé après cet écran',
  'Configuración de audio / el volumen se bloquea después',
  'Configuração áudio / o volume fica bloqueado depois',
);
message(
  'Quiet room.',
  'Ambiente silenzioso.',
  'Ruhiger Raum.',
  'Pièce calme.',
  'Entorno silencioso.',
  'Ambiente silencioso.',
);
message(
  'Low volume.',
  'Volume basso.',
  'Niedrige Lautstärke.',
  'Volume faible.',
  'Volumen bajo.',
  'Volume baixo.',
);
message('Headphones.', 'Cuffie.', 'Kopfhörer.', 'Casque.', 'Auriculares.', 'Auscultadores.');
message(
  'Play quiet reference',
  'Riproduci il riferimento debole',
  'Leise Referenz abspielen',
  'Lire la référence faible',
  'Reproducir referencia suave',
  'Reproduzir referência baixa',
);
message(
  'Start device volume low before playing.',
  'Prima di iniziare, imposta un volume basso.',
  'Stellen Sie die Lautstärke vor dem Abspielen niedrig ein.',
  'Réglez un volume faible avant la lecture.',
  'Baja el volumen antes de reproducir.',
  'Baixe o volume antes de reproduzir.',
);
message(
  'Listening setup',
  'Configurazione di ascolto',
  'Höreinrichtung',
  'Installation d’écoute',
  'Configuración auditiva',
  'Configuração auditiva',
);
message(
  'Over-ear / on-ear headphones',
  'Cuffie circumaurali / sovraurali',
  'Over-Ear- / On-Ear-Kopfhörer',
  'Casque circum-aural / supra-aural',
  'Auriculares circumaurales / supraaurales',
  'Auscultadores circum-aurais / supra-aurais',
);
message(
  'Earbuds / in-ear headphones',
  'Auricolari / cuffie in-ear',
  'Ohrhörer / In-Ear-Kopfhörer',
  'Écouteurs / intra-auriculaires',
  'Auriculares internos / in-ear',
  'Auriculares / intra-auriculares',
);
message(
  'Other / unsure',
  'Altro / non so',
  'Andere / unsicher',
  'Autre / incertain',
  'Otro / no estoy seguro',
  'Outro / não sei',
);
message(
  'Begin instrument 01',
  'Inizia lo strumento 01',
  'Instrument 01 starten',
  'Commencer l’instrument 01',
  'Empezar el instrumento 01',
  'Iniciar o instrumento 01',
);
message(
  'Volume contract',
  'Accordo sul volume',
  'Lautstärkevereinbarung',
  'Contrat de volume',
  'Compromiso de volumen',
  'Acordo de volume',
);
message('Start low', 'Inizia basso', 'Niedrig beginnen', 'Commencer bas', 'Empezar bajo', 'Começar baixo');
message(
  'Find quiet comfort',
  'Trova un livello debole e confortevole',
  'Leisen Komfort finden',
  'Trouver un niveau faible et confortable',
  'Buscar un nivel suave y cómodo',
  'Encontrar um nível baixo e confortável',
);
message(
  'Lock volume',
  'Blocca il volume',
  'Lautstärke beibehalten',
  'Verrouiller le volume',
  'Bloquear el volumen',
  'Bloquear o volume',
);
message(
  'Stop for discomfort',
  'Interrompi in caso di fastidio',
  'Bei Unbehagen stoppen',
  'Arrêter en cas d’inconfort',
  'Detenerse ante molestias',
  'Parar perante desconforto',
);
message('Microphone', 'Microfono', 'Mikrofon', 'Microphone', 'Micrófono', 'Microfone');
message('Not used', 'Non utilizzato', 'Nicht verwendet', 'Non utilisé', 'No se utiliza', 'Não utilizado');
message('Calibration', 'Calibrazione', 'Kalibrierung', 'Étalonnage', 'Calibración', 'Calibração');
message(
  'User-set only',
  'Impostata solo dall’utente',
  'Nur durch Nutzer festgelegt',
  'Réglé par l’utilisateur',
  'Solo configurada por el usuario',
  'Definida apenas pelo utilizador',
);
message(
  'Start practice',
  'Inizia la pratica',
  'Übung starten',
  'Commencer l’entraînement',
  'Empezar la práctica',
  'Iniciar a prática',
);
message('Listen…', 'Ascolta…', 'Hören…', 'Écoutez…', 'Escucha…', 'Escute…');
message(
  'Stop safely',
  'Interrompi in sicurezza',
  'Sicher stoppen',
  'Arrêter en sécurité',
  'Detener con seguridad',
  'Parar em segurança',
);
message(
  'Volume locked',
  'Volume bloccato',
  'Lautstärke gesperrt',
  'Volume verrouillé',
  'Volumen bloqueado',
  'Volume bloqueado',
);
message(
  'Short ramped tones',
  'Toni brevi con dissolvenza',
  'Kurze ein- und ausgeblendete Töne',
  'Sons courts avec fondu',
  'Tonos breves con fundido',
  'Tons breves com transição',
);
message(
  'Response recorded.',
  'Risposta registrata.',
  'Antwort erfasst.',
  'Réponse enregistrée.',
  'Respuesta registrada.',
  'Resposta registada.',
);
message(
  'Run again',
  'Ripeti il test',
  'Erneut durchführen',
  'Recommencer',
  'Repetir la prueba',
  'Repetir o teste',
);
message(
  'Not settled',
  'Non stabilizzato',
  'Nicht stabilisiert',
  'Non stabilisé',
  'No estabilizado',
  'Não estabilizado',
);
message(
  'Device-relative, never dB HL.',
  'Relativo al dispositivo, mai dB HL.',
  'Gerätebezogen, niemals dB HL.',
  'Lié à l’appareil, jamais en dB HL.',
  'Relativo al dispositivo, nunca dB HL.',
  'Relativo ao dispositivo, nunca dB HL.',
);
message(
  'Take off hearing protection only if you normally would. If you use hearing aids or another listening device, leave your usual setup unchanged and record it below.',
  'Togli le protezioni acustiche solo se lo faresti normalmente. Se usi apparecchi acustici o un altro dispositivo di ascolto, lascia invariata la configurazione abituale e indicala qui sotto.',
  'Nehmen Sie Gehörschutz nur ab, wenn Sie das normalerweise tun würden. Wenn Sie Hörgeräte oder andere Hörhilfen verwenden, lassen Sie Ihre übliche Einrichtung unverändert und geben Sie sie unten an.',
  'Retirez les protections auditives uniquement si vous le feriez habituellement. Si vous utilisez des appareils auditifs ou un autre dispositif d’écoute, gardez votre installation habituelle et indiquez-la ci-dessous.',
  'Quítate la protección auditiva solo si lo harías normalmente. Si usas audífonos u otro dispositivo de escucha, mantén tu configuración habitual e indícala abajo.',
  'Retire a proteção auditiva apenas se o faria normalmente. Se usa aparelhos auditivos ou outro dispositivo de audição, mantenha a configuração habitual e indique-a abaixo.',
);
message(
  'Web Audio is unavailable.',
  'Web Audio non è disponibile.',
  'Web Audio ist nicht verfügbar.',
  'Web Audio est indisponible.',
  'Web Audio no está disponible.',
  'Web Audio não está disponível.',
);
message(
  'Udito cannot present controlled intervals in this browser. Try a current browser with audio enabled.',
  'Udito non può presentare intervalli controllati in questo browser. Prova un browser aggiornato con l’audio abilitato.',
  'Udito kann in diesem Browser keine kontrollierten Intervalle wiedergeben. Verwenden Sie einen aktuellen Browser mit aktiviertem Audio.',
  'Udito ne peut pas présenter d’intervalles contrôlés dans ce navigateur. Essayez un navigateur récent avec l’audio activé.',
  'Udito no puede presentar intervalos controlados en este navegador. Prueba un navegador actual con el audio activado.',
  'O Udito não consegue apresentar intervalos controlados neste navegador. Experimente um navegador atual com áudio ativado.',
);
message(
  'Usual hearing aid / assistive setup',
  'Apparecchio acustico / configurazione assistiva abituale',
  'Übliche Hörgeräte- / Hilfsmittel-Einrichtung',
  'Appareil auditif / installation d’assistance habituelle',
  'Audífono / configuración asistiva habitual',
  'Aparelho auditivo / configuração de assistência habitual',
);
message(
  'The reference is quiet and comfortable; the room is quiet; I will not change volume or raise it to chase a tone; I understand this is not clinical audiometry.',
  'Il riferimento è debole e confortevole; l’ambiente è silenzioso; non cambierò il volume né lo alzerò per inseguire un tono; capisco che non è un’audiometria clinica.',
  'Die Referenz ist leise und angenehm; der Raum ist ruhig; ich werde die Lautstärke nicht verändern oder erhöhen, um einen Ton zu finden; ich verstehe, dass dies keine klinische Audiometrie ist.',
  'La référence est faible et confortable ; la pièce est calme ; je ne modifierai pas le volume ni ne l’augmenterai pour chercher un son ; je comprends qu’il ne s’agit pas d’audiométrie clinique.',
  'La referencia es suave y cómoda; el entorno está silencioso; no cambiaré el volumen ni lo subiré para buscar un tono; entiendo que no es audiometría clínica.',
  'A referência é baixa e confortável; o ambiente está silencioso; não alterarei o volume nem o aumentarei para procurar um tom; compreendo que não é audiometria clínica.',
);
message(
  'Safe listening rules',
  'Regole per l’ascolto sicuro',
  'Regeln für sicheres Hören',
  'Règles d’écoute sûre',
  'Reglas de escucha segura',
  'Regras de audição segura',
);
message(
  'A device control, not a measured sound-pressure level. The browser cannot know dB SPL.',
  'Un controllo del dispositivo, non un livello di pressione sonora misurato. Il browser non può conoscere i dB SPL.',
  'Eine Geräteeinstellung, kein gemessener Schalldruckpegel. Der Browser kennt keine dB SPL.',
  'Un réglage de l’appareil, pas un niveau de pression acoustique mesuré. Le navigateur ne connaît pas les dB SPL.',
  'Un control del dispositivo, no un nivel de presión sonora medido. El navegador no puede conocer los dB SPL.',
  'Um controlo do dispositivo, não um nível de pressão sonora medido. O navegador não consegue saber os dB SPL.',
);
message('Upload', 'Caricamento', 'Upload', 'Envoi', 'Envío', 'Envio');
message(
  'Playing quiet reference…',
  'Riproduzione del riferimento debole…',
  'Leise Referenz wird abgespielt…',
  'Lecture de la référence faible…',
  'Reproduciendo referencia suave…',
  'A reproduzir a referência baixa…',
);
message(
  'Keep this quiet and comfortable.',
  'Mantienilo debole e confortevole.',
  'Halten Sie dies leise und angenehm.',
  'Gardez ce son faible et confortable.',
  'Mantenlo suave y cómodo.',
  'Mantenha-o baixo e confortável.',
);
message(
  'Play reference again',
  'Riproduci di nuovo il riferimento',
  'Referenz erneut abspielen',
  'Relire la référence',
  'Reproducir de nuevo la referencia',
  'Reproduzir novamente a referência',
);
message(
  'audio context',
  'contesto audio',
  'Audiokontext',
  'contexte audio',
  'contexto de audio',
  'contexto áudio',
);
message(
  'now leave volume unchanged.',
  'ora lascia invariato il volume.',
  'Lassen Sie die Lautstärke jetzt unverändert.',
  'ne modifiez plus le volume.',
  'ahora deja el volumen sin cambios.',
  'agora não altere o volume.',
);
message(
  'Audio could not start. Check browser audio permissions and try again.',
  'Impossibile avviare l’audio. Controlla le autorizzazioni audio del browser e riprova.',
  'Audio konnte nicht gestartet werden. Prüfen Sie die Audioberechtigungen des Browsers und versuchen Sie es erneut.',
  'L’audio n’a pas pu démarrer. Vérifiez les autorisations audio du navigateur et réessayez.',
  'No se pudo iniciar el audio. Comprueba los permisos de audio del navegador e inténtalo de nuevo.',
  'Não foi possível iniciar o áudio. Verifique as permissões de áudio do navegador e tente novamente.',
);
message(
  'The reference sound could not start.',
  'Impossibile avviare il suono di riferimento.',
  'Der Referenzton konnte nicht gestartet werden.',
  'Le son de référence n’a pas pu démarrer.',
  'No se pudo iniciar el sonido de referencia.',
  'Não foi possível iniciar o som de referência.',
);
message(
  'Play the quiet reference and confirm the volume contract first.',
  'Prima riproduci il riferimento debole e conferma l’accordo sul volume.',
  'Spielen Sie zuerst die leise Referenz ab und bestätigen Sie die Lautstärkevereinbarung.',
  'Lisez d’abord la référence faible et confirmez le contrat de volume.',
  'Primero reproduce la referencia suave y confirma el compromiso de volumen.',
  'Reproduza primeiro a referência baixa e confirme o acordo de volume.',
);
message(
  'Never raise volume to chase a missing high tone.',
  'Non aumentare mai il volume per inseguire un tono acuto assente.',
  'Erhöhen Sie niemals die Lautstärke, um einen fehlenden hohen Ton zu finden.',
  'N’augmentez jamais le volume pour poursuivre un son aigu absent.',
  'Nunca subas el volumen para perseguir un tono agudo ausente.',
  'Nunca aumente o volume para procurar um tom agudo ausente.',
);
message(
  'Stop immediately for discomfort, pain, pressure, or ringing.',
  'Interrompi subito in caso di fastidio, dolore, pressione o fischi.',
  'Stoppen Sie sofort bei Unbehagen, Schmerzen, Druck oder Ohrgeräuschen.',
  'Arrêtez immédiatement en cas d’inconfort, douleur, pression ou sifflement.',
  'Detente de inmediato si notas molestias, dolor, presión o zumbidos.',
  'Pare imediatamente perante desconforto, dor, pressão ou zumbido.',
);

// Shared exam controls and visual tests.
// Udito task and result states.
message('Instrument', 'Strumento', 'Instrument', 'Instrument', 'Instrumento', 'Instrumento');
message('of 03', 'di 03', 'von 03', 'sur 03', 'de 03', 'de 03');
message(
  'Choose the quietest tone. Two practice trials come first; the measured check is six trials.',
  'Scegli il tono più debole. Prima vengono due prove di pratica; il controllo misurato comprende sei prove.',
  'Wählen Sie den leisesten Ton. Zuerst kommen zwei Übungsversuche, danach sechs Messversuche.',
  'Choisissez le son le plus faible. Deux essais d’entraînement précèdent six essais mesurés.',
  'Elige el tono más débil. Primero hay dos ensayos de práctica; la comprobación medida consta de seis.',
  'Escolha o tom mais fraco. Primeiro há dois ensaios de prática; a verificação medida tem seis ensaios.',
);
message(
  'Choose the interval containing the tone. Silence is a valid experience—guess without changing volume.',
  'Scegli l’intervallo che contiene il tono. Il silenzio è un’esperienza valida: prova a indovinare senza cambiare il volume.',
  'Wählen Sie das Intervall mit dem Ton. Stille ist eine gültige Wahrnehmung – raten Sie, ohne die Lautstärke zu ändern.',
  'Choisissez l’intervalle contenant le son. Le silence est une expérience valable : répondez au hasard sans modifier le volume.',
  'Elige el intervalo que contiene el tono. El silencio es una experiencia válida: adivina sin cambiar el volumen.',
  'Escolha o intervalo que contém o tom. O silêncio é uma experiência válida: tente adivinhar sem alterar o volume.',
);
message(
  'Choose which tone was higher. Loudness changes slightly on purpose, so follow pitch rather than loudness.',
  'Scegli quale tono era più acuto. Il volume cambia leggermente di proposito, quindi segui l’intonazione e non l’intensità.',
  'Wählen Sie den höheren Ton. Die Lautstärke ändert sich absichtlich leicht; achten Sie daher auf die Tonhöhe, nicht auf die Lautstärke.',
  'Choisissez le son le plus aigu. Le volume varie légèrement à dessein : suivez la hauteur plutôt que l’intensité.',
  'Elige qué tono era más agudo. El volumen cambia un poco a propósito, así que sigue el tono y no la intensidad.',
  'Escolha o tom mais agudo. O volume muda ligeiramente de propósito; siga a altura e não a intensidade.',
);
message(
  'Start Cuffie',
  'Inizia Cuffie',
  'Cuffie starten',
  'Commencer Cuffie',
  'Empezar Cuffie',
  'Iniciar Cuffie',
);
message(
  'Start Portata',
  'Inizia Portata',
  'Portata starten',
  'Commencer Portata',
  'Empezar Portata',
  'Iniciar Portata',
);
message(
  'Start Intonazione',
  'Inizia Intonazione',
  'Intonazione starten',
  'Commencer Intonazione',
  'Empezar Intonazione',
  'Iniciar Intonazione',
);
message('Practice', 'Pratica', 'Übung', 'Entraînement', 'Práctica', 'Prática');
message(
  'Adaptive run',
  'Sessione adattiva',
  'Adaptiver Durchlauf',
  'Session adaptative',
  'Sesión adaptativa',
  'Sessão adaptativa',
);
message('Preparing…', 'Preparazione…', 'Vorbereitung…', 'Préparation…', 'Preparando…', 'A preparar…');
message(
  'Preparing the sounds…',
  'Preparazione dei suoni…',
  'Töne werden vorbereitet…',
  'Préparation des sons…',
  'Preparando los sonidos…',
  'A preparar os sons…',
);
message(
  'Sound interval choices',
  'Scelta dell’intervallo sonoro',
  'Auswahl der Tonintervalle',
  'Choix de l’intervalle sonore',
  'Elección del intervalo sonoro',
  'Escolha do intervalo sonoro',
);
message('First tone', 'Primo tono', 'Erster Ton', 'Premier son', 'Primer tono', 'Primeiro tom');
message('Second tone', 'Secondo tono', 'Zweiter Ton', 'Deuxième son', 'Segundo tono', 'Segundo tom');
message('Interval', 'Intervallo', 'Intervall', 'Intervalle', 'Intervalo', 'Intervalo');
message('Keys', 'Tasti', 'Tasten', 'Touches', 'Teclas', 'Teclas');
message('Sound', 'Suono', 'Ton', 'Son', 'Sonido', 'Som');
message('of', 'di', 'von', 'sur', 'de', 'de');
message(
  'Which tone was quietest?',
  'Quale tono era più debole?',
  'Welcher Ton war am leisesten?',
  'Quel son était le plus faible ?',
  '¿Qué tono era más débil?',
  'Qual tom era mais fraco?',
);
message(
  'Which interval contained the tone?',
  'Quale intervallo conteneva il tono?',
  'Welches Intervall enthielt den Ton?',
  'Quel intervalle contenait le son ?',
  '¿Qué intervalo contenía el tono?',
  'Qual intervalo continha o tom?',
);
message(
  'Yes—that was the quieter tone.',
  'Sì, era quello il tono più debole.',
  'Ja – das war der leisere Ton.',
  'Oui, c’était le son le plus faible.',
  'Sí, ese era el tono más débil.',
  'Sim, esse era o tom mais fraco.',
);
message(
  'Listen for the tone with lower level.',
  'Ascolta il tono con il livello più basso.',
  'Achten Sie auf den Ton mit dem niedrigeren Pegel.',
  'Écoutez le son dont le niveau est le plus faible.',
  'Escucha el tono con menor nivel.',
  'Escute o tom com nível mais baixo.',
);
message(
  'Control tone found.',
  'Tono di controllo trovato.',
  'Kontrollton erkannt.',
  'Son de contrôle trouvé.',
  'Tono de control encontrado.',
  'Tom de controlo encontrado.',
);
message(
  'Control tone missed; setup confidence will be limited.',
  'Tono di controllo non rilevato; l’affidabilità della configurazione sarà limitata.',
  'Kontrollton verpasst; die Einrichtungskonfidenz wird eingeschränkt.',
  'Son de contrôle manqué ; la confiance dans l’installation sera limitée.',
  'Tono de control no detectado; la confianza en la configuración será limitada.',
  'Tom de controlo não detetado; a confiança na configuração será limitada.',
);
message(
  'Cuffie / practice complete',
  'Cuffie / pratica completata',
  'Cuffie / Übung abgeschlossen',
  'Cuffie / entraînement terminé',
  'Cuffie / práctica completada',
  'Cuffie / prática concluída',
);
message(
  'Now six measured trials.',
  'Ora sei prove misurate.',
  'Jetzt folgen sechs Messversuche.',
  'Place aux six essais mesurés.',
  'Ahora, seis ensayos medidos.',
  'Agora, seis ensaios medidos.',
);
message(
  'The phase-based decoy appears only in the measured block. Keep the volume unchanged.',
  'Il diversivo basato sulla fase appare solo nel blocco misurato. Mantieni invariato il volume.',
  'Der phasenbasierte Köder erscheint nur im Messblock. Lassen Sie die Lautstärke unverändert.',
  'Le leurre fondé sur la phase apparaît uniquement dans le bloc mesuré. Ne modifiez pas le volume.',
  'El señuelo basado en la fase solo aparece en el bloque medido. No cambies el volumen.',
  'O engodo baseado na fase aparece apenas no bloco medido. Não altere o volume.',
);
message(
  'Begin headphone check',
  'Inizia il controllo delle cuffie',
  'Kopfhörerprüfung starten',
  'Commencer le contrôle du casque',
  'Empezar la comprobación de auriculares',
  'Iniciar a verificação dos auscultadores',
);
message('recorded.', 'registrato.', 'erfasst.', 'enregistré.', 'registrado.', 'registado.');
message('Continue to', 'Continua con', 'Weiter zu', 'Continuer avec', 'Continuar con', 'Continuar para');
message(
  'quiet targets located. This is evidence about presentation, not proof of hardware.',
  'bersagli deboli individuati. È un’indicazione sulla presentazione, non una prova dell’hardware.',
  'leise Ziele erkannt. Dies ist ein Hinweis zur Wiedergabe, kein Hardware-Nachweis.',
  'cibles faibles repérées. C’est un indice sur la présentation, pas une preuve du matériel.',
  'objetivos débiles localizados. Es una indicación sobre la presentación, no una prueba del equipo.',
  'alvos fracos localizados. É uma indicação sobre a apresentação, não uma prova do equipamento.',
);
message(
  'adaptive presentations recorded',
  'presentazioni adattive registrate',
  'adaptive Darbietungen erfasst',
  'présentations adaptatives enregistrées',
  'presentaciones adaptativas registradas',
  'apresentações adaptativas registadas',
);
message(
  'without changing volume.',
  'senza modificare il volume.',
  'ohne die Lautstärke zu ändern.',
  'sans modifier le volume.',
  'sin cambiar el volumen.',
  'sem alterar o volume.',
);
message('Adaptive', 'Adattivo', 'Adaptiv', 'Adaptatif', 'Adaptativo', 'Adaptativo');
message('Interleaved', 'Intercalato', 'Verschachtelt', 'Entrelacé', 'Intercalado', 'Intercalado');
message(
  'Your listening profile — Udito | Sense6',
  'Il tuo profilo di ascolto — Udito | Sense6',
  'Ihr Hörprofil — Udito | Sense6',
  'Votre profil d’écoute — Udito | Sense6',
  'Tu perfil auditivo — Udito | Sense6',
  'O seu perfil auditivo — Udito | Sense6',
);
message(
  'Udito / this setup / this run',
  'Udito / questa configurazione / questa sessione',
  'Udito / diese Einrichtung / dieser Durchlauf',
  'Udito / cette installation / cette session',
  'Udito / esta configuración / esta sesión',
  'Udito / esta configuração / esta sessão',
);
message(
  'Three listening measures.',
  'Tre misure di ascolto.',
  'Drei Hörmessungen.',
  'Trois mesures d’écoute.',
  'Tres medidas auditivas.',
  'Três medidas auditivas.',
);
message(
  'No hearing label.',
  'Nessuna etichetta uditiva.',
  'Keine Hörbewertung.',
  'Aucune étiquette auditive.',
  'Sin etiqueta auditiva.',
  'Sem rótulo auditivo.',
);
message(
  'The setup checks and adaptive tracks produced a coherent run-level profile.',
  'I controlli della configurazione e i percorsi adattivi hanno prodotto un profilo coerente per questa sessione.',
  'Einrichtungsprüfungen und adaptive Spuren ergaben ein stimmiges Profil für diesen Durchlauf.',
  'Les contrôles de l’installation et les pistes adaptatives ont produit un profil cohérent pour cette session.',
  'Las comprobaciones de configuración y las pistas adaptativas produjeron un perfil coherente para esta sesión.',
  'As verificações da configuração e os percursos adaptativos produziram um perfil coerente para esta sessão.',
);
message(
  'At least one setup check or adaptive track did not settle. The observations remain visible, but comparison should wait for a steadier repeat.',
  'Almeno un controllo della configurazione o un percorso adattivo non si è stabilizzato. Le osservazioni restano visibili, ma il confronto dovrebbe attendere una ripetizione più stabile.',
  'Mindestens eine Einrichtungsprüfung oder adaptive Spur stabilisierte sich nicht. Die Beobachtungen bleiben sichtbar, ein Vergleich sollte jedoch auf eine stabilere Wiederholung warten.',
  'Au moins un contrôle de l’installation ou une piste adaptative ne s’est pas stabilisé. Les observations restent visibles, mais attendez une répétition plus stable avant de comparer.',
  'Al menos una comprobación de configuración o pista adaptativa no se estabilizó. Las observaciones siguen visibles, pero conviene esperar una repetición más estable para comparar.',
  'Pelo menos uma verificação da configuração ou um percurso adaptativo não estabilizou. As observações continuam visíveis, mas a comparação deve esperar uma repetição mais estável.',
);
message(
  'Setup checks coherent',
  'Controlli della configurazione coerenti',
  'Einrichtungsprüfungen stimmig',
  'Contrôles de l’installation cohérents',
  'Comprobaciones de configuración coherentes',
  'Verificações da configuração coerentes',
);
message(
  'Interpret with caution',
  'Interpreta con cautela',
  'Mit Vorsicht interpretieren',
  'Interpréter avec prudence',
  'Interpretar con cautela',
  'Interpretar com cautela',
);
message(
  'Headphone-like',
  'Compatibile con le cuffie',
  'Kopfhörerähnlich',
  'Compatible avec un casque',
  'Similar a auriculares',
  'Semelhante a auscultadores',
);
message('Uncertain', 'Incerto', 'Unsicher', 'Incertain', 'Incierto', 'Incerto');
message(
  'A phase-based presentation check, not hardware detection.',
  'Un controllo della presentazione basato sulla fase, non un rilevamento dell’hardware.',
  'Eine phasenbasierte Wiedergabeprüfung, keine Hardwareerkennung.',
  'Un contrôle de présentation fondé sur la phase, pas une détection du matériel.',
  'Una comprobación de presentación basada en la fase, no una detección del equipo.',
  'Uma verificação da apresentação baseada na fase, não uma deteção do equipamento.',
);
message(
  'Upper run boundary',
  'Limite superiore della sessione',
  'Obere Laufgrenze',
  'Limite supérieure de la session',
  'Límite superior de la sesión',
  'Limite superior da sessão',
);
message(
  'boundary estimate',
  'stima del limite',
  'Grenzschätzung',
  'estimation de la limite',
  'estimación del límite',
  'estimativa do limite',
);
message(
  'adaptive estimate',
  'stima adattiva',
  'adaptive Schätzung',
  'estimation adaptative',
  'estimación adaptativa',
  'estimativa adaptativa',
);
message(
  'Over-ear / on-ear',
  'Circumaurali / sovraurali',
  'Over-Ear / On-Ear',
  'Circum-aural / supra-aural',
  'Circumaurales / supraaurales',
  'Circum-aurais / supra-aurais',
);
message(
  'Reached the device-safe test ceiling; your personal boundary may be higher.',
  'Raggiunto il limite di test sicuro per il dispositivo; il tuo limite personale potrebbe essere più alto.',
  'Die gerätesichere Testobergrenze wurde erreicht; Ihre persönliche Grenze kann höher liegen.',
  'La limite sûre du test pour l’appareil a été atteinte ; votre limite personnelle peut être plus élevée.',
  'Se alcanzó el límite seguro de la prueba para el dispositivo; tu límite personal podría ser mayor.',
  'Foi atingido o limite seguro do teste para o dispositivo; o seu limite pessoal pode ser superior.',
);
message(
  'Relative to this device, fixed volume, room, and audio sample rate.',
  'Relativo a questo dispositivo, volume fisso, ambiente e frequenza di campionamento audio.',
  'Bezogen auf dieses Gerät, feste Lautstärke, Raum und Audio-Abtastrate.',
  'Lié à cet appareil, au volume fixe, à la pièce et à la fréquence d’échantillonnage audio.',
  'Relativo a este dispositivo, volumen fijo, entorno y frecuencia de muestreo de audio.',
  'Relativo a este dispositivo, volume fixo, ambiente e frequência de amostragem de áudio.',
);
message(
  'Pitch step near 500 Hz',
  'Intervallo di intonazione vicino a 500 Hz',
  'Tonhöhenschritt um 500 Hz',
  'Écart de hauteur près de 500 Hz',
  'Cambio de tono cerca de 500 Hz',
  'Diferença de altura perto de 500 Hz',
);
message(
  'Pitch step near 2 kHz',
  'Intervallo di intonazione vicino a 2 kHz',
  'Tonhöhenschritt um 2 kHz',
  'Écart de hauteur près de 2 kHz',
  'Cambio de tono cerca de 2 kHz',
  'Diferença de altura perto de 2 kHz',
);
message(
  'Reversal-based just-noticeable difference for this run.',
  'Differenza appena percepibile basata sulle inversioni per questa sessione.',
  'Umkehrpunktbasierter eben merklicher Unterschied für diesen Durchlauf.',
  'Différence juste perceptible fondée sur les inversions pour cette session.',
  'Diferencia apenas perceptible basada en inversiones para esta sesión.',
  'Diferença apenas percetível baseada em inversões para esta sessão.',
);
message(
  'Reported separately; no composite hearing score is calculated.',
  'Riportato separatamente; non viene calcolato alcun punteggio uditivo composito.',
  'Separat ausgewiesen; es wird kein Gesamt-Hörwert berechnet.',
  'Rapporté séparément ; aucun score auditif composite n’est calculé.',
  'Se informa por separado; no se calcula ninguna puntuación auditiva compuesta.',
  'Apresentado separadamente; não é calculada qualquer pontuação auditiva composta.',
);
message(
  'Run context',
  'Contesto della sessione',
  'Laufkontext',
  'Contexte de la session',
  'Contexto de la sesión',
  'Contexto da sessão',
);
message(
  'What travelled with the sound.',
  'Ciò che ha accompagnato il suono.',
  'Was den Klang begleitete.',
  'Ce qui accompagnait le son.',
  'Lo que acompañó al sonido.',
  'O que acompanhou o som.',
);
message(
  'Audio context',
  'Contesto audio',
  'Audiokontext',
  'Contexte audio',
  'Contexto de audio',
  'Contexto áudio',
);
message(
  'Portata controls',
  'Controlli di Portata',
  'Portata-Kontrollen',
  'Contrôles de Portata',
  'Controles de Portata',
  'Controlos de Portata',
);
message(
  'Not sampled',
  'Non campionato',
  'Nicht erfasst',
  'Non échantillonné',
  'No muestreado',
  'Não amostrado',
);
message(
  'Interruptions',
  'Interruzioni',
  'Unterbrechungen',
  'Interruptions',
  'Interrupciones',
  'Interrupções',
);
message(
  'Interpretation boundary',
  'Limite di interpretazione',
  'Interpretationsgrenze',
  'Limite d’interprétation',
  'Límite de interpretación',
  'Limite de interpretação',
);
message(
  'A browser knows digital amplitude, not sound pressure at your eardrum. Headphone response, fit, output, age, room noise, device processing, and the volume setting all shape these numbers.',
  'Un browser conosce l’ampiezza digitale, non la pressione sonora sul timpano. Risposta e vestibilità delle cuffie, uscita, età, rumore ambientale, elaborazione del dispositivo e volume influenzano tutti questi numeri.',
  'Ein Browser kennt die digitale Amplitude, nicht den Schalldruck am Trommelfell. Kopfhörerfrequenzgang, Sitz, Ausgang, Alter, Raumgeräusch, Geräteverarbeitung und Lautstärkeeinstellung prägen diese Werte.',
  'Un navigateur connaît l’amplitude numérique, pas la pression acoustique au tympan. Réponse et ajustement du casque, sortie, âge, bruit ambiant, traitement de l’appareil et volume façonnent tous ces chiffres.',
  'Un navegador conoce la amplitud digital, no la presión sonora en el tímpano. Respuesta y ajuste de auriculares, salida, edad, ruido ambiental, procesamiento del dispositivo y volumen determinan estas cifras.',
  'Um navegador conhece a amplitude digital, não a pressão sonora no tímpano. Resposta e ajuste dos auscultadores, saída, idade, ruído ambiente, processamento do dispositivo e volume moldam estes números.',
);
message(
  'Do not infer hearing age, “normal” hearing, safety for work, or a medical diagnosis. If hearing concerns affect daily life, use calibrated clinical audiometry.',
  'Non dedurre un’età uditiva, un udito “normale”, l’idoneità al lavoro o una diagnosi medica. Se i problemi uditivi influiscono sulla vita quotidiana, ricorri a un’audiometria clinica calibrata.',
  'Leiten Sie daraus kein Höralter, „normales“ Hören, berufliche Sicherheit oder eine medizinische Diagnose ab. Bei Hörproblemen im Alltag nutzen Sie kalibrierte klinische Audiometrie.',
  'N’en déduisez pas un âge auditif, une audition « normale », une aptitude au travail ou un diagnostic médical. Si des problèmes auditifs affectent le quotidien, recourez à une audiométrie clinique étalonnée.',
  'No deduzcas una edad auditiva, audición «normal», seguridad laboral ni un diagnóstico médico. Si los problemas auditivos afectan a la vida diaria, recurre a una audiometría clínica calibrada.',
  'Não deduza idade auditiva, audição «normal», segurança no trabalho ou diagnóstico médico. Se as preocupações auditivas afetam a vida diária, recorra a audiometria clínica calibrada.',
);
message(
  'Keep the same volume only for comparison.',
  'Mantieni lo stesso volume solo per il confronto.',
  'Behalten Sie dieselbe Lautstärke nur zum Vergleichen bei.',
  'Gardez le même volume uniquement pour comparer.',
  'Mantén el mismo volumen solo para comparar.',
  'Mantenha o mesmo volume apenas para comparar.',
);
message(
  'Compare your own runs only with the same device, headphones, fit, room, and volume. Stop testing if any sound is uncomfortable.',
  'Confronta le tue sessioni solo con lo stesso dispositivo, cuffie, vestibilità, ambiente e volume. Interrompi il test se un suono è fastidioso.',
  'Vergleichen Sie eigene Durchläufe nur mit demselben Gerät, Kopfhörer, Sitz, Raum und derselben Lautstärke. Stoppen Sie bei unangenehmen Tönen.',
  'Comparez vos propres sessions uniquement avec le même appareil, casque, ajustement, environnement et volume. Arrêtez si un son est inconfortable.',
  'Compara tus sesiones solo con el mismo dispositivo, auriculares, ajuste, entorno y volumen. Detén la prueba si algún sonido resulta incómodo.',
  'Compare as suas sessões apenas com o mesmo dispositivo, auscultadores, ajuste, ambiente e volume. Pare o teste se algum som for desconfortável.',
);
message(
  'Screen check / 01 of 01',
  'Controllo dello schermo / 01 di 01',
  'Bildschirmprüfung / 01 von 01',
  'Contrôle de l’écran / 01 sur 01',
  'Comprobación de pantalla / 01 de 01',
  'Verificação do ecrã / 01 de 01',
);
message(
  'Prepare the environment before the score.',
  'Prepara l’ambiente prima della misurazione.',
  'Bereiten Sie die Umgebung vor der Messung vor.',
  'Préparez l’environnement avant la mesure.',
  'Prepara el entorno antes de la medición.',
  'Prepare o ambiente antes da medição.',
);
message(
  'Display settings and ambient light can move a color threshold. This one-minute check makes your run more repeatable.',
  'Le impostazioni dello schermo e la luce ambientale possono spostare una soglia cromatica. Questo controllo di un minuto rende la sessione più ripetibile.',
  'Bildschirmeinstellungen und Umgebungslicht können eine Farbschwelle verschieben. Diese einminütige Prüfung macht Ihren Durchlauf besser wiederholbar.',
  'Les réglages de l’écran et la lumière ambiante peuvent déplacer un seuil chromatique. Ce contrôle d’une minute rend votre session plus reproductible.',
  'Los ajustes de pantalla y la luz ambiental pueden desplazar un umbral cromático. Esta comprobación de un minuto hace la sesión más repetible.',
  'As definições do ecrã e a luz ambiente podem deslocar um limiar cromático. Esta verificação de um minuto torna a sessão mais repetível.',
);
message(
  'Use one screen. Disable Night Shift, True Tone, blue-light filters, and vivid modes.',
  'Usa un solo schermo. Disattiva Night Shift, True Tone, filtri per la luce blu e modalità vivide.',
  'Verwenden Sie einen Bildschirm. Deaktivieren Sie Night Shift, True Tone, Blaulichtfilter und lebhafte Modi.',
  'Utilisez un seul écran. Désactivez Night Shift, True Tone, les filtres de lumière bleue et les modes vifs.',
  'Usa una sola pantalla. Desactiva Night Shift, True Tone, filtros de luz azul y modos vivos.',
  'Use apenas um ecrã. Desative Night Shift, True Tone, filtros de luz azul e modos vívidos.',
);
message(
  'Avoid direct glare. Let your eyes settle on the neutral page for about 30 seconds.',
  'Evita i riflessi diretti. Lascia adattare gli occhi alla pagina neutra per circa 30 secondi.',
  'Vermeiden Sie direkte Blendung. Lassen Sie Ihre Augen etwa 30 Sekunden an die neutrale Seite gewöhnen.',
  'Évitez les reflets directs. Laissez vos yeux s’adapter à la page neutre pendant environ 30 secondes.',
  'Evita los reflejos directos. Deja que tus ojos se adapten a la página neutra unos 30 segundos.',
  'Evite reflexos diretos. Deixe os olhos adaptarem-se à página neutra durante cerca de 30 segundos.',
);
message(
  'Set comfortable brightness. You should distinguish every neighboring step below.',
  'Imposta una luminosità confortevole. Dovresti distinguere ogni gradino adiacente qui sotto.',
  'Stellen Sie eine angenehme Helligkeit ein. Sie sollten jede benachbarte Stufe unten unterscheiden.',
  'Réglez une luminosité confortable. Vous devez distinguer chaque niveau voisin ci-dessous.',
  'Ajusta un brillo cómodo. Deberías distinguir cada nivel contiguo de abajo.',
  'Defina uma luminosidade confortável. Deve distinguir cada nível adjacente abaixo.',
);
message(
  'Black → white',
  'Nero → bianco',
  'Schwarz → Weiß',
  'Noir → blanc',
  'Negro → blanco',
  'Preto → branco',
);
message(
  '11-step check',
  'Controllo a 11 livelli',
  'Prüfung mit 11 Stufen',
  'Contrôle en 11 niveaux',
  'Comprobación de 11 niveles',
  'Verificação de 11 níveis',
);
message(
  'Look for distinct edges above and a smooth ramp here—without a bright hotspot.',
  'Cerca bordi distinti sopra e una sfumatura uniforme qui, senza una zona eccessivamente luminosa.',
  'Achten Sie oben auf klare Kanten und hier auf einen gleichmäßigen Verlauf ohne hellen Fleck.',
  'Recherchez des bords distincts au-dessus et un dégradé régulier ici, sans zone trop lumineuse.',
  'Busca bordes definidos arriba y una gradación uniforme aquí, sin una zona demasiado brillante.',
  'Procure limites distintos acima e uma gradação uniforme aqui, sem uma zona demasiado brilhante.',
);
message(
  'I can distinguish the steps and my color-shifting filters are off.',
  'Riesco a distinguere i livelli e i filtri che alterano i colori sono disattivati.',
  'Ich kann die Stufen unterscheiden und farbverändernde Filter sind deaktiviert.',
  'Je distingue les niveaux et mes filtres modifiant les couleurs sont désactivés.',
  'Puedo distinguir los niveles y los filtros que alteran el color están desactivados.',
  'Consigo distinguir os níveis e os filtros que alteram as cores estão desativados.',
);
message(
  'Start instrument 01',
  'Inizia lo strumento 01',
  'Instrument 01 starten',
  'Commencer l’instrument 01',
  'Empezar el instrumento 01',
  'Iniciar o instrumento 01',
);
message(
  'Viewing setup / 01 of 01',
  'Configurazione visiva / 01 di 01',
  'Seheinrichtung / 01 von 01',
  'Configuration visuelle / 01 sur 01',
  'Configuración visual / 01 de 01',
  'Configuração visual / 01 de 01',
);
message(
  'Colour filters off, please.',
  'Disattiva i filtri colore.',
  'Bitte Farbfilter deaktivieren.',
  'Désactivez les filtres de couleur.',
  'Desactiva los filtros de color.',
  'Desative os filtros de cor.',
);
message(
  'The thresholds only describe this browser, display, lighting, and viewing position. Colour-shifting features can move them substantially.',
  'Le soglie descrivono solo questo browser, schermo, illuminazione e posizione di visione. Le funzioni che alterano i colori possono modificarle notevolmente.',
  'Die Schwellen beschreiben nur diesen Browser, Bildschirm, diese Beleuchtung und Betrachtungsposition. Farbverändernde Funktionen können sie deutlich verschieben.',
  'Les seuils décrivent uniquement ce navigateur, cet écran, cet éclairage et cette position. Les fonctions modifiant les couleurs peuvent les déplacer fortement.',
  'Los umbrales solo describen este navegador, pantalla, iluminación y posición de visión. Las funciones que alteran el color pueden modificarlos mucho.',
  'Os limiares descrevem apenas este navegador, ecrã, iluminação e posição de visualização. As funções que alteram as cores podem mudá-los bastante.',
);
message(
  'Turn off Night Shift, True Tone, blue-light filters, and vivid display modes.',
  'Disattiva Night Shift, True Tone, i filtri per la luce blu e le modalità vivide dello schermo.',
  'Deaktivieren Sie Night Shift, True Tone, Blaulichtfilter und lebhafte Bildschirmmodi.',
  'Désactivez Night Shift, True Tone, les filtres de lumière bleue et les modes d’affichage vifs.',
  'Desactiva Night Shift, True Tone, los filtros de luz azul y los modos vivos de pantalla.',
  'Desative Night Shift, True Tone, filtros de luz azul e modos vívidos do ecrã.',
);
message(
  'Use comfortable medium brightness in even room light, without glare.',
  'Usa una luminosità media confortevole con luce ambiente uniforme e senza riflessi.',
  'Verwenden Sie eine angenehme mittlere Helligkeit bei gleichmäßigem Raumlicht ohne Blendung.',
  'Utilisez une luminosité moyenne confortable avec un éclairage ambiant uniforme et sans reflets.',
  'Usa un brillo medio cómodo con luz ambiental uniforme y sin reflejos.',
  'Use uma luminosidade média confortável com luz ambiente uniforme e sem reflexos.',
);
message(
  'View the display straight on at a normal reading distance. Use “No gap visible” when the target disappears.',
  'Guarda lo schermo frontalmente a una normale distanza di lettura. Usa “Nessuna apertura visibile” quando il bersaglio scompare.',
  'Betrachten Sie den Bildschirm frontal aus normalem Leseabstand. Wählen Sie „Keine Lücke sichtbar“, wenn das Ziel verschwindet.',
  'Regardez l’écran de face à une distance de lecture normale. Utilisez « Aucune ouverture visible » lorsque la cible disparaît.',
  'Mira la pantalla de frente a una distancia normal de lectura. Usa «No se ve ninguna abertura» cuando desaparezca el objetivo.',
  'Olhe para o ecrã de frente a uma distância normal de leitura. Use «Nenhuma abertura visível» quando o alvo desaparecer.',
);
message(
  'Display check',
  'Controllo dello schermo',
  'Bildschirmprüfung',
  'Contrôle de l’écran',
  'Comprobación de pantalla',
  'Verificação do ecrã',
);
message(
  'Ready to begin',
  'Pronto per iniziare',
  'Bereit zum Start',
  'Prêt à commencer',
  'Listo para empezar',
  'Pronto para começar',
);
message(
  'These six swatches are a gross display check, not colour calibration.',
  'Questi sei campioni sono un controllo approssimativo dello schermo, non una calibrazione del colore.',
  'Diese sechs Farbfelder sind eine grobe Bildschirmprüfung, keine Farbkalibrierung.',
  'Ces six échantillons constituent un contrôle sommaire de l’écran, pas un étalonnage des couleurs.',
  'Estas seis muestras son una comprobación general de pantalla, no una calibración del color.',
  'Estas seis amostras são uma verificação geral do ecrã, não uma calibração de cor.',
);
message(
  'My colour filters are off and I understand this is an unvalidated browser experiment.',
  'I filtri colore sono disattivati e capisco che questo è un esperimento nel browser non convalidato.',
  'Meine Farbfilter sind deaktiviert und ich verstehe, dass dies ein nicht validiertes Browserexperiment ist.',
  'Mes filtres de couleur sont désactivés et je comprends qu’il s’agit d’une expérience dans le navigateur non validée.',
  'Mis filtros de color están desactivados y entiendo que este es un experimento en el navegador sin validar.',
  'Os meus filtros de cor estão desativados e compreendo que esta é uma experiência no navegador não validada.',
);
message(
  'Input setup / before timing starts',
  'Configurazione dell’input / prima del cronometraggio',
  'Eingabeeinrichtung / vor Beginn der Zeitmessung',
  'Configuration de la réponse / avant le chronométrage',
  'Configuración de entrada / antes de medir el tiempo',
  'Configuração da entrada / antes da cronometragem',
);
message(
  'Use the same device and input mode when comparing runs. Keep this tab visible and silence interruptions.',
  'Usa lo stesso dispositivo e la stessa modalità di input quando confronti le sessioni. Mantieni visibile questa scheda ed evita le interruzioni.',
  'Verwenden Sie beim Vergleich von Durchläufen dasselbe Gerät und dieselbe Eingabeart. Lassen Sie diesen Tab sichtbar und vermeiden Sie Unterbrechungen.',
  'Utilisez le même appareil et le même mode de réponse pour comparer les sessions. Gardez cet onglet visible et évitez les interruptions.',
  'Usa el mismo dispositivo y modo de entrada al comparar sesiones. Mantén esta pestaña visible y evita interrupciones.',
  'Use o mesmo dispositivo e modo de entrada ao comparar sessões. Mantenha este separador visível e evite interrupções.',
);
message(
  'Space, then ← / →',
  'Spazio, poi ← / →',
  'Leertaste, dann ← / →',
  'Espace, puis ← / →',
  'Espacio, luego ← / →',
  'Espaço, depois ← / →',
);
message(
  'Tap the chamber or side',
  'Tocca il campo o il lato',
  'Auf Fläche oder Seite tippen',
  'Touchez la zone ou le côté',
  'Toca el área o el lado',
  'Toque na área ou no lado',
);
message(
  'I understand this measures this browser, device, input, and moment—not a clinical trait.',
  'Capisco che misura questo browser, dispositivo, input e momento, non una caratteristica clinica.',
  'Ich verstehe, dass dies diesen Browser, dieses Gerät, diese Eingabe und diesen Moment misst – keine klinische Eigenschaft.',
  'Je comprends que cette mesure concerne ce navigateur, cet appareil, cette entrée et ce moment, pas un trait clinique.',
  'Entiendo que mide este navegador, dispositivo, entrada y momento, no un rasgo clínico.',
  'Compreendo que mede este navegador, dispositivo, entrada e momento, não uma característica clínica.',
);
message(
  'Timing readiness',
  'Preparazione al cronometraggio',
  'Bereitschaft zur Zeitmessung',
  'Préparation au chronométrage',
  'Preparación para la medición',
  'Preparação para a cronometragem',
);
message(
  'Frame cadence check',
  'Controllo della cadenza dei fotogrammi',
  'Prüfung der Bildrate',
  'Contrôle de la cadence des images',
  'Comprobación de cadencia de fotogramas',
  'Verificação da cadência de fotogramas',
);
message('Measuring…', 'Misurazione…', 'Messung läuft…', 'Mesure…', 'Midiendo…', 'A medir…');
message(
  'Sampling animation frames without changing your measured responses.',
  'Campionamento dei fotogrammi senza modificare le risposte misurate.',
  'Animationsbilder werden erfasst, ohne Ihre gemessenen Reaktionen zu verändern.',
  'Échantillonnage des images d’animation sans modifier vos réponses mesurées.',
  'Muestreo de fotogramas sin alterar tus respuestas medidas.',
  'Amostragem de fotogramas sem alterar as respostas medidas.',
);
message(
  'Display correction',
  'Correzione dello schermo',
  'Bildschirmkorrektur',
  'Correction de l’écran',
  'Corrección de pantalla',
  'Correção do ecrã',
);
message(
  'Timing clock',
  'Orologio di misura',
  'Zeitmessuhr',
  'Horloge de mesure',
  'Reloj de medición',
  'Relógio de medição',
);
message('Monotonic', 'Monotono', 'Monoton', 'Monotone', 'Monótono', 'Monotónico');
message('Privacy', 'Privacy', 'Datenschutz', 'Confidentialité', 'Privacidad', 'Privacidade');
message('Local only', 'Solo locale', 'Nur lokal', 'Local uniquement', 'Solo local', 'Apenas local');
message('Back', 'Indietro', 'Zurück', 'Retour', 'Atrás', 'Voltar');
message(
  'Leave lab',
  'Esci dal laboratorio',
  'Labor verlassen',
  'Quitter le laboratoire',
  'Salir del laboratorio',
  'Sair do laboratório',
);
message(
  'End session',
  'Termina la sessione',
  'Sitzung beenden',
  'Terminer la session',
  'Finalizar la sesión',
  'Terminar a sessão',
);
message(
  'End experiment',
  'Termina l’esperimento',
  'Experiment beenden',
  'Terminer l’expérience',
  'Finalizar el experimento',
  'Terminar a experiência',
);
message(
  'How it works',
  'Come funziona',
  'So funktioniert es',
  'Fonctionnement',
  'Cómo funciona',
  'Como funciona',
);
message(
  'Practice first',
  'Prima la pratica',
  'Zuerst üben',
  'Commencer par l’entraînement',
  'Primero la práctica',
  'Primeiro a prática',
);
message(
  'Practice with feedback',
  'Pratica con feedback',
  'Übung mit Rückmeldung',
  'Entraînement avec retour',
  'Práctica con comentarios',
  'Prática com feedback',
);
message(
  'Begin measured run',
  'Inizia la sessione misurata',
  'Messlauf starten',
  'Commencer la mesure',
  'Empezar la sesión medida',
  'Iniciar a sessão medida',
);
message(
  'Next practice target',
  'Prossimo obiettivo di pratica',
  'Nächstes Übungsziel',
  'Cible d’entraînement suivante',
  'Siguiente objetivo de práctica',
  'Próximo alvo de prática',
);
message(
  'Copy summary',
  'Copia il riepilogo',
  'Übersicht kopieren',
  'Copier le résumé',
  'Copiar el resumen',
  'Copiar o resumo',
);
message(
  'Return to method',
  'Torna al metodo',
  'Zur Methode',
  'Retour à la méthode',
  'Volver al método',
  'Voltar ao método',
);
message(
  'Everything runs locally. No answer leaves the browser.',
  'Tutto avviene localmente. Nessuna risposta lascia il browser.',
  'Alles läuft lokal. Keine Antwort verlässt den Browser.',
  'Tout fonctionne localement. Aucune réponse ne quitte le navigateur.',
  'Todo funciona localmente. Ninguna respuesta sale del navegador.',
  'Tudo funciona localmente. Nenhuma resposta sai do navegador.',
);
message(
  'Results are calculated locally and are not uploaded.',
  'I risultati vengono calcolati localmente e non vengono caricati.',
  'Die Ergebnisse werden lokal berechnet und nicht hochgeladen.',
  'Les résultats sont calculés localement et ne sont pas envoyés.',
  'Los resultados se calculan localmente y no se envían.',
  'Os resultados são calculados localmente e não são enviados.',
);

// Tetracromia.
message(
  'Color perception / 03 instruments / about 4 minutes',
  'Percezione del colore / 03 strumenti / circa 4 minuti',
  'Farbwahrnehmung / 03 Instrumente / etwa 4 Minuten',
  'Perception des couleurs / 03 instruments / environ 4 minutes',
  'Percepción del color / 03 instrumentos / unos 4 minutos',
  'Perceção da cor / 03 instrumentos / cerca de 4 minutos',
);
message(
  'How finely do you',
  'Quanto finemente',
  'Wie fein können Sie Farben',
  'Avec quelle finesse',
  '¿Con qué precisión',
  'Com que precisão',
);
message('see', 'vedi', 'unterscheiden', 'voyez-vous', 'ves', 'vê');
message('color?', 'i colori?', '?', 'les couleurs ?', 'los colores?', 'as cores?');
message(
  'Begin the color lab',
  'Inizia il laboratorio del colore',
  'Farblabor starten',
  'Commencer le laboratoire couleur',
  'Empezar el laboratorio de color',
  'Iniciar o laboratório de cor',
);
message(
  'Set the room before the score.',
  'Prepara l’ambiente prima del punteggio.',
  'Richten Sie den Raum vor der Messung ein.',
  'Préparez la pièce avant la mesure.',
  'Prepara el entorno antes de medir.',
  'Prepare o ambiente antes da medição.',
);
message(
  'Which tile is different?',
  'Quale tessera è diversa?',
  'Welche Kachel ist anders?',
  'Quelle tuile est différente ?',
  '¿Qué ficha es diferente?',
  'Qual bloco é diferente?',
);
message(
  'Which field shifts in color?',
  'Quale campo cambia colore?',
  'Welches Feld verändert die Farbe?',
  'Quel champ change de couleur ?',
  '¿Qué campo cambia de color?',
  'Qual campo muda de cor?',
);
message(
  'Build the smoothest color path.',
  'Crea la sequenza cromatica più uniforme.',
  'Erstellen Sie den gleichmäßigsten Farbverlauf.',
  'Créez la progression de couleurs la plus régulière.',
  'Crea la secuencia de color más uniforme.',
  'Crie a sequência de cor mais uniforme.',
);
message(
  'Lock this order',
  'Conferma quest’ordine',
  'Reihenfolge bestätigen',
  'Valider cet ordre',
  'Confirmar este orden',
  'Confirmar esta ordem',
);
message(
  'Your visible boundary, on this display.',
  'Il tuo limite visibile, su questo schermo.',
  'Ihre sichtbare Grenze auf diesem Bildschirm.',
  'Votre limite visible sur cet écran.',
  'Tu límite visible en esta pantalla.',
  'O seu limite visível neste ecrã.',
);
message(
  'This is not a medical test and cannot confirm tetrachromacy.',
  'Non è un test medico e non può confermare la tetracromia.',
  'Dies ist kein medizinischer Test und kann Tetrachromasie nicht bestätigen.',
  'Ce n’est pas un test médical et il ne peut pas confirmer la tétrachromatie.',
  'No es una prueba médica y no puede confirmar la tetracromía.',
  'Não é um teste médico e não pode confirmar a tetracromacia.',
);
message(
  'Lab progress',
  'Avanzamento del laboratorio',
  'Laborfortschritt',
  'Progression du laboratoire',
  'Progreso del laboratorio',
  'Progresso do laboratório',
);
message(
  'Current instrument progress',
  'Avanzamento dello strumento attuale',
  'Fortschritt des aktuellen Instruments',
  'Progression de l’instrument actuel',
  'Progreso del instrumento actual',
  'Progresso do instrumento atual',
);
message(
  'Choose once. Trust the first stable difference you see.',
  'Scegli una volta. Fidati della prima differenza stabile che percepisci.',
  'Wählen Sie einmal. Vertrauen Sie dem ersten stabilen Unterschied, den Sie sehen.',
  'Choisissez une fois. Fiez-vous à la première différence stable que vous voyez.',
  'Elige una vez. Confía en la primera diferencia estable que veas.',
  'Escolha uma vez. Confie na primeira diferença estável que vir.',
);
message(
  'Ignore dot size and brightness. Look for a whole-field hue shift.',
  'Ignora dimensione e luminosità dei punti. Cerca un cambiamento di tonalità nell’intero campo.',
  'Ignorieren Sie Punktgröße und Helligkeit. Achten Sie auf eine Farbtonverschiebung des gesamten Feldes.',
  'Ignorez la taille et la luminosité des points. Recherchez un changement de teinte dans tout le champ.',
  'Ignora el tamaño y el brillo de los puntos. Busca un cambio de tono en todo el campo.',
  'Ignore o tamanho e a luminosidade dos pontos. Procure uma mudança de matiz em todo o campo.',
);
message(
  'The endpoints are fixed. Drag a tile into place — the row makes room. You can also tap two tiles to swap them.',
  'Gli estremi sono fissi. Trascina una tessera al suo posto: la fila fa spazio. Puoi anche toccare due tessere per scambiarle.',
  'Die Endpunkte sind fest. Ziehen Sie eine Kachel an ihren Platz – die Reihe schafft Raum. Sie können auch zwei Kacheln antippen, um sie zu tauschen.',
  'Les extrémités sont fixes. Faites glisser une tuile à sa place : la rangée s’écarte. Vous pouvez aussi toucher deux tuiles pour les échanger.',
  'Los extremos son fijos. Arrastra una ficha a su lugar: la fila deja espacio. También puedes tocar dos fichas para intercambiarlas.',
  'Os extremos são fixos. Arraste uma peça para o lugar: a fila abre espaço. Também pode tocar em duas peças para as trocar.',
);
message(
  'No answer is stored online',
  'Nessuna risposta viene salvata online',
  'Keine Antwort wird online gespeichert',
  'Aucune réponse n’est stockée en ligne',
  'Ninguna respuesta se guarda en línea',
  'Nenhuma resposta é guardada online',
);
message(
  'Sixteen color tiles',
  'Sedici tessere colorate',
  'Sechzehn Farbkacheln',
  'Seize tuiles colorées',
  'Dieciséis fichas de color',
  'Dezasseis peças coloridas',
);
message('Color tile', 'Tessera colorata', 'Farbkachel', 'Tuile colorée', 'Ficha de color', 'Peça colorida');
message(
  'Four dotted color fields',
  'Quattro campi colorati a punti',
  'Vier gepunktete Farbfelder',
  'Quatre champs colorés en points',
  'Cuatro campos de color con puntos',
  'Quatro campos de cor pontilhados',
);
message(
  'Dotted field',
  'Campo a punti',
  'Gepunktetes Feld',
  'Champ en points',
  'Campo con puntos',
  'Campo pontilhado',
);
message(
  'Hue ordering track',
  'Traccia di ordinamento delle tonalità',
  'Spur zur Farbtonsortierung',
  'Piste de classement des teintes',
  'Pista de ordenación de tonos',
  'Pista de ordenação de matizes',
);
message(
  'Start anchor',
  'Estremo iniziale',
  'Startanker',
  'Ancrage de départ',
  'Extremo inicial',
  'Extremo inicial',
);
message('End anchor', 'Estremo finale', 'Endanker', 'Ancrage final', 'Extremo final', 'Extremo final');
message(
  'Movable color tile',
  'Tessera colorata mobile',
  'Verschiebbare Farbkachel',
  'Tuile colorée mobile',
  'Ficha de color móvil',
  'Peça colorida móvel',
);
message('selected', 'selezionata', 'ausgewählt', 'sélectionnée', 'seleccionada', 'selecionada');
message(
  'Move left',
  'Sposta a sinistra',
  'Nach links',
  'Déplacer à gauche',
  'Mover a la izquierda',
  'Mover para a esquerda',
);
message(
  'Move right',
  'Sposta a destra',
  'Nach rechts',
  'Déplacer à droite',
  'Mover a la derecha',
  'Mover para a direita',
);
message('Run', 'Sessione', 'Durchlauf', 'Session', 'Sesión', 'Sessão');
message(
  'drag a tile into place, or tap two tiles to swap them.',
  'trascina una tessera al suo posto oppure tocca due tessere per scambiarle.',
  'ziehen Sie eine Kachel an ihren Platz oder tippen Sie zwei Kacheln zum Tauschen an.',
  'faites glisser une tuile à sa place ou touchez deux tuiles pour les échanger.',
  'arrastra una ficha a su lugar o toca dos fichas para intercambiarlas.',
  'arraste uma peça para o lugar ou toque em duas peças para as trocar.',
);
message('tile', 'tessera', 'Kachel', 'tuile', 'ficha', 'peça');
message(
  'Tap its new place to swap, or use the arrows.',
  'Tocca la nuova posizione per scambiarla oppure usa le frecce.',
  'Tippen Sie zum Tauschen auf die neue Position oder verwenden Sie die Pfeile.',
  'Touchez sa nouvelle place pour l’échanger ou utilisez les flèches.',
  'Toca su nueva posición para intercambiarla o usa las flechas.',
  'Toque na nova posição para a trocar ou use as setas.',
);
message(
  'Your colour profile — Tetracromia | Sense6',
  'Il tuo profilo cromatico — Tetracromia | Sense6',
  'Ihr Farbprofil — Tetracromia | Sense6',
  'Votre profil chromatique — Tetracromia | Sense6',
  'Tu perfil cromático — Tetracromia | Sense6',
  'O seu perfil cromático — Tetracromia | Sense6',
);
message(
  'Session complete',
  'Sessione completata',
  'Sitzung abgeschlossen',
  'Session terminée',
  'Sesión completada',
  'Sessão concluída',
);
message(
  'Session index',
  'Indice della sessione',
  'Sitzungsindex',
  'Indice de session',
  'Índice de sesión',
  'Índice da sessão',
);
message(
  'Hue profile',
  'Profilo delle tonalità',
  'Farbtonprofil',
  'Profil des teintes',
  'Perfil de tonos',
  'Perfil de matizes',
);
message(
  'Display-relative',
  'Relativo allo schermo',
  'Bildschirmbezogen',
  'Lié à l’écran',
  'Relativo a la pantalla',
  'Relativo ao ecrã',
);
message(
  'Each spoke is one hue region, drawn in its real color. The dot shows the share of discrimination trials you answered correctly there — the test keeps overall difficulty near your limit, so shorter spokes mark your relatively weaker directions.',
  'Ogni raggio rappresenta una regione di tonalità nel suo colore reale. Il punto mostra la quota di prove di discriminazione risposte correttamente in quella zona. Il test mantiene la difficoltà generale vicino al tuo limite, quindi raggi più corti indicano direzioni relativamente più deboli.',
  'Jede Speiche steht für einen Farbtonbereich in seiner tatsächlichen Farbe. Der Punkt zeigt den Anteil richtig beantworteter Unterscheidungsversuche. Der Test hält die Gesamtschwierigkeit nahe Ihrer Grenze; kürzere Speichen markieren daher relativ schwächere Richtungen.',
  'Chaque rayon représente une région de teinte dans sa couleur réelle. Le point indique la part d’essais de discrimination réussis dans cette zone. Le test maintient la difficulté globale près de votre limite ; les rayons plus courts signalent donc des directions relativement plus faibles.',
  'Cada radio representa una región de tono en su color real. El punto muestra la proporción de ensayos de discriminación acertados allí. La prueba mantiene la dificultad general cerca de tu límite, por lo que radios más cortos indican direcciones relativamente más débiles.',
  'Cada raio representa uma região de matiz na sua cor real. O ponto mostra a proporção de ensaios de discriminação respondidos corretamente nessa zona. O teste mantém a dificuldade geral perto do seu limite; raios mais curtos indicam direções relativamente mais fracas.',
);
message('Sequence', 'Sequenza', 'Reihenfolge', 'Séquence', 'Secuencia', 'Sequência');
message(
  'Finest step',
  'Intervallo minimo',
  'Feinster Schritt',
  'Écart minimal',
  'Cambio mínimo',
  'Diferença mínima',
);
message(
  'Finest shift',
  'Spostamento minimo',
  'Kleinste Verschiebung',
  'Décalage minimal',
  'Cambio mínimo',
  'Deslocamento mínimo',
);
message('Rose', 'Rosa', 'Rosa', 'Rose', 'Rosa', 'Rosa');
message('Amber', 'Ambra', 'Bernstein', 'Ambre', 'Ámbar', 'Âmbar');
message('Lime', 'Lime', 'Limette', 'Citron vert', 'Lima', 'Lima');
message('Green', 'Verde', 'Grün', 'Vert', 'Verde', 'Verde');
message('Cyan', 'Ciano', 'Cyan', 'Cyan', 'Cian', 'Ciano');
message('Blue', 'Blu', 'Blau', 'Bleu', 'Azul', 'Azul');
message('Magenta', 'Magenta', 'Magenta', 'Magenta', 'Magenta', 'Magenta');
message('of hue', 'di tonalità', 'im Farbton', 'de teinte', 'de tono', 'de matiz');
message(
  'through noise',
  'attraverso il rumore',
  'durch Rauschen',
  'à travers le bruit',
  'entre ruido',
  'através do ruído',
);
message(
  'correct · smaller angle = finer vision',
  'corrette · angolo minore = visione più fine',
  'richtig · kleinerer Winkel = feinere Sicht',
  'correctes · angle plus petit = vision plus fine',
  'correctas · ángulo menor = visión más fina',
  'corretas · ângulo menor = visão mais fina',
);
message(
  'Hue ordering between fixed anchors',
  'Ordinamento delle tonalità tra estremi fissi',
  'Farbtonsortierung zwischen festen Ankern',
  'Classement des teintes entre des ancrages fixes',
  'Ordenación de tonos entre extremos fijos',
  'Ordenação de matizes entre extremos fixos',
);
message(
  'perfect order · each out-of-place pair costs points',
  'ordine perfetto · ogni coppia fuori posto costa punti',
  'perfekte Reihenfolge · jedes falsche Paar kostet Punkte',
  'ordre parfait · chaque paire mal placée coûte des points',
  'orden perfecto · cada pareja fuera de lugar resta puntos',
  'ordem perfeita · cada par fora do lugar custa pontos',
);
message(
  'How to read this',
  'Come leggere il risultato',
  'So lesen Sie das Ergebnis',
  'Comment lire ce résultat',
  'Cómo leer este resultado',
  'Como ler este resultado',
);
message(
  'Threshold and Field report the smallest hue difference you kept answering correctly, found adaptively (the app floor is 1.2°, near what an sRGB screen can render). The session index weighs them 35% + 35%, plus 30% for Sequence. Scores describe this run on this browser and screen — useful for comparing your own sessions under similar conditions, not a population percentile, diagnosis, or evidence for tetrachromacy.',
  'Soglia e Campo riportano la più piccola differenza di tonalità a cui hai continuato a rispondere correttamente, trovata in modo adattivo (il limite minimo dell’app è 1,2°, vicino a ciò che uno schermo sRGB può riprodurre). L’indice della sessione pesa queste misure al 35% + 35%, più il 30% per Sequenza. I punteggi descrivono questa sessione su questo browser e schermo: sono utili per confrontare le tue sessioni in condizioni simili, non sono un percentile di popolazione, una diagnosi o una prova di tetracromia.',
  'Schwelle und Feld geben den kleinsten Farbtonunterschied an, den Sie wiederholt richtig erkannten; er wird adaptiv bestimmt (die Untergrenze der App liegt bei 1,2°, nahe dem, was ein sRGB-Bildschirm darstellen kann). Der Sitzungsindex gewichtet beide mit 35 % + 35 % und die Reihenfolge mit 30 %. Die Werte beschreiben diesen Durchlauf in diesem Browser und auf diesem Bildschirm – nützlich zum Vergleich eigener Sitzungen unter ähnlichen Bedingungen, nicht als Bevölkerungsperzentil, Diagnose oder Nachweis für Tetrachromasie.',
  'Seuil et Champ indiquent la plus petite différence de teinte à laquelle vous avez continué de répondre correctement, déterminée de manière adaptative (le plancher de l’application est de 1,2°, proche de ce qu’un écran sRGB peut afficher). L’indice de session les pondère à 35 % + 35 %, plus 30 % pour Séquence. Les scores décrivent cette session dans ce navigateur et sur cet écran : ils servent à comparer vos propres sessions dans des conditions similaires, pas à établir un percentile, un diagnostic ou une preuve de tétrachromatie.',
  'Umbral y Campo indican la menor diferencia de tono que seguiste acertando, hallada de forma adaptativa (el límite mínimo de la aplicación es 1,2°, cerca de lo que una pantalla sRGB puede mostrar). El índice de sesión las pondera un 35 % + 35 %, más un 30 % para Secuencia. Las puntuaciones describen esta sesión en este navegador y pantalla: sirven para comparar tus sesiones en condiciones similares, no son un percentil poblacional, un diagnóstico ni una prueba de tetracromía.',
  'Limiar e Campo indicam a menor diferença de matiz a que continuou a responder corretamente, determinada de forma adaptativa (o limite mínimo da aplicação é 1,2°, perto do que um ecrã sRGB consegue mostrar). O índice da sessão pondera ambas em 35 % + 35 %, mais 30 % para Sequência. As pontuações descrevem esta sessão neste navegador e ecrã: servem para comparar as suas sessões em condições semelhantes, não são um percentil populacional, diagnóstico ou prova de tetracromacia.',
);
message(
  'Very fine screen-level discrimination',
  'Discriminazione molto fine sullo schermo',
  'Sehr feine Unterscheidung am Bildschirm',
  'Discrimination très fine à l’écran',
  'Discriminación muy fina en pantalla',
  'Discriminação muito fina no ecrã',
);
message(
  'Fine screen-level discrimination',
  'Discriminazione fine sullo schermo',
  'Feine Unterscheidung am Bildschirm',
  'Discrimination fine à l’écran',
  'Discriminación fina en pantalla',
  'Discriminação fina no ecrã',
);
message(
  'Moderate screen-level discrimination',
  'Discriminazione moderata sullo schermo',
  'Mittlere Unterscheidung am Bildschirm',
  'Discrimination modérée à l’écran',
  'Discriminación moderada en pantalla',
  'Discriminação moderada no ecrã',
);
message(
  'Broad screen-level discrimination',
  'Discriminazione ampia sullo schermo',
  'Grobe Unterscheidung am Bildschirm',
  'Discrimination large à l’écran',
  'Discriminación amplia en pantalla',
  'Discriminação ampla no ecrã',
);
message(
  'You resolved small display differences consistently across the three instruments.',
  'Hai distinto con costanza piccole differenze dello schermo nei tre strumenti.',
  'Sie erkannten kleine Bildschirmunterschiede in allen drei Instrumenten zuverlässig.',
  'Vous avez distingué régulièrement de petites différences d’affichage dans les trois instruments.',
  'Has distinguido de forma constante pequeñas diferencias de pantalla en los tres instrumentos.',
  'Distinguiu de forma consistente pequenas diferenças do ecrã nos três instrumentos.',
);
message(
  'You resolved subtle display differences with a stable overall profile.',
  'Hai distinto sottili differenze dello schermo con un profilo generale stabile.',
  'Sie erkannten feine Bildschirmunterschiede mit einem insgesamt stabilen Profil.',
  'Vous avez distingué de subtiles différences d’affichage avec un profil global stable.',
  'Has distinguido diferencias sutiles de pantalla con un perfil general estable.',
  'Distinguiu diferenças subtis do ecrã com um perfil geral estável.',
);
message(
  'You found clear differences; the finest steps were less consistent in this run.',
  'Hai individuato differenze chiare; gli intervalli più fini sono stati meno costanti in questa sessione.',
  'Sie erkannten deutliche Unterschiede; die feinsten Schritte waren in diesem Durchlauf weniger stabil.',
  'Vous avez repéré des différences nettes ; les écarts les plus fins ont été moins réguliers pendant cette session.',
  'Has encontrado diferencias claras; los cambios más finos fueron menos constantes en esta sesión.',
  'Encontrou diferenças claras; os passos mais finos foram menos consistentes nesta sessão.',
);
message(
  'The smallest display steps were difficult in this run. Screen setup and fatigue can matter.',
  'Gli intervalli più piccoli dello schermo sono stati difficili in questa sessione. Configurazione e stanchezza possono influire.',
  'Die kleinsten Bildschirmschritte waren in diesem Durchlauf schwierig. Einrichtung und Ermüdung können eine Rolle spielen.',
  'Les plus petits écarts d’affichage ont été difficiles pendant cette session. L’installation et la fatigue peuvent compter.',
  'Los cambios más pequeños de pantalla resultaron difíciles en esta sesión. La configuración y el cansancio pueden influir.',
  'Os menores passos do ecrã foram difíceis nesta sessão. A configuração e o cansaço podem influenciar.',
);

// Daltonia.
message(
  'Colour vision / adaptive experiment / about 3 minutes',
  'Visione cromatica / esperimento adattivo / circa 3 minuti',
  'Farbsehen / adaptives Experiment / etwa 3 Minuten',
  'Vision des couleurs / expérience adaptative / environ 3 minutes',
  'Visión cromática / experimento adaptativo / unos 3 minutos',
  'Visão cromática / experiência adaptativa / cerca de 3 minutos',
);
message(
  'Find the gap',
  'Trova l’apertura',
  'Finden Sie die Lücke',
  'Repérez l’ouverture',
  'Encuentra la abertura',
  'Encontre a abertura',
);
message(
  'in the dots',
  'tra i punti',
  'in den Punkten',
  'parmi les points',
  'entre los puntos',
  'entre os pontos',
);
message(
  'Start the experiment',
  'Inizia l’esperimento',
  'Experiment starten',
  'Commencer l’expérience',
  'Empezar el experimento',
  'Iniciar a experiência',
);
message(
  'Where is the clear gap?',
  'Dov’è l’apertura evidente?',
  'Wo ist die deutliche Lücke?',
  'Où est l’ouverture nette ?',
  '¿Dónde está la abertura visible?',
  'Onde está a abertura visível?',
);
message(
  'Where is the gap?',
  'Dov’è l’apertura?',
  'Wo ist die Lücke?',
  'Où est l’ouverture ?',
  '¿Dónde está la abertura?',
  'Onde está a abertura?',
);
message(
  'No gap visible',
  'Nessuna apertura visibile',
  'Keine Lücke sichtbar',
  'Aucune ouverture visible',
  'No se ve ninguna abertura',
  'Nenhuma abertura visível',
);
message(
  'What this result cannot tell you',
  'Cosa non può dirti questo risultato',
  'Was dieses Ergebnis nicht aussagt',
  'Ce que ce résultat ne peut pas indiquer',
  'Lo que este resultado no puede decir',
  'O que este resultado não pode indicar',
);
message(
  'Task controls',
  'Controlli del compito',
  'Aufgabenkontrollen',
  'Contrôles de tâche',
  'Controles de tarea',
  'Controlos da tarefa',
);
message(
  'Learn the C-gap task',
  'Impara il compito dell’apertura nella C',
  'C-Lücken-Aufgabe kennenlernen',
  'Apprendre la tâche de l’ouverture du C',
  'Aprende la tarea de la abertura en C',
  'Aprenda a tarefa da abertura no C',
);
message(
  'Clear dotted practice target with a C-shaped gap',
  'Bersaglio di pratica ben visibile a punti con apertura a forma di C',
  'Deutliches gepunktetes Übungsziel mit C-förmiger Lücke',
  'Cible d’entraînement nette en points avec ouverture en C',
  'Objetivo de práctica claro con puntos y abertura en C',
  'Alvo de prática nítido com pontos e abertura em C',
);
message(
  'Learn the shape here. The measured targets will later become faint.',
  'Impara qui la forma. I bersagli misurati diventeranno poi meno visibili.',
  'Lernen Sie hier die Form kennen. Die Messziele werden später schwächer.',
  'Apprenez la forme ici. Les cibles mesurées deviendront ensuite plus faibles.',
  'Aprende aquí la forma. Los objetivos medidos se volverán después más tenues.',
  'Aprenda aqui a forma. Os alvos medidos tornar-se-ão depois mais ténues.',
);
message(
  'Choose the practice gap direction',
  'Scegli la direzione dell’apertura di pratica',
  'Richtung der Übungslücke wählen',
  'Choisir la direction de l’ouverture d’entraînement',
  'Elige la dirección de la abertura de práctica',
  'Escolha a direção da abertura de prática',
);
message(
  'That is the gap',
  'Quella è l’apertura',
  'Das ist die Lücke',
  'C’est l’ouverture',
  'Esa es la abertura',
  'Essa é a abertura',
);
message(
  'Try this target again',
  'Riprova questo bersaglio',
  'Dieses Ziel erneut versuchen',
  'Réessayez cette cible',
  'Vuelve a intentar este objetivo',
  'Tente este alvo novamente',
);
message(
  'The gap is on the',
  'L’apertura è sul lato',
  'Die Lücke ist',
  'L’ouverture est',
  'La abertura está',
  'A abertura está',
);
message(
  'This clear practice gap is on the',
  'Questa evidente apertura di pratica è sul lato',
  'Diese deutliche Übungslücke ist',
  'Cette ouverture d’entraînement nette est',
  'Esta abertura clara de práctica está',
  'Esta abertura de prática nítida está',
);
message(
  'Follow the open side of the coloured C.',
  'Segui il lato aperto della C colorata.',
  'Folgen Sie der offenen Seite des farbigen C.',
  'Suivez le côté ouvert du C coloré.',
  'Sigue el lado abierto de la C de color.',
  'Siga o lado aberto do C colorido.',
);
message('right', 'destro', 'rechts', 'à droite', 'a la derecha', 'à direita');
message('left', 'sinistro', 'links', 'à gauche', 'a la izquierda', 'à esquerda');
message('top', 'superiore', 'oben', 'en haut', 'arriba', 'em cima');
message('bottom', 'inferiore', 'unten', 'en bas', 'abajo', 'em baixo');
message(
  'Adaptive colour threshold',
  'Soglia cromatica adattiva',
  'Adaptive Farbschwelle',
  'Seuil chromatique adaptatif',
  'Umbral cromático adaptativo',
  'Limiar cromático adaptativo',
);
message(
  'Experiment progress',
  'Avanzamento dell’esperimento',
  'Experimentfortschritt',
  'Progression de l’expérience',
  'Progreso del experimento',
  'Progresso da experiência',
);
message(
  'Dotted colour target with a C-shaped gap',
  'Bersaglio colorato a punti con apertura a forma di C',
  'Gepunktetes Farbziel mit C-förmiger Lücke',
  'Cible colorée en points avec ouverture en C',
  'Objetivo de color con puntos y abertura en C',
  'Alvo colorido com pontos e abertura em C',
);
message(
  'Adaptive response',
  'Risposta adattiva',
  'Adaptive Antwort',
  'Réponse adaptative',
  'Respuesta adaptativa',
  'Resposta adaptativa',
);
message(
  'Some targets should disappear. Say so instead of guessing and that direction will become easier.',
  'Alcuni bersagli dovrebbero scomparire. Segnalalo invece di indovinare e quella direzione diventerà più facile.',
  'Einige Ziele sollten verschwinden. Geben Sie das an, statt zu raten; diese Richtung wird dann leichter.',
  'Certaines cibles devraient disparaître. Indiquez-le au lieu de deviner : cette direction deviendra plus facile.',
  'Algunos objetivos deberían desaparecer. Indícalo en vez de adivinar y esa dirección se volverá más fácil.',
  'Alguns alvos devem desaparecer. Indique-o em vez de adivinhar e essa direção ficará mais fácil.',
);
message(
  'Choose the gap direction',
  'Scegli la direzione dell’apertura',
  'Lückenrichtung wählen',
  'Choisir la direction de l’ouverture',
  'Elige la dirección de la abertura',
  'Escolha a direção da abertura',
);
message('Gap at', 'Apertura sul lato', 'Lücke', 'Ouverture', 'Abertura', 'Abertura');
message(
  'Keyboard: arrow keys · N for no gap',
  'Tastiera: frecce · N per nessuna apertura',
  'Tastatur: Pfeiltasten · N für keine Lücke',
  'Clavier : flèches · N pour aucune ouverture',
  'Teclado: flechas · N para ninguna abertura',
  'Teclado: setas · N para nenhuma abertura',
);
message(
  'Experimental run complete',
  'Sessione sperimentale completata',
  'Experimenteller Durchlauf abgeschlossen',
  'Session expérimentale terminée',
  'Sesión experimental completada',
  'Sessão experimental concluída',
);
message(
  'Display-relative thresholds from this run',
  'Soglie relative allo schermo di questa sessione',
  'Bildschirmbezogene Schwellen dieses Durchlaufs',
  'Seuils liés à l’écran pour cette session',
  'Umbrales relativos a la pantalla de esta sesión',
  'Limiares relativos ao ecrã desta sessão',
);
message(
  'Run inconclusive — repeat the controls',
  'Sessione inconcludente: ripeti i controlli',
  'Durchlauf nicht aussagekräftig – Kontrollen wiederholen',
  'Session non concluante — répétez les contrôles',
  'Sesión no concluyente: repite los controles',
  'Sessão inconclusiva — repita os controlos',
);
message(
  'Lower values mean you followed a smaller colour shift in that direction on this display. The three directions are not clinical scores and should not be compared as diagnoses.',
  'Valori più bassi indicano che hai seguito un cambiamento cromatico minore in quella direzione su questo schermo. Le tre direzioni non sono punteggi clinici e non vanno confrontate come diagnosi.',
  'Niedrigere Werte bedeuten, dass Sie auf diesem Bildschirm eine kleinere Farbverschiebung in dieser Richtung erkannten. Die drei Richtungen sind keine klinischen Werte und dürfen nicht diagnostisch verglichen werden.',
  'Des valeurs plus faibles signifient que vous avez suivi un décalage chromatique plus petit dans cette direction sur cet écran. Les trois directions ne sont pas des scores cliniques et ne doivent pas être comparées comme diagnostics.',
  'Valores más bajos indican que seguiste un cambio cromático menor en esa dirección en esta pantalla. Las tres direcciones no son puntuaciones clínicas y no deben compararse como diagnósticos.',
  'Valores mais baixos indicam que seguiu uma alteração cromática menor nessa direção neste ecrã. As três direções não são pontuações clínicas e não devem ser comparadas como diagnósticos.',
);
message(
  'Too many high-contrast task controls were missed to interpret the adaptive thresholds. Check the instructions and viewing setup, then try again.',
  'Sono stati mancati troppi controlli ad alto contrasto per interpretare le soglie adattive. Verifica le istruzioni e la configurazione visiva, poi riprova.',
  'Zu viele kontrastreiche Kontrollaufgaben wurden verpasst, um die adaptiven Schwellen zu interpretieren. Prüfen Sie Anleitung und Seheinrichtung und versuchen Sie es erneut.',
  'Trop de contrôles à fort contraste ont été manqués pour interpréter les seuils adaptatifs. Vérifiez les instructions et l’installation visuelle, puis réessayez.',
  'Se fallaron demasiados controles de alto contraste para interpretar los umbrales adaptativos. Revisa las instrucciones y la configuración visual y vuelve a intentarlo.',
  'Foram falhados demasiados controlos de alto contraste para interpretar os limiares adaptativos. Reveja as instruções e a configuração visual e tente novamente.',
);
message('L direction', 'Direzione L', 'L-Richtung', 'Direction L', 'Dirección L', 'Direção L');
message('M direction', 'Direzione M', 'M-Richtung', 'Direction M', 'Dirección M', 'Direção M');
message('S direction', 'Direzione S', 'S-Richtung', 'Direction S', 'Dirección S', 'Direção S');
message(
  'Protan-aligned display direction',
  'Direzione dello schermo allineata al protan',
  'Protan-ausgerichtete Bildschirmrichtung',
  'Direction d’écran alignée sur le protan',
  'Dirección de pantalla alineada con protán',
  'Direção do ecrã alinhada com protan',
);
message(
  'Deutan-aligned display direction',
  'Direzione dello schermo allineata al deutan',
  'Deutan-ausgerichtete Bildschirmrichtung',
  'Direction d’écran alignée sur le deutan',
  'Dirección de pantalla alineada con deután',
  'Direção do ecrã alinhada com deutan',
);
message(
  'Tritan-aligned display direction',
  'Direzione dello schermo allineata al tritan',
  'Tritan-ausgerichtete Bildschirmrichtung',
  'Direction d’écran alignée sur le tritan',
  'Dirección de pantalla alineada con tritán',
  'Direção do ecrã alinhada com tritan',
);
message(
  'Staircase settled',
  'Scala stabilizzata',
  'Treppe stabilisiert',
  'Escalier stabilisé',
  'Escalera estabilizada',
  'Escada estabilizada',
);
message(
  'Limited reversals',
  'Inversioni limitate',
  'Wenige Umkehrpunkte',
  'Inversions limitées',
  'Inversiones limitadas',
  'Inversões limitadas',
);
message('reversals', 'inversioni', 'Umkehrpunkte', 'inversions', 'inversiones', 'inversões');
message(
  'Experiment floor confirmed',
  'Limite minimo dell’esperimento confermato',
  'Experimentuntergrenze bestätigt',
  'Plancher de l’expérience confirmé',
  'Límite mínimo del experimento confirmado',
  'Limite mínimo da experiência confirmado',
);
message(
  'Experiment maximum reached',
  'Massimo dell’esperimento raggiunto',
  'Experimentmaximum erreicht',
  'Maximum de l’expérience atteint',
  'Máximo del experimento alcanzado',
  'Máximo da experiência atingido',
);
message('presentations', 'presentazioni', 'Darbietungen', 'présentations', 'presentaciones', 'apresentações');
message(
  'lower measurement bound',
  'limite inferiore della misurazione',
  'untere Messgrenze',
  'limite inférieure de mesure',
  'límite inferior de medición',
  'limite inferior de medição',
);
message(
  'upper measurement bound',
  'limite superiore della misurazione',
  'obere Messgrenze',
  'limite supérieure de mesure',
  'límite superior de medición',
  'limite superior de medição',
);
message(
  'run spread',
  'variabilità della sessione',
  'Laufstreuung',
  'dispersion de la session',
  'dispersión de la sesión',
  'dispersão da sessão',
);
message(
  'High-contrast gap trials',
  'Prove dell’apertura ad alto contrasto',
  'Kontrastreiche Lückenversuche',
  'Essais d’ouverture à fort contraste',
  'Ensayos de abertura de alto contraste',
  'Ensaios de abertura de alto contraste',
);
message(
  'Enough controls were read to report this run.',
  'Sono stati letti abbastanza controlli per riportare questa sessione.',
  'Genügend Kontrollen wurden erkannt, um diesen Durchlauf auszugeben.',
  'Assez de contrôles ont été lus pour présenter cette session.',
  'Se leyeron suficientes controles para informar de esta sesión.',
  'Foram lidos controlos suficientes para apresentar esta sessão.',
);
message(
  'Too many controls were missed; repeat before interpreting thresholds.',
  'Troppi controlli non sono stati rilevati; ripeti prima di interpretare le soglie.',
  'Zu viele Kontrollen wurden verpasst; wiederholen Sie den Test vor der Interpretation.',
  'Trop de contrôles ont été manqués ; répétez avant d’interpréter les seuils.',
  'Se fallaron demasiados controles; repite antes de interpretar los umbrales.',
  'Foram falhados demasiados controlos; repita antes de interpretar os limiares.',
);
message(
  'Daltonia has no clinical norms and has not been validated against an anomaloscope, CAD, Cambridge Colour Test, or a diagnosed cohort. These values cannot confirm or rule out a colour-vision deficiency. Compare repeat runs only on the same display and setup.',
  'Daltonia non ha norme cliniche e non è stato convalidato rispetto a un anomaloscopio, CAD, Cambridge Colour Test o una coorte diagnosticata. Questi valori non possono confermare né escludere una carenza della visione cromatica. Confronta le sessioni ripetute solo sullo stesso schermo e con la stessa configurazione.',
  'Daltonia hat keine klinischen Normen und wurde nicht mit Anomaloskop, CAD, Cambridge Colour Test oder einer diagnostizierten Kohorte validiert. Diese Werte können eine Farbsehschwäche weder bestätigen noch ausschließen. Vergleichen Sie Wiederholungen nur auf demselben Bildschirm und mit derselben Einrichtung.',
  'Daltonia ne dispose pas de normes cliniques et n’a pas été validé par rapport à un anomaloscope, au CAD, au Cambridge Colour Test ou à une cohorte diagnostiquée. Ces valeurs ne peuvent ni confirmer ni exclure une déficience de la vision des couleurs. Comparez les sessions répétées uniquement sur le même écran et avec la même installation.',
  'Daltonia no tiene normas clínicas y no se ha validado frente a anomaloscopio, CAD, Cambridge Colour Test ni una cohorte diagnosticada. Estos valores no pueden confirmar ni descartar una deficiencia de visión cromática. Compara repeticiones solo en la misma pantalla y configuración.',
  'O Daltonia não tem normas clínicas e não foi validado face a anomaloscópio, CAD, Cambridge Colour Test ou uma coorte diagnosticada. Estes valores não podem confirmar nem excluir uma deficiência da visão cromática. Compare repetições apenas no mesmo ecrã e configuração.',
);
message(
  'Copy run summary',
  'Copia il riepilogo della sessione',
  'Laufübersicht kopieren',
  'Copier le résumé de la session',
  'Copiar el resumen de la sesión',
  'Copiar o resumo da sessão',
);

// Tetracromia explanatory copy.
message(
  'A careful, adaptive lab for the differences your display can reproduce—and your eyes can resolve.',
  'Un laboratorio accurato e adattivo per le differenze che il tuo schermo può riprodurre e i tuoi occhi distinguere.',
  'Ein sorgfältiges, adaptives Labor für Unterschiede, die Ihr Bildschirm darstellen und Ihre Augen erkennen können.',
  'Un laboratoire rigoureux et adaptatif pour les différences que votre écran peut reproduire et vos yeux distinguer.',
  'Un laboratorio cuidadoso y adaptativo para las diferencias que tu pantalla puede reproducir y tus ojos distinguir.',
  'Um laboratório rigoroso e adaptativo para as diferenças que o seu ecrã consegue reproduzir e os seus olhos distinguir.',
);
message(
  'display relative',
  'relativo allo schermo',
  'bildschirmbezogen',
  'lié à l’écran',
  'relativo a la pantalla',
  'relativo ao ecrã',
);
message('Hue', 'Tonalità', 'Farbton', 'Teinte', 'Tono', 'Matiz');
message('Field', 'Campo', 'Feld', 'Champ', 'Campo', 'Campo');
message('Order', 'Ordine', 'Reihenfolge', 'Ordre', 'Orden', 'Ordem');
message('The lab', 'Il laboratorio', 'Das Labor', 'Le laboratoire', 'El laboratorio', 'O laboratório');
message(
  'Three views of discrimination.',
  'Tre prospettive sulla discriminazione.',
  'Drei Perspektiven auf die Unterscheidung.',
  'Trois perspectives sur la discrimination.',
  'Tres perspectivas sobre la discriminación.',
  'Três perspetivas sobre a discriminação.',
);
message(
  'No names, no account, no upload. Your session stays in this browser.',
  'Nessun nome, account o caricamento. La sessione rimane in questo browser.',
  'Keine Namen, kein Konto, kein Upload. Ihre Sitzung bleibt in diesem Browser.',
  'Aucun nom, compte ou envoi. Votre session reste dans ce navigateur.',
  'Sin nombres, cuenta ni envíos. Tu sesión permanece en este navegador.',
  'Sem nomes, conta ou envios. A sua sessão fica neste navegador.',
);
message('trials', 'prove', 'Versuche', 'essais', 'ensayos', 'ensaios');
message('runs', 'sessioni', 'Durchläufe', 'sessions', 'sesiones', 'sessões');
message(
  'Pick the one tile whose hue is different. The offset adapts after every answer.',
  'Scegli l’unica tessera con una tonalità diversa. La differenza si adatta dopo ogni risposta.',
  'Wählen Sie die einzige Kachel mit einem anderen Farbton. Der Abstand passt sich nach jeder Antwort an.',
  'Choisissez la seule tuile dont la teinte diffère. L’écart s’adapte après chaque réponse.',
  'Elige la única ficha con un tono diferente. La diferencia se adapta tras cada respuesta.',
  'Escolha a única peça com um matiz diferente. A diferença adapta-se após cada resposta.',
);
message(
  'Find the shifted quadrant through controlled lightness and dot-size noise.',
  'Trova il quadrante diverso nonostante il rumore controllato di luminosità e dimensione dei punti.',
  'Finden Sie den veränderten Quadranten trotz kontrolliertem Helligkeits- und Punktgrößenrauschen.',
  'Repérez le quadrant décalé malgré un bruit contrôlé de luminosité et de taille des points.',
  'Encuentra el cuadrante alterado entre ruido controlado de luminosidad y tamaño de puntos.',
  'Encontre o quadrante alterado apesar do ruído controlado de luminosidade e tamanho dos pontos.',
);
message(
  'Arrange three short hue arcs between fixed endpoints, with no color names as clues.',
  'Ordina tre brevi archi di tonalità tra estremi fissi, senza nomi di colori come indizi.',
  'Ordnen Sie drei kurze Farbtonbögen zwischen festen Endpunkten – ohne Farbnamen als Hinweise.',
  'Ordonnez trois courts arcs de teintes entre des extrémités fixes, sans noms de couleurs comme indices.',
  'Ordena tres arcos cortos de tonos entre extremos fijos, sin nombres de colores como pistas.',
  'Ordene três arcos curtos de matizes entre extremos fixos, sem nomes de cores como pistas.',
);
message(
  'Method, not magic',
  'Metodo, non magia',
  'Methode statt Magie',
  'Une méthode, pas de magie',
  'Método, no magia',
  'Método, não magia',
);
message(
  'The difference gets smaller as you succeed.',
  'La differenza diminuisce quando rispondi correttamente.',
  'Der Unterschied wird mit richtigen Antworten kleiner.',
  'La différence diminue à mesure que vous réussissez.',
  'La diferencia disminuye a medida que aciertas.',
  'A diferença diminui à medida que acerta.',
);
message(
  'Threshold and Field use a two-correct-down, one-error-up staircase. It spends more trials near your current boundary instead of asking the same easy question repeatedly.',
  'Soglia e Campo usano una scala adattiva: due risposte corrette riducono la differenza, un errore la aumenta. Così concentrano più prove vicino al tuo limite attuale invece di ripetere la stessa domanda facile.',
  'Schwelle und Feld verwenden eine Treppe: Nach zwei richtigen Antworten wird es schwieriger, nach einem Fehler leichter. So liegen mehr Versuche nahe Ihrer aktuellen Grenze statt bei wiederholt einfachen Aufgaben.',
  'Seuil et Champ utilisent un escalier : deux bonnes réponses réduisent l’écart, une erreur l’augmente. Davantage d’essais se concentrent ainsi près de votre limite actuelle au lieu de répéter une question facile.',
  'Umbral y Campo usan una escalera: dos aciertos reducen la diferencia y un error la aumenta. Así concentran más ensayos cerca de tu límite actual en vez de repetir una pregunta fácil.',
  'Limiar e Campo usam uma escada: duas respostas certas reduzem a diferença e um erro aumenta-a. Assim, mais ensaios ficam perto do seu limite atual em vez de repetir uma pergunta fácil.',
);
message(
  'Neutral surround',
  'Sfondo neutro',
  'Neutrale Umgebung',
  'Environnement neutre',
  'Entorno neutro',
  'Ambiente neutro',
);
message(
  'Stimuli sit on the same middle-gray chamber in either theme.',
  'Gli stimoli appaiono sullo stesso sfondo grigio medio in entrambi i temi.',
  'Die Reize liegen in beiden Designs auf derselben mittelgrauen Fläche.',
  'Les stimuli apparaissent sur le même fond gris moyen dans les deux thèmes.',
  'Los estímulos aparecen sobre el mismo fondo gris medio en ambos temas.',
  'Os estímulos aparecem sobre o mesmo fundo cinzento médio em ambos os temas.',
);
message(
  'Perceptual spacing',
  'Spaziatura percettiva',
  'Wahrnehmungsabstand',
  'Espacement perceptif',
  'Espaciado perceptivo',
  'Espaçamento percetivo',
);
message(
  'Colors are generated in OKLCH and mapped safely into sRGB.',
  'I colori vengono generati in OKLCH e convertiti in modo sicuro in sRGB.',
  'Farben werden in OKLCH erzeugt und sicher in sRGB abgebildet.',
  'Les couleurs sont générées en OKLCH et converties de manière sûre en sRGB.',
  'Los colores se generan en OKLCH y se convierten de forma segura a sRGB.',
  'As cores são geradas em OKLCH e convertidas de forma segura para sRGB.',
);
message(
  'Adaptive estimate',
  'Stima adattiva',
  'Adaptive Schätzung',
  'Estimation adaptative',
  'Estimación adaptativa',
  'Estimativa adaptativa',
);
message(
  'Reversals around the boundary produce a session-relative threshold.',
  'Le inversioni vicino al limite producono una soglia relativa alla sessione.',
  'Umkehrpunkte an der Grenze ergeben eine sitzungsbezogene Schwelle.',
  'Les inversions autour de la limite produisent un seuil lié à la session.',
  'Las inversiones cerca del límite producen un umbral relativo a la sesión.',
  'As inversões perto do limite produzem um limiar relativo à sessão.',
);
message(
  'Honest result',
  'Risultato onesto',
  'Ehrliches Ergebnis',
  'Résultat honnête',
  'Resultado honesto',
  'Resultado honesto',
);
message(
  'Your profile describes this screen, light, fatigue level, and run.',
  'Il profilo descrive questo schermo, questa luce, il livello di stanchezza e questa sessione.',
  'Ihr Profil beschreibt diesen Bildschirm, dieses Licht, Ihren Ermüdungsgrad und diesen Durchlauf.',
  'Votre profil décrit cet écran, cette lumière, votre niveau de fatigue et cette session.',
  'Tu perfil describe esta pantalla, esta luz, tu nivel de cansancio y esta sesión.',
  'O seu perfil descreve este ecrã, esta luz, o nível de cansaço e esta sessão.',
);
message(
  'The fourth-cone question',
  'La questione del quarto cono',
  'Die Frage des vierten Zapfens',
  'La question du quatrième cône',
  'La cuestión del cuarto cono',
  'A questão do quarto cone',
);
message(
  'An RGB screen cannot test tetrachromacy.',
  'Uno schermo RGB non può verificare la tetracromia.',
  'Ein RGB-Bildschirm kann Tetrachromasie nicht testen.',
  'Un écran RGB ne peut pas tester la tétrachromatie.',
  'Una pantalla RGB no puede comprobar la tetracromía.',
  'Um ecrã RGB não pode testar a tetracromacia.',
);
message(
  'Consumer displays mix three primaries. Confirming functional tetrachromacy requires spectral stimuli that can separate a fourth response, specialized hardware, genetics, and controlled conditions. Tetracromia measures ordinary on-screen color discrimination instead—and says exactly that.',
  'Gli schermi comuni mescolano tre colori primari. Confermare la tetracromia funzionale richiede stimoli spettrali capaci di isolare una quarta risposta, hardware specializzato, genetica e condizioni controllate. Tetracromia misura invece la normale discriminazione cromatica sullo schermo e lo dichiara chiaramente.',
  'Gewöhnliche Bildschirme mischen drei Primärfarben. Der Nachweis funktionaler Tetrachromasie erfordert spektrale Reize, die eine vierte Reaktion trennen können, Spezialhardware, Genetik und kontrollierte Bedingungen. Tetracromia misst stattdessen die gewöhnliche Farbdiskrimination am Bildschirm und sagt das ausdrücklich.',
  'Les écrans grand public mélangent trois couleurs primaires. Confirmer une tétrachromatie fonctionnelle exige des stimuli spectraux capables d’isoler une quatrième réponse, du matériel spécialisé, la génétique et des conditions contrôlées. Tetracromia mesure plutôt la discrimination chromatique ordinaire à l’écran et l’indique clairement.',
  'Las pantallas de consumo mezclan tres primarios. Confirmar una tetracromía funcional exige estímulos espectrales capaces de aislar una cuarta respuesta, equipo especializado, genética y condiciones controladas. Tetracromia mide en cambio la discriminación cromática corriente en pantalla y lo dice claramente.',
  'Os ecrãs comuns misturam três cores primárias. Confirmar tetracromacia funcional exige estímulos espetrais capazes de isolar uma quarta resposta, equipamento especializado, genética e condições controladas. O Tetracromia mede antes a discriminação cromática comum no ecrã e afirma-o claramente.',
);
message(
  'Ready when your screen is',
  'Pronto quando lo è il tuo schermo',
  'Bereit, wenn Ihr Bildschirm bereit ist',
  'Prêt quand votre écran l’est',
  'Listo cuando lo esté tu pantalla',
  'Pronto quando o seu ecrã estiver',
);
message(
  'Find your visible boundary.',
  'Trova il tuo limite visibile.',
  'Finden Sie Ihre sichtbare Grenze.',
  'Trouvez votre limite visible.',
  'Encuentra tu límite visible.',
  'Encontre o seu limite visível.',
);
message(
  'Start the lab',
  'Inizia il laboratorio',
  'Labor starten',
  'Commencer le laboratoire',
  'Empezar el laboratorio',
  'Iniciar o laboratório',
);

// Daltonia explanatory copy.
message(
  'A C-shaped target becomes harder to separate from its field. Three independent staircases estimate the smallest colour shift you follow in each display-relative direction during this run.',
  'Un bersaglio a forma di C diventa sempre più difficile da distinguere dal campo. Tre scale indipendenti stimano il più piccolo cambiamento cromatico che riesci a seguire in ogni direzione relativa allo schermo durante questa sessione.',
  'Ein C-förmiges Ziel wird zunehmend schwerer vom Feld zu unterscheiden. Drei unabhängige Treppen schätzen die kleinste Farbverschiebung, die Sie in jeder bildschirmbezogenen Richtung dieses Durchlaufs erkennen.',
  'Une cible en forme de C devient de plus en plus difficile à distinguer du champ. Trois escaliers indépendants estiment le plus petit décalage chromatique que vous suivez dans chaque direction liée à l’écran pendant cette session.',
  'Un objetivo en forma de C se vuelve cada vez más difícil de distinguir del campo. Tres escaleras independientes estiman el menor cambio cromático que sigues en cada dirección relativa a la pantalla durante esta sesión.',
  'Um alvo em forma de C torna-se cada vez mais difícil de distinguir do campo. Três escadas independentes estimam a menor alteração cromática que consegue seguir em cada direção relativa ao ecrã durante esta sessão.',
);
message(
  'Experimental and unvalidated. This is not a screening result or diagnosis.',
  'Sperimentale e non convalidato. Non è un risultato di screening né una diagnosi.',
  'Experimentell und nicht validiert. Dies ist weder ein Screening-Ergebnis noch eine Diagnose.',
  'Expérimental et non validé. Il ne s’agit ni d’un résultat de dépistage ni d’un diagnostic.',
  'Experimental y sin validar. No es un resultado de cribado ni un diagnóstico.',
  'Experimental e não validado. Não é um resultado de rastreio nem um diagnóstico.',
);
message(
  'Last run on this browser:',
  'Ultima sessione in questo browser:',
  'Letzter Durchlauf in diesem Browser:',
  'Dernière session dans ce navigateur :',
  'Última sesión en este navegador:',
  'Última sessão neste navegador:',
);
message(
  'display-relative thresholds recorded',
  'soglie relative allo schermo registrate',
  'bildschirmbezogene Schwellen erfasst',
  'seuils liés à l’écran enregistrés',
  'umbrales relativos a la pantalla registrados',
  'limiares relativos ao ecrã registados',
);
message(
  'An adaptive task, not a plate score.',
  'Un compito adattivo, non il punteggio di una tavola.',
  'Eine adaptive Aufgabe, kein Farbtafelwert.',
  'Une tâche adaptative, pas le score d’une planche.',
  'Una tarea adaptativa, no la puntuación de una lámina.',
  'Uma tarefa adaptativa, não a pontuação de uma placa.',
);
message(
  'The design borrows established psychophysical techniques without claiming their clinical validation.',
  'Il progetto usa tecniche psicofisiche consolidate senza dichiararne una validazione clinica.',
  'Das Design nutzt etablierte psychophysische Verfahren, ohne eine klinische Validierung zu beanspruchen.',
  'La conception reprend des techniques psychophysiques établies sans revendiquer leur validation clinique.',
  'El diseño toma técnicas psicofísicas consolidadas sin afirmar que estén clínicamente validadas.',
  'O desenho usa técnicas psicofísicas estabelecidas sem alegar validação clínica.',
);
message(
  'Two clear targets teach the C-gap interaction with immediate feedback before any threshold is measured.',
  'Due bersagli ben visibili insegnano l’interazione con l’apertura della C e danno un feedback immediato prima di misurare qualsiasi soglia.',
  'Zwei deutliche Ziele erklären die C-Lücken-Aufgabe mit sofortiger Rückmeldung, bevor eine Schwelle gemessen wird.',
  'Deux cibles nettes enseignent l’interaction avec l’ouverture du C et donnent un retour immédiat avant toute mesure de seuil.',
  'Dos objetivos claros enseñan la interacción con la abertura de la C y dan respuesta inmediata antes de medir ningún umbral.',
  'Dois alvos nítidos ensinam a interação com a abertura do C e dão feedback imediato antes de medir qualquer limiar.',
);
message(
  'Luminance noise',
  'Rumore di luminanza',
  'Luminanzrauschen',
  'Bruit de luminance',
  'Ruido de luminancia',
  'Ruído de luminância',
);
message(
  'Target and field dots share the same brightness variation, reducing a consistent lightness cue.',
  'I punti del bersaglio e del campo condividono la stessa variazione di luminosità, riducendo un indizio costante di chiarezza.',
  'Ziel- und Feldpunkte teilen dieselbe Helligkeitsvariation, wodurch ein gleichbleibender Helligkeitshinweis reduziert wird.',
  'Les points de la cible et du champ partagent la même variation de luminosité, ce qui réduit un indice constant de clarté.',
  'Los puntos del objetivo y del campo comparten la misma variación de brillo, lo que reduce una pista constante de claridad.',
  'Os pontos do alvo e do campo partilham a mesma variação de luminosidade, reduzindo uma pista constante de claridade.',
);
message(
  'Three staircases',
  'Tre scale adattive',
  'Drei Treppen',
  'Trois escaliers',
  'Tres escaleras',
  'Três escadas',
);
message(
  'Directions become harder after correct responses. “No gap visible” counts as a miss and makes that direction easier.',
  'Le direzioni diventano più difficili dopo risposte corrette. “Nessuna apertura visibile” conta come errore e rende più facile quella direzione.',
  'Die Richtungen werden nach richtigen Antworten schwieriger. „Keine Lücke sichtbar“ zählt als Fehler und macht diese Richtung leichter.',
  'Les directions deviennent plus difficiles après de bonnes réponses. « Aucune ouverture visible » compte comme une erreur et facilite cette direction.',
  'Las direcciones se vuelven más difíciles tras los aciertos. «No se ve ninguna abertura» cuenta como fallo y facilita esa dirección.',
  'As direções tornam-se mais difíceis após respostas certas. «Nenhuma abertura visível» conta como falha e facilita essa direção.',
);
message(
  'Run-relative output',
  'Risultato relativo alla sessione',
  'Laufbezogene Ausgabe',
  'Résultat lié à la session',
  'Resultado relativo a la sesión',
  'Resultado relativo à sessão',
);
message(
  'You receive thresholds and run spread, not a normal/deficient label or a clinical score.',
  'Ricevi soglie e variabilità della sessione, non un’etichetta normale/deficitaria né un punteggio clinico.',
  'Sie erhalten Schwellen und Laufstreuung, keine Einstufung als normal/defizitär und keinen klinischen Wert.',
  'Vous recevez des seuils et la dispersion de la session, pas une étiquette normal/déficient ni un score clinique.',
  'Recibes umbrales y dispersión de la sesión, no una etiqueta normal/deficiente ni una puntuación clínica.',
  'Recebe limiares e dispersão da sessão, não um rótulo normal/deficiente nem uma pontuação clínica.',
);
message(
  'What informed Daltonia.',
  'Le basi di Daltonia.',
  'Grundlagen von Daltonia.',
  'Les bases de Daltonia.',
  'Fundamentos de Daltonia.',
  'Fundamentos do Daltonia.',
);
message(
  'These sources inform the stimulus model and task design. They do not validate this implementation.',
  'Queste fonti guidano il modello degli stimoli e la progettazione del compito. Non convalidano questa implementazione.',
  'Diese Quellen prägen Reizmodell und Aufgabendesign. Sie validieren diese Umsetzung nicht.',
  'Ces sources éclairent le modèle des stimuli et la conception de la tâche. Elles ne valident pas cette réalisation.',
  'Estas fuentes orientan el modelo de estímulos y el diseño de la tarea. No validan esta implementación.',
  'Estas fontes orientam o modelo dos estímulos e o desenho da tarefa. Não validam esta implementação.',
);
message(
  'Adaptive colour thresholds',
  'Soglie cromatiche adattive',
  'Adaptive Farbschwellen',
  'Seuils chromatiques adaptatifs',
  'Umbrales cromáticos adaptativos',
  'Limiares cromáticos adaptativos',
);
message(
  'Random Landolt-C orientation, spatial and luminance noise, and interleaved confusion-line staircases.',
  'Orientamento casuale della C di Landolt, rumore spaziale e di luminanza e scale intercalate lungo le linee di confusione.',
  'Zufällige Landolt-C-Ausrichtung, räumliches und Luminanzrauschen sowie verschachtelte Treppen entlang der Verwechslungslinien.',
  'Orientation aléatoire du C de Landolt, bruit spatial et de luminance, et escaliers entrelacés selon les lignes de confusion.',
  'Orientación aleatoria de la C de Landolt, ruido espacial y de luminancia y escaleras intercaladas según líneas de confusión.',
  'Orientação aleatória do C de Landolt, ruído espacial e de luminância e escadas intercaladas segundo linhas de confusão.',
);
message(
  'Cone-contrast testing',
  'Test del contrasto dei coni',
  'Zapfenkontrast-Test',
  'Test de contraste des cônes',
  'Prueba de contraste de conos',
  'Teste de contraste dos cones',
);
message(
  'Randomized cone-specific optotypes and validation against anomaloscope and plate results.',
  'Ottotipi casuali specifici per i coni e validazione rispetto ai risultati di anomaloscopio e tavole.',
  'Randomisierte zapfenspezifische Sehzeichen und Validierung gegenüber Anomaloskop- und Farbtafelergebnissen.',
  'Optotypes aléatoires propres aux cônes et validation par rapport aux résultats de l’anomaloscope et des planches.',
  'Optotipos aleatorios específicos de conos y validación frente a resultados de anomaloscopio y láminas.',
  'Optótipos aleatórios específicos dos cones e validação face a resultados de anomaloscópio e placas.',
);
message(
  'Modern screener validation',
  'Validazione di uno screening moderno',
  'Validierung eines modernen Screenings',
  'Validation d’un dépistage moderne',
  'Validación de un cribado moderno',
  'Validação de um rastreio moderno',
);
message(
  'A multicentre comparison on calibrated displays demonstrates the evidence required for screening claims.',
  'Un confronto multicentrico su schermi calibrati mostra le prove necessarie per dichiarazioni di screening.',
  'Ein multizentrischer Vergleich auf kalibrierten Bildschirmen zeigt, welche Evidenz für Screening-Aussagen erforderlich ist.',
  'Une comparaison multicentrique sur des écrans étalonnés montre les preuves nécessaires pour revendiquer un dépistage.',
  'Una comparación multicéntrica en pantallas calibradas demuestra la evidencia necesaria para afirmar que es un cribado.',
  'Uma comparação multicêntrica em ecrãs calibrados demonstra a evidência necessária para alegações de rastreio.',
);

// Riflessi.
message(
  'Response lab / three instruments / about 7 minutes',
  'Laboratorio di risposta / tre strumenti / circa 7 minuti',
  'Reaktionslabor / drei Instrumente / etwa 7 Minuten',
  'Laboratoire de réponse / trois instruments / environ 7 minutes',
  'Laboratorio de respuesta / tres instrumentos / unos 7 minutos',
  'Laboratório de resposta / três instrumentos / cerca de 7 minutos',
);
message(
  'Notice the signal.',
  'Nota il segnale.',
  'Signal erkennen.',
  'Repérez le signal.',
  'Detecta la señal.',
  'Detete o sinal.',
);
message(
  'Measure the response.',
  'Misura la risposta.',
  'Reaktion messen.',
  'Mesurez la réponse.',
  'Mide la respuesta.',
  'Meça a resposta.',
);
message(
  'Prepare the lab',
  'Prepara il laboratorio',
  'Labor vorbereiten',
  'Préparer le laboratoire',
  'Preparar el laboratorio',
  'Preparar o laboratório',
);
message(
  'Browser and device latency remain in every measurement.',
  'La latenza del browser e del dispositivo rimane in ogni misurazione.',
  'Browser- und Gerätelatenz bleibt in jeder Messung enthalten.',
  'La latence du navigateur et de l’appareil reste présente dans chaque mesure.',
  'La latencia del navegador y del dispositivo permanece en cada medición.',
  'A latência do navegador e do dispositivo permanece em cada medição.',
);
message(
  'Three questions, kept separate.',
  'Tre domande, mantenute separate.',
  'Drei getrennte Fragen.',
  'Trois questions séparées.',
  'Tres preguntas separadas.',
  'Três perguntas separadas.',
);
message(
  'Simple visual response',
  'Risposta visiva semplice',
  'Einfache visuelle Reaktion',
  'Réponse visuelle simple',
  'Respuesta visual simple',
  'Resposta visual simples',
);
message(
  'Two-choice response',
  'Risposta a due scelte',
  'Zwei-Wahl-Reaktion',
  'Réponse à deux choix',
  'Respuesta de dos opciones',
  'Resposta de duas escolhas',
);
message(
  'Sustained response',
  'Risposta sostenuta',
  'Anhaltende Reaktion',
  'Réponse soutenue',
  'Respuesta sostenida',
  'Resposta sustentada',
);
message(
  'One signal. One action.',
  'Un segnale. Un’azione.',
  'Ein Signal. Eine Aktion.',
  'Un signal. Une action.',
  'Una señal. Una acción.',
  'Um sinal. Uma ação.',
);
message(
  'See a side. Choose it.',
  'Vedi un lato. Sceglilo.',
  'Seite sehen. Auswählen.',
  'Voyez un côté. Choisissez-le.',
  'Mira un lado. Elígelo.',
  'Veja um lado. Escolha-o.',
);
message(
  'Keep the response steady.',
  'Mantieni la risposta costante.',
  'Reaktion konstant halten.',
  'Gardez une réponse régulière.',
  'Mantén una respuesta constante.',
  'Mantenha a resposta constante.',
);
message(
  'Choose one response path.',
  'Scegli una modalità di risposta.',
  'Wählen Sie einen Reaktionsweg.',
  'Choisissez un mode de réponse.',
  'Elige un modo de respuesta.',
  'Escolha um modo de resposta.',
);
message(
  'How will you respond?',
  'Come risponderai?',
  'Wie möchten Sie reagieren?',
  'Comment allez-vous répondre ?',
  '¿Cómo vas a responder?',
  'Como vai responder?',
);
message('Keyboard', 'Tastiera', 'Tastatur', 'Clavier', 'Teclado', 'Teclado');
message(
  'Touch / pointer',
  'Tocco / puntatore',
  'Touch / Zeiger',
  'Tactile / pointeur',
  'Táctil / puntero',
  'Toque / ponteiro',
);
message(
  'Begin measured block',
  'Inizia il blocco misurato',
  'Messblock starten',
  'Commencer le bloc mesuré',
  'Empezar el bloque medido',
  'Iniciar o bloco medido',
);
message(
  'Start the 3-minute run',
  'Inizia la sessione di 3 minuti',
  '3-Minuten-Lauf starten',
  'Commencer la session de 3 minutes',
  'Empezar la sesión de 3 minutos',
  'Iniciar a sessão de 3 minutos',
);
message(
  'Wait for the signal',
  'Attendi il segnale',
  'Auf das Signal warten',
  'Attendez le signal',
  'Espera la señal',
  'Aguarde o sinal',
);
message(
  'Respond now',
  'Rispondi ora',
  'Jetzt reagieren',
  'Répondez maintenant',
  'Responde ahora',
  'Responda agora',
);
message(
  'Choose the matching side',
  'Scegli il lato corrispondente',
  'Passende Seite wählen',
  'Choisissez le côté correspondant',
  'Elige el lado correspondiente',
  'Escolha o lado correspondente',
);
message(
  'Practice complete',
  'Pratica completata',
  'Übung abgeschlossen',
  'Entraînement terminé',
  'Práctica completada',
  'Prática concluída',
);
message(
  'Now the measured block.',
  'Ora il blocco misurato.',
  'Jetzt folgt der Messblock.',
  'Place au bloc mesuré.',
  'Ahora el bloque medido.',
  'Agora o bloco medido.',
);
message(
  'Instrument complete',
  'Strumento completato',
  'Instrument abgeschlossen',
  'Instrument terminé',
  'Instrumento completado',
  'Instrumento concluído',
);
message(
  'Your response has',
  'La tua risposta ha',
  'Ihre Reaktion hat',
  'Votre réponse comporte',
  'Tu respuesta tiene',
  'A sua resposta tem',
);
message(
  'more than one dimension.',
  'più di una dimensione.',
  'mehr als eine Dimension.',
  'plus d’une dimension.',
  'más de una dimensión.',
  'mais de uma dimensão.',
);
message(
  'Compare conditions, not people.',
  'Confronta le condizioni, non le persone.',
  'Bedingungen vergleichen, nicht Menschen.',
  'Comparez les conditions, pas les personnes.',
  'Compara condiciones, no personas.',
  'Compare condições, não pessoas.',
);
message(
  'Timing context',
  'Contesto temporale',
  'Zeitmesskontext',
  'Contexte temporel',
  'Contexto temporal',
  'Contexto temporal',
);
message(
  'Response events',
  'Eventi di risposta',
  'Reaktionsereignisse',
  'Événements de réponse',
  'Eventos de respuesta',
  'Eventos de resposta',
);
message(
  'Riflessi separates simple response speed, the extra cost of choosing, and how responses change across a sustained run. It reports this device and this session—nothing broader.',
  'Riflessi separa la velocità di risposta semplice, il costo aggiuntivo della scelta e il modo in cui le risposte cambiano durante una sessione prolungata. Descrive questo dispositivo e questa sessione, nulla di più.',
  'Riflessi trennt einfache Reaktionsgeschwindigkeit, die zusätzlichen Kosten einer Wahl und Veränderungen während eines längeren Durchlaufs. Es beschreibt nur dieses Gerät und diese Sitzung.',
  'Riflessi distingue la vitesse de réponse simple, le coût supplémentaire du choix et l’évolution des réponses pendant une session prolongée. Il décrit cet appareil et cette session, rien de plus.',
  'Riflessi separa la velocidad de respuesta simple, el coste añadido de elegir y cómo cambian las respuestas durante una sesión prolongada. Describe este dispositivo y esta sesión, nada más.',
  'O Riflessi separa a velocidade de resposta simples, o custo adicional da escolha e a forma como as respostas mudam durante uma sessão prolongada. Descreve este dispositivo e esta sessão, nada mais.',
);
message(
  'No percentile, “brain age,” or reflex rating. Each instrument answers a narrower question.',
  'Nessun percentile, “età cerebrale” o valutazione dei riflessi. Ogni strumento risponde a una domanda più specifica.',
  'Kein Perzentil, „Gehirnalter“ oder Reflexwert. Jedes Instrument beantwortet eine enger gefasste Frage.',
  'Aucun percentile, « âge cérébral » ou note de réflexes. Chaque instrument répond à une question plus précise.',
  'Sin percentiles, «edad cerebral» ni valoración de reflejos. Cada instrumento responde a una pregunta más concreta.',
  'Sem percentil, «idade cerebral» ou classificação de reflexos. Cada instrumento responde a uma questão mais específica.',
);
message(
  'Wait while the chamber is quiet, then respond as soon as the central mark appears. Random waits make anticipation visible.',
  'Attendi mentre il campo è vuoto, poi rispondi appena appare il segno centrale. Le attese casuali rendono visibile l’anticipazione.',
  'Warten Sie, solange die Fläche ruhig ist, und reagieren Sie, sobald die mittlere Markierung erscheint. Zufällige Wartezeiten machen Vorwegnahmen sichtbar.',
  'Attendez pendant que la zone reste vide, puis répondez dès que le repère central apparaît. Des attentes aléatoires rendent l’anticipation visible.',
  'Espera mientras el área está vacía y responde en cuanto aparezca la marca central. Las esperas aleatorias hacen visible la anticipación.',
  'Aguarde enquanto a área está vazia e responda assim que a marca central aparecer. Esperas aleatórias tornam visível a antecipação.',
);
message(
  'A left or right arrow appears. Respond on the matching side. The difference from Segnale estimates the cost of choosing.',
  'Appare una freccia a sinistra o a destra. Rispondi dal lato corrispondente. La differenza rispetto a Segnale stima il costo della scelta.',
  'Ein Pfeil nach links oder rechts erscheint. Reagieren Sie auf der passenden Seite. Der Unterschied zu Segnale schätzt die Kosten der Wahl.',
  'Une flèche vers la gauche ou la droite apparaît. Répondez du côté correspondant. La différence avec Segnale estime le coût du choix.',
  'Aparece una flecha a la izquierda o derecha. Responde en el lado correspondiente. La diferencia respecto a Segnale estima el coste de elegir.',
  'Surge uma seta para a esquerda ou direita. Responda no lado correspondente. A diferença face ao Segnale estima o custo da escolha.',
);
message(
  'For three minutes, respond to the same simple signal across longer, irregular waits. The pattern within this run matters more than one fastest press.',
  'Per tre minuti, rispondi allo stesso segnale semplice dopo attese più lunghe e irregolari. L’andamento nella sessione conta più di una singola pressione veloce.',
  'Reagieren Sie drei Minuten lang auf dasselbe einfache Signal nach längeren, unregelmäßigen Wartezeiten. Das Muster im Durchlauf ist wichtiger als ein einzelner schnellster Tastendruck.',
  'Pendant trois minutes, répondez au même signal simple après des attentes plus longues et irrégulières. Le profil de la session compte davantage qu’une seule réponse très rapide.',
  'Durante tres minutos, responde a la misma señal simple tras esperas más largas e irregulares. El patrón de la sesión importa más que una sola pulsación rápida.',
  'Durante três minutos, responda ao mesmo sinal simples após esperas mais longas e irregulares. O padrão da sessão importa mais do que uma única resposta muito rápida.',
);
message(
  'What informed Riflessi.',
  'Le basi di Riflessi.',
  'Grundlagen von Riflessi.',
  'Les bases de Riflessi.',
  'Fundamentos de Riflessi.',
  'Fundamentos do Riflessi.',
);
message(
  'Established task structures inform the design. They do not validate an uncontrolled browser as a clinical instrument.',
  'Strutture di compito consolidate guidano il progetto. Non convalidano un browser non controllato come strumento clinico.',
  'Etablierte Aufgabenstrukturen prägen das Design. Sie validieren einen unkontrollierten Browser nicht als klinisches Instrument.',
  'Des structures de tâches établies guident la conception. Elles ne valident pas un navigateur non contrôlé comme instrument clinique.',
  'Estructuras de tareas consolidadas orientan el diseño. No validan un navegador sin controlar como instrumento clínico.',
  'Estruturas de tarefas estabelecidas orientam o desenho. Não validam um navegador não controlado como instrumento clínico.',
);
message(
  'Simple and choice response',
  'Risposta semplice e a scelta',
  'Einfache Reaktion und Wahlreaktion',
  'Réponse simple et à choix',
  'Respuesta simple y de elección',
  'Resposta simples e de escolha',
);
message(
  'A transparent reaction-time task with practice, randomized intervals, and separate simple and choice measures.',
  'Un compito trasparente sui tempi di reazione con pratica, intervalli casuali e misure separate della risposta semplice e a scelta.',
  'Eine transparente Reaktionszeitaufgabe mit Übung, zufälligen Intervallen und getrennten Maßen für einfache und Wahlreaktionen.',
  'Une tâche transparente de temps de réaction avec entraînement, intervalles aléatoires et mesures distinctes des réponses simples et à choix.',
  'Una tarea transparente de tiempo de reacción con práctica, intervalos aleatorios y medidas separadas de respuesta simple y de elección.',
  'Uma tarefa transparente de tempo de reação com prática, intervalos aleatórios e medidas separadas de resposta simples e de escolha.',
);
message(
  'Brief vigilance task',
  'Breve compito di vigilanza',
  'Kurze Vigilanzaufgabe',
  'Brève tâche de vigilance',
  'Tarea breve de vigilancia',
  'Tarefa breve de vigilância',
);
message(
  'The three-minute PVT-B informs the sustained-response duration and emphasis on lapses and false starts.',
  'Il PVT-B di tre minuti guida la durata della risposta sostenuta e l’attenzione a rallentamenti e false partenze.',
  'Der dreiminütige PVT-B prägt die Dauer der anhaltenden Reaktion und den Fokus auf Aussetzer und Fehlstarts.',
  'Le PVT-B de trois minutes guide la durée de la réponse soutenue et l’attention portée aux ralentissements et faux départs.',
  'El PVT-B de tres minutos orienta la duración de la respuesta sostenida y el énfasis en lapsos y salidas falsas.',
  'O PVT-B de três minutos orienta a duração da resposta sustentada e a atenção a lapsos e falsos arranques.',
);
message(
  'Browser timing reality',
  'Realtà dei tempi nel browser',
  'Realität der Browser-Zeitmessung',
  'Réalité de la mesure dans le navigateur',
  'Realidad de la medición en el navegador',
  'Realidade da medição no navegador',
);
message(
  'Browser experiments can be precise enough for many effects, while input hardware and presentation still add latency.',
  'Gli esperimenti nel browser possono essere abbastanza precisi per molti effetti, ma hardware di input e presentazione aggiungono comunque latenza.',
  'Browserexperimente können für viele Effekte präzise genug sein, während Eingabegeräte und Darstellung weiterhin Latenz hinzufügen.',
  'Les expériences dans le navigateur peuvent être assez précises pour de nombreux effets, mais le matériel d’entrée et la présentation ajoutent toujours de la latence.',
  'Los experimentos en el navegador pueden ser suficientemente precisos para muchos efectos, aunque el hardware de entrada y la presentación siguen añadiendo latencia.',
  'As experiências no navegador podem ser suficientemente precisas para muitos efeitos, embora o equipamento de entrada e a apresentação continuem a adicionar latência.',
);

// Udito explanatory copy.
message(
  'Three low tones play in sequence. Choose the quietest. A phase-based decoy helps check whether the sound is arriving like headphones, without claiming to identify your hardware.',
  'Tre toni bassi vengono riprodotti in sequenza. Scegli il più debole. Un diversivo basato sulla fase aiuta a verificare se il suono arriva come in cuffia, senza pretendere di identificare l’hardware.',
  'Drei tiefe Töne werden nacheinander abgespielt. Wählen Sie den leisesten. Ein phasenbasierter Köder hilft zu prüfen, ob der Klang kopfhörerähnlich ankommt, ohne Ihre Hardware identifizieren zu wollen.',
  'Trois sons graves sont joués successivement. Choisissez le plus faible. Un leurre fondé sur la phase aide à vérifier si le son arrive comme au casque, sans prétendre identifier votre matériel.',
  'Se reproducen tres tonos graves seguidos. Elige el más débil. Un señuelo basado en la fase ayuda a comprobar si el sonido llega como por auriculares, sin pretender identificar el equipo.',
  'São reproduzidos três tons graves em sequência. Escolha o mais fraco. Um engodo baseado na fase ajuda a verificar se o som chega como por auscultadores, sem pretender identificar o equipamento.',
);
message(
  'One of three intervals contains a tone. Its frequency adapts to find the upper boundary available in this run, on this device, at the locked volume.',
  'Uno dei tre intervalli contiene un tono. La frequenza si adatta per trovare il limite superiore disponibile in questa sessione, su questo dispositivo e al volume bloccato.',
  'Eines von drei Intervallen enthält einen Ton. Seine Frequenz passt sich an, um die obere Grenze dieses Durchlaufs auf diesem Gerät bei fester Lautstärke zu finden.',
  'Un des trois intervalles contient un son. Sa fréquence s’adapte pour trouver la limite supérieure disponible pendant cette session, sur cet appareil et au volume verrouillé.',
  'Uno de los tres intervalos contiene un tono. Su frecuencia se adapta para hallar el límite superior disponible en esta sesión, en este dispositivo y con el volumen fijado.',
  'Um dos três intervalos contém um tom. A frequência adapta-se para encontrar o limite superior disponível nesta sessão, neste dispositivo e com o volume fixo.',
);
message(
  'Two tones play in sequence. Separate adaptive tracks estimate the smallest pitch step resolved around 500 Hz and 2 kHz.',
  'Due toni vengono riprodotti in sequenza. Percorsi adattivi separati stimano il più piccolo intervallo di intonazione distinto intorno a 500 Hz e 2 kHz.',
  'Zwei Töne werden nacheinander abgespielt. Getrennte adaptive Spuren schätzen den kleinsten erkannten Tonhöhenschritt um 500 Hz und 2 kHz.',
  'Deux sons sont joués successivement. Des pistes adaptatives distinctes estiment le plus petit écart de hauteur distingué autour de 500 Hz et 2 kHz.',
  'Se reproducen dos tonos seguidos. Pistas adaptativas separadas estiman el menor cambio de tono distinguido alrededor de 500 Hz y 2 kHz.',
  'São reproduzidos dois tons em sequência. Percursos adaptativos separados estimam a menor diferença de altura distinguida perto de 500 Hz e 2 kHz.',
);
message(
  'Established task structures inform the experiment. Consumer audio hardware remains uncalibrated.',
  'Strutture di compito consolidate guidano l’esperimento. L’hardware audio di consumo rimane non calibrato.',
  'Etablierte Aufgabenstrukturen prägen das Experiment. Audiogeräte für Verbraucher bleiben unkalibriert.',
  'Des structures de tâches établies guident l’expérience. Le matériel audio grand public reste non étalonné.',
  'Estructuras de tareas consolidadas orientan el experimento. El equipo de audio de consumo sigue sin calibrar.',
  'Estruturas de tarefas estabelecidas orientam a experiência. O equipamento áudio comum continua não calibrado.',
);
message(
  'A six-trial, three-alternative phase-cancellation task informs Cuffie and its cautious setup language.',
  'Un compito di cancellazione di fase a sei prove e tre alternative guida Cuffie e il suo linguaggio prudente sulla configurazione.',
  'Eine Phasenauslöschungsaufgabe mit sechs Versuchen und drei Alternativen prägt Cuffie und seine vorsichtige Einrichtungssprache.',
  'Une tâche d’annulation de phase à six essais et trois choix guide Cuffie et son langage prudent sur l’installation.',
  'Una tarea de cancelación de fase con seis ensayos y tres alternativas orienta Cuffie y su lenguaje prudente sobre la configuración.',
  'Uma tarefa de cancelamento de fase com seis ensaios e três alternativas orienta o Cuffie e a sua linguagem prudente sobre a configuração.',
);
message(
  'Transformed up-down staircases inform the reversal-based Portata and Intonazione estimates.',
  'Le scale up-down trasformate guidano le stime di Portata e Intonazione basate sulle inversioni.',
  'Transformierte Auf-und-ab-Treppen prägen die umkehrpunktbasierten Schätzungen von Portata und Intonazione.',
  'Des escaliers ascendants-descendants transformés guident les estimations de Portata et Intonazione fondées sur les inversions.',
  'Las escaleras ascendentes-descendentes transformadas orientan las estimaciones de Portata e Intonazione basadas en inversiones.',
  'Escadas ascendentes-descendentes transformadas orientam as estimativas de Portata e Intonazione baseadas em inversões.',
);
message(
  'Browser psychoacoustics',
  'Psicoacustica nel browser',
  'Browser-Psychoakustik',
  'Psychoacoustique dans le navigateur',
  'Psicoacústica en el navegador',
  'Psicoacústica no navegador',
);
message(
  'Web and mobile adaptive frequency-discrimination work supports the browser task structure—not clinical interpretation.',
  'Il lavoro sulla discriminazione adattiva delle frequenze sul web e su dispositivi mobili sostiene la struttura del compito nel browser, non un’interpretazione clinica.',
  'Arbeiten zur adaptiven Frequenzunterscheidung im Web und auf Mobilgeräten stützen die Browser-Aufgabenstruktur – nicht die klinische Interpretation.',
  'Les travaux sur la discrimination adaptative des fréquences sur le Web et mobile étayent la structure de la tâche dans le navigateur, pas son interprétation clinique.',
  'El trabajo sobre discriminación adaptativa de frecuencias en web y móvil respalda la estructura de la tarea en el navegador, no su interpretación clínica.',
  'O trabalho sobre discriminação adaptativa de frequências na Web e em dispositivos móveis apoia a estrutura da tarefa no navegador, não a interpretação clínica.',
);
message(
  'Safe-listening guidance informs the low reference, volume lock, short tones, and stop warnings.',
  'Le indicazioni per l’ascolto sicuro guidano il riferimento debole, il blocco del volume, i toni brevi e gli avvisi di interruzione.',
  'Empfehlungen für sicheres Hören prägen die leise Referenz, die feste Lautstärke, kurze Töne und Stoppwarnungen.',
  'Les recommandations d’écoute sûre guident la référence faible, le verrouillage du volume, les sons courts et les avertissements d’arrêt.',
  'Las recomendaciones de escucha segura orientan la referencia suave, el bloqueo del volumen, los tonos breves y los avisos de parada.',
  'As orientações de audição segura guiam a referência baixa, o bloqueio do volume, os tons breves e os avisos de paragem.',
);
message(
  'Copy result summary',
  'Copia il riepilogo dei risultati',
  'Ergebnisübersicht kopieren',
  'Copier le résumé des résultats',
  'Copiar el resumen de resultados',
  'Copiar o resumo dos resultados',
);
// Riflessi task and result states.
message('practice', 'pratica', 'Übung', 'entraînement', 'práctica', 'prática');
message(
  'practice complete',
  'pratica completata',
  'Übung abgeschlossen',
  'entraînement terminé',
  'práctica completada',
  'prática concluída',
);
message(
  'Measurement recorded:',
  'Misurazione registrata:',
  'Messung erfasst:',
  'Mesure enregistrée :',
  'Medición registrada:',
  'Medição registada:',
);
message(
  'Keyboard timing',
  'Cronometraggio con tastiera',
  'Zeitmessung per Tastatur',
  'Chronométrage au clavier',
  'Medición con teclado',
  'Cronometragem com teclado',
);
message(
  'Touch / pointer timing',
  'Cronometraggio con tocco / puntatore',
  'Zeitmessung per Touch / Zeiger',
  'Chronométrage tactile / pointeur',
  'Medición táctil / puntero',
  'Cronometragem por toque / ponteiro',
);
message('Median of', 'Mediana di', 'Median aus', 'Médiane de', 'Mediana de', 'Mediana de');
message(
  'clean responses',
  'risposte valide',
  'saubere Reaktionen',
  'réponses valides',
  'respuestas válidas',
  'respostas válidas',
);
message(
  'measured events',
  'eventi misurati',
  'Messereignisse',
  'événements mesurés',
  'eventos medidos',
  'eventos medidos',
);
message('Under', 'Sotto', 'Unter', 'Sous', 'Menos de', 'Abaixo de');
message(
  'Keep the same hand position. Early responses, misses, and no-signal responses will be recorded.',
  'Mantieni la stessa posizione della mano. Verranno registrate risposte anticipate, mancate e risposte senza segnale.',
  'Behalten Sie dieselbe Handposition. Frühe Reaktionen, Auslassungen und Reaktionen ohne Signal werden erfasst.',
  'Gardez la même position de la main. Les réponses précoces, manquées et sans signal seront enregistrées.',
  'Mantén la misma posición de la mano. Se registrarán respuestas anticipadas, fallos y respuestas sin señal.',
  'Mantenha a mesma posição da mão. Serão registadas respostas antecipadas, falhas e respostas sem sinal.',
);
message(
  'Keep the same hand position. Early responses, misses, and wrong sides will be recorded.',
  'Mantieni la stessa posizione della mano. Verranno registrate risposte anticipate, mancate e lati errati.',
  'Behalten Sie dieselbe Handposition. Frühe Reaktionen, Auslassungen und falsche Seiten werden erfasst.',
  'Gardez la même position de la main. Les réponses précoces, manquées et les mauvais côtés seront enregistrés.',
  'Mantén la misma posición de la mano. Se registrarán respuestas anticipadas, fallos y lados incorrectos.',
  'Mantenha a mesma posição da mão. Serão registadas respostas antecipadas, falhas e lados errados.',
);
message(
  'Please acknowledge the device-relative limit before starting.',
  'Conferma il limite relativo al dispositivo prima di iniziare.',
  'Bestätigen Sie vor dem Start die gerätebezogene Grenze.',
  'Confirmez la limite liée à l’appareil avant de commencer.',
  'Confirma el límite relativo al dispositivo antes de empezar.',
  'Confirme o limite relativo ao dispositivo antes de começar.',
);
message(
  '8 practice responses, then 20 measured signals and 2 no-signal checks.',
  '8 risposte di pratica, poi 20 segnali misurati e 2 controlli senza segnale.',
  '8 Übungsreaktionen, dann 20 Messsignale und 2 Prüfungen ohne Signal.',
  '8 réponses d’entraînement, puis 20 signaux mesurés et 2 contrôles sans signal.',
  '8 respuestas de práctica, luego 20 señales medidas y 2 controles sin señal.',
  '8 respostas de prática, depois 20 sinais medidos e 2 controlos sem sinal.',
);
message(
  '8 practice choices, then 32 balanced measured choices.',
  '8 scelte di pratica, poi 32 scelte misurate e bilanciate.',
  '8 Übungswahlen, dann 32 ausgewogene Messwahlen.',
  '8 choix d’entraînement, puis 32 choix mesurés et équilibrés.',
  '8 elecciones de práctica, luego 32 elecciones medidas y equilibradas.',
  '8 escolhas de prática, depois 32 escolhas medidas e equilibradas.',
);
message(
  'A 3-minute PVT-B-inspired sequence. No fatigue or attention diagnosis is inferred.',
  'Una sequenza di 3 minuti ispirata al PVT-B. Non viene dedotta alcuna diagnosi di stanchezza o attenzione.',
  'Eine dreiminütige, vom PVT-B inspirierte Sequenz. Es wird keine Ermüdungs- oder Aufmerksamkeitsdiagnose abgeleitet.',
  'Une séquence de 3 minutes inspirée du PVT-B. Aucun diagnostic de fatigue ou d’attention n’est déduit.',
  'Una secuencia de 3 minutos inspirada en el PVT-B. No se deduce ningún diagnóstico de fatiga o atención.',
  'Uma sequência de 3 minutos inspirada no PVT-B. Não é inferido qualquer diagnóstico de fadiga ou atenção.',
);
message(
  'Rest one hand near the arrow keys. Use the matching key.',
  'Tieni una mano vicino ai tasti freccia. Usa il tasto corrispondente.',
  'Legen Sie eine Hand an die Pfeiltasten. Verwenden Sie die passende Taste.',
  'Gardez une main près des flèches. Utilisez la touche correspondante.',
  'Deja una mano cerca de las flechas. Usa la tecla correspondiente.',
  'Mantenha uma mão junto às setas. Use a tecla correspondente.',
);
message(
  'Rest one thumb or finger on Space. Do not hold it down.',
  'Appoggia un pollice o un dito sulla barra spaziatrice. Non tenerla premuta.',
  'Legen Sie Daumen oder Finger auf die Leertaste. Halten Sie sie nicht gedrückt.',
  'Posez un pouce ou un doigt sur Espace. Ne maintenez pas la touche enfoncée.',
  'Apoya un pulgar o dedo en Espacio. No lo mantengas pulsado.',
  'Apoie um polegar ou dedo no Espaço. Não mantenha a tecla premida.',
);
message(
  'Keep two thumbs or fingers ready. Tap the matching side.',
  'Tieni pronti due pollici o dita. Tocca il lato corrispondente.',
  'Halten Sie zwei Daumen oder Finger bereit. Tippen Sie auf die passende Seite.',
  'Gardez deux pouces ou doigts prêts. Touchez le côté correspondant.',
  'Ten preparados dos pulgares o dedos. Toca el lado correspondiente.',
  'Mantenha dois polegares ou dedos prontos. Toque no lado correspondente.',
);
message(
  'Keep one finger ready. Tap anywhere inside the chamber.',
  'Tieni pronto un dito. Tocca un punto qualsiasi all’interno del campo.',
  'Halten Sie einen Finger bereit. Tippen Sie irgendwo in die Fläche.',
  'Gardez un doigt prêt. Touchez n’importe où dans la zone.',
  'Ten un dedo preparado. Toca en cualquier lugar dentro del área.',
  'Mantenha um dedo pronto. Toque em qualquer ponto dentro da área.',
);
message('Measured run', 'Sessione misurata', 'Messlauf', 'Session mesurée', 'Sesión medida', 'Sessão medida');
message(
  'Instrument progress',
  'Avanzamento dello strumento',
  'Instrumentfortschritt',
  'Progression de l’instrument',
  'Progreso del instrumento',
  'Progresso do instrumento',
);
message(
  'Respond left',
  'Rispondi a sinistra',
  'Links reagieren',
  'Répondre à gauche',
  'Responder a la izquierda',
  'Responder à esquerda',
);
message(
  'Respond right',
  'Rispondi a destra',
  'Rechts reagieren',
  'Répondre à droite',
  'Responder a la derecha',
  'Responder à direita',
);
message('left key', 'tasto sinistro', 'linke Taste', 'touche gauche', 'tecla izquierda', 'tecla esquerda');
message('right key', 'tasto destro', 'rechte Taste', 'touche droite', 'tecla derecha', 'tecla direita');
message(
  'tap left',
  'tocca a sinistra',
  'links tippen',
  'toucher à gauche',
  'toca a la izquierda',
  'tocar à esquerda',
);
message(
  'tap right',
  'tocca a destra',
  'rechts tippen',
  'toucher à droite',
  'toca a la derecha',
  'tocar à direita',
);
message(
  'Respond to signal',
  'Rispondi al segnale',
  'Auf Signal reagieren',
  'Répondre au signal',
  'Responder a la señal',
  'Responder ao sinal',
);
message(
  'press space',
  'premi spazio',
  'Leertaste drücken',
  'appuyer sur Espace',
  'pulsa espacio',
  'premir espaço',
);
message(
  'tap chamber',
  'tocca il campo',
  'Fläche antippen',
  'toucher la zone',
  'toca el área',
  'tocar na área',
);
message(
  'Respond only after the signal',
  'Rispondi solo dopo il segnale',
  'Erst nach dem Signal reagieren',
  'Répondez uniquement après le signal',
  'Responde solo después de la señal',
  'Responda apenas após o sinal',
);
message('timing', 'cronometraggio', 'Zeitmessung', 'chronométrage', 'medición', 'cronometragem');
message('Good wait', 'Buona attesa', 'Gut gewartet', 'Bonne attente', 'Buena espera', 'Boa espera');
message('Other side', 'Altro lato', 'Andere Seite', 'Autre côté', 'Otro lado', 'Outro lado');
message(
  'No response',
  'Nessuna risposta',
  'Keine Reaktion',
  'Aucune réponse',
  'Sin respuesta',
  'Sem resposta',
);
message('Too early', 'Troppo presto', 'Zu früh', 'Trop tôt', 'Demasiado pronto', 'Demasiado cedo');
message(
  'Keep the same hand position. Early responses, misses, and',
  'Mantieni la stessa posizione della mano. Verranno registrati risposte anticipate, mancate e',
  'Behalten Sie dieselbe Handposition. Frühe Reaktionen, Auslassungen und',
  'Gardez la même position de la main. Les réponses précoces, manquées et',
  'Mantén la misma posición de la mano. Se registrarán respuestas anticipadas, fallos y',
  'Mantenha a mesma posição da mão. Serão registadas respostas antecipadas, falhas e',
);
message(
  'wrong sides',
  'lati errati',
  'falsche Seiten',
  'mauvais côtés',
  'lados incorrectos',
  'lados errados',
);
message(
  'no-signal responses',
  'risposte senza segnale',
  'Reaktionen ohne Signal',
  'réponses sans signal',
  'respuestas sin señal',
  'respostas sem sinal',
);
message(
  'will be recorded.',
  'verranno registrate.',
  'werden erfasst.',
  'seront enregistrées.',
  'se registrarán.',
  'serão registadas.',
);
message(
  'clean response',
  'risposta valida',
  'saubere Reaktion',
  'réponse valide',
  'respuesta válida',
  'resposta válida',
);
message(
  'captured across',
  'registrate in',
  'erfasst bei',
  'enregistrées sur',
  'registradas en',
  'registadas em',
);
message(
  'measured event',
  'evento misurato',
  'Messereignis',
  'événement mesuré',
  'evento medido',
  'evento medido',
);
message(
  'Interpretation waits until all three instruments are complete.',
  'L’interpretazione attende il completamento di tutti e tre gli strumenti.',
  'Die Interpretation erfolgt erst nach Abschluss aller drei Instrumente.',
  'L’interprétation attend la fin des trois instruments.',
  'La interpretación espera hasta completar los tres instrumentos.',
  'A interpretação aguarda a conclusão dos três instrumentos.',
);

message(
  'Your response profile — Riflessi | Sense6',
  'Il tuo profilo di risposta — Riflessi | Sense6',
  'Ihr Reaktionsprofil — Riflessi | Sense6',
  'Votre profil de réponse — Riflessi | Sense6',
  'Tu perfil de respuesta — Riflessi | Sense6',
  'O seu perfil de resposta — Riflessi | Sense6',
);
message(
  'Riflessi / this run / this device',
  'Riflessi / questa sessione / questo dispositivo',
  'Riflessi / dieser Durchlauf / dieses Gerät',
  'Riflessi / cette session / cet appareil',
  'Riflessi / esta sesión / este dispositivo',
  'Riflessi / esta sessão / este dispositivo',
);
message(
  'The three instruments captured enough clean responses for a run-level profile.',
  'I tre strumenti hanno raccolto abbastanza risposte valide per un profilo della sessione.',
  'Die drei Instrumente erfassten genügend saubere Reaktionen für ein Laufprofil.',
  'Les trois instruments ont recueilli assez de réponses valides pour établir un profil de session.',
  'Los tres instrumentos recogieron suficientes respuestas válidas para un perfil de sesión.',
  'Os três instrumentos recolheram respostas válidas suficientes para um perfil da sessão.',
);
message(
  'Several responses were interrupted or invalid. Treat the numbers as a partial run and repeat under steadier conditions.',
  'Diverse risposte sono state interrotte o non valide. Considera i numeri come una sessione parziale e ripeti in condizioni più stabili.',
  'Mehrere Reaktionen waren unterbrochen oder ungültig. Behandeln Sie die Werte als Teildurchlauf und wiederholen Sie unter stabileren Bedingungen.',
  'Plusieurs réponses ont été interrompues ou invalides. Considérez les chiffres comme une session partielle et répétez dans des conditions plus stables.',
  'Varias respuestas se interrumpieron o no fueron válidas. Trata las cifras como una sesión parcial y repite en condiciones más estables.',
  'Várias respostas foram interrompidas ou inválidas. Considere os números como uma sessão parcial e repita em condições mais estáveis.',
);
message(
  'Run usable',
  'Sessione utilizzabile',
  'Durchlauf nutzbar',
  'Session exploitable',
  'Sesión utilizable',
  'Sessão utilizável',
);
message(
  'Limited run',
  'Sessione limitata',
  'Eingeschränkter Durchlauf',
  'Session limitée',
  'Sesión limitada',
  'Sessão limitada',
);
message(
  'Typical signal response',
  'Risposta tipica al segnale',
  'Typische Signalreaktion',
  'Réponse typique au signal',
  'Respuesta típica a la señal',
  'Resposta típica ao sinal',
);
message(
  'clean simple responses. Typical is more robust than your single fastest response.',
  'risposte semplici valide. Il valore tipico è più robusto della singola risposta più veloce.',
  'saubere einfache Reaktionen. Der typische Wert ist robuster als Ihre einzelne schnellste Reaktion.',
  'réponses simples valides. La valeur typique est plus robuste que votre réponse la plus rapide.',
  'respuestas simples válidas. El valor típico es más sólido que tu única respuesta más rápida.',
  'respostas simples válidas. O valor típico é mais robusto do que a sua resposta mais rápida.',
);
message(
  'Choice response',
  'Risposta a scelta',
  'Wahlreaktion',
  'Réponse à choix',
  'Respuesta de elección',
  'Resposta de escolha',
);
message('correct across', 'corrette su', 'richtig bei', 'correctes sur', 'correctas en', 'corretas em');
message(
  'valid choices.',
  'scelte valide.',
  'gültigen Wahlen.',
  'choix valides.',
  'elecciones válidas.',
  'escolhas válidas.',
);
message(
  'Choice cost',
  'Costo della scelta',
  'Wahlkosten',
  'Coût du choix',
  'Coste de elección',
  'Custo da escolha',
);
message(
  'Difference between the choice and simple-response medians in this run.',
  'Differenza tra le mediane della risposta a scelta e semplice in questa sessione.',
  'Differenz zwischen den Medianen von Wahl- und einfacher Reaktion in diesem Durchlauf.',
  'Différence entre les médianes des réponses à choix et simples pendant cette session.',
  'Diferencia entre las medianas de respuesta de elección y simple en esta sesión.',
  'Diferença entre as medianas da resposta de escolha e simples nesta sessão.',
);
message(
  'clean responses across the sustained block.',
  'risposte valide nel blocco sostenuto.',
  'saubere Reaktionen im anhaltenden Block.',
  'réponses valides pendant le bloc soutenu.',
  'respuestas válidas en el bloque sostenido.',
  'respostas válidas no bloco sustentado.',
);
message(
  'Slow-response tail',
  'Coda delle risposte lente',
  'Langsame Reaktionsflanke',
  'Traîne des réponses lentes',
  'Cola de respuestas lentas',
  'Cauda de respostas lentas',
);
message(
  'How much slower the slowest fifth was than the sustained median.',
  'Quanto il quinto più lento è stato più lento della mediana sostenuta.',
  'Wie viel langsamer das langsamste Fünftel als der Median des anhaltenden Blocks war.',
  'Écart entre le cinquième le plus lent et la médiane soutenue.',
  'Cuánto más lento fue el quinto más lento que la mediana sostenida.',
  'Quanto o quinto mais lento foi mais lento do que a mediana sustentada.',
);
message(
  'Within-run drift',
  'Variazione nella sessione',
  'Verlauf im Durchlauf',
  'Dérive pendant la session',
  'Deriva durante la sesión',
  'Variação durante a sessão',
);
message(
  'Not enough clean responses to estimate a first-to-second-half change.',
  'Non ci sono abbastanza risposte valide per stimare il cambiamento tra la prima e la seconda metà.',
  'Nicht genügend saubere Reaktionen, um eine Veränderung zwischen erster und zweiter Hälfte zu schätzen.',
  'Pas assez de réponses valides pour estimer l’évolution entre la première et la seconde moitié.',
  'No hay suficientes respuestas válidas para estimar el cambio entre la primera y la segunda mitad.',
  'Não há respostas válidas suficientes para estimar a mudança entre a primeira e a segunda metade.',
);
message(
  'The first and second halves were similar after rounding to 5 ms.',
  'La prima e la seconda metà erano simili dopo l’arrotondamento a 5 ms.',
  'Erste und zweite Hälfte waren nach Rundung auf 5 ms ähnlich.',
  'Les première et seconde moitiés étaient similaires après arrondi à 5 ms.',
  'La primera y la segunda mitad fueron similares tras redondear a 5 ms.',
  'A primeira e a segunda metade foram semelhantes após arredondar a 5 ms.',
);
message(
  'The second half was slower than the first half in this run.',
  'La seconda metà è stata più lenta della prima in questa sessione.',
  'Die zweite Hälfte war in diesem Durchlauf langsamer als die erste.',
  'La seconde moitié a été plus lente que la première pendant cette session.',
  'La segunda mitad fue más lenta que la primera en esta sesión.',
  'A segunda metade foi mais lenta do que a primeira nesta sessão.',
);
message(
  'The second half was faster than the first half in this run.',
  'La seconda metà è stata più veloce della prima in questa sessione.',
  'Die zweite Hälfte war in diesem Durchlauf schneller als die erste.',
  'La seconde moitié a été plus rapide que la première pendant cette session.',
  'La segunda mitad fue más rápida que la primera en esta sesión.',
  'A segunda metade foi mais rápida do que a primeira nesta sessão.',
);
message(
  'What accompanied the medians.',
  'Ciò che ha accompagnato le mediane.',
  'Was die Mediane begleitete.',
  'Ce qui accompagnait les médianes.',
  'Lo que acompañó a las medianas.',
  'O que acompanhou as medianas.',
);
message('False starts', 'False partenze', 'Fehlstarts', 'Faux départs', 'Salidas falsas', 'Falsos arranques');
message(
  'Missed signals',
  'Segnali mancati',
  'Verpasste Signale',
  'Signaux manqués',
  'Señales perdidas',
  'Sinais falhados',
);
message(
  'Wrong choices',
  'Scelte errate',
  'Falsche Wahlen',
  'Mauvais choix',
  'Elecciones incorrectas',
  'Escolhas erradas',
);
message('Input', 'Input', 'Eingabe', 'Entrée', 'Entrada', 'Entrada');
message(
  'Frame cadence',
  'Cadenza dei fotogrammi',
  'Bildrate',
  'Cadence des images',
  'Cadencia de fotogramas',
  'Cadência de fotogramas',
);
message('Unknown', 'Sconosciuto', 'Unbekannt', 'Inconnu', 'Desconocido', 'Desconhecido');
message(
  'Interrupted trials',
  'Prove interrotte',
  'Unterbrochene Versuche',
  'Essais interrompus',
  'Ensayos interrumpidos',
  'Ensaios interrompidos',
);
message(
  'How to use this result',
  'Come usare questo risultato',
  'So verwenden Sie dieses Ergebnis',
  'Comment utiliser ce résultat',
  'Cómo usar este resultado',
  'Como usar este resultado',
);
message(
  'Browser, display, keyboard, touchscreen, operating system, posture, and attention all remain in the numbers. Compare repeated runs only on the same device and input. Riflessi does not assess concussion, driving fitness, fatigue, neurological health, or a population percentile.',
  'Browser, schermo, tastiera, touchscreen, sistema operativo, postura e attenzione restano tutti nei numeri. Confronta le sessioni ripetute solo sullo stesso dispositivo e con lo stesso input. Riflessi non valuta commozioni cerebrali, idoneità alla guida, stanchezza, salute neurologica o percentili di popolazione.',
  'Browser, Bildschirm, Tastatur, Touchscreen, Betriebssystem, Haltung und Aufmerksamkeit bleiben in den Werten enthalten. Vergleichen Sie Wiederholungen nur auf demselben Gerät und mit derselben Eingabe. Riflessi beurteilt weder Gehirnerschütterung, Fahrtauglichkeit, Müdigkeit, neurologische Gesundheit noch Bevölkerungsperzentile.',
  'Le navigateur, l’écran, le clavier, l’écran tactile, le système d’exploitation, la posture et l’attention restent présents dans les chiffres. Comparez les sessions répétées uniquement sur le même appareil et avec la même entrée. Riflessi n’évalue ni commotion, aptitude à conduire, fatigue, santé neurologique ni percentile de population.',
  'El navegador, la pantalla, el teclado, la pantalla táctil, el sistema operativo, la postura y la atención permanecen en las cifras. Compara sesiones repetidas solo en el mismo dispositivo y con la misma entrada. Riflessi no evalúa conmociones, aptitud para conducir, fatiga, salud neurológica ni percentiles poblacionales.',
  'O navegador, o ecrã, o teclado, o ecrã tátil, o sistema operativo, a postura e a atenção permanecem nos números. Compare sessões repetidas apenas no mesmo dispositivo e com a mesma entrada. O Riflessi não avalia concussões, aptidão para conduzir, fadiga, saúde neurológica ou percentis populacionais.',
);
message(
  'Timing interruptions observed',
  'Interruzioni di cronometraggio rilevate',
  'Unterbrechungen der Zeitmessung erkannt',
  'Interruptions de chronométrage observées',
  'Interrupciones de medición observadas',
  'Interrupções de cronometragem observadas',
);
message(
  'At least one focus interruption or unusually late presentation occurred. Raw response times were not “corrected”; repeat if conditions were unstable.',
  'Si è verificata almeno un’interruzione della messa a fuoco o una presentazione insolitamente tardiva. I tempi grezzi non sono stati “corretti”; ripeti se le condizioni erano instabili.',
  'Mindestens eine Fokusunterbrechung oder ungewöhnlich späte Darbietung trat auf. Die Rohreaktionszeiten wurden nicht „korrigiert“; wiederholen Sie bei instabilen Bedingungen.',
  'Au moins une perte de focus ou une présentation anormalement tardive s’est produite. Les temps bruts n’ont pas été « corrigés » ; répétez si les conditions étaient instables.',
  'Hubo al menos una interrupción de foco o una presentación inusualmente tardía. Los tiempos brutos no se «corrigieron»; repite si las condiciones eran inestables.',
  'Ocorreu pelo menos uma perda de foco ou apresentação anormalmente tardia. Os tempos brutos não foram «corrigidos»; repita se as condições eram instáveis.',
);
message(
  'Timing appeared steady',
  'Cronometraggio apparentemente stabile',
  'Zeitmessung wirkte stabil',
  'Chronométrage apparemment stable',
  'Medición aparentemente estable',
  'Cronometragem aparentemente estável',
);
message(
  'No major interruption was observed by the page. This does not remove unknown display or input-device latency.',
  'La pagina non ha rilevato interruzioni importanti. Ciò non elimina la latenza sconosciuta dello schermo o del dispositivo di input.',
  'Die Seite erkannte keine größere Unterbrechung. Unbekannte Bildschirm- oder Eingabegerätelatenz bleibt bestehen.',
  'La page n’a observé aucune interruption majeure. Cela ne supprime pas la latence inconnue de l’écran ou du dispositif d’entrée.',
  'La página no observó interrupciones importantes. Esto no elimina la latencia desconocida de pantalla o dispositivo de entrada.',
  'A página não observou interrupções importantes. Isto não elimina a latência desconhecida do ecrã ou dispositivo de entrada.',
);

message(
  'End this session? Your progress will be lost.',
  'Terminare questa sessione? I progressi andranno persi.',
  'Diese Sitzung beenden? Ihr Fortschritt geht verloren.',
  'Terminer cette session ? Votre progression sera perdue.',
  '¿Finalizar esta sesión? Se perderá el progreso.',
  'Terminar esta sessão? O progresso será perdido.',
);
message(
  'Leave the lab? Your progress will be lost.',
  'Uscire dal laboratorio? I progressi andranno persi.',
  'Labor verlassen? Ihr Fortschritt geht verloren.',
  'Quitter le laboratoire ? Votre progression sera perdue.',
  '¿Salir del laboratorio? Se perderá el progreso.',
  'Sair do laboratório? O progresso será perdido.',
);
message(
  'End this experiment? Your progress will be lost.',
  'Terminare questo esperimento? I progressi andranno persi.',
  'Dieses Experiment beenden? Ihr Fortschritt geht verloren.',
  'Terminer cette expérience ? Votre progression sera perdue.',
  '¿Finalizar este experimento? Se perderá el progreso.',
  'Terminar esta experiência? O progresso será perdido.',
);
message(
  'Leave the experiment? Your progress will be lost.',
  'Uscire dall’esperimento? I progressi andranno persi.',
  'Experiment verlassen? Ihr Fortschritt geht verloren.',
  'Quitter l’expérience ? Votre progression sera perdue.',
  '¿Salir del experimento? Se perderá el progreso.',
  'Sair da experiência? O progresso será perdido.',
);
message(
  'Prepare your screen — Tetracromia | Sense6',
  'Prepara lo schermo — Tetracromia | Sense6',
  'Bildschirm vorbereiten — Tetracromia | Sense6',
  'Préparez votre écran — Tetracromia | Sense6',
  'Prepara la pantalla — Tetracromia | Sense6',
  'Prepare o ecrã — Tetracromia | Sense6',
);
message(
  'Prepare your display — Daltonia | Sense6',
  'Prepara lo schermo — Daltonia | Sense6',
  'Bildschirm vorbereiten — Daltonia | Sense6',
  'Préparez votre écran — Daltonia | Sense6',
  'Prepara la pantalla — Daltonia | Sense6',
  'Prepare o ecrã — Daltonia | Sense6',
);
message(
  'Your display-relative thresholds — Daltonia | Sense6',
  'Le tue soglie relative allo schermo — Daltonia | Sense6',
  'Ihre bildschirmbezogenen Schwellen — Daltonia | Sense6',
  'Vos seuils liés à l’écran — Daltonia | Sense6',
  'Tus umbrales relativos a la pantalla — Daltonia | Sense6',
  'Os seus limiares relativos ao ecrã — Daltonia | Sense6',
);
message(
  'Prepare your response setup — Riflessi | Sense6',
  'Prepara la configurazione di risposta — Riflessi | Sense6',
  'Reaktionseinrichtung vorbereiten — Riflessi | Sense6',
  'Préparez votre dispositif de réponse — Riflessi | Sense6',
  'Prepara la configuración de respuesta — Riflessi | Sense6',
  'Prepare a configuração de resposta — Riflessi | Sense6',
);
message(
  'Prepare your audio setup — Udito | Sense6',
  'Prepara la configurazione audio — Udito | Sense6',
  'Audioeinrichtung vorbereiten — Udito | Sense6',
  'Préparez votre installation audio — Udito | Sense6',
  'Prepara la configuración de audio — Udito | Sense6',
  'Prepare a configuração áudio — Udito | Sense6',
);
message(
  'Reference played',
  'Riferimento riprodotto',
  'Referenz abgespielt',
  'Référence lue',
  'Referencia reproducida',
  'Referência reproduzida',
);
message(
  'Result summary copied.',
  'Riepilogo dei risultati copiato.',
  'Ergebnisübersicht kopiert.',
  'Résumé des résultats copié.',
  'Resumen de resultados copiado.',
  'Resumo dos resultados copiado.',
);
message(
  'Copy was unavailable in this browser.',
  'La copia non è disponibile in questo browser.',
  'Kopieren war in diesem Browser nicht verfügbar.',
  'La copie n’était pas disponible dans ce navigateur.',
  'La copia no estaba disponible en este navegador.',
  'A cópia não estava disponível neste navegador.',
);
message(
  'Result summary copied',
  'Riepilogo dei risultati copiato',
  'Ergebnisübersicht kopiert',
  'Résumé des résultats copié',
  'Resumen de resultados copiado',
  'Resumo dos resultados copiado',
);
message(
  'Run summary copied',
  'Riepilogo della sessione copiato',
  'Laufübersicht kopiert',
  'Résumé de la session copié',
  'Resumen de la sesión copiado',
  'Resumo da sessão copiado',
);
message(
  'Could not access the clipboard',
  'Impossibile accedere agli appunti',
  'Kein Zugriff auf die Zwischenablage',
  'Impossible d’accéder au presse-papiers',
  'No se pudo acceder al portapapeles',
  'Não foi possível aceder à área de transferência',
);
message(
  'Tetracromia — {overall}/100 screen-level color discrimination. Threshold {threshold}, Field {field}, Sequence {sequence}. Device-relative, not diagnostic.',
  'Tetracromia — {overall}/100 discriminazione cromatica sullo schermo. Soglia {threshold}, Campo {field}, Sequenza {sequence}. Relativo al dispositivo, non diagnostico.',
  'Tetracromia — {overall}/100 Farbdiskrimination am Bildschirm. Schwelle {threshold}, Feld {field}, Reihenfolge {sequence}. Gerätebezogen, nicht diagnostisch.',
  'Tetracromia — {overall}/100 discrimination chromatique à l’écran. Seuil {threshold}, Champ {field}, Séquence {sequence}. Lié à l’appareil, non diagnostique.',
  'Tetracromia — {overall}/100 discriminación cromática en pantalla. Umbral {threshold}, Campo {field}, Secuencia {sequence}. Relativo al dispositivo, no diagnóstico.',
  'Tetracromia — {overall}/100 discriminação cromática no ecrã. Limiar {threshold}, Campo {field}, Sequência {sequence}. Relativo ao dispositivo, não diagnóstico.',
);
message(
  'Daltonia experimental browser run — {thresholds}; task controls {correct}/{total}. Display-relative, unvalidated, and not diagnostic.',
  'Sessione sperimentale Daltonia nel browser — {thresholds}; controlli del compito {correct}/{total}. Relativa allo schermo, non convalidata e non diagnostica.',
  'Experimenteller Daltonia-Browserdurchlauf — {thresholds}; Aufgabenkontrollen {correct}/{total}. Bildschirmbezogen, nicht validiert und nicht diagnostisch.',
  'Session expérimentale Daltonia dans le navigateur — {thresholds} ; contrôles de tâche {correct}/{total}. Liée à l’écran, non validée et non diagnostique.',
  'Sesión experimental Daltonia en el navegador — {thresholds}; controles de tarea {correct}/{total}. Relativa a la pantalla, sin validar y no diagnóstica.',
  'Sessão experimental Daltonia no navegador — {thresholds}; controlos da tarefa {correct}/{total}. Relativa ao ecrã, não validada e não diagnóstica.',
);
message(
  'Riflessi — device-relative response profile',
  'Riflessi — profilo di risposta relativo al dispositivo',
  'Riflessi — gerätebezogenes Reaktionsprofil',
  'Riflessi — profil de réponse lié à l’appareil',
  'Riflessi — perfil de respuesta relativo al dispositivo',
  'Riflessi — perfil de resposta relativo ao dispositivo',
);
message(
  'Input: {input}',
  'Input: {input}',
  'Eingabe: {input}',
  'Entrée : {input}',
  'Entrada: {input}',
  'Entrada: {input}',
);
message(
  'Signal median: {value} ms',
  'Mediana del segnale: {value} ms',
  'Signalmedian: {value} ms',
  'Médiane du signal : {value} ms',
  'Mediana de señal: {value} ms',
  'Mediana do sinal: {value} ms',
);
message(
  'Choice median: {median} ms; accuracy: {accuracy}%; cost: {cost} ms',
  'Mediana della scelta: {median} ms; accuratezza: {accuracy}%; costo: {cost} ms',
  'Wahlmedian: {median} ms; Genauigkeit: {accuracy} %; Kosten: {cost} ms',
  'Médiane du choix : {median} ms ; exactitude : {accuracy} % ; coût : {cost} ms',
  'Mediana de elección: {median} ms; precisión: {accuracy}%; coste: {cost} ms',
  'Mediana da escolha: {median} ms; exatidão: {accuracy}%; custo: {cost} ms',
);
message(
  'Sustained median: {median} ms; slow tail: {tail} ms; drift: {drift} ms',
  'Mediana sostenuta: {median} ms; coda lenta: {tail} ms; variazione: {drift} ms',
  'Median anhaltend: {median} ms; langsame Flanke: {tail} ms; Verlauf: {drift} ms',
  'Médiane soutenue : {median} ms ; traîne lente : {tail} ms ; dérive : {drift} ms',
  'Mediana sostenida: {median} ms; cola lenta: {tail} ms; deriva: {drift} ms',
  'Mediana sustentada: {median} ms; cauda lenta: {tail} ms; variação: {drift} ms',
);
message(
  'Events: {falseStarts} false starts, {anticipations} anticipations, {misses} misses',
  'Eventi: {falseStarts} false partenze, {anticipations} anticipazioni, {misses} mancate',
  'Ereignisse: {falseStarts} Fehlstarts, {anticipations} Vorwegnahmen, {misses} Auslassungen',
  'Événements : {falseStarts} faux départs, {anticipations} anticipations, {misses} réponses manquées',
  'Eventos: {falseStarts} salidas falsas, {anticipations} anticipaciones, {misses} fallos',
  'Eventos: {falseStarts} falsos arranques, {anticipations} antecipações, {misses} falhas',
);
message(
  'Compare only on the same device and input. Not a clinical or population score.',
  'Confronta solo sullo stesso dispositivo e con lo stesso input. Non è un punteggio clinico o di popolazione.',
  'Nur auf demselben Gerät und mit derselben Eingabe vergleichen. Kein klinischer oder Bevölkerungswert.',
  'Comparez uniquement sur le même appareil et avec la même entrée. Ce n’est pas un score clinique ou de population.',
  'Compara solo en el mismo dispositivo y con la misma entrada. No es una puntuación clínica ni poblacional.',
  'Compare apenas no mesmo dispositivo e com a mesma entrada. Não é uma pontuação clínica ou populacional.',
);
message(
  'touch / pointer',
  'tocco / puntatore',
  'Touch / Zeiger',
  'tactile / pointeur',
  'táctil / puntero',
  'toque / ponteiro',
);
message('keyboard', 'tastiera', 'Tastatur', 'clavier', 'teclado', 'teclado');
message(
  'Udito — device-relative listening profile',
  'Udito — profilo di ascolto relativo al dispositivo',
  'Udito — gerätebezogenes Hörprofil',
  'Udito — profil d’écoute lié à l’appareil',
  'Udito — perfil auditivo relativo al dispositivo',
  'Udito — perfil auditivo relativo ao dispositivo',
);
message(
  'Setup: {device}; {sampleRate} Hz audio context',
  'Configurazione: {device}; contesto audio a {sampleRate} Hz',
  'Einrichtung: {device}; Audiokontext mit {sampleRate} Hz',
  'Installation : {device} ; contexte audio à {sampleRate} Hz',
  'Configuración: {device}; contexto de audio a {sampleRate} Hz',
  'Configuração: {device}; contexto áudio a {sampleRate} Hz',
);
message(
  'Headphone confidence: {correct}/{trials} ({confidence})',
  'Affidabilità delle cuffie: {correct}/{trials} ({confidence})',
  'Kopfhörer-Konfidenz: {correct}/{trials} ({confidence})',
  'Confiance casque : {correct}/{trials} ({confidence})',
  'Confianza en auriculares: {correct}/{trials} ({confidence})',
  'Confiança nos auscultadores: {correct}/{trials} ({confidence})',
);
message(
  'Upper run boundary: {boundary}',
  'Limite superiore della sessione: {boundary}',
  'Obere Laufgrenze: {boundary}',
  'Limite supérieure de la session : {boundary}',
  'Límite superior de la sesión: {boundary}',
  'Limite superior da sessão: {boundary}',
);
message(
  'Pitch step near 500 Hz: {step}',
  'Intervallo di intonazione vicino a 500 Hz: {step}',
  'Tonhöhenschritt um 500 Hz: {step}',
  'Écart de hauteur près de 500 Hz : {step}',
  'Cambio de tono cerca de 500 Hz: {step}',
  'Diferença de altura perto de 500 Hz: {step}',
);
message(
  'Pitch step near 2 kHz: {step}',
  'Intervallo di intonazione vicino a 2 kHz: {step}',
  'Tonhöhenschritt um 2 kHz: {step}',
  'Écart de hauteur près de 2 kHz : {step}',
  'Cambio de tono cerca de 2 kHz: {step}',
  'Diferença de altura perto de 2 kHz: {step}',
);
message(
  'headphone-like',
  'compatibile con le cuffie',
  'kopfhörerähnlich',
  'compatible avec un casque',
  'similar a auriculares',
  'semelhante a auscultadores',
);
message('uncertain', 'incerto', 'unsicher', 'incertain', 'incierto', 'incerto');
message(
  'This is not dB HL, a hearing-age score, screening, or diagnosis.',
  'Non è dB HL, un punteggio di età uditiva, uno screening o una diagnosi.',
  'Dies ist weder dB HL noch ein Höralterswert, Screening oder eine Diagnose.',
  'Il ne s’agit ni de dB HL, ni d’un score d’âge auditif, ni d’un dépistage ou diagnostic.',
  'No es dB HL, una puntuación de edad auditiva, un cribado ni un diagnóstico.',
  'Não é dB HL, uma pontuação de idade auditiva, um rastreio ou diagnóstico.',
);

message(
  'Private browser tests for colour, response timing, and hearing. Careful results, visible limits, nothing uploaded.',
  'Test privati nel browser per colore, tempi di risposta e udito. Risultati accurati, limiti visibili, nessun caricamento.',
  'Private Browsertests für Farbe, Reaktionszeit und Hören. Sorgfältige Ergebnisse, sichtbare Grenzen, keine Uploads.',
  'Tests privés dans le navigateur pour la couleur, le temps de réponse et l’audition. Résultats rigoureux, limites visibles, aucun envoi.',
  'Pruebas privadas en el navegador de color, tiempo de respuesta y audición. Resultados cuidadosos, límites visibles, sin envíos.',
  'Testes privados no navegador para cor, tempo de resposta e audição. Resultados rigorosos, limites visíveis, sem envios.',
);

message(
  'Tetracromia — colour discrimination | Sense6',
  'Tetracromia — discriminazione cromatica | Sense6',
  'Tetracromia — Farbdiskrimination | Sense6',
  'Tetracromia — discrimination des couleurs | Sense6',
  'Tetracromia — discriminación del color | Sense6',
  'Tetracromia — discriminação de cores | Sense6',
);
message(
  'Experimental colour-vision check — Daltonia | Sense6',
  'Test sperimentale della visione cromatica — Daltonia | Sense6',
  'Experimenteller Farbsehtest — Daltonia | Sense6',
  'Test expérimental de vision des couleurs — Daltonia | Sense6',
  'Prueba experimental de visión cromática — Daltonia | Sense6',
  'Teste experimental de visão cromática — Daltonia | Sense6',
);
message(
  'Response speed and consistency — Riflessi | Sense6',
  'Velocità e costanza della risposta — Riflessi | Sense6',
  'Reaktionsgeschwindigkeit und Konstanz — Riflessi | Sense6',
  'Vitesse et régularité de réponse — Riflessi | Sense6',
  'Velocidad y constancia de respuesta — Riflessi | Sense6',
  'Velocidade e consistência da resposta — Riflessi | Sense6',
);
message(
  'Device-relative hearing lab — Udito | Sense6',
  'Laboratorio uditivo relativo al dispositivo — Udito | Sense6',
  'Gerätebezogenes Hörlabor — Udito | Sense6',
  'Laboratoire auditif lié à l’appareil — Udito | Sense6',
  'Laboratorio auditivo relativo al dispositivo — Udito | Sense6',
  'Laboratório auditivo relativo ao dispositivo — Udito | Sense6',
);
message(
  'Sense6 offers short, careful browser perception tests with honest, screen-relative results. No account, no upload, no diagnosis theatre.',
  'Sense6 offre brevi e accurati test di percezione nel browser con risultati onesti e relativi al dispositivo. Nessun account, caricamento o finta diagnosi.',
  'Sense6 bietet kurze, sorgfältige Wahrnehmungstests im Browser mit ehrlichen, gerätebezogenen Ergebnissen. Kein Konto, kein Upload, keine Scheindiagnose.',
  'Sense6 propose des tests de perception courts et rigoureux dans le navigateur, avec des résultats honnêtes liés à l’appareil. Aucun compte, envoi ou faux diagnostic.',
  'Sense6 ofrece pruebas de percepción breves y cuidadosas en el navegador, con resultados honestos relativos al dispositivo. Sin cuenta, envíos ni falsos diagnósticos.',
  'O Sense6 oferece testes de perceção breves e cuidadosos no navegador, com resultados honestos relativos ao dispositivo. Sem conta, envios ou falsos diagnósticos.',
);

export const MESSAGE_COUNT = rows.length;

export const MESSAGES = Object.freeze(
  Object.fromEntries(LOCALES.map(({ code }) => [code, new Map(rows.map((row) => [row.en, row[code]]))])),
);
