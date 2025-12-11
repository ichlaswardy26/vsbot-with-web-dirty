const { readdirSync, existsSync } = require("fs");
const path = require("path");

module.exports = (client) => {
    const basePath = "./events/";

    const isExist = existsSync(basePath);
    if (isExist) {
        let totalEvents = 0;
        const eventsByFolder = {};

        const folders = readdirSync(basePath, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);

        folders.forEach((folder) => {
            const folderPath = path.join(basePath, folder);
            const files = readdirSync(folderPath).filter((f) => f.endsWith(".js"));
            let folderCount = 0;

            files.forEach((fileName) => {
                const event = require(path.join("..", folderPath, fileName));
                if (event.name && event.exec) {
                    client.on(event.name, (...args) => event.exec(client, ...args));
                    totalEvents++;
                    folderCount++;
                }
            });

            if (folderCount > 0) {
                eventsByFolder[folder] = folderCount;
            }
        });

        // Display beautiful stats
        console.log('╔════════════════════════════════════════╗');
        console.log('║      🎯 EVENT LOADER STATISTICS       ║');
        console.log('╠════════════════════════════════════════╣');
        
        Object.entries(eventsByFolder).forEach(([folder, count]) => {
            const icon = folder === 'client' ? '🤖' : '🏰';
            const displayName = folder.charAt(0).toUpperCase() + folder.slice(1);
            console.log(`║  ${icon} ${displayName.padEnd(18)}: ${String(count).padEnd(12)}║`);
        });
        
        console.log('╠════════════════════════════════════════╣');
        console.log(`║  ✅ Total Events       : ${String(totalEvents).padEnd(12)}║`);
        console.log('╚════════════════════════════════════════╝\n');
    }
}