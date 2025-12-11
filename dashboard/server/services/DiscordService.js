const axios = require('axios');

class DiscordService {
  constructor() {
    this.baseURL = 'https://discord.com/api/v10';
    this.token = process.env.DISCORD_BOT_TOKEN;
    this.guildId = process.env.GUILD_ID;
    
    // Cache untuk mengurangi API calls
    this.cache = {
      guild: null,
      channels: null,
      roles: null,
      categories: null,
      lastFetch: null,
      ttl: 5 * 60 * 1000 // 5 menit cache
    };
  }

  // Helper untuk membuat request ke Discord API
  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bot ${this.token}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Discord API Error (${endpoint}):`, error.response?.data || error.message);
      throw new Error(`Discord API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  // Check apakah cache masih valid
  isCacheValid() {
    return this.cache.lastFetch && 
           (Date.now() - this.cache.lastFetch) < this.cache.ttl;
  }

  // Fetch guild information
  async getGuild() {
    if (this.cache.guild && this.isCacheValid()) {
      return this.cache.guild;
    }

    try {
      const guild = await this.makeRequest(`/guilds/${this.guildId}`);
      this.cache.guild = guild;
      this.cache.lastFetch = Date.now();
      return guild;
    } catch (error) {
      throw new Error(`Failed to fetch guild: ${error.message}`);
    }
  }

  // Fetch semua channels dari guild
  async getChannels() {
    if (this.cache.channels && this.isCacheValid()) {
      return this.cache.channels;
    }

    try {
      const channels = await this.makeRequest(`/guilds/${this.guildId}/channels`);
      
      // Kategorikan channels berdasarkan type
      const categorized = {
        text: channels.filter(c => c.type === 0), // GUILD_TEXT
        voice: channels.filter(c => c.type === 2), // GUILD_VOICE
        category: channels.filter(c => c.type === 4), // GUILD_CATEGORY
        announcement: channels.filter(c => c.type === 5), // GUILD_ANNOUNCEMENT
        stage: channels.filter(c => c.type === 13), // GUILD_STAGE_VOICE
        forum: channels.filter(c => c.type === 15), // GUILD_FORUM
        thread: channels.filter(c => [10, 11, 12].includes(c.type)) // Various thread types
      };

      // Sort channels by position
      Object.keys(categorized).forEach(type => {
        categorized[type].sort((a, b) => (a.position || 0) - (b.position || 0));
      });

      this.cache.channels = categorized;
      this.cache.lastFetch = Date.now();
      return categorized;
    } catch (error) {
      throw new Error(`Failed to fetch channels: ${error.message}`);
    }
  }

  // Fetch semua roles dari guild
  async getRoles() {
    if (this.cache.roles && this.isCacheValid()) {
      return this.cache.roles;
    }

    try {
      const roles = await this.makeRequest(`/guilds/${this.guildId}/roles`);
      
      // Sort roles by position (highest first)
      roles.sort((a, b) => b.position - a.position);
      
      this.cache.roles = roles;
      this.cache.lastFetch = Date.now();
      return roles;
    } catch (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }
  }

  // Fetch categories (shortcut untuk channel categories)
  async getCategories() {
    if (this.cache.categories && this.isCacheValid()) {
      return this.cache.categories;
    }

    try {
      const channels = await this.getChannels();
      this.cache.categories = channels.category;
      return channels.category;
    } catch (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }
  }

