module.exports = {
    name: 'desk',
    description: 'Desk command',
    async exec(client, message, args) {
        await message.channel.send(`# ── .✦ 𝐕𝐢𝐥𝐥𝐚𝐢𝐧 𝐒𝐞𝐫𝐚𝐩𝐡𝐲𝐱  ✦.──
「 ✦ 𝐀𝐛𝐨𝐮𝐭 𝐒𝐞𝐫𝐯𝐞𝐫 ✦ 」

"𝐊𝐞𝐛𝐞𝐫𝐚𝐧𝐢𝐚𝐧 𝐬𝐞𝐨𝐫𝐚𝐧𝐠 𝐯𝐢𝐥𝐥𝐚𝐢𝐧 𝐚𝐝𝐚𝐥𝐚𝐡 𝐦𝐞𝐧𝐞𝐫𝐢𝐦𝐚 𝐤𝐞𝐛𝐞𝐧𝐜𝐢𝐚𝐧 𝐝𝐮𝐧𝐢𝐚 𝐝𝐞𝐦𝐢 𝐭𝐮𝐣𝐮𝐚𝐧 𝐲𝐚𝐧𝐠 𝐥𝐞𝐛𝐢𝐡 𝐛𝐞𝐬𝐚𝐫." 

「 ✦  Features ✦ 」
⛧ Friendly Owner , Staff and Member
⛧ Special Team with Staff 
⛧ Podcast and Giveaway
⛧ Aesthetic Layout
⛧ Leveling Role
⛧ Mission Role 
⛧ Voice , Chill
⛧ Lofi Radio
⛧ Gaming

「 ✦ 𝐓𝐡𝐞 𝐕𝐢𝐥𝐥𝐚𝐢𝐧 ✦ 」
✦ Partner : 
✦ Special Tag : 
✦ Link : https:https://discord.gg/villainseraphyx`);
        
        // Delete original message after sending response
        try {
            await message.delete();
        } catch (error) {
            console.error('Failed to delete original message:', error);
        }
    }
}