import jsonata from "jsonata";

export namespace TxnQueryASTCalculator
{
    /**
     * Parse a JSON query into AST, and return a list of tokens
     * referenced by the AST. This allows selections of required resources only.
     */
    export function flattenASTTokens(node: jsonata.ExprNode): jsonata.ExprNode[]
    {
        let output: jsonata.ExprNode[] = [];
        output.push(node);
        for (const argNode of node.arguments ?? [])
            output = output.concat(flattenASTTokens(argNode));
        for (const argNode of node.expressions ?? [])
            output = output.concat(flattenASTTokens(argNode));
        for (const argNode of Array.isArray(node.lhs) ? node.lhs : [node.lhs])
            if (argNode !== undefined)
                output = output.concat(flattenASTTokens(argNode));
        for (const argNode of Array.isArray(node.rhs) ? node.rhs : [node.rhs])
            if (argNode !== undefined)
                output = output.concat(flattenASTTokens(argNode));
        if (node.procedure)
            output = output.concat(flattenASTTokens(node.procedure));
        for (const argNode of node.stages ?? [])
            output = output.concat(flattenASTTokens(argNode));
        for (const argNode of node.steps ?? [])
            output = output.concat(flattenASTTokens(argNode));
        return output;
    }

    /**
     * Sanitize the query to prevent DOS attack.
     * This currently prevents all binding to lambda to prevent recursive calls.
     */
    export function areFunctionBindingsInAST(query: string)
    {
        const flattenedTokens = flattenASTTokens(jsonata(query).ast());
        for (const token of flattenedTokens)
        {
            // @ts-expect-error
            if (token.type === 'bind' && token.rhs?.type === 'lambda')
                return true;
        }
        return false;
    }
}