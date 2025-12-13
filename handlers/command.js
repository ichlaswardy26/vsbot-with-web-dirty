const { readdirSync, existsSync } = require("fs");
const path = require("path");

module.exports = (client) => {
    const basePath = path.resolve("./commands/");
    const isExist = existsSync(basePath);

    if (isExist) {
        let prefixCommands = 0;
        const categories = new Set();

        const loadCommands = (dir) => {
            const files = readdirSync(dir);

            files.forEach((file) => {
                const filePath = path.join(dir, file);
                const isCommandFile = path.extname(file) === '.js';

                if (isCommandFile) {
                    const command = require(filePath);

                    if (command.name) {
                        client.commands.set(command.name, command);
                        prefixCommands++;
                        if (command.category) categories.add(command.category);
                    }
                }
                else {
                    loadCommands(filePath);
                }
            });
        };

        loadCommands(basePath);

        // Display beautiful stats
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║     📦 COMMAND LOADER STATISTICS      ║');
        console.log('╠════════════════════════════════════════╣');
        console.log(`║  ⚡ Prefix Commands    : ${String(prefixCommands).padEnd(12)}║`);
        console.log(`║  📁 Categories         : ${String(categories.size).padEnd(12)}║`);
        console.log(`║  ✅ Total Commands     : ${String(prefixCommands).padEnd(12)}║`);
        console.log('╚════════════════════════════════════════╝\n');
    }
};