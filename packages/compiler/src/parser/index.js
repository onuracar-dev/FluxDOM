export function parse(source, filename = 'unknown.flow') {
    const scriptMatch = source.match(/<script(?:\s+lang=["']([^"']+)["'])?>([\s\S]*?)<\/script>/);
    const styleMatch = source.match(/<style(?:\s+(scoped))?>([\s\S]*?)<\/style>/);
    const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/);
    let script = null;
    if (scriptMatch)
        script = { lang: scriptMatch[1], content: scriptMatch[2] };
    let style = null;
    if (styleMatch)
        style = { scoped: !!styleMatch[1], content: styleMatch[2] };
    let template = null;
    if (templateMatch) {
        template = { children: parseTemplate(templateMatch[1]) };
    }
    return { script, style, template };
}
function parseTemplate(html) {
    const rootChildren = [];
    const stack = [];
    let current = html;
    while (current.length > 0) {
        const tagOpen = current.indexOf('<');
        if (tagOpen === -1) {
            if (current.trim())
                pushTextOrExpr(current, stack, rootChildren);
            break;
        }
        if (tagOpen > 0) {
            const text = current.substring(0, tagOpen);
            if (text.trim())
                pushTextOrExpr(text, stack, rootChildren);
            current = current.substring(tagOpen);
            continue;
        }
        const tagClose = current.indexOf('>');
        if (tagClose === -1)
            break;
        const tagContent = current.substring(1, tagClose);
        current = current.substring(tagClose + 1);
        if (tagContent.startsWith('/')) {
            stack.pop();
            continue;
        }
        const parts = tagContent.split(/\s+/);
        const tag = parts[0];
        const attributes = {};
        const events = {};
        const bindings = {};
        const attrRegex = /(@|:)?([a-zA-Z0-9-]+)=["']([^"']+)["']/g;
        let match;
        while ((match = attrRegex.exec(tagContent)) !== null) {
            const type = match[1];
            const name = match[2];
            const value = match[3];
            if (type === '@')
                events[name] = value;
            else if (type === ':')
                bindings[name] = value;
            else
                attributes[name] = value;
        }
        const node = { type: 'Element', tag, attributes, events, bindings, children: [] };
        if (stack.length > 0) {
            stack[stack.length - 1].node.children.push(node);
        }
        else {
            rootChildren.push(node);
        }
        if (!tagContent.endsWith('/') && !['br', 'hr', 'img', 'input', 'meta'].includes(tag)) {
            stack.push({ node, tag });
        }
    }
    return rootChildren;
}
function pushTextOrExpr(text, stack, rootChildren) {
    const parts = text.split(/(\{.*?\})/g);
    for (const part of parts) {
        if (!part)
            continue;
        let node;
        if (part.startsWith('{') && part.endsWith('}')) {
            node = { type: 'Expression', content: part.slice(1, -1).trim() };
        }
        else if (part.trim()) {
            node = { type: 'Text', content: part.trim() };
        }
        else
            continue;
        if (stack.length > 0) {
            stack[stack.length - 1].node.children.push(node);
        }
        else {
            rootChildren.push(node);
        }
    }
}
//# sourceMappingURL=index.js.map