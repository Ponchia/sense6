const PRIVACY_EMAIL = 'privacy@sense6.net';

const COPY = Object.freeze({
  en: {
    title: 'Privacy at Sense6',
    eyebrow: 'Privacy / plain language',
    updated: 'Last updated 19 July 2026',
    back: 'All tests',
    intro:
      'Your tests stay on your device. Sense6 keeps only anonymous daily activity totals and uses no cookies, advertising trackers, or user profiles.',
    summaryTitle: 'The short version',
    summary: 'We cannot see your answers or results, and we do not try to recognise you between visits.',
    sections: [
      {
        title: 'Who is responsible',
        paragraphs: [
          'Sense6 is an independent project operated in Switzerland. Privacy questions and requests can be sent to {email}.',
        ],
      },
      {
        title: 'What stays in your browser',
        paragraphs: [
          'Test answers, measurements, and results are processed in your browser and are not uploaded to Sense6. Your selected language, theme, and the latest or best result offered by each test may be saved in local browser storage so the site can remember them.',
          'You can remove this information at any time by clearing the site data for sense6.net in your browser. Copy-to-clipboard features run only when you choose them.',
        ],
      },
      {
        title: 'Anonymous daily counts',
        paragraphs: [
          'Sense6 counts site loads and when a named test is started or completed. If report downloads are added, it may also count that a report was downloaded. The database stores only the UTC day, test name, event name, and total count.',
          'These are activity totals, not unique-person counts. The metrics database does not store IP addresses, identifiers, fingerprints, user agents, referrers, exact timestamps, answers, scores, or report contents. Anonymous totals are kept only while they remain useful for understanding the service.',
        ],
      },
      {
        title: 'Hosting and security',
        paragraphs: [
          'Sense6 uses Cloudflare Pages to deliver the site, Cloudflare D1 in the European Union for the anonymous totals, and Cloudflare security controls to limit abuse. Like any hosting provider, Cloudflare necessarily processes technical request information such as IP addresses and request headers to deliver and protect the service.',
          'Sense6 does not use that technical information to build profiles, advertise, or measure unique visitors. Cloudflare may process it outside Switzerland or the European Economic Area under its contractual safeguards. See {cloudflarePrivacy} and the {cloudflareDpa}.',
          'Sense6 sets no cookies and includes no advertising pixels, behavioural analytics, or fingerprinting scripts.',
        ],
      },
      {
        title: 'Legal basis and your rights',
        paragraphs: [
          'This notice follows the Swiss Federal Act on Data Protection. Where the GDPR applies, the minimum technical processing needed to deliver and secure Sense6 is based on our legitimate interest in providing a reliable, privacy-preserving service.',
          'You may ask about access, correction, deletion, or objection by contacting {email}. Because the daily totals contain no identifier and cannot be connected to an individual, Sense6 cannot retrieve or delete a metric belonging to a particular visitor.',
        ],
      },
      {
        title: 'Changes',
        paragraphs: [
          'If Sense6 later adds accounts, uploads, cloud-saved results, third-party analytics, or other processing, this notice and the privacy design will be reviewed before those features are released.',
        ],
      },
    ],
  },
  it: {
    title: 'Privacy su Sense6',
    eyebrow: 'Privacy / linguaggio chiaro',
    updated: 'Ultimo aggiornamento: 19 luglio 2026',
    back: 'Tutti i test',
    intro:
      'I tuoi test rimangono sul tuo dispositivo. Sense6 conserva soltanto totali giornalieri anonimi e non utilizza cookie, sistemi pubblicitari di tracciamento o profili utente.',
    summaryTitle: 'In breve',
    summary:
      'Non possiamo vedere le tue risposte o i tuoi risultati e non cerchiamo di riconoscerti tra una visita e l’altra.',
    sections: [
      {
        title: 'Chi è responsabile',
        paragraphs: [
          'Sense6 è un progetto indipendente gestito in Svizzera. Per domande e richieste sulla privacy puoi scrivere a {email}.',
        ],
      },
      {
        title: 'Cosa rimane nel tuo browser',
        paragraphs: [
          'Le risposte, le misurazioni e i risultati dei test vengono elaborati nel browser e non sono caricati su Sense6. La lingua e il tema scelti, nonché l’ultimo o il miglior risultato previsto da ciascun test, possono essere salvati nella memoria locale del browser affinché il sito possa ricordarli.',
          'Puoi eliminare queste informazioni in qualsiasi momento cancellando nel browser i dati del sito sense6.net. Le funzioni di copia negli appunti si attivano soltanto quando le scegli.',
        ],
      },
      {
        title: 'Conteggi giornalieri anonimi',
        paragraphs: [
          'Sense6 conta i caricamenti del sito e l’avvio o il completamento di un test specifico. Se verranno aggiunti report scaricabili, potrà anche contare che un report è stato scaricato. Il database conserva soltanto il giorno UTC, il nome del test, il nome dell’evento e il conteggio totale.',
          'Sono totali di attività, non conteggi di persone uniche. Il database delle metriche non conserva indirizzi IP, identificatori, impronte digitali, user agent, referrer, orari esatti, risposte, punteggi o contenuti dei report. I totali anonimi vengono conservati soltanto finché risultano utili per comprendere il servizio.',
        ],
      },
      {
        title: 'Hosting e sicurezza',
        paragraphs: [
          'Sense6 utilizza Cloudflare Pages per distribuire il sito, Cloudflare D1 nell’Unione europea per i totali anonimi e i controlli di sicurezza Cloudflare per limitare gli abusi. Come ogni fornitore di hosting, Cloudflare tratta necessariamente informazioni tecniche delle richieste, quali indirizzi IP e intestazioni, per distribuire e proteggere il servizio.',
          'Sense6 non usa queste informazioni tecniche per creare profili, fare pubblicità o misurare visitatori unici. Cloudflare può trattarle al di fuori della Svizzera o dello Spazio economico europeo in base alle proprie garanzie contrattuali. Consulta la {cloudflarePrivacy} e il {cloudflareDpa}.',
          'Sense6 non imposta cookie e non include pixel pubblicitari, analisi comportamentali o script di fingerprinting.',
        ],
      },
      {
        title: 'Base giuridica e i tuoi diritti',
        paragraphs: [
          'Questa informativa segue la Legge federale svizzera sulla protezione dei dati. Quando si applica il GDPR, il trattamento tecnico minimo necessario per distribuire e proteggere Sense6 si fonda sul nostro legittimo interesse a fornire un servizio affidabile e rispettoso della privacy.',
          'Puoi chiedere informazioni su accesso, rettifica, cancellazione o opposizione contattando {email}. Poiché i totali giornalieri non contengono identificatori e non possono essere collegati a una persona, Sense6 non può recuperare o cancellare una metrica appartenente a un visitatore specifico.',
        ],
      },
      {
        title: 'Modifiche',
        paragraphs: [
          'Se in futuro Sense6 aggiungerà account, caricamenti, risultati salvati nel cloud, analisi di terze parti o altri trattamenti, questa informativa e la progettazione della privacy saranno riesaminate prima del rilascio.',
        ],
      },
    ],
  },
  de: {
    title: 'Datenschutz bei Sense6',
    eyebrow: 'Datenschutz / verständlich erklärt',
    updated: 'Zuletzt aktualisiert am 19. Juli 2026',
    back: 'Alle Tests',
    intro:
      'Ihre Tests bleiben auf Ihrem Gerät. Sense6 speichert nur anonyme tägliche Aktivitätssummen und verwendet keine Cookies, Werbetracker oder Nutzerprofile.',
    summaryTitle: 'Kurz gesagt',
    summary:
      'Wir können Ihre Antworten oder Ergebnisse nicht sehen und versuchen nicht, Sie bei späteren Besuchen wiederzuerkennen.',
    sections: [
      {
        title: 'Wer verantwortlich ist',
        paragraphs: [
          'Sense6 ist ein unabhängiges, in der Schweiz betriebenes Projekt. Fragen und Anliegen zum Datenschutz können Sie an {email} senden.',
        ],
      },
      {
        title: 'Was in Ihrem Browser bleibt',
        paragraphs: [
          'Testantworten, Messwerte und Ergebnisse werden in Ihrem Browser verarbeitet und nicht an Sense6 übermittelt. Die gewählte Sprache, das Design sowie das letzte oder beste von einem Test angebotene Ergebnis können im lokalen Browserspeicher gesichert werden, damit die Website sie wiedererkennt.',
          'Sie können diese Informationen jederzeit löschen, indem Sie die Websitedaten für sense6.net in Ihrem Browser entfernen. Funktionen zum Kopieren in die Zwischenablage werden nur auf Ihre Auswahl hin ausgeführt.',
        ],
      },
      {
        title: 'Anonyme tägliche Zähler',
        paragraphs: [
          'Sense6 zählt Seitenaufrufe sowie den Start oder Abschluss eines benannten Tests. Wenn Berichtdownloads hinzukommen, kann auch gezählt werden, dass ein Bericht heruntergeladen wurde. Die Datenbank speichert nur den UTC-Tag, den Testnamen, den Ereignisnamen und die Gesamtsumme.',
          'Dies sind Aktivitätssummen, keine Zählung eindeutiger Personen. Die Metrikdatenbank speichert keine IP-Adressen, Kennungen, Fingerabdrücke, User-Agents, Referrer, genauen Zeitstempel, Antworten, Punktwerte oder Berichtsinhalte. Anonyme Summen werden nur so lange aufbewahrt, wie sie zum Verständnis des Dienstes nützlich sind.',
        ],
      },
      {
        title: 'Hosting und Sicherheit',
        paragraphs: [
          'Sense6 nutzt Cloudflare Pages zur Auslieferung der Website, Cloudflare D1 in der Europäischen Union für die anonymen Summen und Cloudflare-Sicherheitskontrollen zur Missbrauchsbegrenzung. Wie jeder Hosting-Anbieter verarbeitet Cloudflare notwendigerweise technische Anfrageinformationen wie IP-Adressen und Anfrage-Header, um den Dienst auszuliefern und zu schützen.',
          'Sense6 verwendet diese technischen Informationen nicht zur Profilbildung, für Werbung oder zur Messung eindeutiger Besucher. Cloudflare kann sie auf Grundlage seiner vertraglichen Garantien ausserhalb der Schweiz oder des Europäischen Wirtschaftsraums verarbeiten. Siehe die {cloudflarePrivacy} und den {cloudflareDpa}.',
          'Sense6 setzt keine Cookies und bindet keine Werbepixel, Verhaltensanalysen oder Fingerprinting-Skripte ein.',
        ],
      },
      {
        title: 'Rechtsgrundlage und Ihre Rechte',
        paragraphs: [
          'Diese Erklärung richtet sich nach dem schweizerischen Datenschutzgesetz. Soweit die DSGVO anwendbar ist, beruht die minimale technische Verarbeitung zur Bereitstellung und Absicherung von Sense6 auf unserem berechtigten Interesse an einem zuverlässigen, datenschutzfreundlichen Dienst.',
          'Sie können sich zu Auskunft, Berichtigung, Löschung oder Widerspruch an {email} wenden. Da die täglichen Summen keine Kennung enthalten und keiner Person zugeordnet werden können, kann Sense6 keine Metrik eines bestimmten Besuchers abrufen oder löschen.',
        ],
      },
      {
        title: 'Änderungen',
        paragraphs: [
          'Falls Sense6 später Konten, Uploads, in der Cloud gespeicherte Ergebnisse, Analysen von Drittanbietern oder andere Verarbeitungen einführt, werden diese Erklärung und das Datenschutzkonzept vor der Veröffentlichung überprüft.',
        ],
      },
    ],
  },
  fr: {
    title: 'Confidentialité chez Sense6',
    eyebrow: 'Confidentialité / en termes simples',
    updated: 'Dernière mise à jour : 19 juillet 2026',
    back: 'Tous les tests',
    intro:
      'Vos tests restent sur votre appareil. Sense6 ne conserve que des totaux d’activité quotidiens anonymes et n’utilise ni cookies, ni traceurs publicitaires, ni profils utilisateur.',
    summaryTitle: 'En bref',
    summary:
      'Nous ne pouvons pas voir vos réponses ou vos résultats et nous ne cherchons pas à vous reconnaître entre deux visites.',
    sections: [
      {
        title: 'Qui est responsable',
        paragraphs: [
          'Sense6 est un projet indépendant exploité en Suisse. Les questions et demandes relatives à la confidentialité peuvent être envoyées à {email}.',
        ],
      },
      {
        title: 'Ce qui reste dans votre navigateur',
        paragraphs: [
          'Les réponses, mesures et résultats des tests sont traités dans votre navigateur et ne sont pas envoyés à Sense6. La langue et le thème choisis, ainsi que le dernier ou le meilleur résultat proposé par chaque test, peuvent être enregistrés dans le stockage local du navigateur afin que le site puisse les mémoriser.',
          'Vous pouvez supprimer ces informations à tout moment en effaçant les données du site sense6.net dans votre navigateur. Les fonctions de copie dans le presse-papiers ne s’exécutent que lorsque vous les choisissez.',
        ],
      },
      {
        title: 'Comptages quotidiens anonymes',
        paragraphs: [
          'Sense6 compte les chargements du site ainsi que le démarrage ou l’achèvement d’un test nommé. Si le téléchargement de rapports est ajouté, le téléchargement d’un rapport pourra également être compté. La base de données ne conserve que le jour UTC, le nom du test, le nom de l’événement et le total.',
          'Il s’agit de totaux d’activité, et non d’un comptage de personnes uniques. La base de métriques ne conserve aucune adresse IP, aucun identifiant, aucune empreinte numérique, aucun user-agent ou référent, aucun horodatage précis, aucune réponse, aucun score et aucun contenu de rapport. Les totaux anonymes ne sont conservés que tant qu’ils restent utiles à la compréhension du service.',
        ],
      },
      {
        title: 'Hébergement et sécurité',
        paragraphs: [
          'Sense6 utilise Cloudflare Pages pour distribuer le site, Cloudflare D1 dans l’Union européenne pour les totaux anonymes et les contrôles de sécurité Cloudflare pour limiter les abus. Comme tout hébergeur, Cloudflare traite nécessairement des informations techniques de requête, telles que les adresses IP et les en-têtes, afin de distribuer et protéger le service.',
          'Sense6 n’utilise pas ces informations techniques pour établir des profils, faire de la publicité ou mesurer les visiteurs uniques. Cloudflare peut les traiter hors de Suisse ou de l’Espace économique européen conformément à ses garanties contractuelles. Consultez la {cloudflarePrivacy} et le {cloudflareDpa}.',
          'Sense6 ne dépose aucun cookie et n’intègre aucun pixel publicitaire, outil d’analyse comportementale ou script d’empreinte numérique.',
        ],
      },
      {
        title: 'Base juridique et vos droits',
        paragraphs: [
          'Cette déclaration respecte la loi fédérale suisse sur la protection des données. Lorsque le RGPD s’applique, le traitement technique minimal nécessaire pour distribuer et sécuriser Sense6 repose sur notre intérêt légitime à fournir un service fiable et respectueux de la vie privée.',
          'Vous pouvez poser toute question relative à l’accès, la rectification, l’effacement ou l’opposition en contactant {email}. Comme les totaux quotidiens ne contiennent aucun identifiant et ne peuvent être reliés à une personne, Sense6 ne peut pas retrouver ou supprimer la métrique d’un visiteur particulier.',
        ],
      },
      {
        title: 'Modifications',
        paragraphs: [
          'Si Sense6 ajoute ultérieurement des comptes, des téléversements, des résultats enregistrés dans le cloud, des analyses tierces ou d’autres traitements, cette déclaration et la conception de la confidentialité seront réexaminées avant leur mise en service.',
        ],
      },
    ],
  },
  es: {
    title: 'Privacidad en Sense6',
    eyebrow: 'Privacidad / lenguaje claro',
    updated: 'Última actualización: 19 de julio de 2026',
    back: 'Todas las pruebas',
    intro:
      'Tus pruebas permanecen en tu dispositivo. Sense6 solo conserva totales diarios anónimos de actividad y no utiliza cookies, rastreadores publicitarios ni perfiles de usuario.',
    summaryTitle: 'En pocas palabras',
    summary: 'No podemos ver tus respuestas ni tus resultados y no intentamos reconocerte entre visitas.',
    sections: [
      {
        title: 'Quién es responsable',
        paragraphs: [
          'Sense6 es un proyecto independiente operado en Suiza. Puedes enviar preguntas y solicitudes sobre privacidad a {email}.',
        ],
      },
      {
        title: 'Lo que permanece en tu navegador',
        paragraphs: [
          'Las respuestas, mediciones y resultados de las pruebas se procesan en tu navegador y no se envían a Sense6. El idioma y el tema seleccionados, así como el último o el mejor resultado ofrecido por cada prueba, pueden guardarse en el almacenamiento local del navegador para que el sitio pueda recordarlos.',
          'Puedes eliminar esta información en cualquier momento borrando los datos del sitio sense6.net en tu navegador. Las funciones para copiar al portapapeles solo se ejecutan cuando tú las eliges.',
        ],
      },
      {
        title: 'Recuentos diarios anónimos',
        paragraphs: [
          'Sense6 cuenta las cargas del sitio y cuándo se inicia o completa una prueba identificada. Si se añaden descargas de informes, también podrá contar que se descargó un informe. La base de datos solo conserva el día UTC, el nombre de la prueba, el nombre del evento y el recuento total.',
          'Son totales de actividad, no recuentos de personas únicas. La base de datos de métricas no almacena direcciones IP, identificadores, huellas digitales, agentes de usuario, referentes, marcas de tiempo exactas, respuestas, puntuaciones ni contenido de informes. Los totales anónimos solo se conservan mientras sigan siendo útiles para comprender el servicio.',
        ],
      },
      {
        title: 'Alojamiento y seguridad',
        paragraphs: [
          'Sense6 utiliza Cloudflare Pages para servir el sitio, Cloudflare D1 en la Unión Europea para los totales anónimos y los controles de seguridad de Cloudflare para limitar abusos. Como cualquier proveedor de alojamiento, Cloudflare procesa necesariamente información técnica de las solicitudes, como direcciones IP y cabeceras, para entregar y proteger el servicio.',
          'Sense6 no utiliza esa información técnica para crear perfiles, mostrar publicidad o medir visitantes únicos. Cloudflare puede procesarla fuera de Suiza o del Espacio Económico Europeo con arreglo a sus garantías contractuales. Consulta la {cloudflarePrivacy} y el {cloudflareDpa}.',
          'Sense6 no instala cookies ni incluye píxeles publicitarios, análisis de comportamiento o scripts de huella digital.',
        ],
      },
      {
        title: 'Base jurídica y tus derechos',
        paragraphs: [
          'Este aviso sigue la Ley Federal suiza de Protección de Datos. Cuando se aplica el RGPD, el tratamiento técnico mínimo necesario para entregar y proteger Sense6 se basa en nuestro interés legítimo en ofrecer un servicio fiable y respetuoso con la privacidad.',
          'Puedes consultar sobre acceso, rectificación, supresión u oposición contactando con {email}. Como los totales diarios no contienen identificadores y no pueden vincularse a una persona, Sense6 no puede recuperar ni eliminar una métrica perteneciente a un visitante concreto.',
        ],
      },
      {
        title: 'Cambios',
        paragraphs: [
          'Si Sense6 añade posteriormente cuentas, cargas, resultados guardados en la nube, análisis de terceros u otros tratamientos, este aviso y el diseño de privacidad se revisarán antes de publicar esas funciones.',
        ],
      },
    ],
  },
  pt: {
    title: 'Privacidade na Sense6',
    eyebrow: 'Privacidade / linguagem clara',
    updated: 'Última atualização: 19 de julho de 2026',
    back: 'Todos os testes',
    intro:
      'Os seus testes permanecem no seu dispositivo. A Sense6 conserva apenas totais diários anónimos de atividade e não utiliza cookies, rastreadores publicitários ou perfis de utilizador.',
    summaryTitle: 'Em resumo',
    summary: 'Não conseguimos ver as suas respostas ou resultados e não tentamos reconhecê-lo entre visitas.',
    sections: [
      {
        title: 'Quem é responsável',
        paragraphs: [
          'A Sense6 é um projeto independente operado na Suíça. Pode enviar perguntas e pedidos sobre privacidade para {email}.',
        ],
      },
      {
        title: 'O que permanece no seu navegador',
        paragraphs: [
          'As respostas, medições e resultados dos testes são processados no seu navegador e não são enviados para a Sense6. O idioma e o tema escolhidos, assim como o último ou o melhor resultado disponibilizado por cada teste, podem ser guardados no armazenamento local do navegador para que o site os possa recordar.',
          'Pode remover estas informações a qualquer momento apagando os dados do site sense6.net no seu navegador. As funções de cópia para a área de transferência só são executadas quando as escolhe.',
        ],
      },
      {
        title: 'Contagens diárias anónimas',
        paragraphs: [
          'A Sense6 conta os carregamentos do site e quando um teste identificado é iniciado ou concluído. Se forem adicionadas transferências de relatórios, poderá também contar que um relatório foi transferido. A base de dados guarda apenas o dia UTC, o nome do teste, o nome do evento e a contagem total.',
          'São totais de atividade, não contagens de pessoas únicas. A base de dados de métricas não guarda endereços IP, identificadores, impressões digitais, agentes do utilizador, referências, carimbos de data e hora exatos, respostas, pontuações ou conteúdo dos relatórios. Os totais anónimos são mantidos apenas enquanto forem úteis para compreender o serviço.',
        ],
      },
      {
        title: 'Alojamento e segurança',
        paragraphs: [
          'A Sense6 utiliza o Cloudflare Pages para disponibilizar o site, o Cloudflare D1 na União Europeia para os totais anónimos e os controlos de segurança da Cloudflare para limitar abusos. Tal como qualquer fornecedor de alojamento, a Cloudflare processa necessariamente informações técnicas dos pedidos, como endereços IP e cabeçalhos, para disponibilizar e proteger o serviço.',
          'A Sense6 não utiliza essas informações técnicas para criar perfis, apresentar publicidade ou medir visitantes únicos. A Cloudflare pode processá-las fora da Suíça ou do Espaço Económico Europeu ao abrigo das suas garantias contratuais. Consulte a {cloudflarePrivacy} e o {cloudflareDpa}.',
          'A Sense6 não define cookies nem inclui píxeis publicitários, análises comportamentais ou scripts de impressão digital.',
        ],
      },
      {
        title: 'Base jurídica e os seus direitos',
        paragraphs: [
          'Este aviso segue a Lei Federal suíça sobre a Proteção de Dados. Quando o RGPD se aplica, o tratamento técnico mínimo necessário para disponibilizar e proteger a Sense6 baseia-se no nosso interesse legítimo em fornecer um serviço fiável e respeitador da privacidade.',
          'Pode colocar questões sobre acesso, retificação, eliminação ou oposição contactando {email}. Como os totais diários não contêm identificadores e não podem ser associados a uma pessoa, a Sense6 não consegue recuperar ou eliminar uma métrica pertencente a um visitante específico.',
        ],
      },
      {
        title: 'Alterações',
        paragraphs: [
          'Se a Sense6 adicionar posteriormente contas, carregamentos, resultados guardados na nuvem, análises de terceiros ou outro tratamento, este aviso e a conceção da privacidade serão revistos antes do lançamento dessas funcionalidades.',
        ],
      },
    ],
  },
});

