const Responder = require('../../schemas/autoresponder');

module.exports = {
  name: 'deleteresponder',
  aliases: ["delres"],
  description: 'Delete an autoresponder by trigger or index number',
  category: 'Autoresponder',
  async exec(client, message, args) {
    const rolePermissions = require("../../util/rolePermissions");
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }
    const input = args[0];
    if (!input) {
      return message.reply('Please provide the trigger or index number to delete!\nExample: `!delres welcome` or `!delres 1`');
    }

    try {
      // Check if input is a number (index)
      const index = parseInt(input);
      
      if (!isNaN(index) && index > 0) {
        // Delete by index
        const responders = await Responder.find();
        
        if (index > responders.length) {
          return message.reply(`Invalid index! There are only ${responders.length} autoresponders. Use \`!listres\` to see all autoresponders.`);
        }
        
        // Get the responder at the specified index (index - 1 because arrays are 0-based)
        const responderToDelete = responders[index - 1];
        
        // Delete the responder by its ID
        const result = await Responder.findByIdAndDelete(responderToDelete._id);
        
        if (!result) {
          return message.reply('Failed to delete autoresponder.');
        }
        
        message.reply(`Deleted autoresponder #${index}: \`${responderToDelete.trigger}\` → "${responderToDelete.response}"`);
        
      } else {
        // Delete by trigger (original functionality)
        const result = await Responder.findOneAndDelete({ trigger: input });
        
        if (!result) {
          return message.reply(`Autoresponder with trigger \`${input}\` not found. Use \`!listres\` to see all autoresponders.`);
        }
        
        message.reply(`Deleted autoresponder: \`${input}\` → "${result.response}"`);
      }
      
    } catch (err) {
      console.error('Error in deleteresponder command:', err);
      message.reply('Failed to delete autoresponder. Please try again.');
    }
  },
};
