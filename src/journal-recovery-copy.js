/** @type {Readonly<Record<string, Readonly<Record<string, string>>>>} */
const COPY = Object.freeze({
  en: recoveryCopy({
    title: 'Journal recovery required',
    inaccessible:
      'This browser did not allow Sense6 to read local journal storage. Backup and clear actions remain unavailable until access returns.',
    malformed:
      'The saved journal is malformed. Download the raw data before clearing it if you want to attempt recovery elsewhere.',
    oversized: 'The saved journal exceeds the supported size. Download the raw data before clearing it.',
    future:
      'A newer Sense6 schema wrote this journal. Download the raw data and open it with a compatible version.',
    backup: 'Download raw backup',
    clear: 'Clear unreadable journal',
    confirmMalformed: 'Clear the malformed journal data from this browser? This cannot be undone.',
    confirmOversized: 'Clear the oversized journal data from this browser? This cannot be undone.',
    confirmFuture: 'Clear the newer-schema journal data from this browser? This cannot be undone.',
  }),
  it: recoveryCopy({
    title: 'È necessario recuperare il diario',
    inaccessible:
      'Il browser non ha consentito a Sense6 di leggere l’archivio locale del diario. Le azioni di backup e cancellazione non sono disponibili finché l’accesso non viene ripristinato.',
    malformed:
      'Il diario salvato non è valido. Scarica i dati grezzi prima di cancellarlo se vuoi tentare il recupero altrove.',
    oversized:
      'Il diario salvato supera le dimensioni supportate. Scarica i dati grezzi prima di cancellarlo.',
    future:
      'Questo diario è stato scritto da uno schema Sense6 più recente. Scarica i dati grezzi e aprili con una versione compatibile.',
    backup: 'Scarica il backup grezzo',
    clear: 'Cancella il diario illeggibile',
    confirmMalformed:
      'Cancellare da questo browser i dati non validi del diario? L’operazione non può essere annullata.',
    confirmOversized:
      'Cancellare da questo browser i dati troppo grandi del diario? L’operazione non può essere annullata.',
    confirmFuture:
      'Cancellare da questo browser i dati del diario con schema più recente? L’operazione non può essere annullata.',
  }),
  de: recoveryCopy({
    title: 'Wiederherstellung des Journals erforderlich',
    inaccessible:
      'Dieser Browser hat Sense6 den Zugriff auf den lokalen Journalspeicher verweigert. Sicherung und Löschen bleiben nicht verfügbar, bis der Zugriff wieder möglich ist.',
    malformed:
      'Das gespeicherte Journal ist fehlerhaft. Laden Sie die Rohdaten vor dem Löschen herunter, wenn Sie sie anderswo wiederherstellen möchten.',
    oversized:
      'Das gespeicherte Journal überschreitet die unterstützte Größe. Laden Sie die Rohdaten vor dem Löschen herunter.',
    future:
      'Dieses Journal wurde mit einem neueren Sense6-Schema geschrieben. Laden Sie die Rohdaten herunter und öffnen Sie sie mit einer kompatiblen Version.',
    backup: 'Rohdatensicherung herunterladen',
    clear: 'Unlesbares Journal löschen',
    confirmMalformed:
      'Fehlerhafte Journaldaten aus diesem Browser löschen? Dies kann nicht rückgängig gemacht werden.',
    confirmOversized:
      'Zu große Journaldaten aus diesem Browser löschen? Dies kann nicht rückgängig gemacht werden.',
    confirmFuture:
      'Journaldaten mit neuerem Schema aus diesem Browser löschen? Dies kann nicht rückgängig gemacht werden.',
  }),
  fr: recoveryCopy({
    title: 'Récupération du journal requise',
    inaccessible:
      'Ce navigateur n’a pas autorisé Sense6 à lire le stockage local du journal. La sauvegarde et l’effacement restent indisponibles jusqu’au rétablissement de l’accès.',
    malformed:
      'Le journal enregistré est mal formé. Téléchargez les données brutes avant de l’effacer si vous souhaitez tenter une récupération ailleurs.',
    oversized:
      'Le journal enregistré dépasse la taille prise en charge. Téléchargez les données brutes avant de l’effacer.',
    future:
      'Ce journal a été écrit avec un schéma Sense6 plus récent. Téléchargez les données brutes et ouvrez-les avec une version compatible.',
    backup: 'Télécharger la sauvegarde brute',
    clear: 'Effacer le journal illisible',
    confirmMalformed:
      'Effacer de ce navigateur les données mal formées du journal ? Cette action est irréversible.',
    confirmOversized:
      'Effacer de ce navigateur les données trop volumineuses du journal ? Cette action est irréversible.',
    confirmFuture:
      'Effacer de ce navigateur les données du journal au schéma plus récent ? Cette action est irréversible.',
  }),
  es: recoveryCopy({
    title: 'Es necesario recuperar el diario',
    inaccessible:
      'Este navegador no permitió que Sense6 leyera el almacenamiento local del diario. Las opciones de copia y borrado no estarán disponibles hasta que vuelva el acceso.',
    malformed:
      'El diario guardado tiene un formato incorrecto. Descarga los datos sin procesar antes de borrarlo si quieres intentar recuperarlos en otro lugar.',
    oversized:
      'El diario guardado supera el tamaño admitido. Descarga los datos sin procesar antes de borrarlo.',
    future:
      'Este diario fue escrito con un esquema de Sense6 más reciente. Descarga los datos sin procesar y ábrelos con una versión compatible.',
    backup: 'Descargar copia sin procesar',
    clear: 'Borrar diario ilegible',
    confirmMalformed:
      '¿Borrar de este navegador los datos incorrectos del diario? Esta acción no se puede deshacer.',
    confirmOversized:
      '¿Borrar de este navegador los datos demasiado grandes del diario? Esta acción no se puede deshacer.',
    confirmFuture:
      '¿Borrar de este navegador los datos del diario con un esquema más reciente? Esta acción no se puede deshacer.',
  }),
  pt: recoveryCopy({
    title: 'É necessário recuperar o diário',
    inaccessible:
      'Este navegador não permitiu que o Sense6 lesse o armazenamento local do diário. As ações de cópia e limpeza permanecem indisponíveis até o acesso regressar.',
    malformed:
      'O diário guardado está malformado. Transfira os dados em bruto antes de o limpar se quiser tentar recuperá-los noutro local.',
    oversized: 'O diário guardado excede o tamanho suportado. Transfira os dados em bruto antes de o limpar.',
    future:
      'Este diário foi escrito com um esquema Sense6 mais recente. Transfira os dados em bruto e abra-os com uma versão compatível.',
    backup: 'Transferir cópia em bruto',
    clear: 'Limpar diário ilegível',
    confirmMalformed:
      'Limpar deste navegador os dados malformados do diário? Esta ação não pode ser anulada.',
    confirmOversized:
      'Limpar deste navegador os dados demasiado grandes do diário? Esta ação não pode ser anulada.',
    confirmFuture:
      'Limpar deste navegador os dados do diário com esquema mais recente? Esta ação não pode ser anulada.',
  }),
  'pt-br': recoveryCopy({
    title: 'É necessário recuperar o diário',
    inaccessible:
      'Este navegador não permitiu que o Sense6 lesse o armazenamento local do diário. As ações de backup e limpeza ficam indisponíveis até o acesso voltar.',
    malformed:
      'O diário salvo está malformado. Baixe os dados brutos antes de limpá-lo se quiser tentar recuperá-los em outro lugar.',
    oversized: 'O diário salvo excede o tamanho compatível. Baixe os dados brutos antes de limpá-lo.',
    future:
      'Este diário foi gravado com um esquema do Sense6 mais recente. Baixe os dados brutos e abra-os com uma versão compatível.',
    backup: 'Baixar backup bruto',
    clear: 'Limpar diário ilegível',
    confirmMalformed:
      'Limpar deste navegador os dados malformados do diário? Esta ação não pode ser desfeita.',
    confirmOversized:
      'Limpar deste navegador os dados grandes demais do diário? Esta ação não pode ser desfeita.',
    confirmFuture:
      'Limpar deste navegador os dados do diário com esquema mais recente? Esta ação não pode ser desfeita.',
  }),
  ar: recoveryCopy({
    title: 'يلزم استرداد السجل',
    inaccessible:
      'لم يسمح هذا المتصفح لـ Sense6 بقراءة مساحة تخزين السجل المحلية. تظل إجراءات النسخ الاحتياطي والمسح غير متاحة حتى يعود الوصول.',
    malformed:
      'السجل المحفوظ تالف البنية. نزّل البيانات الأولية قبل مسحه إذا أردت محاولة استردادها في مكان آخر.',
    oversized: 'يتجاوز السجل المحفوظ الحجم المدعوم. نزّل البيانات الأولية قبل مسحه.',
    future: 'كُتب هذا السجل بمخطط Sense6 أحدث. نزّل البيانات الأولية وافتحها بإصدار متوافق.',
    backup: 'تنزيل نسخة احتياطية أولية',
    clear: 'مسح السجل غير المقروء',
    confirmMalformed: 'هل تريد مسح بيانات السجل التالفة من هذا المتصفح؟ لا يمكن التراجع عن ذلك.',
    confirmOversized: 'هل تريد مسح بيانات السجل التي تتجاوز الحجم من هذا المتصفح؟ لا يمكن التراجع عن ذلك.',
    confirmFuture: 'هل تريد مسح بيانات السجل ذات المخطط الأحدث من هذا المتصفح؟ لا يمكن التراجع عن ذلك.',
  }),
  ja: recoveryCopy({
    title: 'ジャーナルの復旧が必要です',
    inaccessible:
      'このブラウザーでは Sense6 がローカルのジャーナルストレージを読み取れませんでした。アクセスが戻るまで、バックアップと消去は利用できません。',
    malformed:
      '保存されたジャーナルの形式が壊れています。別の場所で復旧を試す場合は、消去する前に生データをダウンロードしてください。',
    oversized:
      '保存されたジャーナルは対応サイズを超えています。消去する前に生データをダウンロードしてください。',
    future:
      'このジャーナルは新しい Sense6 スキーマで書き込まれました。生データをダウンロードし、対応するバージョンで開いてください。',
    backup: '生データのバックアップをダウンロード',
    clear: '読めないジャーナルを消去',
    confirmMalformed: 'このブラウザーから壊れたジャーナルデータを消去しますか？この操作は元に戻せません。',
    confirmOversized:
      'このブラウザーから大きすぎるジャーナルデータを消去しますか？この操作は元に戻せません。',
    confirmFuture:
      'このブラウザーから新しいスキーマのジャーナルデータを消去しますか？この操作は元に戻せません。',
  }),
  ko: recoveryCopy({
    title: '저널 복구가 필요합니다',
    inaccessible:
      '이 브라우저는 Sense6가 로컬 저널 저장소를 읽도록 허용하지 않았습니다. 접근이 복원될 때까지 백업과 지우기 작업을 사용할 수 없습니다.',
    malformed:
      '저장된 저널의 형식이 잘못되었습니다. 다른 곳에서 복구하려면 지우기 전에 원시 데이터를 다운로드하세요.',
    oversized: '저장된 저널이 지원되는 크기를 초과합니다. 지우기 전에 원시 데이터를 다운로드하세요.',
    future:
      '이 저널은 더 새로운 Sense6 스키마로 작성되었습니다. 원시 데이터를 다운로드하여 호환되는 버전에서 여세요.',
    backup: '원시 백업 다운로드',
    clear: '읽을 수 없는 저널 지우기',
    confirmMalformed:
      '이 브라우저에서 형식이 잘못된 저널 데이터를 지우시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    confirmOversized: '이 브라우저에서 너무 큰 저널 데이터를 지우시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    confirmFuture:
      '이 브라우저에서 더 새로운 스키마의 저널 데이터를 지우시겠습니까? 이 작업은 되돌릴 수 없습니다.',
  }),
  hi: recoveryCopy({
    title: 'जर्नल पुनर्प्राप्ति आवश्यक है',
    inaccessible:
      'इस ब्राउज़र ने Sense6 को स्थानीय जर्नल स्टोरेज पढ़ने की अनुमति नहीं दी। पहुँच लौटने तक बैकअप और मिटाने की कार्रवाइयाँ उपलब्ध नहीं रहेंगी।',
    malformed:
      'सहेजा गया जर्नल विकृत है। यदि आप कहीं और पुनर्प्राप्ति का प्रयास करना चाहते हैं, तो इसे मिटाने से पहले कच्चा डेटा डाउनलोड करें।',
    oversized: 'सहेजा गया जर्नल समर्थित आकार से बड़ा है। इसे मिटाने से पहले कच्चा डेटा डाउनलोड करें।',
    future: 'यह जर्नल नए Sense6 स्कीमा से लिखा गया था। कच्चा डेटा डाउनलोड करें और इसे संगत संस्करण में खोलें।',
    backup: 'कच्चा बैकअप डाउनलोड करें',
    clear: 'अपठनीय जर्नल मिटाएँ',
    confirmMalformed: 'इस ब्राउज़र से विकृत जर्नल डेटा मिटाएँ? इसे पूर्ववत नहीं किया जा सकता।',
    confirmOversized: 'इस ब्राउज़र से बहुत बड़ा जर्नल डेटा मिटाएँ? इसे पूर्ववत नहीं किया जा सकता।',
    confirmFuture: 'इस ब्राउज़र से नए स्कीमा वाला जर्नल डेटा मिटाएँ? इसे पूर्ववत नहीं किया जा सकता।',
  }),
  'zh-hans': recoveryCopy({
    title: '需要恢复日志',
    inaccessible: '此浏览器不允许 Sense6 读取本地日志存储。在恢复访问权限之前，备份和清除操作不可用。',
    malformed: '保存的日志格式错误。如果想在其他位置尝试恢复，请在清除前下载原始数据。',
    oversized: '保存的日志超过支持的大小。请在清除前下载原始数据。',
    future: '此日志由较新的 Sense6 架构写入。请下载原始数据，并使用兼容版本打开。',
    backup: '下载原始备份',
    clear: '清除无法读取的日志',
    confirmMalformed: '要从此浏览器清除格式错误的日志数据吗？此操作无法撤销。',
    confirmOversized: '要从此浏览器清除过大的日志数据吗？此操作无法撤销。',
    confirmFuture: '要从此浏览器清除采用较新架构的日志数据吗？此操作无法撤销。',
  }),
});

const SOURCE_KEYS = Object.keys(COPY.en).sort();
for (const [locale, value] of Object.entries(COPY)) {
  if (Object.keys(value).sort().join('\n') !== SOURCE_KEYS.join('\n')) {
    throw new Error(`Incomplete journal recovery copy for ${locale}`);
  }
}

/** @param {string} locale */
export function journalRecoveryCopy(locale) {
  return COPY[locale] ?? COPY.en;
}

/** @param {Record<string, string>} value */
function recoveryCopy(value) {
  return Object.freeze(value);
}