const LINKS = Object.freeze({
  email: `<a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a>`,
  cloudflarePrivacy:
    '<a href="https://www.cloudflare.com/privacypolicy/" rel="noreferrer">Cloudflare Privacy Policy</a>',
  cloudflareDpa:
    '<a href="https://www.cloudflare.com/cloudflare-customer-dpa/" rel="noreferrer">Cloudflare Data Processing Addendum</a>',
});

export function renderPrivacy(context) {
  const { app, locale, localeHref } = context;
  const copy = COPY[locale] ?? COPY.en;
  document.title = `${copy.title} | Sense6`;

  app.innerHTML = `
    <article class="privacy-view ui-container">
      <a class="back-link privacy-view__back" href="${localeHref('')}">
        <span aria-hidden="true">←</span> ${copy.back}
      </a>

      <header class="privacy-hero">
        <div>
          <p class="ui-eyebrow">${copy.eyebrow}</p>
          <h1>${copy.title}</h1>
          <p class="privacy-hero__lede">${copy.intro}</p>
          <p class="privacy-hero__updated">${copy.updated}</p>
        </div>
        <aside class="privacy-summary" aria-labelledby="privacy-summary-title">
          <span aria-hidden="true">00</span>
          <div>
            <h2 id="privacy-summary-title">${copy.summaryTitle}</h2>
            <p>${copy.summary}</p>
          </div>
        </aside>
      </header>

      <div class="privacy-sections">
        ${copy.sections
          .map(
            (section, index) => `
              <section class="privacy-section" aria-labelledby="privacy-section-${index}">
                <span class="privacy-section__number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h2 id="privacy-section-${index}">${section.title}</h2>
                  ${section.paragraphs.map((paragraph) => `<p>${withLinks(paragraph)}</p>`).join('')}
                </div>
              </section>
            `,
          )
          .join('')}
      </div>
    </article>
  `;

  return () => {};
}

function withLinks(text) {
  return Object.entries(LINKS).reduce((output, [name, link]) => output.replaceAll(`{${name}}`, link), text);
}