  // Fetch emojis dari guild
  async getEmojis() {
    try {
      const emojis = await this.makeRequest(`/guilds/${this.guildId}/emojis`);
      return emojis.map(emoji => ({
        id: emoji.id,
        name: emoji.name,
        animated: emoji.animated,
        formatted: `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`,
        url: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`
      }));
    } catch (error) {
      throw new Error(`Failed to fetch emojis: ${error.message}`);
    }
  }

  // Fetch members dengan role tertentu
  async getMembersWithRole(roleId, limit = 100) {
    try {
      const members = await this.makeRequest(`/guilds/${this.guildId}/members?limit=${limit}`);
      return members.filter(member => member.roles.includes(roleId));
    } catch (error) {
      throw new Error(`Failed to fetch members with role: ${error.message}`);
    }
  }

  // Get channel by ID dengan informasi lengkap
  async getChannelById(channelId) {
    try {
      const channel = await this.makeRequest(`/channels/${channelId}`);
      return channel;
    } catch (error) {
      throw new Error(`Failed to fetch channel ${channelId}: ${error.message}`);
    }
  }

  // Get role by ID dengan informasi lengkap
  async getRoleById(roleId) {
    try {
      const roles = await this.getRoles();
      return roles.find(role => role.id === roleId);
    } catch (error) {
      throw new Error(`Failed to fetch role ${roleId}: ${error.message}`);
    }
  }

  // Validate apakah channel/role/category ID masih valid
  async validateIds(config) {
    const results = {
      valid: {},
      invalid: {},
      warnings: []
    };

    try {
      const [channels, roles, categories] = await Promise.all([
        this.getChannels(),
        this.getRoles(),
        this.getCategories()
      ]);

      const allChannels = [
        ...channels.text,
        ...channels.voice,
        ...channels.announcement,
        ...channels.stage,
        ...channels.forum
      ];

      // Validate channels
      if (config.channels) {
        for (const [key, channelId] of Object.entries(config.channels)) {
          if (channelId) {
            const exists = allChannels.find(c => c.id === channelId);
            if (exists) {
              results.valid[`channels.${key}`] = { id: channelId, name: exists.name, type: exists.type };
            } else {
              results.invalid[`channels.${key}`] = channelId;
            }
          }
        }
      }

      // Validate roles
      if (config.roles) {
        const validateRoleObject = (obj, prefix = 'roles') => {
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null) {
              validateRoleObject(value, `${prefix}.${key}`);
            } else if (value) {
              const exists = roles.find(r => r.id === value);
              if (exists) {
                results.valid[`${prefix}.${key}`] = { id: value, name: exists.name, color: exists.color };
              } else {
                results.invalid[`${prefix}.${key}`] = value;
              }
            }
          }
        };
        validateRoleObject(config.roles);
      }

      // Validate categories
      if (config.categories) {
        for (const [key, categoryId] of Object.entries(config.categories)) {
          if (categoryId) {
            const exists = categories.find(c => c.id === categoryId);
            if (exists) {
              results.valid[`categories.${key}`] = { id: categoryId, name: exists.name };
            } else {
              results.invalid[`categories.${key}`] = categoryId;
            }
          }
        }
      }

      // Generate warnings untuk invalid IDs
      const invalidCount = Object.keys(results.invalid).length;
      if (invalidCount > 0) {
        results.warnings.push(`Found ${invalidCount} invalid Discord IDs that may need to be updated`);
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to validate IDs: ${error.message}`);
    }
  }

  // Clear cache (untuk force refresh)
  clearCache() {
    this.cache = {
      guild: null,
      channels: null,
      roles: null,
      categories: null,
      lastFetch: null,
      ttl: 5 * 60 * 1000
    };
  }

  // Get formatted data untuk dropdown/select components
  async getFormattedData() {
    try {
      const [guild, channels, roles, categories, emojis] = await Promise.all([
        this.getGuild(),
        this.getChannels(),
        this.getRoles(),
        this.getCategories(),
        this.getEmojis().catch(() => []) // Emojis optional
      ]);

      return {
        guild: {
          id: guild.id,
          name: guild.name,
          icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
          memberCount: guild.approximate_member_count || 'Unknown'
        },
        channels: {
          text: channels.text.map(c => ({
            id: c.id,
            name: c.name,
            category: c.parent_id,
            categoryName: categories.find(cat => cat.id === c.parent_id)?.name || 'No Category'
          })),
          voice: channels.voice.map(c => ({
            id: c.id,
            name: c.name,
            category: c.parent_id,
            categoryName: categories.find(cat => cat.id === c.parent_id)?.name || 'No Category'
          })),
          announcement: channels.announcement.map(c => ({
            id: c.id,
            name: c.name,
            category: c.parent_id,
            categoryName: categories.find(cat => cat.id === c.parent_id)?.name || 'No Category'
          })),
          forum: channels.forum.map(c => ({
            id: c.id,
            name: c.name,
            category: c.parent_id,
            categoryName: categories.find(cat => cat.id === c.parent_id)?.name || 'No Category'
          }))
        },
        roles: roles.filter(r => r.name !== '@everyone').map(r => ({
          id: r.id,
          name: r.name,
          color: r.color,
          hexColor: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#99aab5',
          position: r.position,
          managed: r.managed,
          mentionable: r.mentionable
        })),
        categories: categories.map(c => ({
          id: c.id,
          name: c.name,
          position: c.position
        })),
        emojis: emojis
      };
    } catch (error) {
      throw new Error(`Failed to get formatted data: ${error.message}`);
    }
  }
}

module.exports = new DiscordService();