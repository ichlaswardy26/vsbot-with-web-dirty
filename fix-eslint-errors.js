#!/usr/bin/env node

const fs = require('fs');


// Common fixes for ESLint errors
const fixes = {
    // Remove unused imports
    removeUnusedImports: (content, unusedVars) => {
        let fixed = content;
        
        // Handle destructured imports
        const destructureRegex = /const\s*{\s*([^}]+)\s*}\s*=\s*require\([^)]+\);?/g;
        fixed = fixed.replace(destructureRegex, (match, imports) => {
            const importList = imports.split(',').map(imp => imp.trim());
            const usedImports = importList.filter(imp => !unusedVars.includes(imp));
            
            if (usedImports.length === 0) {
                return ''; // Remove entire line if no imports are used
            } else if (usedImports.length < importList.length) {
                return match.replace(imports, usedImports.join(', '));
            }
            return match;
        });
        
        // Handle single imports
        unusedVars.forEach(varName => {
            const singleImportRegex = new RegExp(`const\\s+${varName}\\s*=\\s*require\\([^)]+\\);?\\s*\\n?`, 'g');
            fixed = fixed.replace(singleImportRegex, '');
        });
        
        return fixed;
    },
    
    // Remove unused parameters by prefixing with underscore or removing them
    fixUnusedParams: (content, unusedParams) => {
        let fixed = content;
        
        unusedParams.forEach(param => {
            // If already prefixed with underscore, remove the variable declaration/assignment
            if (param.startsWith('_')) {
                // Remove variable declarations
                const varRegex = new RegExp(`\\s*const\\s+${param.replace('_', '\\_')}\\s*=\\s*[^;\\n]+;?\\s*\\n?`, 'g');
                fixed = fixed.replace(varRegex, '');
                
                // Remove from function parameters (make it just underscore)
                const paramRegex = new RegExp(`\\b${param.replace('_', '\\_')}\\b(?=\\s*[,)])`, 'g');
                fixed = fixed.replace(paramRegex, '_');
                
                // Remove from destructuring
                const destructureRegex = new RegExp(`${param.replace('_', '\\_')}\\s*,?\\s*`, 'g');
                fixed = fixed.replace(destructureRegex, '');
            } else {
                // Replace parameter in function definitions
                const paramRegex = new RegExp(`\\b${param}\\b(?=\\s*[,)])`, 'g');
                fixed = fixed.replace(paramRegex, `_${param}`);
            }
        });
        
        return fixed;
    },
    
    // Fix case declarations
    fixCaseDeclarations: (content) => {
        return content.replace(/case\s+[^:]+:\s*\n\s*const\s+/g, (match) => {
            return match.replace('const ', '{\n                const ') + '\n            }';
        }).replace(/case\s+[^:]+:\s*\n\s*let\s+/g, (match) => {
            return match.replace('let ', '{\n                let ') + '\n            }';
        });
    },
    
    // Fix duplicate keys
    fixDuplicateKeys: (content) => {
        // This is a simple fix for the pastebin.js duplicate key issue
        const lines = content.split('\n');
        const seen = new Set();
        const filtered = lines.filter(line => {
            const keyMatch = line.match(/^\s*['"]?([^'":\s]+)['"]?\s*:/);
            if (keyMatch) {
                const key = keyMatch[1];
                if (seen.has(key)) {
                    return false; // Remove duplicate
                }
                seen.add(key);
            }
            return true;
        });
        return filtered.join('\n');
    },
    
    // Fix no-undef errors
    fixUndefinedVars: (content, undefinedVars) => {
        let fixed = content;
        
        undefinedVars.forEach(varName => {
            if (varName === 'Discord') {
                // Add Discord import if missing
                if (!fixed.includes('const Discord = require(\'discord.js\')')) {
                    fixed = 'const Discord = require(\'discord.js\');\n' + fixed;
                }
            } else if (varName === 'config') {
                // Add config import if missing
                if (!fixed.includes('const config = require(')) {
                    fixed = 'const config = require(\'../config.js\');\n' + fixed;
                }
            } else if (varName === 'lobbyPlayerList') {
                // Define lobbyPlayerList variable
                const lines = fixed.split('\n');
                let insertIndex = -1;
                
                // Find where to insert the variable declaration
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('lobbyPlayerList') && !lines[i].includes('const') && !lines[i].includes('let')) {
                        insertIndex = i;
                        break;
                    }
                }
                
                if (insertIndex > 0) {
                    lines.splice(insertIndex, 0, '        const lobbyPlayerList = [];');
                    fixed = lines.join('\n');
                }
            }
        });
        
        return fixed;
    },
    
    // Fix prototype builtins
    fixPrototypeBuiltins: (content) => {
        return content.replace(/([^.]+)\.hasOwnProperty\(([^)]+)\)/g, 'Object.prototype.hasOwnProperty.call($1, $2)');
    },
    
    // Fix duplicate else-if conditions
    fixDuplicateElseIf: (content) => {
        // This requires manual inspection, but we can comment out obvious duplicates
        return content.replace(/else if \(([^)]+)\) {[^}]*}\s*else if \(\1\)/g, 
            (match, condition) => match.replace(`else if (${condition})`, `// else if (${condition}) // Duplicate condition removed`));
    }
};

