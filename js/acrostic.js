window.CM_ACROSTIC = {
  January: [
    ["Jesus goes before you", "Ask and you will receive", "New mercies every morning", "Under His wings you rest", "Always loved, never forgotten", "Rise in His strength", "Yes, He is faithful"],
    ["Joy comes in the morning", "Anchor your hope in Christ", "Nothing is wasted with God", "Unfailing love surrounds you", "Arise, shine — your light has come", "Rest in the finished work", "You belong to Him"]
  ],
  February: [
    ["Forgiven and free", "Every fear can be cast on Him", "Believe He is working", "Rest in His promises", "Open your hands to grace", "Mercy is new today", "Always held", "Ready for good work", "Yes, God loves you"],
    ["Faith over fear", "Emmanuel is with you", "Blessed are the peacemakers", "Receive His peace", "Overcome evil with good", "Mercy triumphs", "Abide in the Vine", "Rejoice always", "Your name is written"]
  ],
  March: [
    ["Mercy meets you here", "A new heart He can give", "Rest from striving", "Christ is enough", "Hope does not put you to shame"],
    ["Move forward in faith", "Ask for wisdom", "Refuse shame", "Cling to the Cross", "He will complete the work"]
  ],
  April: [
    ["Alive because He lives", "Peace that passes understanding", "Risen hope for weary people", "In Christ you are a new creation", "Love never fails"],
    ["Ask, seek, knock", "Pray without ceasing", "Receive the gift of today", "It is well with your soul", "Let His light lead"]
  ],
  May: [
    ["Miracles still happen", "Await His goodness", "You are deeply loved"],
    ["Mercy is already moving", "Abide and you will bear fruit", "Yes — God is for you"]
  ],
  June: [
    ["Jesus is near", "Under grace, not the whip of fear", "New strength for this mile", "Every day is a gift"],
    ["Joy is a strength", "Use your gifts to serve", "Nothing can separate you from His love", "Endure with hope"]
  ],
  July: [
    ["Jesus holds the outcome", "Under His banner you stand", "Love your neighbor as yourself", "Yes, keep going"],
    ["Justice and mercy meet in Him", "Use today for good", "Lean not on your own understanding", "Your labor in the Lord is not in vain"]
  ],
  August: [
    ["Abide in Him", "Use the quiet to listen", "Grace is sufficient", "Until He says otherwise, stay faithful", "Stand firm", "Trust the next step"],
    ["Ask for a clean heart", "Until then, wait well", "God is not finished", "Unseen work still counts", "Sing in the dark", "Truth will outlast the noise"]
  ],
  September: [
    ["Seek first the Kingdom", "Each day has enough trouble — and enough grace", "Pray about everything", "Trust Him with the timing", "Encourage someone today", "Mercy is your starting place", "Believe again", "Enter His rest", "Remain in love"],
    ["Strength rises when you wait", "Even now He hears you", "Plant what you hope to harvest", "Take the next obedient step", "Everything hidden will be made right", "Make room for stillness", "Bless those who wound you", "Expect His help", "Remember whose you are"]
  ],
  October: [
    ["Obey God’s Word", "Cast your cares on Him", "Trust His timing", "Open your heart in prayer", "Believe His promises", "Embrace His peace", "Rejoice in His love"],
    ["Offer God the first hour", "Call on the name of Jesus", "Take courage — He is with you", "Overlook an offense in love", "Build your house on the Rock", "Encourage the weary", "Rest in finished grace"]
  ],
  November: [
    ["Near to the brokenhearted", "Open your mouth with thanks", "Victory belongs to the Lord", "Even here, He provides", "Mercy received becomes mercy given", "Bless the Lord at all times", "Enter His courts with praise", "Remember all His benefits"],
    ["Now is the time to forgive", "Obey the quiet prompting", "Voice your gratitude", "Expect help from above", "Make peace where you can", "Believe for one more day", "Endure with joy", "Remain in His love"]
  ],
  December: [
    ["Do not be afraid", "Emmanuel — God with us", "Christ is born for you", "Every shadow meets His light", "Mercy came wrapped in flesh", "Bethlehem still preaches hope", "Everlasting Father holds you", "Rejoice, the King has come"],
    ["Draw near to the manger", "Expect wonder", "Consider the kindness of God", "Enter the story again", "Make room in the inn of your heart", "Believe the Word became flesh", "Endure the winter with light", "Rest, for the Savior has come"]
  ]
};

window.CM_monthSet = function (date) {
  const names = Object.keys(window.CM_ACROSTIC);
  const name = names[date.getMonth()];
  const year = date.getFullYear();
  const variants = window.CM_ACROSTIC[name];
  const idx = year % variants.length;
  return { name, words: variants[idx], variant: idx + 1 };
};
