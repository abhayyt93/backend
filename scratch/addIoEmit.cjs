const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'controllers', 'authController.js');
let content = fs.readFileSync(filePath, 'utf8');

const ioCode = `
      // Emit socket event for auto-refresh
      const io = req.app.get('io');
      if (io) {
        io.emit('profileUpdated', { 
          userId: updatedUser._id, 
          profilePicture: updatedUser.profilePicture,
          name: updatedUser.name
        });
      }

      res.json({`;

// Replace all instances of `res.json({` that follow profile updates.
// Since we know exactly what is before `res.json({` in these functions...

// 1. updateUserProfile
content = content.replace(
  "        message: 'Your profile details were updated successfully.',\n      });\n\n      res.json({",
  "        message: 'Your profile details were updated successfully.',\n      });\n" + ioCode
);

// 2. updateProfilePicture
content = content.replace(
  "        message: 'Your profile picture was updated successfully.',\n      });\n\n      res.json({",
  "        message: 'Your profile picture was updated successfully.',\n      });\n" + ioCode
);

// 3. removeProfilePicture
content = content.replace(
  "        message: 'Your profile picture was removed.',\n      });\n\n      res.json({",
  "        message: 'Your profile picture was removed.',\n      });\n" + ioCode
);

fs.writeFileSync(filePath, content);
console.log('Done!');