// Parse ESLint output to extract errors
function parseESLintErrors(eslintOutput) {
    const errors = {};
    const lines = eslintOutput.split('\n');
    
    let currentFile = null;
    
    lines.forEach(line => {
        // Match file path
        const fileMatch = line.match(/^([^:]+\.js)/);
        if (fileMatch) {
            currentFile = fileMatch[1].replace(/^C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\/, '');
            if (!errors[currentFile]) {
                errors[currentFile] = [];
            }
        }
        
        // Match error details
        const errorMatch = line.match(/(\d+):(\d+)\s+error\s+(.+?)\s+(no-unused-vars|no-case-declarations|no-dupe-keys|no-undef|no-prototype-builtins|no-dupe-else-if)/);
        if (errorMatch && currentFile) {
            const [, lineNum, colNum, message, rule] = errorMatch;
            errors[currentFile].push({
                line: parseInt(lineNum),
                column: parseInt(colNum),
                message,
                rule,
                variable: extractVariableName(message)
            });
        }
    });
    
    return errors;
}

function extractVariableName(message) {
    const matches = message.match(/'([^']+)'/);
    return matches ? matches[1] : null;
}

// Apply fixes to a file
function fixFile(filePath, fileErrors) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        
        // Group errors by type
        const unusedVars = fileErrors.filter(e => e.rule === 'no-unused-vars' && e.message.includes('assigned a value but never used')).map(e => e.variable);
        const unusedParams = fileErrors.filter(e => e.rule === 'no-unused-vars' && e.message.includes('defined but never used')).map(e => e.variable);
        const undefinedVars = fileErrors.filter(e => e.rule === 'no-undef').map(e => e.variable);
        const hasCaseDeclarations = fileErrors.some(e => e.rule === 'no-case-declarations');
        const hasDuplicateKeys = fileErrors.some(e => e.rule === 'no-dupe-keys');
        const hasPrototypeBuiltins = fileErrors.some(e => e.rule === 'no-prototype-builtins');
        const hasDuplicateElseIf = fileErrors.some(e => e.rule === 'no-dupe-else-if');
        
        // Apply fixes
        if (unusedVars.length > 0) {
            content = fixes.removeUnusedImports(content, unusedVars);
        }
        
        if (unusedParams.length > 0) {
            content = fixes.fixUnusedParams(content, unusedParams);
        }
        
        if (undefinedVars.length > 0) {
            content = fixes.fixUndefinedVars(content, undefinedVars);
        }
        
        if (hasCaseDeclarations) {
            content = fixes.fixCaseDeclarations(content);
        }
        
        if (hasDuplicateKeys) {
            content = fixes.fixDuplicateKeys(content);
        }
        
        if (hasPrototypeBuiltins) {
            content = fixes.fixPrototypeBuiltins(content);
        }
        
        if (hasDuplicateElseIf) {
            content = fixes.fixDuplicateElseIf(content);
        }
        
        // Only write if content changed
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content);
            console.log(`✅ Fixed: ${filePath}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`❌ Error fixing ${filePath}:`, error.message);
        return false;
    }
}

// Main execution
const eslintOutput = `C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\actions\\bite.js
8:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\actions\\cringe.js
8:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\actions\\cry.js
8:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\actions\\cuddle.js
8:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\actions\\dance.js
8:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\actions\\hug.js
8:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\actions\\kick.js
8:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\actions\\kill.js
8:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\actions\\kiss.js
9:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\actions\\pat.js
8:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\actions\\poke.js
8:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\actions\\slap.js
9:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\actions\\wave.js
7:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\admin\\analytics.js
84:34  error  '_args' is defined but never used    no-unused-vars
84:41  error  '_client' is defined but never used  no-unused-vars
111:41  error  '_client' is defined but never used  no-unused-vars
165:38  error  '_client' is defined but never used  no-unused-vars
219:38  error  '_args' is defined but never used    no-unused-vars
219:45  error  '_client' is defined but never used  no-unused-vars
284:41  error  '_client' is defined but never used  no-unused-vars
349:44  error  '_client' is defined but never used  no-unused-vars
415:39  error  '_client' is defined but never used  no-unused-vars
484:35  error  '_args' is defined but never used    no-unused-vars
484:42  error  '_client' is defined but never used  no-unused-vars
530:39  error  '_client' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\admin\\contextperms.js
49:21  error  Unexpected lexical declaration in case block  no-case-declarations
74:36  error  'client' is defined but never used            no-unused-vars
93:18  error  'error' is defined but never used             no-unused-vars
127:36  error  'client' is defined but never used            no-unused-vars
163:39  error  'client' is defined but never used            no-unused-vars
253:42  error  'client' is defined but never used            no-unused-vars
377:31  error  'args' is defined but never used              no-unused-vars
377:37  error  'client' is defined but never used            no-unused-vars
408:35  error  'args' is defined but never used              no-unused-vars
408:41  error  'client' is defined but never used            no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\admin\\permgroups.js
54:21  error  Unexpected lexical declaration in case block  no-case-declarations
81:31  error  'args' is defined but never used              no-unused-vars
81:37  error  'client' is defined but never used            no-unused-vars
113:39  error  'client' is defined but never used            no-unused-vars
154:39  error  'client' is defined but never used            no-unused-vars
266:43  error  'client' is defined but never used            no-unused-vars
309:43  error  'client' is defined but never used            no-unused-vars
413:42  error  'client' is defined but never used            no-unused-vars
463:37  error  'client' is defined but never used            no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\admin\\reset.js
10:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\admin\\resetxp.js
7:33  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\admin\\temppermissions.js
39:21  error  Unexpected lexical declaration in case block  no-case-declarations
277:23  error  '_' is defined but never used                 no-unused-vars
278:32  error  '_' is defined but never used                 no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\admin\\validateconfig.js
11:33  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\autores\\listres.js
84:29  error  '_collected' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\confess\\reset.js
7:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\createembed.js
7:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\cusrole\\cusrole.js
149:22  error  'e' is defined but never used                                                                                          no-unused-vars
365:26  error  'e' is defined but never used                                                                                          no-unused-vars
681:24  error  This branch can never execute. Its condition is a duplicate or covered by previous conditions in the if-else-if chain  no-dupe-else-if
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\economy\\bal.js
8:33  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\economy\\resetsouls.js
8:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\level\\rank.js
31:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\moderator\\trollban.js
50:16  error  'reactionError' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\moderator\\warn.js
1:9   error  'EmbedBuilder' is assigned a value but never used  no-unused-vars
44:14  error  'err' is defined but never used                    no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\shop\\removeexclusiveitem.js
47:14  error  '_e' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\test\\confes.js
12:31  error  'args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\test\\debugconfess.js
7:31  error  'args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\test\\debugticket.js
7:31  error  'args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\test\\desk.js
4:33  error  'args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\test\\forceclose.js
8:31  error  'args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\test\\ping.js
7:31  error  'args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\test\\say.js
7:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\test\\testafk.js
7:31  error  'args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\test\\testconfess.js
7:31  error  'args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\test\\testpermissions.js
13:31  error  'args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\test\\testwel.js
4:33  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\test\\welcome.js
7:33  error  'args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\ticket\\close.js
8:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\ticket\\ticket.js
9:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\voice\\claim.js
6:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\voice\\voice.js
371:35  error  'member' is assigned a value but never used  no-unused-vars
413:35  error  'member' is assigned a value but never used  no-unused-vars
452:35  error  'member' is assigned a value but never used  no-unused-vars
494:35  error  'member' is assigned a value but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\commands\\wordchain.js
8:31  error  '_args' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\fix-eslint-errors.js
4:7  error  'path' is assigned a value but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\handlers\\buttons\\embedBuilderHandler.js
125:11  error  'fieldType' is assigned a value but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\handlers\\buttons\\introHandler.js
15:47  error  '_guild' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\handlers\\buttons\\wordChainHandler.js
184:33  error  '_index' is defined but never used                    no-unused-vars
195:9   error  'playerCount' is assigned a value but never used      no-unused-vars
196:7   error  'lobbyPlayerList' is assigned a value but never used  no-unused-vars
332:9   error  'result' is assigned a value but never used           no-unused-vars
381:33  error  'index' is defined but never used                     no-unused-vars
392:9   error  'playerCount' is assigned a value but never used      no-unused-vars
393:7   error  'lobbyPlayerList' is assigned a value but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\handlers\\wordChainMessageHandler.js
195:61  error  '_pointsEarned' is defined but never used    no-unused-vars
195:76  error  '_lastPlayerName' is defined but never used  no-unused-vars
195:93  error  '_lastAnswer' is defined but never used      no-unused-vars
200:33  error  '_index' is defined but never used           no-unused-vars
215:7   error  'lobbyPlayerList' is not defined             no-undef
217:7   error  'lobbyPlayerList' is not defined             no-undef
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\util\\analytics.js
3:7   error  'rolePermissions' is assigned a value but never used  no-unused-vars
466:21  error  '_commandName' is assigned a value but never used     no-unused-vars
514:23  error  '_name' is defined but never used                     no-unused-vars
575:23  error  '_key' is defined but never used                      no-unused-vars
576:23  error  '_key' is defined but never used                      no-unused-vars
577:20  error  '_key' is defined but never used                      no-unused-vars
723:34  error  '_guildId' is defined but never used                  no-unused-vars
723:44  error  '_timeframe' is defined but never used                no-unused-vars
743:20  error  '_guildId' is defined but never used                  no-unused-vars
743:30  error  '_timeframe' is defined but never used                no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\util\\contextPermissions.js
401:32  error  '_guildId' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\util\\i18n.js
440:40  error  Do not access Object.prototype method 'hasOwnProperty' from target object  no-prototype-builtins
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\util\\logger.js
69:22  error  '_error' is defined but never used  no-unused-vars
94:26  error  '_error' is defined but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\util\\performanceMonitor.js
332:21  error  '_commandName' is assigned a value but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\util\\roleUtils.js
20:32  error  '_roleId' is assigned a value but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\util\\temporaryPermissions.js
343:20  error  '_userId' is assigned a value but never used  no-unused-vars
C:\\Users\\Administrator\\Documents\\vsbot-with-web-dirty\\util\\wordChainManager.js
576:18  error  '_error' is defined but never used  no-unused-vars
609:20  error  '_error' is defined but never used  no-unused-vars`;

const errors = parseESLintErrors(eslintOutput);
let fixedCount = 0;

console.log('🔧 Starting ESLint error fixes...\n');

Object.entries(errors).forEach(([filePath, fileErrors]) => {
    if (fixFile(filePath, fileErrors)) {
        fixedCount++;
    }
});

console.log(`\n✨ Fixed ${fixedCount} files!`);
console.log('🔍 Run "npx eslint ." again to see remaining issues.');