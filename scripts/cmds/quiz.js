module.exports = {
  config: {
    name: "quiz",
    aliases: ["qz"],
    version: "3.2.0",
    author: "DI-ABLO JISOO (Modified)",
    countDown: 5,
    role: 0,
    shortDescription: "Answer funny quizzes to win or lose money!",
    category: "game",
    guide: { en: "{p}qz" }
  },

  formatMoney: function (num) {
    num = Number(num) || 0;
    if (num >= 1e12) return (num / 1e12).toFixed(2).replace(/\.00$/, "") + "T";
    if (num >= 1e9) return (num / 1e9).toFixed(2).replace(/\.00$/, "") + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2).replace(/\.00$/, "") + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2).replace(/\.00$/, "") + "K";
    return num.toLocaleString();
  },

  onStart: async function ({ api, event, message, commandName, usersData }) {
    const senderID = event.senderID;
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);

    // ৭০টি আজাইরা ও রোস্ট কুইজ
    const quizData = [
      { q: "১+১=৩ হয় কখন?", options: ["ক্যালকুলেটর নষ্ট হলে", "ভুল করলে", "স্বপ্নে", "কখনোই না"], correctIndex: 1 },
      { q: "মাথায় চুল নেই, কিন্তু সবসময় চিরুনি নিয়ে ঘোরে— কে?", options: ["পাগল", "চিরুনি বিক্রেতা", "হেয়ার স্টাইলিস্ট", "টাক মাথা মানুষ"], correctIndex: 1 },
      { q: "রাতে ঘুমানোর আগে কোন জিনিসটা সবচেয়ে বেশি পরিশ্রম করে?", options: ["মাথার ব্রেইন", "মোবাইল চার্জার", "বালিশ", "মশারির দড়ি"], correctIndex: 1 },
      { q: "ছেলেদের সবচেয়ে বড় শত্রু কে?", options: ["পরীক্ষার খাতা", "প্রেমিকার 'Seen'", "মা-বাবা", "বাসার কারেন্ট বিল"], correctIndex: 1 },
      { q: "কোন প্রাণী কখনো পানি খায় না?", options: ["উট", "ক্যাঙ্গারু র‍্যাট", "জিরাফ", "সিংহ"], correctIndex: 1 },
      { q: "কোন জিনিস যত টানো হয়, তত ছোট হয়ে যায়?", options: ["রাবার", "সিগারেট", "দড়ি", "চুইংগাম"], correctIndex: 1 },
      { q: "প্রেমিকা রাগ করলে সাধারণত কী করে?", options: ["কেঁদে ফেলে", "সোশ্যাল মিডিয়ায় স্টোরি দেয়", "চুপ করে থাকে", "মেরে ফেলে"], correctIndex: 1 },
      { q: "পৃথিবীর সবচেয়ে দ্রুতগামী জিনিস কোনটি?", options: ["আলো", "ভাইয়ের পকেট থেকে টাকা খরচ হওয়া", "প্লেন", "গফুরের গাধা"], correctIndex: 1 },
      { q: "ছেলেদের লাইফে সবচেয়ে বড় ট্র্যাজেডি কোনটা?", options: ["চুল পড়া", "ফোন চার্জ না থাকা", "ক্রাশের মেসেজে 'Seen' দিয়ে চুপ থাকা", "পকেটে টাকা না থাকা"], correctIndex: 2 },
      { q: "মেয়েদের সবচেয়ে বড় ডায়েট প্রোগ্রাম কোনটি?", options: ["জিমে যাওয়া", "সকালে না খেয়ে থাকা", "কাল থেকে ডায়েট শুরু করব বলা", "সালাদ খাওয়া"], correctIndex: 2 },
      { q: "বিয়ে করার পর ছেলেদের কী হারিয়ে যায়?", options: ["চাকরি", "বন্ধু", "ফ্রিডম", "মোবাইল"], correctIndex: 2 },
      { q: "কোন প্রাণী তার নিজের লেজ দেখে ভয় পায়?", options: ["বিড়াল", "কুকুর", "বানর", "খরগোশ"], correctIndex: 0 },
      { q: "কোন সবজি খেলে মানুষের মাথা গরম হয়?", options: ["আলু", "পেঁয়াজ", "লাউ", "কুমড়া"], correctIndex: 1 },
      { q: "স্কুলে সবচেয়ে বেশি ভয় দেখায় কোন জিনিস?", options: ["শিক্ষক", "রেজাল্ট শিট", "হোমওয়ার্ক", "প্রিন্সিপালের রুম"], correctIndex: 1 },
      { q: "এমন কী জিনিস যা তোমার, কিন্তু অন্যরা বেশি ব্যবহার করে?", options: ["তোমার ফোন", "তোমার নাম", "তোমার টাকা", "তোমার জামা"], correctIndex: 1 },
      { q: "কোন জিনিস পকেটে থাকলে কেউ দিতে চায় না?", options: ["টাকা", "ফোন", "বিল", "চাবি"], correctIndex: 2 },
      { q: "মুরগি আগে আসে না ডিম আগে আসে?", options: ["মুরগি", "ডিম", "দুটোই না", "কষা মুরগি"], correctIndex: 3 },
      { q: "লাইফে সাকসেস হতে চাইলে সবচেয়ে আগে কী ছাড়তে হবে?", options: ["ঘুম", "সিন (Seen)", "ফেসবুক", "সবগুলো"], correctIndex: 3 },
      { q: "ছেলেরা মেসেজ রিপ্লাই দিতে দেরি করে কেন?", options: ["ব্যস্ত থাকে", "ভুলে যায়", "গেম খেলে", "সবগুলো"], correctIndex: 3 },
      { q: "কোন খাবারটা খেলে সবাই খুশি হয়?", options: ["বিরিয়ানি", "সালাদ", "সবজি", "ওটস"], correctIndex: 0 },
      { q: "কোন রঙের গাড়ি সবচেয়ে দ্রুত যায়?", options: ["লাল", "কালো", "সাদা", "হলুদ"], correctIndex: 0 },
      { q: "কোন প্রাণীর পিঠে হাঁটা যায় না?", options: ["হাতি", "উট", "সিংহ", "সাপ"], correctIndex: 3 },
      { q: "কোন মাসে মানুষ সবচেয়ে কম কাজ করে?", options: ["জানুয়ারি", "ডিসেম্বর", "রমজান", "কোনো মাসেই না"], correctIndex: 2 },
      { q: "মোবাইল চার্জার হারিয়ে গেলে কার রাগ বেশি হয়?", options: ["মায়ের", "বাবার", "নিজের", "বোনের"], correctIndex: 2 },
      { q: "কোন জিনিস দেখতে পাওয়া যায় না, কিন্তু অনুভব করা যায়?", options: ["বাতাস", "ভালোবাসা", "ব্যথা", "সবগুলো"], correctIndex: 3 },
      { q: "কোন ফলটি খেতে মিষ্টি কিন্তু মনে bitter?", options: ["কামরাঙ্গা", "লেবু", "আমড়া", "অলিভ"], correctIndex: 2 },
      { q: "মানুষ কেন সকালে অ্যালার্ম বন্ধ করে আবার ঘুমায়?", options: ["ক্লান্তি", "৫ মিনিটের লোভ", "অলসতা", "সবগুলো"], correctIndex: 3 },
      { q: "পৃথিবীতে সবচেয়ে বেশি পাওয়া যায় কী?", options: ["পানি", "বালি", "ভুয়া বন্ধু", "গাছ"], correctIndex: 2 },
      { q: "কোন প্রাণী মানুষের মতো হাসে?", options: ["বানর", "হায়েনা", "কুকুর", "ডলফিন"], correctIndex: 1 },
      { q: "কোন জিনিসের দাম সবচেয়ে বেশি?", options: ["সোনা", "হীরা", "সম্মান", "তেল"], correctIndex: 2 },
      { q: "কোন সময়টা সবচেয়ে দ্রুত কেটে যায়?", options: ["অফিসে", "ঘুমে", "ছুটির দিনে", "পরীক্ষায়"], correctIndex: 2 },
      { q: "কোন জিনিস খেলে পেট ভরে না, কিন্তু খাওয়া না খেলে মারা যায়?", options: ["ভাত", "পানি", "ধোঁকা", "ভালোবাসা"], correctIndex: 2 },
      { q: "কোন প্রাণী পিছনে হাঁটতে পারে?", options: ["মানুষ", "কাঁকড়া", "ঘোড়া", "বিড়াল"], correctIndex: 1 },
      { q: "কোন রঙের জামা পরলে মানুষের ওজন কম দেখায়?", options: ["সাদা", "লাল", "কালো", "হলুদ"], correctIndex: 2 },
      { q: "ছেলেরা কেন বন্ধুদের সাথে বেশি কথা বলে?", options: ["ভালো লাগে", "গসিপ করতে", "প্রেমিকার চেয়ে কম ঝামেলা", "সবগুলো"], correctIndex: 3 },
      { q: "কোন খাবারটি গরম খেলে সবচেয়ে বেশি আরাম লাগে?", options: ["সিঙ্গারা", "চা", "খিচুড়ি", "বিরিয়ানি"], correctIndex: 1 },
      { q: "কোন প্রাণীর ইমিউনিটি সবচেয়ে বেশি?", options: ["মানুষ", "তেলাপোকা", "ইঁদুর", "ব্যাঙ"], correctIndex: 1 },
      { q: "পড়াশোনা না করে পাস করার সেরা উপায় কী?", options: ["কপি করা", "মিল্কি", "বন্ধুর খাতা", "কোনোটাই না"], correctIndex: 3 },
      { q: "কোন জিনিস ধার দিলে ফেরত পাওয়া কঠিন?", options: ["টাকা", "বই", "চার্জার", "সবগুলো"], correctIndex: 3 },
      { q: "মেয়েরা আয়নার সামনে বেশি সময় কেন কাটায়?", options: ["সুন্দর দেখায়", "সাজতে", "নিজেকে দেখতে", "সবগুলো"], correctIndex: 3 },
      { q: "কোন প্রাণী সবচেয়ে বেশি ঘুমায়?", options: ["বিড়াল", "কোয়ালা", "স্লথ", "মানুষ"], correctIndex: 1 },
      { q: "কোন জিনিসের কোনো ওজন নেই?", options: ["আলো", "বাতাস", "ভালোবাসা", "সবগুলো"], correctIndex: 2 },
      { q: "কোন খাবারটি খেলে গলা জ্বালা করে?", options: ["মিষ্টি", "ঝাল", "টক", "কোনোটাই না"], correctIndex: 1 },
      { q: "মানুষ কেন সিন করে চুপ থাকে?", options: ["ব্যস্ত", "ভাবতে", "রাগ দেখাতে", "কিছু বলার নেই"], correctIndex: 2 },
      { q: "কোন প্রাণীকে পোষ মানানো সবচেয়ে কঠিন?", options: ["বাঘ", "সিংহ", "মানুষ", "হাতি"], correctIndex: 2 },
      { q: "কোন জিনিস বেশি খেলে শরীরের ক্ষতি?", options: ["পানি", "ফাস্টফুড", "ফল", "সবজি"], correctIndex: 1 },
      { q: "কোন প্রাণীর তিনটি হৃদয় থাকে?", options: ["অক্টোপাস", "মানুষ", "কুকুর", "বিড়াল"], correctIndex: 0 },
      { q: "কোন জিনিসের শুরু আছে, শেষ নেই?", options: ["গল্প", "রাস্তা", "আকাশ", "সবগুলো"], correctIndex: 3 },
      { q: "কোন প্রাণী মানুষের মতো হাঁটে?", options: ["বানর", "পেঙ্গুইন", "ভাল্লুক", "সবগুলো"], correctIndex: 3 },
      { q: "কোন জিনিস দেখলে মন ভালো হয়ে যায়?", options: ["টাকা", "বন্ধু", "প্রেমিকা", "সবগুলো"], correctIndex: 3 },
      { q: "কোন প্রাণী পানি ছাড়া বাঁচতে পারে?", options: ["উট", "সাপ", "মাছ", "কোনোটাই না"], correctIndex: 3 },
      { q: "মানুষ কেন গোপন কথা বলতে পারে না?", options: ["ভুলে যায়", "বলতে ভালো লাগে", "কনফিউশন", "সবগুলো"], correctIndex: 3 },
      { q: "কোন জিনিস যত বেশি খরচ করবে তত বাড়বে?", options: ["টাকা", "জ্ঞান", "সম্পদ", "সময়"], correctIndex: 1 },
      { q: "কোন রঙের ফুল সবচেয়ে সুন্দর?", options: ["লাল", "সাদা", "হলুদ", "সবগুলো"], correctIndex: 3 },
      { q: "কোন প্রাণীর লেজ নেই?", options: ["মানুষ", "বানর", "বিড়াল", "কুকুর"], correctIndex: 0 },
      { q: "কোন জিনিস সবচেয়ে বেশি মূল্যবান?", options: ["সময়", "টাকা", "সোনা", "হীরা"], correctIndex: 0 },
      { q: "কোন প্রাণী সবচেয়ে বেশি ডাকে?", options: ["কুকুর", "বিড়াল", "মানুষ", "পাখি"], correctIndex: 2 },
      { q: "কোন খাবারটি খেতে সবার আগে হাত বাড়ে?", options: ["মিষ্টি", "ভাত", "মাছ", "মাংস"], correctIndex: 0 },
      { q: "কোন জিনিস পেলে সবাই খুশি হয়?", options: ["উপহার", "টাকা", "ভালোবাসা", "সবগুলো"], correctIndex: 3 },
      { q: "কোন প্রাণী সবচেয়ে বেশি শক্তিশালী?", options: ["হাতি", "সিংহ", "বাঘ", "পিঁপড়া"], correctIndex: 0 },
      { q: "কোন জিনিসের কোনো রঙ নেই?", options: ["বাতাস", "পানি", "আলো", "সবগুলো"], correctIndex: 3 },
      { q: "মানুষ কেন রাতে বেশি খায়?", options: ["খিদে পায়", "অভ্যাস", "ঘুমাতে দেরি হয়", "সবগুলো"], correctIndex: 3 },
      { q: "কোন প্রাণী মানুষকে দেখলে ভয় পায়?", options: ["বাঘ", "সিংহ", "ইঁদুর", "হাতি"], correctIndex: 2 },
      { q: "কোন জিনিস বাসায় থাকলে সবাই খুশি থাকে?", options: ["টাকা", "ভালোবাসা", "শান্তি", "সবগুলো"], correctIndex: 3 },
      { q: "কোন গেমটি খেলে মানুষের মাথা ব্যথা করে?", options: ["ফুটবল", "ক্রিকেট", "পাজল", "সবগুলো"], correctIndex: 2 },
      { q: "কোন জিনিসকে ভালোবাসলে কষ্ট পেতে হয়?", options: ["মানুষ", "প্রাণী", "জিনিস", "সবগুলো"], correctIndex: 0 },
      { q: "কোন প্রাণী সবচেয়ে বেশি দ্রুত দৌড়ায়?", options: ["চিতা", "ঘোড়া", "মানুষ", "বাঘ"], correctIndex: 0 },
      { q: "মানুষ কেন মিথ্যা বলে?", options: ["ভয়ে", "লজ্জায়", "স্বার্থে", "সবগুলো"], correctIndex: 3 },
      { q: "কোন জিনিস ছাড়া মানুষ বাঁচতে পারে না?", options: ["পানি", "খাবার", "বাতাস", "সবগুলো"], correctIndex: 3 }
    ];

    // ইউজারের বর্তমান ব্যালেন্স চেক (MongoDB ছাড়া)
    const userData = await usersData.get(senderID);
    const combined = userData?.money || 0;

    if (combined < 3000000000) {
      return sendMsg(`🚫 গরিব কোথাকার!\nতোর তো ৩ বিলিয়ন টাকাই নাই, ভুল উত্তর দিলে কী দিবি?\n💰 Your Balance: $${this.formatMoney(combined)}\n💡 আগে গেম খেলে টাকা আয় কর, তারপর কুইজ খেলতে আয়!`);
    }

    const randomQuiz = quizData[Math.floor(Math.random() * quizData.length)];
    const rewardMoney = 969000000; // 969M
    const penaltyMoney = 3000000000; // 3B
    const optionLabels = ["A", "B", "C", "D"];
    const correctAnswerLetter = optionLabels[randomQuiz.correctIndex];
    const correctAnswerText = randomQuiz.options[randomQuiz.correctIndex];

    const quizBox =
      `✨━━━[🧠 𝗤𝗨𝗜𝗭 𝗚𝗔𝗠𝗘 🧠]━━━✨\n\n` +
      `❓ প্রশ্ন: ${randomQuiz.q}\n\n` +
      `🔹 A) ${randomQuiz.options[0]}\n` +
      `🔹 B) ${randomQuiz.options[1]}\n` +
      `🔹 C) ${randomQuiz.options[2]}\n` +
      `🔹 D) ${randomQuiz.options[3]}\n\n` +
      `🎁 সঠিক উত্তর: +$${this.formatMoney(rewardMoney)}\n` +
      `💸 ভুল উত্তর: -$${this.formatMoney(penaltyMoney)}\n` +
      `⏳ সময়: ৩০ সেকেন্ড\n\n` +
      `💬 উত্তর দিতে A, B, C, D রিপ্লাই দাও!`;

    const sentMessage = await sendMsg(quizBox);

    const timerID = setTimeout(async () => {
      if (global.GoatBot.onReply.has(sentMessage.messageID)) {
        global.GoatBot.onReply.delete(sentMessage.messageID);
        
        await sendMsg(`⏰ সময় শেষ!\nতুই এত সহজ প্রশ্নের উত্তর দিতে পারলি না? 🥱\n💡 সঠিক উত্তর: [ ${correctAnswerLetter} ] ${correctAnswerText}`);
        
        setTimeout(() => {
          try {
            api.unsendMessage(sentMessage.messageID);
          } catch (e) {}
        }, 3000);
      }
    }, 30000);

    global.GoatBot.onReply.set(sentMessage.messageID, {
      commandName: commandName,
      author: senderID,
      correctLetter: correctAnswerLetter,
      correctText: correctAnswerText.toLowerCase(),
      reward: rewardMoney,
      penalty: penaltyMoney,
      timerID: timerID,
      originalMsgID: sentMessage.messageID
    });
  },

  onReply: async function ({ api, event, message, Reply, usersData }) {
    const { senderID, body } = event;
    const { correctLetter, correctText, reward, penalty, author, timerID, originalMsgID } = Reply;
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);

    if (senderID !== author) {
      return sendMsg("❌ এই কুইজটা তোর না! চুরি করতে এসেছিস? নিজের কুইজ খেলতে `#qz` লিখ।");
    }

    clearTimeout(timerID);

    const userInput = body.trim().toLowerCase();
    const isCorrect = (userInput === correctLetter.toLowerCase()) || (userInput === correctText);
    
    try {
      const __task = require("./task");
      if (__task.recordPlay) await __task.recordPlay(String(event.senderID), "quiz", api, event.threadID, event.messageID);
    } catch (_e) {}

    let userData = await usersData.get(senderID) || { money: 0, data: {} };
    if (!userData.data) userData.data = {};
    
    // ইনিশিয়াল কুইজ স্ট্যাটস সেট করা
    if (typeof userData.data.quizWins === 'undefined') userData.data.quizWins = 0;
    if (typeof userData.data.quizTotal === 'undefined') userData.data.quizTotal = 0;

    if (isCorrect) {
      userData.data.quizWins += 1;
      userData.data.quizTotal += 1;
      
      // রিওয়ার্ড যোগ করা
      userData.money = (userData.money || 0) + reward;
      await usersData.set(senderID, userData);

      global.GoatBot.onReply.delete(Reply.messageID);

      const winRate = ((userData.data.quizWins / userData.data.quizTotal) * 100).toFixed(1);

      await sendMsg(
        `✨━━━[🧠 𝗤𝗨𝗜𝗭 𝗚𝗔𝗠𝗘 🧠]━━━✨\n\n` +
        `✅ দারুণ! সঠিক উত্তর!\n` +
        `🎯 উত্তর: [ ${correctLetter} ]\n` +
        `🎁 তুই জিতলি: +$${this.formatMoney(reward)}\n\n` +
        `📊 উইন রেট: ${winRate}% (${userData.data.quizWins}/${userData.data.quizTotal})\n` +
        `💰 নতুন ব্যালেন্স: $${this.formatMoney(userData.money)}`
      );
    } else {
      userData.data.quizTotal += 1;
      
      // পেনাল্টি কাটা (টাকা শূন্যের নিচে নামবে না)
      userData.money = Math.max(0, (userData.money || 0) - penalty);
      await usersData.set(senderID, userData);

      global.GoatBot.onReply.delete(Reply.messageID);

      await sendMsg(
        `✨━━━[🧠 𝗤𝗨𝗜𝗭 𝗚𝗔𝗠𝗘 🧠]━━━✨\n\n` +
        `💔 উফ! ভুল উত্তর!\n` +
        `📉 তুই হারালি: -$${this.formatMoney(penalty)}\n` +
        `💡 সঠিক উত্তর ছিল: [ ${correctLetter} ] ${correctText}\n\n` +
        `💰 নতুন ব্যালেন্স: $${this.formatMoney(userData.money)}`
      );
    }

    setTimeout(() => {
      try {
        if (originalMsgID) api.unsendMessage(originalMsgID);
      } catch (e) {}
    }, 3000);
  }
};
