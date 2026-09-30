  // 关键：干扰项不能和答案重名 —— 出现"两个一样的选项"是设计事故
  const wrongSet = new Set(c.wrong);
