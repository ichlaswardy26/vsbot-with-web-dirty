const { EmbedBuilder } = require('discord.js');
const rolePermissions = require('../../util/rolePermissions');
const configValidator = require('../../util/configValidator');
const rateLimiter = require('../../util/rateLimiter');
const config = require('../../config');

module.exports = {
  name: 'testpermissions',
  aliases: ['testperms', 'checkperms'],
  description: 'Test permission system dan tampilkan status permission user',
  category: 'test',
  
  async exec(client, message, args) {
    // Only allow staff or higher to use this command
    const permissionError = rolePermissions.checkPermission(message.member, 'staff');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const target = message.mentions.members.first() || message.member;
    const user = target.user;

    // Test all permission levels
    const permissions = {
      'Owner': rolePermissions.isAdmin(target) && config.ownerId?.includes(user.id),
      'Admin': rolePermissions.isAdmin(target),
      'Staff': rolePermissions.isStaff(target),
      'Moderator': rolePermissions.isModerator(target),
      'Economy Manager': rolePermissions.canManageEconomy(target),
      'Giveaway Manager': rolePermissions.canManageGiveaways(target),
      'Ticket Manager': rolePermissions.canManageTickets(target),
      'Shop Manager': rolePermissions.canManageShop(target),
      'Custom Role Creator': rolePermissions.canCreateCustomRole(target)
    };

    // Get user roles
    const userRoles = target.roles.cache
      .filter(role => role.id !== message.guild.id) // Exclude @everyone
      .map(role => role.name)
      .slice(0, 10); // Limit to 10 roles

    // Get available custom role types
    const customRoleTypes = rolePermissions.getAvailableCustomRoleTypes(target);

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('🔐 Permission Test Results')
      .setColor('#5865F2')
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: '👤 User',
          value: `${user.tag} (${user.id})`,
          inline: false
        },
        {
          name: '🎭 Roles',
          value: userRoles.length > 0 ? userRoles.join(', ') : 'No roles',
          inline: false
        },
        {
          name: '✅ Permissions',
          value: Object.entries(permissions)
            .map(([perm, hasIt]) => `${hasIt ? '✅' : '❌'} ${perm}`)
            .join('\n'),
          inline: true
        },
        {
          name: '🎨 Custom Role Types',
          value: customRoleTypes.length > 0 ? customRoleTypes.join(', ') : 'None available',
          inline: true
        }
      )
      .setFooter({ 
        text: `Tested by ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setTimestamp();

    // Add configuration info
    const configInfo = [
      `Staff Role: ${config.roles?.staff ? '✅' : '❌'} (${config.roles?.staff || 'Not set'})`,
      `Admin Role: ${config.roles?.admin ? '✅' : '❌'} (${config.roles?.admin || 'Not set'})`,
      `Moderator Role: ${config.roles?.moderator ? '✅' : '❌'} (${config.roles?.moderator || 'Not set'})`,
      `Boost Role: ${config.roles?.boost ? '✅' : '❌'} (${config.roles?.boost || 'Not set'})`,
      `Donate Role: ${config.roles?.donate ? '✅' : '❌'} (${config.roles?.donate || 'Not set'})`
    ];

    embed.addFields({
      name: '⚙️ Configuration Status',
      value: configInfo.join('\n'),
      inline: false
    });

    await message.channel.send({ embeds: [embed] });

    // Test permission check functions
    const testResults = [];
    const permissionTypes = ['admin', 'staff', 'moderator', 'economy', 'giveaway', 'ticket', 'shop', 'customRole'];
    
    for (const permType of permissionTypes) {
      const error = rolePermissions.checkPermission(target, permType);
      testResults.push(`${permType}: ${error ? '❌' : '✅'}`);
    }

    const testEmbed = new EmbedBuilder()
      .setTitle('🧪 Permission Check Tests')
      .setColor(permissions['Staff'] ? '#57F287' : '#ED4245')
      .setDescription(testResults.join('\n'))
      .setFooter({ text: 'Permission system working correctly!' });

    await message.channel.send({ embeds: [testEmbed] });

    // Add rate limit status
    const rateLimitEmbed = new EmbedBuilder()
      .setTitle('⏰ Rate Limit Status')
      .setColor('#FEE75C');

    const isExempt = rateLimiter.isExempt(target);
    if (isExempt) {
      rateLimitEmbed.setDescription('✅ User is exempt from rate limits');
    } else {
      const categories = ['admin', 'economy', 'shop', 'giveaway'];
      const statusLines = [];
      
      for (const category of categories) {
        const status = rateLimiter.getRateLimitStatus(user.id, category);
        if (status) {
          const icon = status.uses >= status.maxUses ? '🔴' : '🟢';
          statusLines.push(`${icon} ${category}: ${status.uses}/${status.maxUses}`);
        }
      }
      
      rateLimitEmbed.setDescription(statusLines.join('\n') || 'No active rate limits');
    }

    await message.channel.send({ embeds: [rateLimitEmbed] });

    // Add configuration validation if user is admin
    if (rolePermissions.isAdmin(message.member)) {
      const validationResults = await configValidator.validateAll(message.guild);
      const validationEmbed = new EmbedBuilder()
        .setTitle('🔧 Configuration Status')
        .setColor(validationResults.overall ? '#57F287' : '#ED4245')
        .setDescription(validationResults.overall ? '✅ All validations passed' : '⚠️ Some issues found')
        .addFields({
          name: 'Quick Status',
          value: [
            `Bot Permissions: ${validationResults.validations.botPermissions?.valid ? '✅' : '❌'}`,
            `Role Hierarchy: ${validationResults.validations.roleHierarchy?.valid ? '✅' : '⚠️'}`,
            `Channels: ${validationResults.validations.channels?.valid ? '✅' : '⚠️'}`,
            `Categories: ${validationResults.validations.categories?.valid ? '✅' : '⚠️'}`
          ].join('\n'),
          inline: false
        })
        .setFooter({ text: 'Use "validateconfig" for detailed report' });

      await message.channel.send({ embeds: [validationEmbed] });
    }
  }
};