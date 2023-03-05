import { CompanionVariableDefinition } from "@companion-module/base";

export function GetVariables(): CompanionVariableDefinition[] {
    return [
        { variableId: "version", name: "VSCode version" },
        { variableId: "language", name: "Language (current file)" },
        { variableId: "lines", name: "Line count (current file)" },
        { variableId: "commands", name: "Command count" },
    ];
}
