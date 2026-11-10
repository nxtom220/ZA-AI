module.exports = {
  config: {
    name: "addbal",
    aliases: ["addbalance", "addmoney"],
    version: "1.0",
    author: "ROCKY CHOWDHURY (Modified)",
    countDown: 5,
    role: 2, // role 2 মানে শুধু বটের অ্যাডমিন/মালিক চালাতে পারবে
    description: {
      en: "Add balance to a user's wallet (Owner Only)"
    },
    category: "𝗪𝗔𝗟𝗟𝗘𝗧",
    guide: {
      en: "   {pn} [amount] @mention / reply\n   {pn} [amount] [uid]"
    }
  },

  onStart: async function ({ args, message, event, usersData, api }) {
    const OWNER_UIDS = ["61596202262199", "61596328413453"];
    const senderID = event.senderID;

    // ১. চেক করা হচ্ছে সে মালিক কি না
    if (!OWNER_UIDS.includes(senderID)) {
      return message.reply("⛔ দুঃখিত! বটের মালিক ছাড়া কেউ টাকা যোগ করতে পারবে না।");
    }

    // ২. আর্গুমেন্ট থেকে এমাউন্ট বের করা
    const amount = parseInt(args[0]);
    if (!amount || isNaN(amount) || amount <= 0) {
      return message.reply("⚠️ সঠিক এমাউন্ট দিন!\nউদাহরণ: `#addbal 1000 @user` অথবা `#addbal 1000 61596202262199`");
    }

    // ৩. টার্গেট ইউজার আইডি বের করা (রিপ্লাই, মেনশন বা সরাসরি UID)
    let targetID = null;

    if (event.type === "message_reply" && event.messageReply) {
      targetID = event.messageReply.senderID;
    } else if (Object.keys(event.mentions || {}).length > 0) {
      targetID = Object.keys(event.mentions)[0];
    } else if (args[1]) {
      // যদি সরাসরি UID দেওয়া হয়
      targetID = args[1].replace(/[^0-9]/g, '');
    }

    if (!targetID) {
      return message.reply("⚠️ কাকে টাকা দিবেন সেটা বুঝতে পারছি না! কাউকে মেনশন দিন, রিপ্লাই দিন অথবা সঠিক UID দিন।");
    }

    // ৪. টার্গেট ইউজারের ডেটা আনা এবং ব্যালেন্স আপডেট করা
    try {
      let userData = await usersData.get(targetID);
      if (!userData) userData = { money: 0 }; // ইউজার নতুন হলে

      userData.money = (userData.money || 0) + amount;
      await usersData.set(targetID, userData);

      // ৫. টার্গেট ইউজারের নাম বের করা (সাকসেস মেসেজের জন্য)
      let targetName = "User";
      try {
        const info = await api.getUserInfo(targetID);
        targetName = info[targetID]?.name || "User";
      } catch (e) {}

      // সাকসেস মেসেজ
      const formatMoney = (num) => num.toLocaleString();
      return message.reply(
        `✅ 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹!\n\n` +
        `👤 𝗨𝘀𝗲𝗿: ${targetName}\n` +
        `💵 𝗔𝗱𝗱𝗲𝗱: $${formatMoney(amount)}\n` +
        `💰 𝗡𝗲𝘄 𝗕𝗮𝗹𝗮𝗻𝗰𝗲: $${formatMoney(userData.money)}`
      );

    } catch (error) {
      console.error(error);
      return message.reply("❌ দুঃখিত, টাকা যোগ করার সময় একটি এরর হয়েছে। আবার চেষ্টা করুন।");
    }
  }
};
