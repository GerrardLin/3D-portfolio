import type { PublicCase } from "./model.ts";

export const originalCases: PublicCase[] = [
  {
    id: "printed-record",
    kind: "record",
    author: "Amanda Ghassaei",
    title: "一张唱片，能印出声音吗？",
    context: "2012 年。一台树脂打印机、一台普通唱机。你要决定：现有打印精度下，还值不值得做一张能听的唱片？",
    question: "如果目标是让人听出旋律，你会怎么做？",
    profile: { headline: "数字制造与交互创作者", link: { label: "查看作者主页", url: "https://amandaghassaei.com/" } },
    role: "编写音频转沟槽的程序，并用树脂 3D 打印机制作可播放的唱片。",
    feedback: [
      { text: "你先验证旋律是否可辨认。试听原型精度后想一想，哪些细节足以支撑这次验证？", clue: 1 },
      { text: "你优先考虑还原度。回听原型精度，若验收条件只有辨认旋律，你还会等待吗？", clue: 1 },
      { text: "让数字文件承担播放能保住音质，但无法检验塑料沟槽能否驱动唱针。", clue: 0 },
    ],
    options: ["用现有打印机，先做一张能听出旋律的原型", "等设备能接近数字音质，再做唱片", "只打印唱片外形，把声音留在数字文件里"],
    clues: [
      {label:"唱针读什么",text:"声音可以写进沟槽深度。播放时，唱针机械地跟随沟槽，把起伏还原成信号。"},
      {label:"打印机的限制",text:"Ghassaei 使用的 Objet Connex 500 的平面精度为 600 dpi，层高约 16 微米。它能造出的最小特征比实际唱片上的特征大。"},
    ],
    reveal: "Ghassaei 编写程序把数字音频转换成可打印的螺旋沟槽，制作出能在普通唱机上播放的 33 转唱片。她报告实际达到约 11 kHz 采样率、5–6 bit 量化精度。音质有损，仍能辨认原曲。",
    takeaway: "先确定听众必须听出什么，再判断精度门槛。用能运行的原型验证这条门槛。",
    sources: [
      {label:"Amanda Ghassaei · 公开 CV",url:"https://amandaghassaei.com/about/files/AmandaGhassaeiResume.pdf"},
      {label:"作者项目记录 · 3D Printed Record",url:"https://amandaghassaei.com/projects/3D_printed_record/"},
    ],
  },
  {
    id: "distributed-web",
    kind: "web",
    author: "Tim Berners-Lee",
    title: "关掉中间那台服务器。",
    context: "1989 年，CERN 的项目资料分布在不同系统里。团队既要保留已有档案，也需要让不同机器上的资料互相链接。",
    question: "如果各组希望独立维护资料，你会怎么组织它们？",
    profile: { headline: "万维网发明者", link: { label: "作者的 MIT CV", url: "https://www.w3.org/People/Berners-Lee/MIT-CV.html" } },
    role: "提出分布式超文本方案，说明不同系统如何在保留各自档案的同时建立链接。",
    feedback: [
      { text: "你把资料维护留给各组。再断开中间节点，确认哪些资料仍能访问、哪些已经失联。", clue: 1 },
      { text: "集中维护降低了协调成本，也可能集中故障。把中间节点关掉，观察谁还能访问资料。", clue: 0 },
    ],
    options: ["允许各组维护自己的资料，使用链接相互引用", "把资料集中到一台服务器统一维护"],
    clues: [
      {label:"已有系统",text:"同一份资料需要从多种系统访问。提案列举了 VM/CMS、Macintosh、VAX/VMS 和 Unix。"},
      {label:"信息会不断变化",text:"提案要求新系统能连接已有系统，并容许独立的小系统发展和合并。"},
    ],
    reveal: "Berners-Lee 在 1989 年提议使用分布式超文本，让已有系统能在无需中心统筹的情况下相互链接。他在文档里把资料存储和显示分开，通过明确的接口连接二者。",
    takeaway: "把内容的所有权与内容之间的链接分开。画架构时，顺手问一句：哪一台停了，谁还能继续工作？",
    sources: [
      {label:"Tim Berners-Lee · MIT CV",url:"https://www.w3.org/People/Berners-Lee/MIT-CV.html"},
      {label:"CERN 原始提案 · Non-Centralisation",url:"https://www.w3.org/2002/Talks/01-sweb/proposal#NonCentralisation"},
    ],
  },
  {
    id: "release-triage",
    kind: "evidence",
    author: "示例作者",
    profile: { headline: "虚构练习 · 软件验收" },
    title: "发布前只剩一次复测",
    context: "这是虚构的验收练习。测试组发现权限残留、导出筛选错误和按钮样式错位，今天只能安排一次完整的复测。",
    role: "本练习设定的职责是协调业务验收并建议复测顺序。",
    question: "如果只能安排一次完整复测，你建议先处理什么？",
    options: ["核查权限撤销后旧链接是否仍可使用", "确认导出文件是否漏掉筛选项", "调整窄屏按钮对齐"],
    activity: { type: "priority", constraint: "安排至少两项的先后。第一项获得本轮唯一一次完整复测。" },
    clues: [
      { label: "权限回收", text: "旧链接在撤销权限后仍可能被曾有权限的人打开，需要验证可访问的数据范围。" },
      { label: "受影响人员", text: "导出筛选影响报表核对。窄屏错位暂时挡不住按钮操作。" },
    ],
    feedback: [
      { text: "你先核查潜在的数据可见性问题。复测时要分别用原账号和新账号验证。", clue: 0 },
      { text: "你优先保证报表可用。先比较导出错误是否可逆，以及权限异常会覆盖哪些记录。", clue: 1 },
      { text: "你优先修复肉眼能看到的问题。先确认错位有无阻断操作，以及另一项风险是否能延后。", clue: 1 },
    ],
    reveal: "在这个虚构场景里，验收人员先要求复测权限回收，记录账号与链接的可见范围，再把报表筛选和样式问题分别排入后续轮次。",
    takeaway: "当复测次数有限，先查影响范围和可逆性，再排队处理最明显的问题。",
    sources: [],
  },
];
