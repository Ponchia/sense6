export const privacy = Object.freeze({
  title: 'Sense6 隐私说明',
  eyebrow: '隐私 / 通俗说明',
  updated: '最后更新：2026年7月19日',
  back: '所有测试',
  intro:
    '测试只在你的设备上进行。Sense6 仅保留匿名的每日活动总数，不使用 Cookie、广告跟踪器或用户画像。',
  summaryTitle: '简要说明',
  summary: '我们看不到你的回答或结果，也不会尝试在多次访问之间识别你。',
  sections: [
    {
      title: '谁负责运营',
      paragraphs: [
        'Sense6 是一个在瑞士运营的独立项目。如有隐私问题或相关请求，请发送至 {email}。',
      ],
    },
    {
      title: '哪些信息留在浏览器中',
      paragraphs: [
        '测试回答、测量值和结果都在浏览器中处理，不会上传到 Sense6。你选择的语言和主题、最新或最佳结果的简要记录，以及包含多次测量的私密日志，可能会保存在浏览器本地存储中。',
        '你可以删除一条日志记录、清空整个日志，或在浏览器中清除 sense6.net 的网站数据，以移除全部信息。复制、导入和导出功能只会在你选择使用时运行。导出的日志文件包含向你显示的测量值和设置详情。',
      ],
    },
    {
      title: '匿名每日总数',
      paragraphs: [
        'Sense6 会统计网站加载次数，以及各项测试的开始和完成次数。如果以后增加报告下载功能，也可能统计报告下载次数。数据库只保存 UTC 日期、测试名称、事件名称和总数。',
        '这些是活动总数，不是去重后的访客人数。指标数据库不保存 IP 地址、标识符、设备指纹、用户代理、来源页面、精确时间戳、回答、分数或报告内容。匿名总数只在有助于了解服务运行情况时保留。',
      ],
    },
    {
      title: '托管与安全',
      paragraphs: [
        'Sense6 使用 Cloudflare Pages 提供网站内容，使用位于欧盟的 Cloudflare D1 保存匿名总数，并使用 Cloudflare 安全控制来限制滥用。与任何托管服务商一样，为了交付和保护服务，Cloudflare 必须处理 IP 地址、请求标头等技术请求信息。',
        'Sense6 不使用这些技术信息建立用户画像、投放广告或统计独立访客。Cloudflare 可能依据合同保障措施，在瑞士或欧洲经济区以外处理这些信息。请参阅 {cloudflarePrivacy} 和 {cloudflareDpa}。',
        'Sense6 不设置 Cookie，也不包含广告像素、行为分析或设备指纹识别脚本。',
      ],
    },
    {
      title: '法律依据与你的权利',
      paragraphs: [
        '本说明遵循《瑞士联邦数据保护法》。在 GDPR 适用时，为提供和保护 Sense6 而进行的最低限度技术处理，以我们提供可靠且保护隐私的服务这一合法利益为依据。',
        '你可以通过 {email} 就访问、更正、删除或反对处理提出请求。由于每日总数不含标识符，且无法与个人关联，Sense6 无法检索或删除属于某位特定访客的指标。',
      ],
    },
    {
      title: '变更',
      paragraphs: [
        '如果 Sense6 以后增加账户、上传、云端保存结果、第三方分析或其他处理方式，我们会在相关功能发布前重新审查本说明和隐私设计。',
      ],
    },
  ],
});

export const journal = Object.freeze({
  title: '你的私密测量日志',
  eyebrow: '本地日志 / 仅限此浏览器',
  intro:
    '无需账户即可回顾多次测量。记录、设置档案、比较、导入和导出都保留在此设备上。',
  privacy:
    'Sense6 绝不会上传此日志。导出的文件包含你的测量值和设置详情，请将它保存在你选择的安全位置。',
  emptyTitle: '尚无已记录的测量',
  empty: '完成任意一项 Sense6 实验后，其结构化结果会显示在这里。',
  filter: '显示测量项目',
  all: '所有测量项目',
  export: '导出日志',
  import: '导入日志',
  deleteAll: '删除所有记录',
  deleteOne: '删除本次测量',
  back: '所有测试',
  setup: '设置档案',
  measurements: '测量值',
  latest: '最新记录的测量',
  compare: '与上一次测量比较',
  comparable: '可比较',
  caution: '可谨慎比较',
  notComparable: '不可比较',
  noPrevious: '此测量项目没有更早的记录。',
  change: '变化',
  uncertainty: '合并不确定度',
  noUncertainty: '未提供不确定区间',
  bounded: '一个或两个数值为测量边界',
  lowerBound: '下限',
  upperBound: '上限',
  yes: '是',
  no: '否',
  importSuccess: '日志已导入。',
  importFailure: '此文件不是有效的 Sense6 日志导出文件。',
  storageFailure: '无法在此浏览器中保存日志。',
  confirmAll: '要从此浏览器删除所有已保存的 Sense6 日志记录吗？',
  confirmOne: '要删除这次已保存的测量吗？',
  entries: '条已保存测量',
  reasonInstrument: '两次测量使用了不同的测量项目。',
  reasonSetup: '必需的设置条件发生了变化或缺失。',
  reasonVolume: '无法核实两次测量之间的浏览器音量是否相同。',
  reasonLimited: '至少一次测量的设置或测量质量有限。',
  reasonMinor: '某项设置详情发生了变化或缺失。',
});

export const setupLabels = Object.freeze([
  '显示器',
  '视口',
  '色域',
  '输入方式',
  '帧间隔',
  '计时状态',
  '中断',
  '聆听设备',
  '采样率',
  '测量期间音量固定',
  '视力矫正',
  '观看距离',
  '校准状态',
  '卡片宽度',
]);
