const fs = require('fs');
const content = fs.readFileSync('src/controllers/adminController.js', 'utf8');
const newContent = content.replace(
    /const usersData = await User\.find\(\{\}\)\.select\('-password'\)\.sort\(\{ createdAt: -1 \}\)\.lean\(\);\s*const users = usersData\.map\(user => \(\{ \.\.\.user, id: user\._id, isAdmin: false, phone: user\.phoneNumber \}\)\);/,
    `const usersData = await User.find({}).select('-password').sort({ createdAt: -1 });
    const users = [];
    
    for (const userData of usersData) {
      const subStatus = await userData.checkSubscriptionValidity();
      
      users.push({
        ...userData.toObject(),
        id: userData._id,
        isAdmin: false,
        phone: userData.phoneNumber,
        isSubscribed: subStatus.isSubscribed,
        subscriptionDaysLeft: subStatus.daysLeft,
        trialUsage: {
          plate_scan: Math.max(0, 2 - (userData.trialUsage?.plate_scan || 0)),
          bp_scan: Math.max(0, 2 - (userData.trialUsage?.bp_scan || 0)),
          community_post: Math.max(0, 2 - (userData.trialUsage?.community_post || 0)),
          smartwatch_connect: Math.max(0, 2 - (userData.trialUsage?.smartwatch_connect || 0))
        }
      });
    }`
);
if (content === newContent) { console.log('No change'); } else {
fs.writeFileSync('src/controllers/adminController.js', newContent);
console.log('Replaced successfully');
}
