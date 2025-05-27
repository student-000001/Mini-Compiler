function compile(code) {
    let tokens;
    try {
        tokens = lexicalAnalyzer(code);  // Will throw on unknown characters
    } catch (err) {
        return "ERROR " + err.message;
    }

    let constants = 0;
    let identifiers = 0;
    let comments = 0;
    let outputCode = [];

    tokens.forEach(token => {
        if (token.type === 'Constant') constants++;
        else if (token.type === 'Identifier') identifiers++;
        else if (token.type === 'Comment') comments++;

        outputCode.push(`[${token.type}] ${token.value}`);
    });

    const syntaxErrors = syntaxAnalyzer(code);

    return outputCode.join('\n') +
        `\n\n Summary:\nConstants: ${constants}\nIdentifiers: ${identifiers}\nComments: ${comments}` +
        `\n\n Syntax Check:\n${syntaxErrors.length ? syntaxErrors.join('\n') : ' No syntax errors found'}`;
}

function lexicalAnalyzer(code) {
    const keywords = new Set([
        "auto", "break", "case", "char", "const", "continue", "default",
        "do", "double", "else", "enum", "extern", "float", "for", "goto",
        "if", "int", "long", "register", "return", "short", "signed",
        "sizeof", "static", "struct", "switch", "typedef", "union",
        "unsigned", "void", "volatile", "while"
    ]);

    const operators = ['+', '-', '*', '/', '=', '%', '<', '>', '!', '&', '|', '^', '~'];
    const symbols = ['(', ')', '{', '}', '[', ']', ';', ',', '.', ':', '"'];

    const tokens = [];
    const lines = code.split('\n');

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        const line = lines[lineNumber];
        let i = 0;

        while (i < line.length) {
            let ch = line[i];

            if (/\s/.test(ch)) {
                i++;
                continue;
            }

            if (ch === '/' && line[i + 1] === '/') {
                tokens.push({ type: 'Comment', value: line.slice(i).trim() });
                break;
            }

            if (operators.includes(ch)) {
                let op = ch;
                if (line[i + 1] === '=' || (ch === '&' && line[i + 1] === '&') || (ch === '|' && line[i + 1] === '|')) {
                    op += line[i + 1];
                    i++;
                }
                tokens.push({ type: 'Operator', value: op });
                i++;
                continue;
            }

            if (symbols.includes(ch)) {
                tokens.push({ type: 'Symbol', value: ch });
                i++;
                continue;
            }

            if (/\d/.test(ch)) {
                let num = '';
                while (i < line.length && /\d/.test(line[i])) {
                    num += line[i++];
                }
                tokens.push({ type: 'Constant', value: num });
                continue;
            }

            if (/[a-zA-Z_]/.test(ch)) {
                let id = '';
                while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) {
                    id += line[i++];
                }
                if (keywords.has(id)) {
                    tokens.push({ type: 'Keyword', value: id });
                } else {
                    tokens.push({ type: 'Identifier', value: id });
                }
                continue;
            }

            //  Lexical Error
            throw new Error(` Lexical Error: Invalid character '${ch}' at line ${lineNumber + 1}`);
        }
    }

    return tokens;
}

function syntaxAnalyzer(code) {
    const errors = [];
    const stack = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        for (let i = 0; i < trimmed.length; i++) {
            const ch = trimmed[i];

            if (ch === '(' || ch === '{') {
                stack.push({ char: ch, line: index + 1 });
            } else if (ch === ')' || ch === '}') {
                if (stack.length === 0) {
                    errors.push(` Line ${index + 1}: Extra closing '${ch}'`);
                    continue;
                }

                const last = stack[stack.length - 1]; // peek

                const matches = (last.char === '(' && ch === ')') || (last.char === '{' && ch === '}');
                if (matches) {
                    stack.pop();
                } else {
                    errors.push(` Line ${index + 1}: Mismatched '${last.char}' with '${ch}'`);
                    // do not pop, keep open so we can catch unclosed later
                }
            }
        }

        // Check for missing semicolon (excluding control structures, blocks, comments)
        if (
            trimmed &&
            !trimmed.startsWith('//') &&
            !trimmed.endsWith(';') &&
            !trimmed.endsWith('{') &&
            !trimmed.endsWith('}') &&
            !trimmed.includes('#') &&
            !/\b(if|else|for|while|switch)\b/.test(trimmed)
        ) {
            errors.push(` Line ${index + 1}: Possible missing semicolon`);
        }
    });

    while (stack.length > 0) {
        const unmatched = stack.pop();
        errors.push(` Line ${unmatched.line}: Unclosed '${unmatched.char}'`);
    }

    return errors;
}
